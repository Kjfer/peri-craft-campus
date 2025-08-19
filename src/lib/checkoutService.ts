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
  private baseURL = 'http://localhost:3003/api/checkout';

  private getAuthHeaders() {
    const token = localStorage.getItem('auth_token');
    return {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${token}`
    };
  }

  // Iniciar checkout desde el carrito
  async startCheckoutFromCart(cartItems: CheckoutItem[], paymentMethod: string) {
    try {
      const response = await fetch(`${this.baseURL}/start`, {
        method: 'POST',
        headers: this.getAuthHeaders(),
        body: JSON.stringify({
          cart_items: cartItems,
          payment_method: paymentMethod
        })
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Error al iniciar el checkout');
      }

      return data;
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

  // Confirmar pago manual (Yape/Plin)
  async confirmManualPayment(orderId: string, transactionId: string, paymentMethod: 'yape' | 'plin') {
    try {
      const response = await fetch(`${this.baseURL}/confirm-payment`, {
        method: 'POST',
        headers: this.getAuthHeaders(),
        body: JSON.stringify({
          order_id: orderId,
          transaction_id: transactionId,
          payment_method: paymentMethod
        })
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Error al confirmar el pago');
      }

      return data;
    } catch (error) {
      console.error('Error in confirmManualPayment:', error);
      throw error;
    }
  }

  // Obtener órdenes del usuario
  async getUserOrders(page = 1, limit = 10, status?: string) {
    try {
      const params = new URLSearchParams({
        page: page.toString(),
        limit: limit.toString()
      });

      if (status) {
        params.append('status', status);
      }

      const response = await fetch(`${this.baseURL}/orders?${params}`, {
        headers: this.getAuthHeaders()
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Error al obtener las órdenes');
      }

      return data;
    } catch (error) {
      console.error('Error in getUserOrders:', error);
      throw error;
    }
  }

  // Obtener detalles de una orden específica
  async getOrderDetails(orderId: string) {
    try {
      const response = await fetch(`${this.baseURL}/orders/${orderId}`, {
        headers: this.getAuthHeaders()
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Error al obtener los detalles de la orden');
      }

      return data;
    } catch (error) {
      console.error('Error in getOrderDetails:', error);
      throw error;
    }
  }

  // Verificar si el usuario puede usar Yape/Plin
  async canUsePeruvianPayments() {
    try {
      const token = localStorage.getItem('auth_token');
      const response = await fetch('http://localhost:3003/api/users/profile', {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });

      if (response.ok) {
        const data = await response.json();
        const country = data.profile?.country || '';
        const normalized = country.toString().trim().toLowerCase();
        // Accept both 'peru' and 'perú'
        return normalized === 'peru' || normalized === 'perú';
      }

      return false;
    } catch (error) {
      console.error('Error checking Peruvian payments:', error);
      return false;
    }
  }

  // Obtener métodos de pago disponibles para el usuario
  async getAvailablePaymentMethods() {
    const canUsePeruvian = await this.canUsePeruvianPayments();
    
    const baseMethods = [
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
          id: 'yape',
          name: 'Yape',
          icon: '📱',
          type: 'mobile_payment'
        },
        {
          id: 'plin',
          name: 'Plin',
          icon: '📱',
          type: 'mobile_payment'
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
    if (paymentMethod === 'yape' || paymentMethod === 'plin') {
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
