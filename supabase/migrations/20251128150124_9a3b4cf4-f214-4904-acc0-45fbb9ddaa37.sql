-- Permitir lectura pública de admin_settings para que el video tutorial sea visible
CREATE POLICY "Public can read admin settings"
ON admin_settings
FOR SELECT
TO public
USING (true);