import { supabase } from "@/integrations/supabase/client";

// Servicio de checkout para manejar todo el flujo de pagos
export interface CheckoutItem {
  course_id?: string;
  subscription_id?: string;
  course?: {
    id: string;
    title: string;
    price: number;
    thumbnail_url?: string;
    instructor_name: string;
    level: string;
    duration_hours: number;
  };
  subscription?: {
    id: string;
    name: string;
    price: number;
    description: string;
    duration_months: number;
    features: string[];
  };
}

export interface CheckoutOrder {
  id: string;
  order_number: string;
  total_amount: number;
  currency: string;
  payment_method: string;
  payment_status: string;
  created_at: string;
  order_items: Array<{
    id: string;
    course_id?: string;
    subscription_id?: string;
    price: number;
    courses?: {
      id: string;
      title: string;
      thumbnail_url?: string;
      instructor_name: string;
    };
    subscriptions?: {
      id: string;
      name: string;
      description: string;
      duration_months: number;
      features: string[];
    };
  }>;
}

export interface PaymentConfirmation {
  transaction_id: string;
  payment_method: 'yape' | 'plin';
}

class CheckoutService {
  // Iniciar checkout desde el carrito - soporta cursos y suscripciones
  async startCheckoutFromCart(cartItems: CheckoutItem[], paymentMethod: string) {
    try {
      // Separar items por tipo
      const courseItems = cartItems.filter(item => item.course_id);
      const subscriptionItems = cartItems.filter(item => item.subscription_id);

      // Calcular total
      const courseTotal = courseItems.reduce((sum, item) => sum + (item.course?.price || 0), 0);
      const subscriptionTotal = subscriptionItems.reduce((sum, item) => sum + (item.subscription?.price || 0), 0);
      const totalAmount = courseTotal + subscriptionTotal;

      // Preparar items para el backend
      const items = [
        ...courseItems.map(item => ({
          id: item.course_id!,
          type: 'course',
          title: item.course?.title || '',
          price: item.course?.price || 0,
          instructor_name: item.course?.instructor_name || '',
          thumbnail_url: item.course?.thumbnail_url || ''
        })),
        ...subscriptionItems.map(item => ({
          id: item.subscription_id!,
          type: 'subscription',
          title: item.subscription?.name || '',
          price: item.subscription?.price || 0,
          description: item.subscription?.description || '',
          duration_months: item.subscription?.duration_months || 1
        }))
      ];

      const { data, error } = await supabase.functions.invoke('create-payment', {
        body: {
          items: items,
          totalAmount: totalAmount,
          paymentMethod: paymentMethod,
          paymentData: {
            user: {
              email: (await supabase.auth.getUser()).data.user?.email,
              name: (await supabase.auth.getUser()).data.user?.user_metadata?.full_name
            }
          }
        }
      });

      if (error) throw error;
      
      if (data.success) {
        return {
          success: true,
          order: data.order,
          paymentUrl: data.paymentUrl
        };
      } else {
        throw new Error(data.error || 'Error creating payment');
      }
    } catch (error) {
      console.error('Error in startCheckoutFromCart:', error);
      throw error;
    }
  }

  // Iniciar checkout de un solo curso
  async startSingleCourseCheckout(courseId: string, courseData: any, paymentMethod: string) {
    const checkoutItem: CheckoutItem = {
      course_id: courseId,
      course: {
        id: courseData.id,
        title: courseData.title,
        price: courseData.price || 0,
        thumbnail_url: courseData.thumbnail_url,
        instructor_name: courseData.instructor_name,
        level: courseData.level,
        duration_hours: courseData.duration_hours || 0
      }
    };

    return this.startCheckoutFromCart([checkoutItem], paymentMethod);
  }

  // Iniciar checkout de una suscripción
  async startSubscriptionCheckout(subscriptionId: string, subscriptionData: any, paymentMethod: string) {
    const checkoutItem: CheckoutItem = {
      subscription_id: subscriptionId,
      subscription: {
        id: subscriptionData.id,
        name: subscriptionData.name,
        price: subscriptionData.price || 0,
        description: subscriptionData.description,
        duration_months: subscriptionData.duration_months,
        features: subscriptionData.features || []
      }
    };

    return this.startCheckoutFromCart([checkoutItem], paymentMethod);
  }

