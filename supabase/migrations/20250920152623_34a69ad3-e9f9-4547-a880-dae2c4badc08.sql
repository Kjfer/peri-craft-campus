-- Limpiar payments duplicados, mantener solo el más reciente por orden
DELETE FROM payments 
WHERE id IN (
  SELECT p1.id 
  FROM payments p1
  INNER JOIN payments p2 ON p1.order_id = p2.order_id
  WHERE p1.created_at < p2.created_at
);

-- Verificar que no haya más duplicados
SELECT 
  order_id,
  COUNT(*) as payment_count
FROM payments 
GROUP BY order_id
HAVING COUNT(*) > 1;