-- Agregar constraint para prevenir duplicados futuros en payments
-- Solo permitir un payment activo por orden
ALTER TABLE payments 
ADD CONSTRAINT unique_payment_per_order 
UNIQUE (order_id, payment_provider);