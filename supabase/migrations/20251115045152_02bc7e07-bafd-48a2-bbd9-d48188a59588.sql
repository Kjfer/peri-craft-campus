-- Asegurar que la tabla orders tenga REPLICA IDENTITY FULL para Supabase Realtime
-- Esto permite que los eventos UPDATE incluyan todos los datos de la fila
ALTER TABLE public.orders REPLICA IDENTITY FULL;

-- Asegurar que la tabla orders esté publicada en la publicación de realtime
-- Verificar primero si ya está
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM pg_publication_tables
    WHERE pubname = 'supabase_realtime'
    AND schemaname = 'public'
    AND tablename = 'orders'
  ) THEN
    ALTER PUBLICATION supabase_realtime ADD TABLE public.orders;
  END IF;
END $$;