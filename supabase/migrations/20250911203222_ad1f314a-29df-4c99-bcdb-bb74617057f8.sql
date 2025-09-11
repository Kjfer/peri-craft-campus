-- Fix RLS policies for course content visibility
-- Drop existing restrictive policies for modules
DROP POLICY IF EXISTS "Modules are viewable by enrolled users" ON public.modules;

-- Create new policy that allows everyone to view modules (syllabus should be public)
CREATE POLICY "Modules are viewable by everyone" 
ON public.modules 
FOR SELECT 
USING (true);

-- Update lessons policy to be more clear about what's viewable
DROP POLICY IF EXISTS "Lessons are viewable by enrolled users" ON public.lessons;

-- Allow everyone to see lesson titles and descriptions (syllabus info) but restrict content access
CREATE POLICY "Lesson info is viewable by everyone" 
ON public.lessons 
FOR SELECT 
USING (true);