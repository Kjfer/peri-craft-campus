-- Eliminar funciones duplicadas que crean registros en payments
-- Solo mantener process_completed_order() que hace todo el procesamiento

-- Primero eliminar cualquier trigger que use las funciones duplicadas
DROP TRIGGER IF EXISTS trigger_order_completion ON orders;
DROP TRIGGER IF EXISTS trigger_payment_completion ON orders;
DROP TRIGGER IF EXISTS trigger_create_payment_on_completion ON orders;
DROP TRIGGER IF EXISTS trigger_create_enrollments_on_completion ON orders;

-- Eliminar las funciones duplicadas
DROP FUNCTION IF EXISTS create_payment_on_order_completion() CASCADE;
DROP FUNCTION IF EXISTS create_enrollments_on_order_completion() CASCADE;

-- Verificar que el trigger principal existe
CREATE OR REPLACE TRIGGER trigger_process_completed_order
    AFTER UPDATE ON orders
    FOR EACH ROW
    EXECUTE FUNCTION process_completed_order();

-- Verificar triggers activos
SELECT 
    trigger_name,
    event_manipulation,
    event_object_table,
    action_timing,
    action_statement
FROM information_schema.triggers 
WHERE event_object_table = 'orders'
ORDER BY trigger_name;