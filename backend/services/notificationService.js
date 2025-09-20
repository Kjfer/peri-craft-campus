const emailService = require('../services/emailService');

// Función para procesar notificaciones y enviar emails cuando se completa un pago
async function handlePaymentCompleted(paymentData, orderData, supabase) {
  try {
    console.log('Processing payment completion notification:', paymentData.id);

    // Enviar email de confirmación de pago
    await emailService.sendPaymentConfirmation(orderData.user_id, {
      id: orderData.id,
      total: orderData.total,
      items: orderData.items || [],
      payment_method: paymentData.payment_method
    });

    // Verificar si es una suscripción
    const { data: subscription } = await supabase
      .from('user_subscriptions')
      .select('*')
      .eq('order_id', orderData.id)
      .single();

    if (subscription) {
      // Enviar email de suscripción activada
      await emailService.sendSubscriptionActivated(orderData.user_id, subscription);
    }

    console.log('Payment completion emails sent successfully');
  } catch (error) {
    console.error('Error handling payment completion:', error);
  }
}

// Función para enviar recordatorios de renovación
async function sendRenewalReminders(supabase) {
  try {
    console.log('Sending renewal reminders...');

    // Obtener suscripciones que vencen en 7 días y no han recibido recordatorio reciente
    const sevenDaysFromNow = new Date();
    sevenDaysFromNow.setDate(sevenDaysFromNow.getDate() + 7);

    const { data: subscriptions, error } = await supabase
      .from('user_subscriptions')
      .select(`
        *,
        profiles!user_subscriptions_user_id_fkey(email, full_name)
      `)
      .eq('status', 'active')
      .eq('auto_renew', true)
      .lte('current_period_end', sevenDaysFromNow.toISOString())
      .gt('current_period_end', new Date().toISOString());

    if (error) {
      console.error('Error fetching subscriptions for renewal reminders:', error);
      return;
    }

    let remindersSent = 0;
    for (const subscription of subscriptions || []) {
      // Verificar si ya se envió un recordatorio en los últimos 2 días
      const twoDaysAgo = new Date();
      twoDaysAgo.setDate(twoDaysAgo.getDate() - 2);

      const { data: recentNotification } = await supabase
        .from('notifications')
        .select('id')
        .eq('user_id', subscription.user_id)
        .eq('type', 'subscription')
        .ilike('title', '%recordatorio%')
        .gte('created_at', twoDaysAgo.toISOString())
        .limit(1);

      if (recentNotification && recentNotification.length > 0) {
        console.log(`Skipping reminder for user ${subscription.user_id} - already sent recently`);
        continue;
      }

      // Enviar email de recordatorio
      const success = await emailService.sendRenewalReminder(subscription.user_id, subscription);
      if (success) {
        remindersSent++;
      }
    }

    console.log(`Sent ${remindersSent} renewal reminder emails`);
    return remindersSent;
  } catch (error) {
    console.error('Error sending renewal reminders:', error);
    return 0;
  }
}

// Función para limpiar notificaciones antiguas
async function cleanupOldNotifications(supabase) {
  try {
    console.log('Cleaning up old notifications...');

    const ninetyDaysAgo = new Date();
    ninetyDaysAgo.setDate(ninetyDaysAgo.getDate() - 90);

    const { data, error } = await supabase
      .from('notifications')
      .delete()
      .eq('read', true)
      .lt('created_at', ninetyDaysAgo.toISOString());

    if (error) {
      console.error('Error cleaning up notifications:', error);
      return 0;
    }

    const deletedCount = data?.length || 0;
    console.log(`Cleaned up ${deletedCount} old notifications`);
    return deletedCount;
  } catch (error) {
    console.error('Error in cleanup function:', error);
    return 0;
  }
}

module.exports = {
  handlePaymentCompleted,
  sendRenewalReminders,
  cleanupOldNotifications
};