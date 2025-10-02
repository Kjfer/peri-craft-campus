-- Migración para corregir las políticas de video y el sistema de almacenamiento
-- Fecha: 2025-10-02

-- Primero, vamos a crear una tabla para relacionar las rutas de video con las lecciones
CREATE TABLE IF NOT EXISTS lesson_video_files (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  lesson_id UUID REFERENCES lessons(id) ON DELETE CASCADE,
  file_path TEXT NOT NULL,
  original_filename TEXT,
  file_size BIGINT,
  mime_type TEXT,
  uploaded_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  created_by UUID REFERENCES auth.users(id)
);

-- Índices para mejorar el rendimiento
CREATE INDEX IF NOT EXISTS idx_lesson_video_files_lesson_id ON lesson_video_files(lesson_id);
CREATE INDEX IF NOT EXISTS idx_lesson_video_files_path ON lesson_video_files(file_path);

-- Políticas para la tabla de archivos de video
ALTER TABLE lesson_video_files ENABLE ROW LEVEL SECURITY;

-- Política para que los admins puedan gestionar todos los archivos
DROP POLICY IF EXISTS "Admins can manage lesson video files" ON lesson_video_files;
CREATE POLICY "Admins can manage lesson video files" ON lesson_video_files FOR ALL USING (
  auth.jwt() ->> 'role' = 'admin' OR 
  auth.jwt() ->> 'role' = 'service_role'
);

-- Política para que usuarios inscritos puedan ver los archivos de sus cursos
DROP POLICY IF EXISTS "Enrolled users can view lesson video files" ON lesson_video_files;
CREATE POLICY "Enrolled users can view lesson video files" ON lesson_video_files FOR SELECT USING (
  EXISTS (
    SELECT 1 FROM lessons l
    JOIN modules m ON l.module_id = m.id
    JOIN enrollments e ON e.course_id = m.course_id
    WHERE e.user_id = auth.uid()
    AND l.id = lesson_video_files.lesson_id
  ) OR
  auth.jwt() ->> 'role' = 'admin' OR
  auth.jwt() ->> 'role' = 'service_role'
);

-- Actualizar políticas de Storage para usar la nueva tabla de relación
DROP POLICY IF EXISTS "Enrolled users can view lesson videos" ON storage.objects;
CREATE POLICY "Enrolled users can view lesson videos" ON storage.objects FOR SELECT USING (
  bucket_id = 'lesson-videos' AND (
    -- Verificar si el usuario tiene acceso a través de la tabla de relación
    EXISTS (
      SELECT 1 FROM lesson_video_files lvf
      JOIN lessons l ON lvf.lesson_id = l.id
      JOIN modules m ON l.module_id = m.id
      JOIN enrollments e ON e.course_id = m.course_id
      WHERE e.user_id = auth.uid()
      AND storage.objects.name = lvf.file_path
    ) OR
    -- También permitir acceso si es una lección gratuita
    EXISTS (
      SELECT 1 FROM lesson_video_files lvf
      JOIN lessons l ON lvf.lesson_id = l.id
      WHERE l.is_free = true
      AND storage.objects.name = lvf.file_path
    ) OR
    -- Administradores y service role
    auth.jwt() ->> 'role' = 'admin' OR
    auth.jwt() ->> 'role' = 'service_role'
  )
);

-- Actualizar política de upload para admins
DROP POLICY IF EXISTS "Admins can upload lesson videos" ON storage.objects;
CREATE POLICY "Admins can upload lesson videos" ON storage.objects FOR INSERT WITH CHECK (
  bucket_id = 'lesson-videos' AND (
    auth.jwt() ->> 'role' = 'admin' OR
    auth.jwt() ->> 'role' = 'service_role'
  )
);

-- Política para administración completa por parte de admins
DROP POLICY IF EXISTS "Admins can manage lesson videos" ON storage.objects;
CREATE POLICY "Admins can manage lesson videos" ON storage.objects FOR ALL USING (
  bucket_id = 'lesson-videos' AND (
    auth.jwt() ->> 'role' = 'admin' OR
    auth.jwt() ->> 'role' = 'service_role'
  )
);

-- Función para limpiar archivos huérfanos
CREATE OR REPLACE FUNCTION cleanup_orphaned_video_files()
RETURNS void AS $$
BEGIN
  -- Eliminar archivos de storage que no tienen relación en lesson_video_files
  DELETE FROM storage.objects 
  WHERE bucket_id = 'lesson-videos' 
  AND name NOT IN (SELECT file_path FROM lesson_video_files);
  
  -- Eliminar registros de lesson_video_files que no existen en storage
  DELETE FROM lesson_video_files 
  WHERE file_path NOT IN (
    SELECT name FROM storage.objects WHERE bucket_id = 'lesson-videos'
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Agregar comentarios para documentación
COMMENT ON TABLE lesson_video_files IS 'Tabla para relacionar archivos de video en Supabase Storage con lecciones específicas';
COMMENT ON FUNCTION cleanup_orphaned_video_files() IS 'Función para limpiar archivos de video huérfanos sin relación con lecciones';