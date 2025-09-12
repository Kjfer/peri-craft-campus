-- Fix security issue: Restrict lesson content access to enrolled users only

-- Drop the overly permissive policy
DROP POLICY IF EXISTS "Lesson info is viewable by everyone" ON public.lessons;

-- Create new restrictive policies

-- Allow everyone to see basic lesson info for preview (title, description, duration) but NOT video_url or content
CREATE POLICY "Basic lesson info is viewable by everyone" 
ON public.lessons 
FOR SELECT 
USING (true);

-- However, we need a way to restrict sensitive fields. Since we can't do column-level RLS easily,
-- we'll create a more comprehensive policy that checks enrollment for full access

-- Drop the basic policy and create a comprehensive one
DROP POLICY IF EXISTS "Basic lesson info is viewable by everyone" ON public.lessons;

-- Create policy that allows full access only to admins and enrolled users
CREATE POLICY "Lessons viewable by admins and enrolled users" 
ON public.lessons 
FOR SELECT 
USING (
  -- Admins can see everything
  EXISTS (
    SELECT 1 FROM public.profiles 
    WHERE user_id = auth.uid() AND role = 'admin'
  )
  OR
  -- Enrolled users can see lessons for their enrolled courses
  EXISTS (
    SELECT 1 FROM public.enrollments 
    WHERE user_id = auth.uid() AND course_id = lessons.course_id
  )
  OR
  -- Anyone can see free lessons
  lessons.is_free = true
  OR
  -- Anyone can see lessons for free courses
  EXISTS (
    SELECT 1 FROM public.courses 
    WHERE id = lessons.course_id AND price = 0
  )
);

-- Keep the admin management policy
-- (The existing "Admins can manage lessons" policy remains unchanged)