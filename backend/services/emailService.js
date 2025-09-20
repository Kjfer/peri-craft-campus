const { createClient } = require('@supabase/supabase-js');

// Configuración de Supabase para el servicio de email
const supabaseUrl = process.env.SUPABASE_URL;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
const supabase = createClient(supabaseUrl, supabaseServiceKey);

class EmailService {
  // Enviar email de confirmación de pago
  async sendPaymentConfirmation(userId, orderData) {
    try {
      // Obtener datos del usuario
      const { data: user, error: userError } = await supabase
        .from('profiles')
        .select('email, full_name')
        .eq('id', userId)
        .single();

      if (userError || !user) {
        console.error('Error getting user data:', userError);
        return false;
      }

      // Verificar configuración de notificaciones
      const { data: settings } = await supabase
        .from('notification_settings')
        .select('email_notifications, payment_confirmations')
        .eq('user_id', userId)
        .single();

      if (!settings?.email_notifications || !settings?.payment_confirmations) {
        console.log('User has disabled payment email notifications');
        return true; // No es error, solo no envía
      }

      // Preparar datos del email
      const emailData = {
        to: [user.email],
        subject: '✅ Pago Confirmado - Peri Institute',
        html: this.getPaymentConfirmationTemplate({
          userName: user.full_name || 'Usuario',
          orderId: orderData.id,
          amount: orderData.total,
          items: orderData.items || [],
          paymentMethod: orderData.payment_method,
          date: new Date().toLocaleDateString('es-ES')
        })
      };

      // Enviar email usando la API de Supabase Edge Functions
      const { data, error } = await supabase.functions.invoke('send-email', {
        body: emailData
      });

      if (error) {
        console.error('Error sending payment confirmation email:', error);
        return false;
      }

      console.log('Payment confirmation email sent successfully');
      return true;
    } catch (error) {
      console.error('Error in sendPaymentConfirmation:', error);
      return false;
    }
  }

  // Enviar email de suscripción activada
  async sendSubscriptionActivated(userId, subscriptionData) {
    try {
      const { data: user, error: userError } = await supabase
        .from('profiles')
        .select('email, full_name')
        .eq('id', userId)
        .single();

      if (userError || !user) {
        console.error('Error getting user data:', userError);
        return false;
      }

      // Verificar configuración
      const { data: settings } = await supabase
        .from('notification_settings')
        .select('email_notifications, subscription_renewals')
        .eq('user_id', userId)
        .single();

      if (!settings?.email_notifications || !settings?.subscription_renewals) {
        return true;
      }

      const emailData = {
        to: [user.email],
        subject: '🎉 Suscripción Activada - Peri Institute',
        html: this.getSubscriptionActivatedTemplate({
          userName: user.full_name || 'Usuario',
          planName: subscriptionData.plan_name,
          price: subscriptionData.price,
          validUntil: new Date(subscriptionData.current_period_end).toLocaleDateString('es-ES'),
          features: subscriptionData.features || []
        })
      };

      const { data, error } = await supabase.functions.invoke('send-email', {
        body: emailData
      });

      if (error) {
        console.error('Error sending subscription email:', error);
        return false;
      }

      return true;
    } catch (error) {
      console.error('Error in sendSubscriptionActivated:', error);
      return false;
    }
  }

  // Enviar recordatorio de renovación
  async sendRenewalReminder(userId, subscriptionData) {
    try {
      const { data: user } = await supabase
        .from('profiles')
        .select('email, full_name')
        .eq('id', userId)
        .single();

      if (!user) return false;

      const { data: settings } = await supabase
        .from('notification_settings')
        .select('email_notifications, subscription_renewals')
        .eq('user_id', userId)
        .single();

      if (!settings?.email_notifications || !settings?.subscription_renewals) {
        return true;
      }

      const renewalDate = new Date(subscriptionData.current_period_end);
      const daysUntilRenewal = Math.ceil((renewalDate - new Date()) / (1000 * 60 * 60 * 24));

      const emailData = {
        to: [user.email],
        subject: '🔔 Recordatorio: Tu suscripción se renueva pronto',
        html: this.getRenewalReminderTemplate({
          userName: user.full_name || 'Usuario',
          planName: subscriptionData.plan_name,
          price: subscriptionData.price,
          renewalDate: renewalDate.toLocaleDateString('es-ES'),
          daysUntilRenewal: daysUntilRenewal
        })
      };

      const { data, error } = await supabase.functions.invoke('send-email', {
        body: emailData
      });

      return !error;
    } catch (error) {
      console.error('Error in sendRenewalReminder:', error);
      return false;
    }
  }

