-- Agregar campo para enlace externo de compra en cursos
ALTER TABLE public.courses 
ADD COLUMN IF NOT EXISTS external_purchase_url text;

-- Hacer video_url opcional en lessons (ya que no se subirán más videos)
ALTER TABLE public.lessons 
ALTER COLUMN video_url DROP NOT NULL;

COMMENT ON COLUMN public.courses.external_purchase_url IS 'URL externa de Hotmart para comprar el curso';
COMMENT ON COLUMN public.lessons.video_url IS 'URL del video (opcional, solo para referencia)';
