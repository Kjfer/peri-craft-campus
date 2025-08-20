import { supabase } from "@/integrations/supabase/client";

// Servicio de checkout para manejar todo el flujo de pagos
export interface CheckoutItem {
  course_id: string;
  course?: {
    id: string;
    title: string;
    price: number;
    thumbnail_url?: string;
    instructor_name: string;
    level: string;
    duration_hours: number;
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
    course_id: string;
    price: number;
    courses?: {
      id: string;
      title: string;
      thumbnail_url?: string;
      instructor_name: string;
    };
  }>;
}

export interface PaymentConfirmation {
  transaction_id: string;
  payment_method: 'yape' | 'plin';
}

class CheckoutService {
  // Iniciar checkout desde el carrito
  async startCheckoutFromCart(cartItems: CheckoutItem[], paymentMethod: string) {
    try {
      const { data, error } = await supabase.functions.invoke('create-payment', {
        body: {
          cartItems: cartItems.map(item => ({
            id: item.course_id,
            title: item.course?.title || '',
            price: item.course?.price || 0,
            instructor_name: item.course?.instructor_name || '',
            thumbnail_url: item.course?.thumbnail_url || ''
          })),
          totalAmount: cartItems.reduce((sum, item) => sum + (item.course?.price || 0), 0),
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

  // Confirmar pago manual (Yape/Plin) - Esta funcionalidad se maneja via webhook
  async confirmManualPayment(orderId: string, transactionId: string, paymentMethod: 'yape' | 'plin') {
    try {
      // En el flujo con MercadoPago y webhooks, no necesitamos confirmación manual
      // El webhook se encarga de actualizar el estado automáticamente
      return {
        success: true,
        message: 'El pago se procesará automáticamente via MercadoPago'
      };
    } catch (error) {
      console.error('Error in confirmManualPayment:', error);
      throw error;
    }
  }

  // Obtener órdenes del usuario
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

  // Obtener detalles de una orden específica
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
  async getAvailablePaymentMethods(): Promise<Array<{
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
        id: 'googlepay',
        name: 'Google Pay',
        icon: '💳',
        type: 'digital_wallet'
      },
      {
        id: 'paypal',
        name: 'PayPal',
        icon: '🅿️',
        type: 'digital_wallet'
      },
      {
        id: 'card',
        name: 'Tarjeta de Crédito/Débito',
        icon: '💳',
        type: 'card'
      }
    ];

    if (canUsePeruvian) {
      baseMethods.push(
        {
          id: 'mercadopago',
          name: 'MercadoPago',
          icon: '🏦',
          type: 'digital_wallet',
          description: 'Yape, Tarjetas y más métodos peruanos'
        }
      );
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

  // Obtener precio en la moneda correcta según el método de pago
  getPriceForPaymentMethod(usdPrice: number, paymentMethod: string) {
    if (paymentMethod === 'mercadopago') {
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
}

export const checkoutService = new CheckoutService();
