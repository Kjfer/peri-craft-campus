/**
 * Servicio para registrar pagos en Google Sheets
 * Registra todas las transacciones confirmadas en una hoja de cálculo
 */

interface PaymentRecord {
  user_id: string;
  user_name: string;
  user_email: string;
  transaction_id: string;
  amount: number;
  currency: string;
  payment_type: 'course' | 'subscription';
  payment_method: string;
  date: string; // formato: DD/MM/YYYY
  hour: string; // formato: HH:MM
}

class PaymentGoogleSheetsService {
  private webhookUrl = 'https://hooks.zapier.com/hooks/catch/YOUR_WEBHOOK_ID'; // Configurar con webhook real

  /**
   * Registra un pago en Google Sheets
   */
  async recordPayment(payment: PaymentRecord): Promise<boolean> {
    try {
      console.log('📊 Registrando pago en Google Sheets:', payment);

      const response = await fetch(this.webhookUrl, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          ID_USUARIO: payment.user_id,
          NOMBRE: payment.user_name,
          CORREO: payment.user_email,
          MONTO: payment.amount,
          MONEDA: payment.currency,
          TIPO_PAGO: payment.payment_type,
          ID_TRANSACCION: payment.transaction_id,
          METODO_PAGO: payment.payment_method,
          FECHA_PAGO: payment.date,
          HORA_PAGO: payment.hour,
        }),
      });

      if (!response.ok) {
        throw new Error(`HTTP ${response.status}: ${response.statusText}`);
      }

      console.log('✅ Pago registrado exitosamente en Google Sheets');
      return true;
    } catch (error) {
      console.error('❌ Error registrando pago en Google Sheets:', error);
      // No lanzar error para no interrumpir el flujo de pago
      return false;
    }
  }

  /**
   * Formatea una fecha para Google Sheets
   */
  formatDate(date: Date = new Date()): string {
    const day = String(date.getDate()).padStart(2, '0');
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const year = date.getFullYear();
    return `${day}/${month}/${year}`;
  }

  /**
   * Formatea una hora para Google Sheets
   */
  formatTime(date: Date = new Date()): string {
    const hours = String(date.getHours()).padStart(2, '0');
    const minutes = String(date.getMinutes()).padStart(2, '0');
    return `${hours}:${minutes}`;
  }

  /**
   * Convierte el método de pago a formato legible
   */
  formatPaymentMethod(method: string): string {
    const methodMap: Record<string, string> = {
      'yape_qr': 'yape_qr',
      'paypal': 'paypal',
      'googlepay': 'google_pay',
      'mercadopago': 'mercadopago',
      'card': 'tarjeta',
    };
    return methodMap[method] || method;
  }
}

// Singleton instance
const paymentGoogleSheetsService = new PaymentGoogleSheetsService();

export default paymentGoogleSheetsService;
export type { PaymentRecord };
