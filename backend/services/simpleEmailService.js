const nodemailer = require('nodemailer');

class SimpleEmailService {
  constructor() {
    this.transporter = nodemailer.createTransporter({
      service: 'gmail',
      auth: {
        user: process.env.GMAIL_USER, // tu-email@gmail.com
        pass: process.env.GMAIL_APP_PASSWORD // password de app de Gmail
      }
    });
  }

  async sendPaymentConfirmation(userEmail, orderData) {
    try {
      const mailOptions = {
        from: process.env.GMAIL_USER,
        to: userEmail,
        subject: '✅ Pago Confirmado - Peri Institute',
        html: `
          <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
            <div style="background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); color: white; padding: 30px; text-align: center;">
              <h1>¡Pago Confirmado!</h1>
              <div style="font-size: 48px; margin: 20px 0;">✅</div>
            </div>
            <div style="padding: 30px;">
              <h2 style="color: #28a745;">$${orderData.total}</h2>
              <p><strong>ID de Orden:</strong> #${orderData.id}</p>
              <p><strong>Fecha:</strong> ${new Date().toLocaleDateString('es-ES')}</p>
              <p>Ya puedes acceder a tu contenido desde tu dashboard.</p>
              <a href="${process.env.FRONTEND_URL}/dashboard" 
                 style="display: inline-block; background-color: #667eea; color: white; padding: 12px 24px; text-decoration: none; border-radius: 6px; margin: 20px 0;">
                Ir a Mi Dashboard
              </a>
            </div>
            <div style="background-color: #f8f9fa; padding: 20px; text-align: center; color: #6c757d; font-size: 14px;">
              <p>Gracias por confiar en Peri Institute</p>
            </div>
          </div>
        `
      };

      await this.transporter.sendMail(mailOptions);
      return true;
    } catch (error) {
      console.error('Error sending email:', error);
      return false;
    }
  }

  async sendSubscriptionActivated(userEmail, subscriptionData) {
    try {
      const mailOptions = {
        from: process.env.GMAIL_USER,
        to: userEmail,
        subject: '🎉 Suscripción Activada - Peri Institute',
        html: `
          <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
            <div style="background: linear-gradient(135deg, #ffd700 0%, #ffb347 100%); color: #333; padding: 30px; text-align: center;">
              <h1>¡Suscripción Activada!</h1>
              <div style="font-size: 48px; margin: 20px 0;">🎉</div>
            </div>
            <div style="padding: 30px;">
              <h2 style="color: #667eea;">${subscriptionData.plan_name}</h2>
              <p><strong>Precio:</strong> $${subscriptionData.price}</p>
              <p><strong>Válida hasta:</strong> ${new Date(subscriptionData.current_period_end).toLocaleDateString('es-ES')}</p>
              <p>¡Disfruta de todo el contenido premium disponible!</p>
              <a href="${process.env.FRONTEND_URL}/my-subscriptions" 
                 style="display: inline-block; background-color: #667eea; color: white; padding: 12px 24px; text-decoration: none; border-radius: 6px; margin: 20px 0;">
                Ver Mi Suscripción
              </a>
            </div>
          </div>
        `
      };

      await this.transporter.sendMail(mailOptions);
      return true;
    } catch (error) {
      console.error('Error sending subscription email:', error);
      return false;
    }
  }
}

module.exports = new SimpleEmailService();