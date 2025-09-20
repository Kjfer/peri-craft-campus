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
      if (!user.data.user) throw new Error('User not authenticated');

      const fileExt = receiptFile.name.split('.').pop();
      const fileName = `${user.data.user.id}/${orderId}_${Date.now()}.${fileExt}`;
      
      const { error: uploadError } = await supabase.storage
        .from('receipts')
        .upload(fileName, receiptFile);

      if (uploadError) throw uploadError;

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

      if (orderError) throw orderError;

      // Determine payment type based on order items
      const hasSubscription = orderData.order_items.some((item: any) => item.subscription_id);
      const paymentType = hasSubscription ? 'subscription' : 'course';

      // Create payment record
      const { data, error } = await supabase
        .from('payments')
        .insert({
          order_id: orderId,
          payment_method: 'yape_qr',
          payment_provider_id: transactionId,
          receipt_url: fileName,
          user_id: user.data.user.id,
          amount: orderData.total_amount || 0,
          currency: 'PEN',
          // Add subscription_id if it's a subscription payment
          ...(hasSubscription && { subscription_id: orderData.order_items[0].subscription_id })
        })
        .select()
        .single();

      if (error) throw error;

      return {
        success: true,
        payment: data,
        paymentType,
        message: 'Comprobante subido. El pago será validado en breve.'
      };
    } catch (error) {
      console.error('Error in confirmManualPayment:', error);
      throw error;
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
export const confirmManualPayment = async (
  cartItems: any[],
  totalAmount: number,
  receiptFile: File | null,
  operationCode: string,
  orderId?: string // opcional, si ya tienes el id de la orden
) => {
  if (!receiptFile) {
    throw new Error('Receipt file is required');
  }

  // 1. Subir recibo a storage
  const fileExt = receiptFile.name.split('.').pop();
  const fileName = `receipt_${Date.now()}.${fileExt}`;
  const { data: uploadData, error: uploadError } = await supabase.storage
    .from('receipts')
    .upload(fileName, receiptFile);
  if (uploadError) {
    throw new Error('Failed to upload receipt');
  }
  // Obtener URL pública del recibo
  const { data: urlData } = supabase.storage
    .from('receipts')
    .getPublicUrl(fileName);
  const receiptUrl = urlData.publicUrl;

  // 2. Obtener datos del usuario
  const { data: userData } = await supabase.auth.getUser();
  const user = userData?.user;
  if (!user) throw new Error('User not authenticated');

  // 3. Determinar tipo de items y obtener info
  const courses = cartItems.filter(item => item.course_id).map(item => ({
    course_id: item.course_id,
    course_name: item.course?.title || ''
  }));

  const subscriptions = cartItems.filter(item => item.subscription_id).map(item => ({
    subscription_id: item.subscription_id,
    subscription_name: item.subscription?.name || '',
    duration_months: item.subscription?.duration_months || 1
  }));

  // 4. Preparar payload para n8n
  const n8nWebhookUrl = 'https://n8n.example.com/webhook/validar-pago-yape'; // <--- reemplazar luego
  const payload = {
    user_id: user.id,
    user_name: user.user_metadata?.full_name || '',
    user_email: user.email,
    receipt_url: receiptUrl,
    operation_code: operationCode,
    order_id: orderId || '',
    amount: totalAmount,
    currency: 'PEN',
    courses,
    subscriptions, // Nuevo campo para suscripciones
    item_type: subscriptions.length > 0 ? 'mixed' : 'courses' // Indicar tipo de compra
  };

  // 5. Enviar POST al webhook de n8n
  const response = await fetch(n8nWebhookUrl, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload)
  });

  if (!response.ok) {
    throw new Error('No se pudo enviar la validación a n8n');
  }

  // 6. Retornar resultado
  return {
    success: true,
    message: 'Comprobante enviado para validación.',
    itemType: payload.item_type
  };
};

export const checkoutService = new CheckoutService();