  // Procesar pago de PayPal para suscripciones
  async processPayPalSubscriptionPayment(subscriptionId: string, subscriptionData: any) {
    try {
      const response = await fetch('/api/payments/create-intent/subscription', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${(await supabase.auth.getSession()).data.session?.access_token}`
        },
        body: JSON.stringify({
          subscription_id: subscriptionId,
          payment_method: 'paypal'
        })
      });

      if (!response.ok) {
        throw new Error('Failed to create PayPal subscription payment');
      }

      const data = await response.json();
      return {
        success: true,
        paymentData: data,
        redirectUrl: data.approval_url
      };
    } catch (error) {
      console.error('PayPal subscription payment error:', error);
      throw error;
    }
  }

  // Procesar pago de Google Pay para suscripciones
  async processGooglePaySubscriptionPayment(subscriptionId: string, subscriptionData: any, paymentData: any) {
    try {
      const response = await fetch('/api/payments/googlepay/subscription', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${(await supabase.auth.getSession()).data.session?.access_token}`
        },
        body: JSON.stringify({
          subscription_id: subscriptionId,
          payment_data: paymentData
        })
      });

      if (!response.ok) {
        throw new Error('Failed to process Google Pay subscription payment');
      }

      const data = await response.json();
      return {
        success: true,
        paymentResult: data
      };
    } catch (error) {
      console.error('Google Pay subscription payment error:', error);
      throw error;
    }
  }

  // Confirmar pago manual (Yape QR) - soporta cursos y suscripciones
  async confirmManualPayment(orderId: string, transactionId: string, receiptFile: File, itemType?: 'course' | 'subscription') {
    try {
      // Upload receipt to storage with user folder structure
      const user = await supabase.auth.getUser();
      if (!user.data.user) {
        console.error('Authentication error: User not found');
        throw new Error('Usuario no autenticado');
      }

      console.log('Starting receipt upload for user:', user.data.user.id);

      const fileExt = receiptFile.name.split('.').pop()?.toLowerCase();
      if (!fileExt || !['jpg', 'jpeg', 'png', 'pdf'].includes(fileExt)) {
        throw new Error('Formato de archivo no válido. Solo se permiten JPG, PNG o PDF');
      }

      const fileName = `${user.data.user.id}/${orderId}_${Date.now()}.${fileExt}`;
      console.log('Uploading file with name:', fileName);
      
      const { data: uploadData, error: uploadError } = await supabase.storage
        .from('receipts')
        .upload(fileName, receiptFile, {
          contentType: receiptFile.type,
          upsert: false
        });

      if (uploadError) {
        console.error('Storage upload error:', uploadError);
        throw new Error(`Error al subir archivo: ${uploadError.message}`);
      }

      console.log('File uploaded successfully:', uploadData);

      // Get the public URL of the uploaded receipt
      const { data: publicUrlData } = supabase.storage
        .from('receipts')
        .getPublicUrl(fileName);

      const receiptPublicUrl = publicUrlData.publicUrl;
      console.log('Receipt public URL:', receiptPublicUrl);

      // Get order details to determine if it's course or subscription
      const { data: orderData, error: orderError } = await supabase
        .from('orders')
        .select(`
          *,
          order_items (
            id,
            course_id,
            subscription_id,
            price
          )
        `)
        .eq('id', orderId)
        .single();

      if (orderError) {
        console.error('Order fetch error:', orderError);
        throw new Error(`Error al obtener la orden: ${orderError.message}`);
      }

      // Determine payment type based on order items
      const hasSubscription = orderData.order_items.some((item: any) => item.subscription_id);
      const paymentType = hasSubscription ? 'subscription' : 'course';

      console.log('Creating payment record for order:', orderId, 'type:', paymentType);

      // Create payment record with the full URL
      const paymentData = {
        order_id: orderId,
        payment_method: 'yape_qr',
        payment_provider_id: transactionId,
        receipt_url: receiptPublicUrl, // Use full URL instead of just filename
        user_id: user.data.user.id,
        amount: orderData.total_amount || 0,
        currency: 'PEN'
      };

      const { data, error } = await supabase
        .from('payments')
        .insert(paymentData)
        .select()
        .single();

      if (error) {
        console.error('Payment insert error:', error);
        throw new Error(`Error al crear el registro de pago: ${error.message}`);
      }

      console.log('Payment record created successfully:', data);

      // Send notification to Supabase edge function for N8n webhook processing
      try {
        const webhookPayload = {
          user_id: user.data.user.id,
          user_name: user.data.user.user_metadata?.full_name || '',
          user_email: user.data.user.email || '',
          payment_id: data.id,
          order_id: orderId,
          transaction_id: transactionId,
          receipt_url: receiptPublicUrl,
          amount: orderData.total_amount || 0,
          currency: 'PEN',
          payment_type: paymentType,
          payment_method: 'yape_qr'
        };

        console.log('Sending payment notification for N8n processing:', webhookPayload);

        // Send to edge function that will handle N8n webhook
        const { data: webhookData, error: webhookError } = await supabase.functions.invoke('process-payment-validation', {
          body: webhookPayload
        });

        if (webhookError) {
          console.warn('Failed to trigger payment validation:', webhookError);
        } else {
          console.log('Payment validation triggered successfully:', webhookData);
        }
      } catch (n8nError) {
        console.warn('Error triggering payment validation:', n8nError);
        // Don't throw error here as the payment was already recorded
      }

      return {
        success: true,
        payment: data,
        paymentType,
        message: 'Comprobante subido exitosamente. Estamos procesando tu pago.'
      };
    } catch (error: any) {
      console.error('Error in confirmManualPayment:', error);
      
      // Provide more specific error messages
      let errorMessage = error.message || 'Error desconocido';
      
      if (error.message?.includes('auth')) {
        errorMessage = 'Error de autenticación. Por favor inicia sesión nuevamente.';
      } else if (error.message?.includes('storage')) {
        errorMessage = 'Error al subir el archivo. Verifica que el archivo sea válido.';
      } else if (error.message?.includes('order')) {
        errorMessage = 'Error al procesar la orden. Contacta con soporte.';
      } else if (error.message?.includes('payment')) {
        errorMessage = 'Error al registrar el pago. Contacta con soporte.';
      }
      
      throw new Error(errorMessage);
    }
  }

  // Obtener órdenes del usuario - incluye cursos y suscripciones
  async getUserOrders(page = 1, limit = 10, status?: string) {
    try {
      let query = supabase
        .from('orders')
        .select(`
          *,
          order_items (
            id,
            course_id,
            subscription_id,
            price,
            created_at,
            order_id,
            courses:course_id (
              id,
              title,
              thumbnail_url,
              instructor_name
            )
          )
        `)
        .order('created_at', { ascending: false })
        .range((page - 1) * limit, page * limit - 1);

      if (status && status !== 'all') {
        query = query.eq('payment_status', status);
      }

      const { data, error } = await query;

      if (error) throw error;

      // Transform the data to match CheckoutOrder interface
      const transformedOrders = data?.map(order => ({
        ...order,
        order_items: order.order_items?.map((item: any) => ({
          id: item.id,
          course_id: item.course_id,
          subscription_id: item.subscription_id,
          price: item.price,
          courses: item.courses,
          // Note: subscriptions join removed due to schema constraints
          subscriptions: undefined
        })) || []
      })) || [];

      return {
        success: true,
        orders: transformedOrders
      };
    } catch (error) {
      console.error('Error in getUserOrders:', error);
      throw error;
    }
  }

  // Obtener detalles de una orden específica - incluye cursos y suscripciones
  async getOrderDetails(orderId: string) {
    try {
      const { data, error } = await supabase
        .from('orders')
        .select(`
          *,
          order_items (
            *,
            courses:course_id (
              id,
              title,
              thumbnail_url,
              instructor_name
            ),
            subscriptions:subscription_id (
              id,
              name,
              description,
              duration_months,
              features
            )
          )
        `)
        .eq('id', orderId)
        .single();

      if (error) throw error;

      return {
        success: true,
        order: data
      };
    } catch (error) {
      console.error('Error in getOrderDetails:', error);
      throw error;
    }
  }

  // Verificar si el usuario puede usar Yape/Plin
  async canUsePeruvianPayments() {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return false;

      const { data: profile } = await supabase
        .from('profiles')
        .select('country')
        .eq('user_id', user.id)
        .single();

      const country = profile?.country || '';
      const normalized = country.toString().trim().toLowerCase();
      return normalized === 'peru' || normalized === 'perú';
    } catch (error) {
      console.error('Error checking Peruvian payments:', error);
      return false;
    }
  }

  // Obtener métodos de pago disponibles para el usuario
  async getAvailablePaymentMethods(itemType?: 'course' | 'subscription'): Promise<Array<{
    id: string;
    name: string;
    icon: string;
    type: string;
    description?: string;
  }>> {
    const canUsePeruvian = await this.canUsePeruvianPayments();
    
    const baseMethods: Array<{
      id: string;
      name: string;
      icon: string;
      type: string;
      description?: string;
    }> = [
      {
        id: 'paypal',
        name: 'PayPal',
        icon: '🅿️',
        type: 'digital_wallet',
        description: 'Paga de forma segura con tu cuenta PayPal'
      },
      {
        id: 'googlepay',
        name: 'Google Pay',
        icon: '💳',
        type: 'digital_wallet',
        description: 'Pago rápido con Google Pay'
      }
    ];

    if (canUsePeruvian) {
      baseMethods.push({
        id: 'yape_qr',
        name: 'Yape QR',
        icon: '📱',
        type: 'manual_payment',
        description: 'Escanea el QR y sube tu comprobante'
      });

      // Solo agregar MercadoPago para cursos, no para suscripciones
      if (itemType !== 'subscription') {
        baseMethods.push({
          id: 'mercadopago',
          name: 'MercadoPago',
          icon: '🏦',
          type: 'external_payment',
          description: 'Paga con tarjetas mediante enlace seguro'
        });
      }
    }

    return baseMethods;
  }

  // Formatear precio según la moneda
  formatPrice(amount: number, currency: string = 'USD') {
    const formatter = new Intl.NumberFormat('es-PE', {
      style: 'currency',
      currency: currency,
      minimumFractionDigits: 2
    });

    return formatter.format(amount);
  }

  // Convertir USD a PEN
  convertToPEN(usdAmount: number) {
    return usdAmount * 3.75; // Tasa de cambio fija
  }

  // Obtener precio en la moneda correcta según el método de pago - soporta cursos y suscripciones
  getPriceForPaymentMethod(usdPrice: number, paymentMethod: string, itemType?: 'course' | 'subscription') {
    // MercadoPago solo funciona con cursos (no suscripciones)
    if (paymentMethod === 'mercadopago' && itemType !== 'subscription') {
      return {
        amount: this.convertToPEN(usdPrice),
        currency: 'PEN'
      };
    }
    
    return {
      amount: usdPrice,
      currency: 'USD'
    };
  }

  // Test n8n webhook connection
  async testN8nWebhook() {
    try {
      const n8nWebhookUrl = 'http://localhost:5678/webhook-test/cd9a61b2-d84c-4517-9e0a-13f898148204';
      
      const testParams = new URLSearchParams({
        test: 'true',
        timestamp: new Date().toISOString(),
        message: 'Test connection from Peri Craft Campus'
      });

      console.log('Testing n8n webhook connection...');
      
      const response = await fetch(`${n8nWebhookUrl}?${testParams.toString()}`, {
        method: 'GET',
        headers: { 'Content-Type': 'application/json' }
      });

      const result: any = {
        success: response.ok,
        status: response.status,
        statusText: response.statusText,
        url: n8nWebhookUrl
      };

      if (response.ok) {
        try {
          const responseData = await response.json();
          result.data = responseData;
        } catch (e) {
          result.data = await response.text();
        }
      }

      console.log('N8n webhook test result:', result);
      return result;
      
    } catch (error: any) {
      console.error('N8n webhook test failed:', error);
      return {
        success: false,
        error: error.message,
        url: 'http://localhost:5678/webhook-test/cd9a61b2-d84c-4517-9e0a-13f898148204'
      };
    }
  }

  // Obtener suscripciones disponibles
  async getAvailableSubscriptions() {
    try {
      const { data, error } = await supabase
        .from('subscriptions')
        .select('*')
        .eq('is_active', true)
        .order('price', { ascending: true });

      if (error) throw error;

      return {
        success: true,
        subscriptions: data || []
      };
    } catch (error) {
      console.error('Error fetching subscriptions:', error);
      throw error;
    }
  }
}


export const checkoutService = new CheckoutService();