  // Template para confirmación de pago
  getPaymentConfirmationTemplate({ userName, orderId, amount, items, paymentMethod, date }) {
    return `
    <!DOCTYPE html>
    <html lang="es">
    <head>
        <meta charset="UTF-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <title>Pago Confirmado</title>
        <style>
            body { font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; margin: 0; padding: 0; background-color: #f5f5f5; }
            .container { max-width: 600px; margin: 0 auto; background-color: white; border-radius: 8px; overflow: hidden; box-shadow: 0 2px 10px rgba(0,0,0,0.1); }
            .header { background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); color: white; padding: 30px; text-align: center; }
            .content { padding: 30px; }
            .success-icon { font-size: 48px; margin-bottom: 20px; }
            .amount { font-size: 32px; font-weight: bold; color: #28a745; margin: 20px 0; }
            .details { background-color: #f8f9fa; padding: 20px; border-radius: 8px; margin: 20px 0; }
            .detail-row { display: flex; justify-content: space-between; margin: 10px 0; padding: 5px 0; border-bottom: 1px solid #e9ecef; }
            .footer { background-color: #f8f9fa; padding: 20px; text-align: center; color: #6c757d; font-size: 14px; }
            .button { display: inline-block; background-color: #667eea; color: white; padding: 12px 24px; text-decoration: none; border-radius: 6px; margin: 20px 0; }
        </style>
    </head>
    <body>
        <div class="container">
            <div class="header">
                <div class="success-icon">✅</div>
                <h1>¡Pago Confirmado!</h1>
                <p>Hola ${userName}, tu pago ha sido procesado exitosamente</p>
            </div>
            
            <div class="content">
                <div class="amount">$${amount}</div>
                
                <div class="details">
                    <h3>Detalles de la Transacción</h3>
                    <div class="detail-row">
                        <span>ID de Orden:</span>
                        <span><strong>#${orderId}</strong></span>
                    </div>
                    <div class="detail-row">
                        <span>Método de Pago:</span>
                        <span>${paymentMethod}</span>
                    </div>
                    <div class="detail-row">
                        <span>Fecha:</span>
                        <span>${date}</span>
                    </div>
                </div>

                ${items.length > 0 ? `
                <div class="details">
                    <h3>Elementos Adquiridos</h3>
                    ${items.map(item => `
                        <div class="detail-row">
                            <span>${item.name}</span>
                            <span>$${item.price}</span>
                        </div>
                    `).join('')}
                </div>
                ` : ''}

                <p>Ya puedes acceder a tu contenido desde tu dashboard.</p>
                
                <a href="${process.env.FRONTEND_URL}/dashboard" class="button">
                    Ir a Mi Dashboard
                </a>
            </div>
            
            <div class="footer">
                <p>Gracias por confiar en Peri Institute</p>
                <p>Si tienes alguna pregunta, contáctanos en soporte@peri-institute.com</p>
            </div>
        </div>
    </body>
    </html>
    `;
  }

