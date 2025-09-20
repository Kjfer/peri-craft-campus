-- Verificar que el trigger process_completed_order funcione correctamente
-- Actualizar el trigger para manejar tanto cursos como suscripciones desde order_items

CREATE OR REPLACE FUNCTION public.process_completed_order()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
AS $function$
DECLARE
    item RECORD;
BEGIN
    -- Solo cuando cambia a 'completed' desde cualquier otro estado
    IF OLD.payment_status != NEW.payment_status AND NEW.payment_status = 'completed' THEN
        
        RAISE LOG 'Processing completed order: % from status % to %', NEW.id, OLD.payment_status, NEW.payment_status;
        
        -- Procesar cada item en order_items
        FOR item IN 
            SELECT * FROM order_items WHERE order_id = NEW.id 
        LOOP
            RAISE LOG 'Processing order item: course_id=%, subscription_id=%', item.course_id, item.subscription_id;
            
            -- CURSO: crear enrollment si course_id existe
            IF item.course_id IS NOT NULL THEN
                INSERT INTO enrollments (user_id, course_id, enrolled_at, progress_percentage)
                VALUES (NEW.user_id, item.course_id, NOW(), 0)
                ON CONFLICT (user_id, course_id) DO NOTHING;
                
                RAISE LOG 'Created enrollment for user % in course %', NEW.user_id, item.course_id;
                
            -- SUSCRIPCIÓN: crear user_subscription si subscription_id existe  
            ELSIF item.subscription_id IS NOT NULL THEN
                -- Obtener duración de la suscripción
                DECLARE
                    sub_duration INTEGER := 1;
                    end_date DATE;
                BEGIN
                    SELECT duration_months INTO sub_duration 
                    FROM subscriptions 
                    WHERE id = item.subscription_id;
                    
                    IF sub_duration IS NULL THEN
                        sub_duration := 1;
                    END IF;
                    
                    end_date := CURRENT_DATE + INTERVAL '1 month' * sub_duration;
                    
                    INSERT INTO user_subscriptions (
                        user_id, plan_id, start_date, end_date, status
                    ) VALUES (
                        NEW.user_id, item.subscription_id, CURRENT_DATE, end_date, 'active'
                    )
                    ON CONFLICT (user_id, plan_id) DO UPDATE SET
                        start_date = CURRENT_DATE,
                        end_date = end_date,
                        status = 'active';
                    
                    RAISE LOG 'Created/updated subscription for user % with plan % until %', NEW.user_id, item.subscription_id, end_date;
                END;
            END IF;
        END LOOP;
        
        RAISE LOG 'Completed processing order %', NEW.id;
    END IF;
    
    RETURN NEW;
END;
$function$;