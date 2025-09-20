-- TRIGGER SEGURO - Sin operaciones destructivas
-- Versión que no elimina nada existente

BEGIN;

-- 1. Crear función (REPLACE es seguro)
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
    IF OLD.payment_status IS DISTINCT FROM NEW.payment_status AND NEW.payment_status = 'completed' THEN
        
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
$$;

-- 2. Crear trigger solo si no existe
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.triggers 
        WHERE trigger_name = 'process_order_completion' 
        AND event_object_table = 'orders'
    ) THEN
        CREATE TRIGGER process_order_completion
            AFTER UPDATE ON orders
            FOR EACH ROW
            EXECUTE FUNCTION process_completed_order();
        
        RAISE NOTICE 'Trigger process_order_completion created successfully!';
    ELSE
        RAISE NOTICE 'Trigger process_order_completion already exists';
    END IF;
END $$;

-- 3. Verificación
SELECT 
    trigger_name,
    event_object_table,
    action_timing,
    event_manipulation
FROM information_schema.triggers 
WHERE trigger_name = 'process_order_completion';

COMMIT;