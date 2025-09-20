-- Trigger simplificado para suscripciones
-- Solo copia y pega este código en SQL Editor

BEGIN;

-- 1. Función principal para cuando se completa una orden
CREATE OR REPLACE FUNCTION process_completed_order()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    item RECORD;
    subscription_info RECORD;
    end_date DATE;
BEGIN
    -- Solo cuando cambia a 'completed'
    IF OLD.payment_status != NEW.payment_status AND NEW.payment_status = 'completed' THEN
        
        -- Procesar cada item de la orden
        FOR item IN SELECT * FROM order_items WHERE order_id = NEW.id LOOP
            
            -- Si es un CURSO: crear enrollment
            IF item.course_id IS NOT NULL THEN
                INSERT INTO enrollments (user_id, course_id, enrolled_at, progress_percentage)
                VALUES (NEW.user_id, item.course_id, NOW(), 0)
                ON CONFLICT (user_id, course_id) DO NOTHING;
                
            -- Si es una SUSCRIPCIÓN: crear user_subscription
            ELSIF item.subscription_id IS NOT NULL THEN
                -- Obtener duración de la suscripción
                SELECT duration_months INTO subscription_info 
                FROM subscriptions 
                WHERE id = item.subscription_id;
                
                -- Calcular fecha de fin
                end_date := CURRENT_DATE + INTERVAL '1 month' * subscription_info.duration_months;
                
                -- Crear suscripción activa
                INSERT INTO user_subscriptions (
                    user_id,
                    plan_id,
                    start_date,
                    end_date,
                    status
                ) VALUES (
                    NEW.user_id,
                    item.subscription_id,
                    CURRENT_DATE,
                    end_date,
                    'active'
                );
                
            END IF;
        END LOOP;
        
    END IF;
    
    RETURN NEW;
END;
$$;

-- 2. Crear el trigger
DROP TRIGGER IF EXISTS process_order_completion ON orders;

CREATE TRIGGER process_order_completion
    AFTER UPDATE ON orders
    FOR EACH ROW
    EXECUTE FUNCTION process_completed_order();

-- 3. Verificar que se creó
SELECT 'Trigger created successfully!' as status;

COMMIT;