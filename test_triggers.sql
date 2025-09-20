-- Test script for payment triggers with subscriptions
-- Run this after creating the triggers to verify they work

BEGIN;

-- 1. Crear datos de prueba
DO $$
DECLARE
    test_user_id UUID := gen_random_uuid();
    test_course_id UUID := gen_random_uuid();
    test_subscription_id UUID := gen_random_uuid();
    test_order_id UUID := gen_random_uuid();
BEGIN
    RAISE NOTICE 'Creating test data...';
    
    -- Crear usuario de prueba
    INSERT INTO auth.users (id, email) VALUES (test_user_id, 'test@example.com');
    
    -- Crear curso de prueba
    INSERT INTO courses (id, title, price, instructor_name, status) 
    VALUES (test_course_id, 'Test Course', 99.99, 'Test Instructor', 'published');
    
    -- Crear suscripción de prueba
    INSERT INTO subscriptions (id, name, description, price, duration_months, is_active)
    VALUES (test_subscription_id, 'Test Plan', 'Test subscription', 29.99, 1, true);
    
    -- TEST 1: Orden con curso
    RAISE NOTICE 'TEST 1: Testing course enrollment trigger...';
    
    INSERT INTO orders (id, user_id, total_amount, currency, payment_status, payment_method)
    VALUES (test_order_id, test_user_id, 99.99, 'USD', 'pending', 'paypal');
    
    INSERT INTO order_items (order_id, course_id, price)
    VALUES (test_order_id, test_course_id, 99.99);
    
    -- Simular completar el pago
    UPDATE orders SET payment_status = 'completed' WHERE id = test_order_id;
    
    -- Verificar que se creó el enrollment
    IF EXISTS (SELECT 1 FROM enrollments WHERE user_id = test_user_id AND course_id = test_course_id) THEN
        RAISE NOTICE '✅ Course enrollment trigger works correctly';
    ELSE
        RAISE EXCEPTION '❌ Course enrollment trigger failed';
    END IF;
    
    -- TEST 2: Orden con suscripción
    RAISE NOTICE 'TEST 2: Testing subscription creation trigger...';
    
    DECLARE
        test_order_id_2 UUID := gen_random_uuid();
    BEGIN
        INSERT INTO orders (id, user_id, total_amount, currency, payment_status, payment_method)
        VALUES (test_order_id_2, test_user_id, 29.99, 'USD', 'pending', 'googlepay');
        
        INSERT INTO order_items (order_id, subscription_id, price)
        VALUES (test_order_id_2, test_subscription_id, 29.99);
        
        -- Simular completar el pago
        UPDATE orders SET payment_status = 'completed' WHERE id = test_order_id_2;
        
        -- Verificar que se creó la suscripción
        IF EXISTS (SELECT 1 FROM user_subscriptions WHERE user_id = test_user_id AND plan_id = test_subscription_id) THEN
            RAISE NOTICE '✅ Subscription creation trigger works correctly';
        ELSE
            RAISE EXCEPTION '❌ Subscription creation trigger failed';
        END IF;
    END;
    
    -- TEST 3: Pago directo de suscripción
    RAISE NOTICE 'TEST 3: Testing direct subscription payment trigger...';
    
    DECLARE
        test_payment_id UUID := gen_random_uuid();
        test_user_id_2 UUID := gen_random_uuid();
    BEGIN
        INSERT INTO auth.users (id, email) VALUES (test_user_id_2, 'test2@example.com');
        
        INSERT INTO payments (id, user_id, subscription_id, amount, currency, payment_method, payment_status)
        VALUES (test_payment_id, test_user_id_2, test_subscription_id, 29.99, 'USD', 'yape_qr', 'pending');
        
        -- Simular completar el pago directo
        UPDATE payments SET payment_status = 'completed' WHERE id = test_payment_id;
        
        -- Verificar que se creó la suscripción
        IF EXISTS (SELECT 1 FROM user_subscriptions WHERE user_id = test_user_id_2 AND plan_id = test_subscription_id) THEN
            RAISE NOTICE '✅ Direct subscription payment trigger works correctly';
        ELSE
            RAISE EXCEPTION '❌ Direct subscription payment trigger failed';
        END IF;
    END;
    
    RAISE NOTICE '🎉 All trigger tests passed successfully!';
    
END $$;

ROLLBACK; -- Deshacer los datos de prueba