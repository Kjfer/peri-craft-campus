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

      // Get order details to determine if it's course or subscription
      const { data: orderData, error: orderError } = await supabase
        .from('orders')
        .select(`
          *,
          order_items (
            course_id,
            subscription_id
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

      // Create payment record
      const paymentData = {
        order_id: orderId,
        payment_method: 'yape_qr',
        payment_provider_id: transactionId,
        receipt_url: fileName,
        user_id: user.data.user.id,
        amount: orderData.total_amount || 0,
        currency: 'PEN'
      };

      // Add subscription_id if it's a subscription payment
      if (hasSubscription && orderData.order_items[0]?.subscription_id) {
        (paymentData as any).subscription_id = orderData.order_items[0].subscription_id;
      }

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

      return {
        success: true,
        payment: data,
        paymentType,
        message: 'Comprobante subido exitosamente. El pago será validado en breve.'
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
        .order('created_at', { ascending: false })
        .range((page - 1) * limit, page * limit - 1);

      if (status && status !== 'all') {
        query = query.eq('payment_status', status);
      }

      const { data, error } = await query;

      if (error) throw error;

      return {
        success: true,
        orders: data || []
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

// Export the manual payment confirmation function - soporta cursos y suscripciones  
// This is a simplified wrapper around checkoutService.confirmManualPayment
export const confirmManualPayment = async (
  cartItems: any[],
  totalAmount: number,
  receiptFile: File | null,
  operationCode: string,
  orderId?: string // opcional, si ya tienes el id de la orden
) => {
  if (!receiptFile) {
    throw new Error('El archivo de comprobante es requerido');
  }

  if (!operationCode.trim()) {
    throw new Error('El código de operación es requerido');
  }

  try {
    // If we have an orderId, use the service method directly
    if (orderId) {
      return await checkoutService.confirmManualPayment(orderId, operationCode, receiptFile);
    }

    // If no orderId, we need to create the order first
    // This is for the cart-based flow
    
    // 1. Subir recibo a storage
    const { data: userData } = await supabase.auth.getUser();
    const user = userData?.user;
    if (!user) throw new Error('Usuario no autenticado');

    const fileExt = receiptFile.name.split('.').pop()?.toLowerCase();
    if (!fileExt || !['jpg', 'jpeg', 'png', 'pdf'].includes(fileExt)) {
      throw new Error('Formato de archivo no válido. Solo se permiten JPG, PNG o PDF');
    }

    const fileName = `${user.id}/temp_${Date.now()}.${fileExt}`;
    
    const { data: uploadData, error: uploadError } = await supabase.storage
      .from('receipts')
      .upload(fileName, receiptFile, {
        contentType: receiptFile.type,
        upsert: false
      });

    if (uploadError) {
      console.error('Receipt upload error:', uploadError);
      throw new Error(`Error al subir comprobante: ${uploadError.message}`);
    }

    // Obtener URL pública del recibo
    const { data: urlData } = supabase.storage
      .from('receipts')
      .getPublicUrl(fileName);
    const receiptUrl = urlData.publicUrl;

    // 2. Determinar tipo de items y obtener info
    const courses = cartItems.filter(item => item.course_id).map(item => ({
      course_id: item.course_id,
      course_name: item.course?.title || ''
    }));

    const subscriptions = cartItems.filter(item => item.subscription_id).map(item => ({
      subscription_id: item.subscription_id,
      subscription_name: item.subscription?.name || '',
      duration_months: item.subscription?.duration_months || 1
    }));

    // 3. Create a temporary payment record for validation process
    const paymentData = {
      payment_method: 'yape_qr',
      payment_provider_id: operationCode,
      receipt_url: fileName,
      user_id: user.id,
      amount: totalAmount,
      currency: 'PEN',
      status: 'pending_validation'
    };

    const { data: paymentRecord, error: paymentError } = await supabase
      .from('payments')
      .insert(paymentData)
      .select()
      .single();

    if (paymentError) {
      console.error('Payment record error:', paymentError);
      throw new Error(`Error al crear registro de pago: ${paymentError.message}`);
    }

    // 4. Retornar resultado exitoso
    return {
      success: true,
      message: 'Comprobante enviado para validación.',
      itemType: subscriptions.length > 0 ? 'mixed' : 'courses',
      payment: paymentRecord,
      receiptUrl
    };

  } catch (error: any) {
    console.error('Error in confirmManualPayment wrapper:', error);
    throw error;
  }
};

export const checkoutService = new CheckoutService();
