-- Crear trigger para procesar órdenes completadas automáticamente
-- Este trigger ejecuta la función process_completed_order cuando se actualiza una orden

CREATE TRIGGER trigger_process_completed_order
    AFTER UPDATE ON orders
    FOR EACH ROW
    EXECUTE FUNCTION process_completed_order();

-- Verificar que el trigger se creó correctamente
SELECT 
    trigger_name,
    event_manipulation,
    event_object_table,
    action_timing
FROM information_schema.triggers 
WHERE trigger_name = 'trigger_process_completed_order';