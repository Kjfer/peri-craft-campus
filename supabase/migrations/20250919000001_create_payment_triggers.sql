-- Migration: Create triggers for automatic payment processing and enrollment
-- Date: 2025-09-19
-- Description: Triggers que manejan pagos completados para cursos y suscripciones

BEGIN;

-- 1. Función para procesar pagos completados y crear enrollments/subscriptions
CREATE OR REPLACE FUNCTION create_payment_and_enrollments_on_completion()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    item_record RECORD;
    payment_record_id UUID;
BEGIN
    -- Solo procesar cuando el estado cambia a 'completed'
    IF OLD.payment_status IS DISTINCT FROM NEW.payment_status AND NEW.payment_status = 'completed' THEN
        
        -- Crear registro de pago
        INSERT INTO payments (
            user_id,
            order_id,
            amount,
            currency,
            payment_method,
            payment_status,
            external_payment_id,
            created_at,
            updated_at
        ) VALUES (
            NEW.user_id,
            NEW.id,
            NEW.total_amount,
            NEW.currency,
            NEW.payment_method,
            'completed',
            NEW.payment_id,
            NOW(),
            NOW()
        ) RETURNING id INTO payment_record_id;

        -- Procesar cada item de la orden
        FOR item_record IN 
            SELECT * FROM order_items WHERE order_id = NEW.id
        LOOP
            -- Si es un curso, crear enrollment
            IF item_record.course_id IS NOT NULL THEN
                INSERT INTO enrollments (
                    user_id,
                    course_id,
                    enrolled_at,
                    progress_percentage
                ) VALUES (
                    NEW.user_id,
                    item_record.course_id,
                    NOW(),
                    0
                ) ON CONFLICT (user_id, course_id) DO NOTHING;
                
                RAISE LOG 'Created enrollment for user % in course %', NEW.user_id, item_record.course_id;
            
            -- Si es una suscripción, crear user_subscription
            ELSIF item_record.subscription_id IS NOT NULL THEN
                DECLARE
                    subscription_data RECORD;
                    start_date DATE;
                    end_date DATE;
                BEGIN
                    -- Obtener datos de la suscripción
                    SELECT * INTO subscription_data 
                    FROM subscriptions 
                    WHERE id = item_record.subscription_id;
                    
                    -- Calcular fechas
                    start_date := CURRENT_DATE;
                    end_date := start_date + INTERVAL '1 month' * subscription_data.duration_months;
                    
                    -- Crear suscripción de usuario
                    INSERT INTO user_subscriptions (
                        user_id,
                        plan_id,
                        payment_id,
                        start_date,
                        end_date,
                        status,
                        created_at,
                        updated_at
                    ) VALUES (
                        NEW.user_id,
                        item_record.subscription_id,
                        payment_record_id,
                        start_date,
                        end_date,
                        'active',
                        NOW(),
                        NOW()
                    );
                    
                    -- Actualizar el payment record con subscription_id
                    UPDATE payments 
                    SET subscription_id = item_record.subscription_id
                    WHERE id = payment_record_id;
                    
                    RAISE LOG 'Created subscription for user % with plan % (valid until %)', NEW.user_id, item_record.subscription_id, end_date;
                END;
            END IF;
        END LOOP;

        RAISE LOG 'Order % completed - Created payment record % and processed % items', NEW.id, payment_record_id, (SELECT COUNT(*) FROM order_items WHERE order_id = NEW.id);
    END IF;

    RETURN NEW;
END;
$$;

-- 2. Crear el trigger en la tabla orders
DROP TRIGGER IF EXISTS trigger_order_completion ON orders;

CREATE TRIGGER trigger_order_completion
    AFTER UPDATE ON orders
    FOR EACH ROW
    EXECUTE FUNCTION create_payment_and_enrollments_on_completion();

-- 3. Función para procesar pagos directos (cuando se actualiza payments directamente)
CREATE OR REPLACE FUNCTION process_direct_payment_completion()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    order_record RECORD;
    item_record RECORD;
BEGIN
    -- Solo procesar cuando el estado cambia a 'completed'
    IF OLD.payment_status IS DISTINCT FROM NEW.payment_status AND NEW.payment_status = 'completed' THEN
        
        -- Si hay order_id, actualizar la orden
        IF NEW.order_id IS NOT NULL THEN
            UPDATE orders 
            SET payment_status = 'completed',
                payment_id = NEW.id,
                updated_at = NOW()
            WHERE id = NEW.order_id;
            
            RAISE LOG 'Updated order % status to completed via payment %', NEW.order_id, NEW.id;
        
        -- Si es pago directo de suscripción (sin orden)
        ELSIF NEW.subscription_id IS NOT NULL THEN
            DECLARE
                subscription_data RECORD;
                start_date DATE;
                end_date DATE;
            BEGIN
                -- Obtener datos de la suscripción
                SELECT * INTO subscription_data 
                FROM subscriptions 
                WHERE id = NEW.subscription_id;
                
                -- Calcular fechas
                start_date := CURRENT_DATE;
                end_date := start_date + INTERVAL '1 month' * subscription_data.duration_months;
                
                -- Crear suscripción de usuario
                INSERT INTO user_subscriptions (
                    user_id,
                    plan_id,
                    payment_id,
                    start_date,
                    end_date,
                    status,
                    created_at,
                    updated_at
                ) VALUES (
                    NEW.user_id,
                    NEW.subscription_id,
                    NEW.id,
                    start_date,
                    end_date,
                    'active',
                    NOW(),
                    NOW()
                ) ON CONFLICT (user_id, plan_id, start_date) DO NOTHING;
                
                RAISE LOG 'Created direct subscription for user % with plan % (valid until %)', NEW.user_id, NEW.subscription_id, end_date;
            END;
        END IF;
    END IF;

    RETURN NEW;
END;
$$;

-- 4. Crear el trigger en la tabla payments
DROP TRIGGER IF EXISTS trigger_payment_completion ON payments;

CREATE TRIGGER trigger_payment_completion
    AFTER UPDATE ON payments
    FOR EACH ROW
    EXECUTE FUNCTION process_direct_payment_completion();

-- 5. Función para manejar renovaciones automáticas (opcional)
CREATE OR REPLACE FUNCTION handle_subscription_renewal()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
    -- Lógica futura para renovaciones automáticas
    -- Por ahora solo log
    RAISE LOG 'Subscription % status changed to %', NEW.id, NEW.status;
    RETURN NEW;
END;
$$;

-- 6. Trigger para renovaciones (preparado para futuro)
DROP TRIGGER IF EXISTS trigger_subscription_status_change ON user_subscriptions;

CREATE TRIGGER trigger_subscription_status_change
    AFTER UPDATE ON user_subscriptions
    FOR EACH ROW
    WHEN (OLD.status IS DISTINCT FROM NEW.status)
    EXECUTE FUNCTION handle_subscription_renewal();

-- 7. Comentarios para documentación
COMMENT ON FUNCTION create_payment_and_enrollments_on_completion() IS 'Procesa órdenes completadas creando pagos y enrollments/subscriptions automáticamente';
COMMENT ON FUNCTION process_direct_payment_completion() IS 'Procesa pagos directos y actualiza órdenes o crea suscripciones';
COMMENT ON FUNCTION handle_subscription_renewal() IS 'Maneja cambios de estado en suscripciones para futuras renovaciones';

COMMIT;