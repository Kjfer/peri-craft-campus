-- Create modules table
CREATE TABLE public.modules (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  course_id UUID NOT NULL REFERENCES public.courses(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  description TEXT,
  order_number INTEGER NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS for modules
ALTER TABLE public.modules ENABLE ROW LEVEL SECURITY;

-- Create policies for modules
CREATE POLICY "Modules are viewable by enrolled users" 
ON public.modules 
FOR SELECT 
USING (
  EXISTS (
    SELECT 1 FROM enrollments 
    WHERE enrollments.user_id = auth.uid() 
    AND enrollments.course_id = modules.course_id
  ) 
  OR EXISTS (
    SELECT 1 FROM profiles 
    WHERE profiles.user_id = auth.uid() 
    AND profiles.role = 'admin'
  )
);

CREATE POLICY "Admins can manage modules" 
ON public.modules 
FOR ALL 
USING (
  EXISTS (
    SELECT 1 FROM profiles 
    WHERE profiles.user_id = auth.uid() 
    AND profiles.role = 'admin'
  )
);

-- Add module_id to lessons table
ALTER TABLE public.lessons ADD COLUMN module_id UUID REFERENCES public.modules(id) ON DELETE CASCADE;

-- Create trigger for modules updated_at
CREATE TRIGGER update_modules_updated_at
BEFORE UPDATE ON public.modules
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();

-- Create storage bucket for lesson videos
INSERT INTO storage.buckets (id, name, public) VALUES ('lesson-videos', 'lesson-videos', false);

-- Create storage policies for videos
CREATE POLICY "Admins can upload lesson videos" 
ON storage.objects 
FOR INSERT 
WITH CHECK (
  bucket_id = 'lesson-videos' 
  AND EXISTS (
    SELECT 1 FROM profiles 
    WHERE profiles.user_id = auth.uid() 
    AND profiles.role = 'admin'
  )
);

CREATE POLICY "Enrolled users can view lesson videos" 
ON storage.objects 
FOR SELECT 
USING (
  bucket_id = 'lesson-videos' 
  AND (
    EXISTS (
      SELECT 1 FROM lessons l
      JOIN modules m ON l.module_id = m.id
      JOIN enrollments e ON e.course_id = m.course_id
      WHERE e.user_id = auth.uid()
      AND storage.foldername(name)[1] = l.id::text
    )
    OR EXISTS (
      SELECT 1 FROM profiles 
      WHERE profiles.user_id = auth.uid() 
      AND profiles.role = 'admin'
    )
  )
);

CREATE POLICY "Admins can manage lesson videos" 
ON storage.objects 
FOR ALL 
USING (
  bucket_id = 'lesson-videos' 
  AND EXISTS (
    SELECT 1 FROM profiles 
    WHERE profiles.user_id = auth.uid() 
    AND profiles.role = 'admin'
  )
);