  // Template para suscripción activada
  getSubscriptionActivatedTemplate({ userName, planName, price, validUntil, features }) {
    return `
    <!DOCTYPE html>
    <html lang="es">
    <head>
        <meta charset="UTF-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <title>Suscripción Activada</title>
        <style>
            body { font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; margin: 0; padding: 0; background-color: #f5f5f5; }
            .container { max-width: 600px; margin: 0 auto; background-color: white; border-radius: 8px; overflow: hidden; box-shadow: 0 2px 10px rgba(0,0,0,0.1); }
            .header { background: linear-gradient(135deg, #ffd700 0%, #ffb347 100%); color: #333; padding: 30px; text-align: center; }
            .content { padding: 30px; }
            .celebration-icon { font-size: 48px; margin-bottom: 20px; }
            .plan-name { font-size: 28px; font-weight: bold; color: #667eea; margin: 20px 0; }
            .details { background-color: #f8f9fa; padding: 20px; border-radius: 8px; margin: 20px 0; }
            .feature { padding: 8px 0; border-bottom: 1px solid #e9ecef; }
            .feature:last-child { border-bottom: none; }
            .footer { background-color: #f8f9fa; padding: 20px; text-align: center; color: #6c757d; font-size: 14px; }
            .button { display: inline-block; background-color: #667eea; color: white; padding: 12px 24px; text-decoration: none; border-radius: 6px; margin: 20px 0; }
        </style>
    </head>
    <body>
        <div class="container">
            <div class="header">
                <div class="celebration-icon">🎉</div>
                <h1>¡Suscripción Activada!</h1>
                <p>¡Hola ${userName}! Tu suscripción está lista</p>
            </div>
            
            <div class="content">
                <div class="plan-name">${planName}</div>
                
                <div class="details">
                    <h3>Detalles de tu Suscripción</h3>
                    <p><strong>Precio:</strong> $${price}</p>
                    <p><strong>Válida hasta:</strong> ${validUntil}</p>
                    
                    <h4>Incluye:</h4>
                    ${features.map(feature => `<div class="feature">✓ ${feature}</div>`).join('')}
                </div>

                <p>¡Disfruta de todo el contenido premium disponible!</p>
                
                <a href="${process.env.FRONTEND_URL}/my-subscriptions" class="button">
                    Ver Mi Suscripción
                </a>
            </div>
            
            <div class="footer">
                <p>¡Bienvenido a la familia premium de Peri Institute!</p>
                <p>Soporte: soporte@peri-institute.com</p>
            </div>
        </div>
    </body>
    </html>
    `;
  }

  // Template para recordatorio de renovación
  getRenewalReminderTemplate({ userName, planName, price, renewalDate, daysUntilRenewal }) {
    return `
    <!DOCTYPE html>
    <html lang="es">
    <head>
        <meta charset="UTF-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <title>Recordatorio de Renovación</title>
        <style>
            body { font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; margin: 0; padding: 0; background-color: #f5f5f5; }
            .container { max-width: 600px; margin: 0 auto; background-color: white; border-radius: 8px; overflow: hidden; box-shadow: 0 2px 10px rgba(0,0,0,0.1); }
            .header { background: linear-gradient(135deg, #17a2b8 0%, #138496 100%); color: white; padding: 30px; text-align: center; }
            .content { padding: 30px; }
            .reminder-icon { font-size: 48px; margin-bottom: 20px; }
            .countdown { font-size: 36px; font-weight: bold; color: #17a2b8; text-align: center; margin: 20px 0; }
            .details { background-color: #f8f9fa; padding: 20px; border-radius: 8px; margin: 20px 0; }
            .footer { background-color: #f8f9fa; padding: 20px; text-align: center; color: #6c757d; font-size: 14px; }
            .button { display: inline-block; background-color: #17a2b8; color: white; padding: 12px 24px; text-decoration: none; border-radius: 6px; margin: 10px; }
            .button-secondary { background-color: #6c757d; }
        </style>
    </head>
    <body>
        <div class="container">
            <div class="header">
                <div class="reminder-icon">🔔</div>
                <h1>Recordatorio de Renovación</h1>
                <p>Hola ${userName}, tu suscripción se renueva pronto</p>
            </div>
            
            <div class="content">
                <div class="countdown">${daysUntilRenewal} días restantes</div>
                
                <div class="details">
                    <h3>${planName}</h3>
                    <p><strong>Fecha de renovación:</strong> ${renewalDate}</p>
                    <p><strong>Precio de renovación:</strong> $${price}</p>
                </div>

                <p>Tu suscripción se renovará automáticamente. Si deseas hacer algún cambio, puedes administrar tu suscripción desde tu panel de control.</p>
                
                <div style="text-align: center;">
                    <a href="${process.env.FRONTEND_URL}/my-subscriptions" class="button">
                        Administrar Suscripción
                    </a>
                    <a href="${process.env.FRONTEND_URL}/dashboard" class="button button-secondary">
                        Ir a Dashboard
                    </a>
                </div>
            </div>
            
            <div class="footer">
                <p>Gracias por ser parte de Peri Institute</p>
                <p>Puedes cancelar en cualquier momento desde tu panel de control</p>
            </div>
        </div>
    </body>
    </html>
    `;
  }
}

module.exports = new EmailService();