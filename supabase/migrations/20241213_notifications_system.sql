-- Crear tabla de notificaciones
CREATE TABLE IF NOT EXISTS notifications (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    type VARCHAR(50) NOT NULL, -- 'payment', 'subscription', 'course', 'system', 'promotional'
    title VARCHAR(255) NOT NULL,
    message TEXT NOT NULL,
    action_url TEXT,
    action_label VARCHAR(100),
    read BOOLEAN DEFAULT FALSE,
    read_at TIMESTAMP WITH TIME ZONE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Crear tabla de configuración de notificaciones
CREATE TABLE IF NOT EXISTS notification_settings (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    email_notifications BOOLEAN DEFAULT TRUE,
    sms_notifications BOOLEAN DEFAULT FALSE,
    payment_confirmations BOOLEAN DEFAULT TRUE,
    subscription_renewals BOOLEAN DEFAULT TRUE,
    course_updates BOOLEAN DEFAULT TRUE,
    promotional_offers BOOLEAN DEFAULT FALSE,
    system_announcements BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Crear índices para optimizar consultas
CREATE INDEX IF NOT EXISTS idx_notifications_user_id ON notifications(user_id);
CREATE INDEX IF NOT EXISTS idx_notifications_user_read ON notifications(user_id, read);
CREATE INDEX IF NOT EXISTS idx_notifications_created_at ON notifications(created_at DESC);
CREATE UNIQUE INDEX IF NOT EXISTS idx_notification_settings_user_id ON notification_settings(user_id);

-- Trigger para actualizar updated_at en notifications
CREATE OR REPLACE FUNCTION update_notifications_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_update_notifications_updated_at
    BEFORE UPDATE ON notifications
    FOR EACH ROW
    EXECUTE FUNCTION update_notifications_updated_at();

-- Trigger para actualizar updated_at en notification_settings
CREATE OR REPLACE FUNCTION update_notification_settings_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_update_notification_settings_updated_at
    BEFORE UPDATE ON notification_settings
    FOR EACH ROW
    EXECUTE FUNCTION update_notification_settings_updated_at();

-- Función para crear notificación automáticamente
CREATE OR REPLACE FUNCTION create_notification(
    p_user_id UUID,
    p_type VARCHAR,
    p_title VARCHAR,
    p_message TEXT,
    p_action_url TEXT DEFAULT NULL,
    p_action_label VARCHAR DEFAULT NULL
)
RETURNS UUID AS $$
DECLARE
    notification_id UUID;
    user_settings RECORD;
BEGIN
    -- Obtener configuraciones del usuario
    SELECT * INTO user_settings 
    FROM notification_settings 
    WHERE user_id = p_user_id;

    -- Si no hay configuraciones, crear por defecto
    IF user_settings IS NULL THEN
        INSERT INTO notification_settings (user_id)
        VALUES (p_user_id)
        RETURNING * INTO user_settings;
    END IF;

    -- Verificar si el usuario quiere recibir este tipo de notificación
    CASE p_type
        WHEN 'payment' THEN
            IF NOT user_settings.payment_confirmations THEN
                RETURN NULL;
            END IF;
        WHEN 'subscription' THEN
            IF NOT user_settings.subscription_renewals THEN
                RETURN NULL;
            END IF;
        WHEN 'course' THEN
            IF NOT user_settings.course_updates THEN
                RETURN NULL;
            END IF;
        WHEN 'promotional' THEN
            IF NOT user_settings.promotional_offers THEN
                RETURN NULL;
            END IF;
        WHEN 'system' THEN
            IF NOT user_settings.system_announcements THEN
                RETURN NULL;
            END IF;
    END CASE;

    -- Crear la notificación
    INSERT INTO notifications (user_id, type, title, message, action_url, action_label)
    VALUES (p_user_id, p_type, p_title, p_message, p_action_url, p_action_label)
    RETURNING id INTO notification_id;

    RETURN notification_id;
END;
$$ LANGUAGE plpgsql;

-- Trigger para notificaciones automáticas de pagos
CREATE OR REPLACE FUNCTION trigger_payment_notification()
RETURNS TRIGGER AS $$
DECLARE
    order_record RECORD;
    subscription_record RECORD;
BEGIN
    -- Solo procesar cuando el estado cambia a 'completed'
    IF NEW.status = 'completed' AND OLD.status != 'completed' THEN
        -- Obtener información de la orden
        SELECT * INTO order_record 
        FROM orders 
        WHERE id = NEW.order_id;

        IF order_record IS NOT NULL THEN
            -- Notificación de confirmación de pago
            PERFORM create_notification(
                order_record.user_id,
                'payment',
                'Pago confirmado ✅',
                'Tu pago de $' || order_record.total || ' ha sido procesado exitosamente. Ya puedes acceder a tu contenido.',
                '/ordenes',
                'Ver orden'
            );

            -- Si es una suscripción, crear notificación específica
            SELECT * INTO subscription_record 
            FROM user_subscriptions 
            WHERE order_id = NEW.order_id;

            IF subscription_record IS NOT NULL THEN
                PERFORM create_notification(
                    order_record.user_id,
                    'subscription',
                    'Suscripción activada 🎉',
                    'Tu suscripción al plan ' || subscription_record.plan_name || ' está ahora activa. ¡Disfruta de todo el contenido premium!',
                    '/my-subscriptions',
                    'Ver suscripciones'
                );
            END IF;
        END IF;
    END IF;

    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Crear trigger para notificaciones de pago
DROP TRIGGER IF EXISTS trigger_payment_notification ON payments;
CREATE TRIGGER trigger_payment_notification
    AFTER UPDATE ON payments
    FOR EACH ROW
    EXECUTE FUNCTION trigger_payment_notification();

-- Trigger para notificaciones de suscripciones próximas a vencer
CREATE OR REPLACE FUNCTION trigger_subscription_renewal_reminder()
RETURNS TRIGGER AS $$
BEGIN
    -- Si la suscripción está próxima a vencer (7 días antes)
    IF NEW.current_period_end <= NOW() + INTERVAL '7 days' 
       AND NEW.status = 'active' 
       AND NEW.auto_renew = TRUE THEN
        
        PERFORM create_notification(
            NEW.user_id,
            'subscription',
            'Recordatorio de renovación 🔔',
            'Tu suscripción al plan ' || NEW.plan_name || ' se renovará automáticamente el ' || 
            TO_CHAR(NEW.current_period_end, 'DD/MM/YYYY') || ' por $' || NEW.price || '.',
            '/my-subscriptions',
            'Administrar suscripción'
        );
    END IF;

    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Crear trigger para recordatorios de renovación (se ejecutará manualmente o con cron job)
-- CREATE TRIGGER trigger_subscription_renewal_reminder
--     AFTER UPDATE ON user_subscriptions
--     FOR each ROW
--     EXECUTE FUNCTION trigger_subscription_renewal_reminder();

-- Función para enviar recordatorios de renovación (para ejecutar manualmente)
CREATE OR REPLACE FUNCTION send_renewal_reminders()
RETURNS INTEGER AS $$
DECLARE
    subscription_record RECORD;
    notification_count INTEGER := 0;
BEGIN
    FOR subscription_record IN 
        SELECT * FROM user_subscriptions 
        WHERE status = 'active' 
        AND auto_renew = TRUE 
        AND current_period_end <= NOW() + INTERVAL '7 days'
        AND current_period_end > NOW()
    LOOP
        PERFORM create_notification(
            subscription_record.user_id,
            'subscription',
            'Recordatorio de renovación 🔔',
            'Tu suscripción al plan ' || subscription_record.plan_name || ' se renovará automáticamente el ' || 
            TO_CHAR(subscription_record.current_period_end, 'DD/MM/YYYY') || ' por $' || subscription_record.price || '.',
            '/my-subscriptions',
            'Administrar suscripción'
        );
        notification_count := notification_count + 1;
    END LOOP;

    RETURN notification_count;
END;
$$ LANGUAGE plpgsql;

-- Función para limpiar notificaciones antiguas (más de 90 días)
CREATE OR REPLACE FUNCTION cleanup_old_notifications()
RETURNS INTEGER AS $$
DECLARE
    deleted_count INTEGER;
BEGIN
    DELETE FROM notifications 
    WHERE created_at < NOW() - INTERVAL '90 days'
    AND read = TRUE;
    
    GET DIAGNOSTICS deleted_count = ROW_COUNT;
    RETURN deleted_count;
END;
$$ LANGUAGE plpgsql;

-- Habilitar RLS para las tablas
ALTER TABLE notifications ENABLE ROW LEVEL SECURITY;
ALTER TABLE notification_settings ENABLE ROW LEVEL SECURITY;

-- Políticas RLS para notifications
CREATE POLICY "Users can view their own notifications" ON notifications
    FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can update their own notifications" ON notifications
    FOR UPDATE USING (auth.uid() = user_id);

CREATE POLICY "Users can delete their own notifications" ON notifications
    FOR DELETE USING (auth.uid() = user_id);

-- Política para crear notificaciones (solo sistema)
CREATE POLICY "System can create notifications" ON notifications
    FOR INSERT WITH CHECK (true);

-- Políticas RLS para notification_settings
CREATE POLICY "Users can view their own notification settings" ON notification_settings
    FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can update their own notification settings" ON notification_settings
    FOR UPDATE USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own notification settings" ON notification_settings
    FOR INSERT WITH CHECK (auth.uid() = user_id);

-- Comentarios de documentación
COMMENT ON TABLE notifications IS 'Tabla para almacenar todas las notificaciones de usuarios';
COMMENT ON TABLE notification_settings IS 'Configuraciones de preferencias de notificación por usuario';
COMMENT ON FUNCTION create_notification IS 'Función para crear notificaciones respetando las preferencias del usuario';
COMMENT ON FUNCTION send_renewal_reminders IS 'Función para enviar recordatorios de renovación de suscripciones';
COMMENT ON FUNCTION cleanup_old_notifications IS 'Función para limpiar notificaciones antiguas y leídas';