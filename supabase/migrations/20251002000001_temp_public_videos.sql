-- Solución temporal: hacer el bucket lesson-videos público para pruebas
-- Fecha: 2025-10-02

-- Cambiar el bucket a público temporalmente
UPDATE storage.buckets 
SET public = true 
WHERE id = 'lesson-videos';

-- Eliminar políticas restrictivas temporalmente
DROP POLICY IF EXISTS "Enrolled users can view lesson videos" ON storage.objects;
DROP POLICY IF EXISTS "Admins can upload lesson videos" ON storage.objects;
DROP POLICY IF EXISTS "Admins can manage lesson videos" ON storage.objects;

-- Política simple: cualquier usuario autenticado puede ver videos
CREATE POLICY "Authenticated users can view lesson videos" ON storage.objects FOR SELECT USING (
  bucket_id = 'lesson-videos' AND auth.role() = 'authenticated'
);

-- Solo admins pueden subir y gestionar videos
CREATE POLICY "Admins can upload lesson videos" ON storage.objects FOR INSERT WITH CHECK (
  bucket_id = 'lesson-videos' AND (
    auth.jwt() ->> 'role' = 'admin' OR
    auth.jwt() ->> 'role' = 'service_role'
  )
);

CREATE POLICY "Admins can manage lesson videos" ON storage.objects FOR ALL USING (
  bucket_id = 'lesson-videos' AND (
    auth.jwt() ->> 'role' = 'admin' OR
    auth.jwt() ->> 'role' = 'service_role'
  )
);

-- Comentario explicativo
COMMENT ON TABLE storage.objects IS 'Bucket lesson-videos configurado temporalmente como público para pruebas de video';