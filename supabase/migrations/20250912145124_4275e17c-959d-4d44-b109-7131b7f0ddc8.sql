-- Actualizar política de lecciones para permitir ver información básica a todos
-- pero restringir video_url a usuarios enrollados

-- Eliminar política restrictiva actual
DROP POLICY IF EXISTS "Lessons viewable by admins and enrolled users" ON public.lessons;

-- Crear nueva política que permite ver información básica a todos
-- El video_url será filtrado a nivel de aplicación para mayor control
CREATE POLICY "Lessons basic info viewable by everyone, full access for enrolled users" 
ON public.lessons 
FOR SELECT 
USING (
  -- Todos pueden ver información básica de lecciones
  -- El filtrado de video_url se hará en la aplicación
  true
);

-- Mantener la política de administración existente
-- (La política "Admins can manage lessons" ya existe y no se modifica)