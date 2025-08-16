-- Agregar columna discounted_price a la tabla courses
ALTER TABLE public.courses 
ADD COLUMN discounted_price DECIMAL(10,2) DEFAULT NULL;

-- Comentario: Esta columna almacenará el precio con descuento del curso
-- NULL significa que no hay descuento aplicado
-- Si tiene valor, será el precio de oferta del curso
