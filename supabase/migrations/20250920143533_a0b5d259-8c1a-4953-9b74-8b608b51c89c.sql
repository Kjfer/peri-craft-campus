-- Eliminar triggers duplicados, mantener solo uno
DROP TRIGGER IF EXISTS process_completed_order_trigger ON orders;
DROP TRIGGER IF EXISTS process_order_completion ON orders;
DROP TRIGGER IF EXISTS trigger_process_completed_order ON orders;

-- Crear un único trigger limpio
CREATE TRIGGER trigger_order_status_change
    AFTER UPDATE ON orders
    FOR EACH ROW
    EXECUTE FUNCTION process_completed_order();

-- Verificar que solo quede un trigger para process_completed_order
SELECT 
    trigger_name,
    event_manipulation,
    event_object_table,
    action_statement
FROM information_schema.triggers 
WHERE event_object_table = 'orders' 
AND action_statement LIKE '%process_completed_order%';