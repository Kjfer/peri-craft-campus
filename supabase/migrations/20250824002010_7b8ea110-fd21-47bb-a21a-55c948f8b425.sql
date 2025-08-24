-- Modificar el campo category para soportar múltiples categorías
ALTER TABLE public.courses ALTER COLUMN category TYPE text[] USING ARRAY[category];

-- Actualizar el comentario de la columna para reflejar el cambio
COMMENT ON COLUMN public.courses.category IS 'Array of categories for the course';