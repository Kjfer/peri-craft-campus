/**
 * Utilidades para manejo de estado de PayPal en el checkout
 */

export interface PayPalCheckoutState {
  step: string;
  currentOrder: any;
  paypalDbOrderId: string | null;
  paypalOrderId: string | null;
  selectedPaymentMethod: string;
  transactionId?: string; // Para Yape QR
  timestamp: number;
}

export const PAYPAL_STATE_KEY = 'checkout_state';
export const PAYPAL_MAX_AGE = 15 * 60 * 1000; // 15 minutos

export const savePayPalState = (state: Partial<PayPalCheckoutState>) => {
  try {
    const stateToSave = {
      ...state,
      timestamp: Date.now()
    };
    sessionStorage.setItem(PAYPAL_STATE_KEY, JSON.stringify(stateToSave));
    console.log('💾 Estado PayPal guardado:', {
      step: state.step,
      hasOrder: !!state.paypalOrderId,
      hasDbOrder: !!state.paypalDbOrderId
    });
  } catch (error) {
    console.error('Error guardando estado PayPal:', error);
  }
};

export const loadPayPalState = (): PayPalCheckoutState | null => {
  try {
    const saved = sessionStorage.getItem(PAYPAL_STATE_KEY);
    if (!saved) return null;

    const parsed = JSON.parse(saved);
    const age = Date.now() - (parsed.timestamp || 0);

    if (age > PAYPAL_MAX_AGE) {
      console.log('🗑️ Estado PayPal expirado, limpiando...');
      clearPayPalState();
      return null;
    }

    return parsed;
  } catch (error) {
    console.error('Error cargando estado PayPal:', error);
    clearPayPalState();
    return null;
  }
};

export const clearPayPalState = () => {
  try {
    sessionStorage.removeItem(PAYPAL_STATE_KEY);
    sessionStorage.removeItem('yape_receipt_file');
    console.log('🧹 Estado PayPal limpiado');
  } catch (error) {
    console.error('Error limpiando estado PayPal:', error);
  }
};

export const checkPayPalOrderStatus = async (
  supabase: any, 
  paypalOrderId: string,
  dbOrderId: string
): Promise<{
  completed: boolean;
  error?: string;
  orderId?: string;
}> => {
  try {
    console.log('🔍 Verificando estado de orden PayPal:', paypalOrderId);
    
    const { data, error } = await supabase.functions.invoke('paypal', {
      body: {
        action: 'capture',
        orderID: paypalOrderId,
        dbOrderId: dbOrderId
      }
    });

    if (error) {
      console.log('❌ Error verificando PayPal:', error.message);
      return { completed: false, error: error.message };
    }

    if (data?.success) {
      console.log('✅ Pago PayPal completado');
      return { completed: true, orderId: data.orderId };
    }

    console.log('⏳ Pago PayPal aún pendiente');
    return { completed: false };

  } catch (error: any) {
    console.error('💥 Error verificando estado PayPal:', error);
    return { completed: false, error: error.message };
  }
};

export const generatePayPalDirectUrl = (paypalOrderId: string, sandbox: boolean = true): string => {
  const baseUrl = sandbox 
    ? 'https://www.sandbox.paypal.com' 
    : 'https://www.paypal.com';
  return `${baseUrl}/checkoutnow?token=${paypalOrderId}`;
};

export const isPayPalEnvironmentSandbox = (clientId: string): boolean => {
  return clientId.startsWith('Ab') || clientId.startsWith('Aa');
};