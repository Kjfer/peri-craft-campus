-- Asegurar que existe el trigger para crear enrollments y payments cuando la orden se completa
DROP TRIGGER IF EXISTS create_enrollments_on_order_completion ON orders;
DROP TRIGGER IF EXISTS create_payment_on_order_completion ON orders;
DROP TRIGGER IF EXISTS process_completed_order_trigger ON orders;

-- Crear trigger unificado para procesar órdenes completadas
CREATE OR REPLACE FUNCTION public.process_completed_order()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
AS $function$
DECLARE
    item RECORD;
    subscription_info RECORD;
    end_date DATE;
BEGIN
    -- Solo cuando cambia a 'completed'
    IF OLD.payment_status != NEW.payment_status AND NEW.payment_status = 'completed' THEN
        
        -- Crear registro en payments
        INSERT INTO payments (
            user_id,
            order_id,
            amount,
            currency,
            payment_method,
            payment_provider,
            payment_provider_id
        ) VALUES (
            NEW.user_id,
            NEW.id,
            NEW.total_amount,
            COALESCE(NEW.currency, 'PEN'),
            COALESCE(NEW.payment_method, 'yape_qr'),
            'yape',
            'VALIDATED-' || NEW.id || '-' || EXTRACT(EPOCH FROM NOW())
        );
        
        FOR item IN SELECT * FROM order_items WHERE order_id = NEW.id LOOP
            
            -- CURSO: crear enrollment
            IF item.course_id IS NOT NULL THEN
                INSERT INTO enrollments (user_id, course_id, enrolled_at, progress_percentage)
                VALUES (NEW.user_id, item.course_id, NOW(), 0)
                ON CONFLICT (user_id, course_id) DO NOTHING;
                
            -- SUSCRIPCIÓN: crear user_subscription
            ELSIF item.subscription_id IS NOT NULL THEN
                SELECT duration_months INTO subscription_info 
                FROM subscriptions 
                WHERE id = item.subscription_id;
                
                end_date := CURRENT_DATE + INTERVAL '1 month' * subscription_info.duration_months;
                
                INSERT INTO user_subscriptions (
                    user_id, plan_id, start_date, end_date, status
                ) VALUES (
                    NEW.user_id, item.subscription_id, CURRENT_DATE, end_date, 'active'
                );
                
            END IF;
        END LOOP;
        
    END IF;
    
    RETURN NEW;
END;
$function$;

-- Crear el trigger
CREATE TRIGGER process_completed_order_trigger
    AFTER UPDATE ON orders
    FOR EACH ROW
    EXECUTE FUNCTION process_completed_order();