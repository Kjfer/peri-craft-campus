-- Agregar columna teaching_method
ALTER TABLE public.courses 
ADD COLUMN IF NOT EXISTS teaching_method TEXT;

-- Convertir target_audience de TEXT a TEXT[]
-- Primero, crear una nueva columna temporal
ALTER TABLE public.courses 
ADD COLUMN IF NOT EXISTS target_audience_new TEXT[];

-- Migrar datos existentes: si target_audience tiene datos, convertirlos a array
UPDATE public.courses
SET target_audience_new = ARRAY[target_audience]::TEXT[]
WHERE target_audience IS NOT NULL AND target_audience != '';

-- Eliminar la columna antigua
ALTER TABLE public.courses 
DROP COLUMN IF EXISTS target_audience;

-- Renombrar la nueva columna
ALTER TABLE public.courses 
RENAME COLUMN target_audience_new TO target_audience;

-- Comentar la tabla con la descripción de los nuevos campos
COMMENT ON COLUMN public.courses.teaching_method IS 'Método de enseñanza utilizado en el curso';
COMMENT ON COLUMN public.courses.target_audience IS 'Array de strings describiendo el público objetivo (cada elemento se muestra con viñeta)';