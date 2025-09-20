const express = require('express');
const emailService = require('../services/emailService');
const router = express.Router();

// GET /api/notifications/user - Obtener notificaciones del usuario
router.get('/user', async (req, res) => {
  try {
    const userId = req.user.id;
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 20;
    const offset = (page - 1) * limit;

    const { data: notifications, error } = await req.supabase
      .from('notifications')
      .select('*')
      .eq('user_id', userId)
      .order('created_at', { ascending: false })
      .range(offset, offset + limit - 1);

    if (error) {
      console.error('Error fetching notifications:', error);
      return res.status(500).json({ error: 'Error fetching notifications' });
    }

    // Contar total de notificaciones
    const { count } = await req.supabase
      .from('notifications')
      .select('*', { count: 'exact', head: true })
      .eq('user_id', userId);

    res.json({
      notifications: notifications || [],
      pagination: {
        page,
        limit,
        total: count || 0,
        pages: Math.ceil((count || 0) / limit)
      }
    });
  } catch (error) {
    console.error('Error in GET /notifications/user:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// GET /api/notifications/settings - Obtener configuración de notificaciones
router.get('/settings', async (req, res) => {
  try {
    const userId = req.user.id;

    const { data: settings, error } = await req.supabase
      .from('notification_settings')
      .select('*')
      .eq('user_id', userId)
      .single();

    if (error && error.code !== 'PGRST116') { // PGRST116 es "not found"
      console.error('Error fetching notification settings:', error);
      return res.status(500).json({ error: 'Error fetching notification settings' });
    }

    // Si no existen configuraciones, crear configuraciones por defecto
    if (!settings) {
      const defaultSettings = {
        user_id: userId,
        email_notifications: true,
        sms_notifications: false,
        payment_confirmations: true,
        subscription_renewals: true,
        course_updates: true,
        promotional_offers: false,
        system_announcements: true
      };

      const { data: newSettings, error: createError } = await req.supabase
        .from('notification_settings')
        .insert([defaultSettings])
        .select()
        .single();

      if (createError) {
        console.error('Error creating default notification settings:', createError);
        return res.status(500).json({ error: 'Error creating notification settings' });
      }

      return res.json({ settings: newSettings });
    }

    res.json({ settings });
  } catch (error) {
    console.error('Error in GET /notifications/settings:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// PUT /api/notifications/settings - Actualizar configuración de notificaciones
router.put('/settings', async (req, res) => {
  try {
    const userId = req.user.id;
    const { settings } = req.body;

    if (!settings) {
      return res.status(400).json({ error: 'Settings are required' });
    }

    // Actualizar o crear configuraciones
    const { data: updatedSettings, error } = await req.supabase
      .from('notification_settings')
      .upsert([{ 
        user_id: userId,
        ...settings,
        updated_at: new Date().toISOString()
      }])
      .select()
      .single();

    if (error) {
      console.error('Error updating notification settings:', error);
      return res.status(500).json({ error: 'Error updating notification settings' });
    }

    res.json({ 
      success: true,
      settings: updatedSettings 
    });
  } catch (error) {
    console.error('Error in PUT /notifications/settings:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// PUT /api/notifications/:id/read - Marcar notificación como leída
router.put('/:id/read', async (req, res) => {
  try {
    const userId = req.user.id;
    const notificationId = req.params.id;

    const { data, error } = await req.supabase
      .from('notifications')
      .update({ 
        read: true,
        read_at: new Date().toISOString()
      })
      .eq('id', notificationId)
      .eq('user_id', userId)
      .select()
      .single();

    if (error) {
      console.error('Error marking notification as read:', error);
      return res.status(500).json({ error: 'Error updating notification' });
    }

    if (!data) {
      return res.status(404).json({ error: 'Notification not found' });
    }

    res.json({ success: true, notification: data });
  } catch (error) {
    console.error('Error in PUT /notifications/:id/read:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// PUT /api/notifications/mark-all-read - Marcar todas las notificaciones como leídas
router.put('/mark-all-read', async (req, res) => {
  try {
    const userId = req.user.id;

    const { data, error } = await req.supabase
      .from('notifications')
      .update({ 
        read: true,
        read_at: new Date().toISOString()
      })
      .eq('user_id', userId)
      .eq('read', false);

    if (error) {
      console.error('Error marking all notifications as read:', error);
      return res.status(500).json({ error: 'Error updating notifications' });
    }

    res.json({ 
      success: true,
      updated_count: data?.length || 0
    });
  } catch (error) {
    console.error('Error in PUT /notifications/mark-all-read:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// DELETE /api/notifications/:id - Eliminar notificación
router.delete('/:id', async (req, res) => {
  try {
    const userId = req.user.id;
    const notificationId = req.params.id;

    const { data, error } = await req.supabase
      .from('notifications')
      .delete()
      .eq('id', notificationId)
      .eq('user_id', userId)
      .select()
      .single();

    if (error) {
      console.error('Error deleting notification:', error);
      return res.status(500).json({ error: 'Error deleting notification' });
    }

    if (!data) {
      return res.status(404).json({ error: 'Notification not found' });
    }

    res.json({ success: true });
  } catch (error) {
    console.error('Error in DELETE /notifications/:id:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// POST /api/notifications - Crear nueva notificación (para uso interno)
router.post('/', async (req, res) => {
  try {
    const { user_id, type, title, message, action_url, action_label } = req.body;

    if (!user_id || !type || !title || !message) {
      return res.status(400).json({ 
        error: 'user_id, type, title, and message are required' 
      });
    }

    const { data: notification, error } = await req.supabase
      .from('notifications')
      .insert([{
        user_id,
        type,
        title,
        message,
        action_url,
        action_label,
        read: false,
        created_at: new Date().toISOString()
      }])
      .select()
      .single();

    if (error) {
      console.error('Error creating notification:', error);
      return res.status(500).json({ error: 'Error creating notification' });
    }

    res.status(201).json({ 
      success: true, 
      notification 
    });
  } catch (error) {
    console.error('Error in POST /notifications:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// GET /api/notifications/unread-count - Obtener cantidad de notificaciones sin leer
router.get('/unread-count', async (req, res) => {
  try {
    const userId = req.user.id;

    const { count, error } = await req.supabase
      .from('notifications')
      .select('*', { count: 'exact', head: true })
      .eq('user_id', userId)
      .eq('read', false);

    if (error) {
      console.error('Error fetching unread count:', error);
      return res.status(500).json({ error: 'Error fetching unread count' });
    }

    res.json({ unread_count: count || 0 });
  } catch (error) {
    console.error('Error in GET /notifications/unread-count:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

module.exports = router;