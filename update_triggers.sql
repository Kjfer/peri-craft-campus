-- Script: Update existing triggers to support subscriptions
-- Date: 2025-09-19
-- Use this if you already have payment triggers that need updating

BEGIN;

-- 1. Verificar si existe la función anterior y crearla si no existe
DO $$
BEGIN
    -- Eliminar versiones anteriores de los triggers
    DROP TRIGGER IF EXISTS trigger_order_completion ON orders;
    DROP TRIGGER IF EXISTS trigger_payment_completion ON payments;
    DROP TRIGGER IF EXISTS trigger_subscription_status_change ON user_subscriptions;
    
    -- Eliminar funciones anteriores
    DROP FUNCTION IF EXISTS create_payment_and_enrollments_on_completion() CASCADE;
    DROP FUNCTION IF EXISTS process_direct_payment_completion() CASCADE;
    DROP FUNCTION IF EXISTS handle_subscription_renewal() CASCADE;
    
    RAISE NOTICE 'Cleaned up existing triggers and functions';
EXCEPTION
    WHEN OTHERS THEN
        RAISE NOTICE 'Some triggers or functions did not exist, continuing...';
END $$;

-- 2. Verificar estructura necesaria
DO $$
BEGIN
    -- Verificar que order_items tenga subscription_id
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'order_items' AND column_name = 'subscription_id'
    ) THEN
        RAISE EXCEPTION 'order_items table does not have subscription_id column. Run the table migration first.';
    END IF;
    
    -- Verificar que user_subscriptions existe
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.tables 
        WHERE table_name = 'user_subscriptions'
    ) THEN
        RAISE EXCEPTION 'user_subscriptions table does not exist. Create it first.';
    END IF;
    
    RAISE NOTICE 'Database structure verification passed';
END $$;

-- 3. Ahora ejecutar el script principal
\i 20250919000001_create_payment_triggers.sql

COMMIT;

-- 4. Verificar que los triggers se crearon correctamente
SELECT 
    trigger_name, 
    event_manipulation, 
    event_object_table,
    action_statement
FROM information_schema.triggers 
WHERE trigger_name IN (
    'trigger_order_completion',
    'trigger_payment_completion', 
    'trigger_subscription_status_change'
)
ORDER BY event_object_table, trigger_name;