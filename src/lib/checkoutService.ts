import { supabase } from '@/integrations/supabase/client';
import { exchangeRateService } from './exchangeRateService';

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

      // Update existing payment record instead of creating a new one
      console.log('🔍 Looking for existing payment for order:', orderId);
      
      // Find existing payment record
      const { data: existingPayment, error: findError } = await supabase
        .from('payments')
        .select('*')
        .eq('order_id', orderId)
        .order('created_at', { ascending: false })
        .limit(1)
        .single();

      if (findError && findError.code !== 'PGRST116') {
        console.error('Error finding payment:', findError);
        throw new Error(`Error al buscar el registro de pago: ${findError.message}`);
      }

      let data;
      if (existingPayment) {
        // Update existing payment
        console.log('📝 Updating existing payment:', existingPayment.id);
        const { data: updatedPayment, error } = await supabase
          .from('payments')
          .update({
            payment_provider_id: transactionId,
            receipt_url: receiptPublicUrl,
            payment_provider: 'yape',
            updated_at: new Date().toISOString()
          })
          .eq('id', existingPayment.id)
          .select()
          .single();

        if (error) {
          console.error('Payment update error:', error);
          throw new Error(`Error al actualizar el registro de pago: ${error.message}`);
        }
        data = updatedPayment;
      } else {
        // Create new payment if none exists (fallback)
        console.log('➕ Creating new payment record');
        const paymentData = {
          order_id: orderId,
          payment_method: 'yape_qr',
          payment_provider: 'yape',
          payment_provider_id: transactionId,
          receipt_url: receiptPublicUrl,
          user_id: user.data.user.id,
          amount: orderData.total_amount || 0,
          currency: 'PEN'
        };

        const { data: newPayment, error } = await supabase
          .from('payments')
          .insert(paymentData)
          .select()
          .single();

        if (error) {
          console.error('Payment insert error:', error);
          throw new Error(`Error al crear el registro de pago: ${error.message}`);
        }
        data = newPayment;
      }


      console.log('💾 Payment record created successfully:', data);
      console.log('🎯 Iniciando envío de webhook a N8n...');

      // Send notification to n8n webhook for validation (from frontend)
      try {
        const n8nWebhookUrl = 'https://peri-n8n-1-n8n.j60naj.easypanel.host/webhook-test/cd9a61b2-d84c-4517-9e0a-13f898148204';
        
        // Crear parámetros para GET request
        const n8nParams = new URLSearchParams({
          user_id: user.data.user.id,
          user_name: user.data.user.user_metadata?.full_name || '',
          user_email: user.data.user.email || '',
          payment_id: data.id,
          order_id: orderId,
          transaction_id: transactionId,
          receipt_url: receiptPublicUrl,
          amount: (orderData.total_amount || 0).toString(),
          currency: 'PEN',
          payment_type: paymentType,
          payment_method: 'yape_qr'
        });

        const fullUrl = `${n8nWebhookUrl}?${n8nParams.toString()}`;

        console.log('🚀 Enviando notificación a N8n webhook (GET):', n8nParams.toString());
        console.log('🔗 URL completa del webhook:', fullUrl);

        // Usar GET method con parámetros de consulta para N8n
        const n8nResponse = await fetch(fullUrl, {
          method: 'GET',
          mode: 'cors', // Cambiar a cors para el webhook de producción
          headers: {
            'Content-Type': 'application/json'
          }
        });

        console.log('📊 Respuesta de N8n - Status:', n8nResponse.status);
        console.log('📊 Respuesta de N8n - StatusText:', n8nResponse.statusText);
        console.log('📊 Respuesta de N8n - Type:', n8nResponse.type);

        // Con no-cors, no podemos leer la respuesta pero el request se envía
        if (n8nResponse.type === 'opaque') {
          console.log('✅ Webhook enviado a N8n (modo no-cors, respuesta opaca)');
          console.log('📡 Si N8n está corriendo, debería haber recibido el payload');
        } else if (n8nResponse.ok) {
          console.log('✅ Payment notification sent to n8n successfully');
          try {
            const responseText = await n8nResponse.text();
            console.log('📝 N8n response body:', responseText);
          } catch (e) {
            console.log('⚠️ Could not read N8n response body');
          }
        } else {
          console.warn('❌ Failed to send notification to n8n:', n8nResponse.status, n8nResponse.statusText);
        }
      } catch (n8nError) {
        console.error('💥 Error enviando webhook a N8n:', n8nError);
        console.error('💥 Error stack:', n8nError.stack);
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
    return exchangeRateService.formatPrice(amount, currency);
  }

  // Obtener información de tasa de cambio actual
  async getExchangeRateInfo() {
    return await exchangeRateService.getRateInfo();
  }

  // Forzar actualización de tasa de cambio
  async forceRefreshExchangeRate(): Promise<number> {
    return await exchangeRateService.forceRefresh();
  }

  // Convertir USD a PEN usando tasa de cambio real
  async convertToPEN(usdAmount: number): Promise<number> {
    return await exchangeRateService.convertUSDToPEN(usdAmount);
  }

  // Versión síncrona con fallback (para compatibilidad)
  convertToPENSync(usdAmount: number): number {
    const cachedRate = exchangeRateService.getCacheInfo().rates['USD_TO_PEN'];
    const rate = cachedRate ? cachedRate.rate : 3.50; // Fallback actualizado
    return Math.round((usdAmount * rate) * 100) / 100;
  }

  // Obtener precio en la moneda correcta según el método de pago - soporta cursos y suscripciones
  async getPriceForPaymentMethod(usdPrice: number, paymentMethod: string, itemType?: 'course' | 'subscription') {
    // MercadoPago solo funciona con cursos (no suscripciones)
    if (paymentMethod === 'mercadopago' && itemType !== 'subscription') {
      return {
        amount: await this.convertToPEN(usdPrice),
        currency: 'PEN'
      };
    }
    
    // Yape QR también usa soles
    if (paymentMethod === 'yape_qr') {
      return {
        amount: await this.convertToPEN(usdPrice),
        currency: 'PEN'
      };
    }
    
    return {
      amount: usdPrice,
      currency: 'USD'
    };
  }

  // Versión síncrona para compatibilidad con código existente
  getPriceForPaymentMethodSync(usdPrice: number, paymentMethod: string, itemType?: 'course' | 'subscription') {
    // MercadoPago solo funciona con cursos (no suscripciones)
    if (paymentMethod === 'mercadopago' && itemType !== 'subscription') {
      return {
        amount: this.convertToPENSync(usdPrice),
        currency: 'PEN'
      };
    }
    
    // Yape QR también usa soles
    if (paymentMethod === 'yape_qr') {
      return {
        amount: this.convertToPENSync(usdPrice),
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
      const n8nWebhookUrl = 'https://peri-n8n-1-n8n.j60naj.easypanel.host/webhook-test/cd9a61b2-d84c-4517-9e0a-13f898148204';
      
      console.log('🧪 Testing N8n webhook connection...');
      console.log('🔗 Testing URL:', n8nWebhookUrl);
      
      // First test with GET method
      console.log('📡 Testing GET request...');
      const getResponse = await fetch(n8nWebhookUrl, {
        method: 'GET',
        mode: 'cors'
      });
      
      console.log('📊 GET Response - Status:', getResponse.status);
      console.log('📊 GET Response - Type:', getResponse.type);
      
      // Then test with POST method
      console.log('📡 Testing POST request...');
      const testPayload = {
        test: true,
        timestamp: new Date().toISOString(),
        message: 'Test connection from Peri Craft Campus'
      };
      
      const postResponse = await fetch(n8nWebhookUrl, {
        method: 'POST',
        mode: 'cors',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(testPayload)
      });

      console.log('📊 POST Response - Status:', postResponse.status);
      console.log('📊 POST Response - Type:', postResponse.type);

      const result = {
        success: true,
        get_status: getResponse.status,
        get_type: getResponse.type,
        post_status: postResponse.status,
        post_type: postResponse.type,
        url: n8nWebhookUrl
      };

      console.log('✅ N8n webhook test completed:', result);
      return result;
      
    } catch (error: any) {
      console.error('N8n webhook test failed:', error);
      return {
        success: false,
        error: error.message,
        get_status: 0,
        get_type: 'error' as ResponseType,
        post_status: 0,
        post_type: 'error' as ResponseType,
        url: 'https://peri-n8n-1-n8n.j60naj.easypanel.host/webhook-test/cd9a61b2-d84c-4517-9e0a-13f898148204'
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
