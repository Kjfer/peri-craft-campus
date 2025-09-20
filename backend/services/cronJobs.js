const cron = require('node-cron');
const { createClient } = require('@supabase/supabase-js');
const notificationService = require('../services/notificationService');

// Configurar Supabase
const supabaseUrl = process.env.SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
const supabase = createClient(supabaseUrl, supabaseKey);

class CronJobManager {
  constructor() {
    this.jobs = new Map();
    this.init();
  }

  init() {
    console.log('🕐 Initializing Cron Job Manager...');

    // Recordatorios de renovación - todos los días a las 9:00 AM
    this.scheduleRenewalReminders();

    // Limpieza de notificaciones - todos los domingos a las 2:00 AM
    this.scheduleNotificationCleanup();

    // Verificación de suscripciones expiradas - todos los días a las 1:00 AM
    this.scheduleSubscriptionExpiration();

    console.log('✅ Cron jobs scheduled successfully');
  }

  // Programar recordatorios de renovación
  scheduleRenewalReminders() {
    const job = cron.schedule('0 9 * * *', async () => {
      console.log('🔔 Running renewal reminders job...');
      try {
        const remindersSent = await notificationService.sendRenewalReminders(supabase);
        console.log(`✅ Sent ${remindersSent} renewal reminders`);
      } catch (error) {
        console.error('❌ Error in renewal reminders job:', error);
      }
    }, {
      scheduled: false,
      timezone: "America/Lima" // Ajustar según tu zona horaria
    });

    this.jobs.set('renewalReminders', job);
    job.start();
    console.log('📅 Renewal reminders job scheduled (daily at 9:00 AM)');
  }

  // Programar limpieza de notificaciones
  scheduleNotificationCleanup() {
    const job = cron.schedule('0 2 * * 0', async () => {
      console.log('🧹 Running notification cleanup job...');
      try {
        const deletedCount = await notificationService.cleanupOldNotifications(supabase);
        console.log(`✅ Cleaned up ${deletedCount} old notifications`);
      } catch (error) {
        console.error('❌ Error in cleanup job:', error);
      }
    }, {
      scheduled: false,
      timezone: "America/Lima"
    });

    this.jobs.set('notificationCleanup', job);
    job.start();
    console.log('📅 Notification cleanup job scheduled (weekly on Sunday at 2:00 AM)');
  }

  // Verificar suscripciones expiradas
  scheduleSubscriptionExpiration() {
    const job = cron.schedule('0 1 * * *', async () => {
      console.log('⏰ Running subscription expiration check...');
      try {
        // Marcar suscripciones expiradas
        const { data: expiredSubs, error } = await supabase
          .from('user_subscriptions')
          .update({ status: 'expired' })
          .eq('status', 'active')
          .lt('current_period_end', new Date().toISOString())
          .select('*');

        if (error) {
          console.error('Error updating expired subscriptions:', error);
          return;
        }

        // Enviar notificaciones de suscripciones expiradas
        for (const sub of expiredSubs || []) {
          await supabase
            .from('notifications')
            .insert({
              user_id: sub.user_id,
              type: 'subscription',
              title: 'Suscripción expirada',
              message: `Tu suscripción al plan ${sub.plan_name} ha expirado. Renueva tu suscripción para seguir disfrutando del contenido premium.`,
              action_url: '/subscriptions',
              action_label: 'Renovar suscripción'
            });
        }

        console.log(`✅ Processed ${expiredSubs?.length || 0} expired subscriptions`);
      } catch (error) {
        console.error('❌ Error in subscription expiration job:', error);
      }
    }, {
      scheduled: false,
      timezone: "America/Lima"
    });

    this.jobs.set('subscriptionExpiration', job);
    job.start();
    console.log('📅 Subscription expiration job scheduled (daily at 1:00 AM)');
  }

  // Detener un job específico
  stopJob(jobName) {
    const job = this.jobs.get(jobName);
    if (job) {
      job.stop();
      console.log(`🛑 Stopped job: ${jobName}`);
    }
  }

  // Iniciar un job específico
  startJob(jobName) {
    const job = this.jobs.get(jobName);
    if (job) {
      job.start();
      console.log(`▶️ Started job: ${jobName}`);
    }
  }

  // Obtener estado de todos los jobs
  getJobsStatus() {
    const status = {};
    this.jobs.forEach((job, name) => {
      status[name] = {
        running: job.getStatus() === 'scheduled'
      };
    });
    return status;
  }

  // Ejecutar un job manualmente
  async runJobManually(jobName) {
    console.log(`🚀 Manually running job: ${jobName}`);
    
    try {
      switch (jobName) {
        case 'renewalReminders':
          const remindersSent = await notificationService.sendRenewalReminders(supabase);
          return { success: true, result: `Sent ${remindersSent} renewal reminders` };
          
        case 'notificationCleanup':
          const deletedCount = await notificationService.cleanupOldNotifications(supabase);
          return { success: true, result: `Cleaned up ${deletedCount} old notifications` };
          
        default:
          return { success: false, error: 'Unknown job name' };
      }
    } catch (error) {
      console.error(`❌ Error running job ${jobName}:`, error);
      return { success: false, error: error.message };
    }
  }

  // Detener todos los jobs (para shutdown graceful)
  stopAll() {
    this.jobs.forEach((job, name) => {
      job.stop();
      console.log(`🛑 Stopped job: ${name}`);
    });
    console.log('🔴 All cron jobs stopped');
  }
}

// Instancia singleton
const cronManager = new CronJobManager();

// Manejar shutdown graceful
process.on('SIGTERM', () => {
  console.log('📝 SIGTERM received, stopping cron jobs...');
  cronManager.stopAll();
  process.exit(0);
});

process.on('SIGINT', () => {
  console.log('📝 SIGINT received, stopping cron jobs...');
  cronManager.stopAll();
  process.exit(0);
});

module.exports = cronManager;