-- Fix recursive policy in profiles table
-- Drop the problematic recursive policy
DROP POLICY IF EXISTS "Admins can view all profiles" ON public.profiles;

-- Create a non-recursive policy for admins
-- This policy allows users to view profiles if they have admin role in auth.users metadata
CREATE POLICY "Admins can view all profiles" ON public.profiles FOR SELECT USING (
  auth.jwt() ->> 'role' = 'admin' OR
  (auth.uid() = user_id) OR
  (
    -- Allow service role to bypass RLS
    auth.jwt() ->> 'role' = 'service_role'
  )
);

-- Also fix other policies that might have similar issues
-- Update enrollments admin policy
DROP POLICY IF EXISTS "Admins can view all enrollments" ON public.enrollments;
CREATE POLICY "Admins can view all enrollments" ON public.enrollments FOR SELECT USING (
  auth.uid() = user_id OR
  auth.jwt() ->> 'role' = 'admin' OR
  auth.jwt() ->> 'role' = 'service_role'
);

-- Update payments admin policy
DROP POLICY IF EXISTS "Admins can view all payments" ON public.payments;
CREATE POLICY "Admins can view all payments" ON public.payments FOR SELECT USING (
  auth.uid() = user_id OR
  auth.jwt() ->> 'role' = 'admin' OR
  auth.jwt() ->> 'role' = 'service_role'
);

-- Update courses admin policy
DROP POLICY IF EXISTS "Admins can manage courses" ON public.courses;
CREATE POLICY "Admins can manage courses" ON public.courses FOR ALL USING (
  auth.jwt() ->> 'role' = 'admin' OR
  auth.jwt() ->> 'role' = 'service_role'
);

-- Update certificates admin policy
DROP POLICY IF EXISTS "Admins can manage certificates" ON public.certificates;
CREATE POLICY "Admins can manage certificates" ON public.certificates FOR ALL USING (
  auth.jwt() ->> 'role' = 'admin' OR
  auth.jwt() ->> 'role' = 'service_role'
);

-- Update subscriptions admin policy
DROP POLICY IF EXISTS "Admins can manage subscriptions" ON public.subscriptions;
CREATE POLICY "Admins can manage subscriptions" ON public.subscriptions FOR ALL USING (
  auth.jwt() ->> 'role' = 'admin' OR
  auth.jwt() ->> 'role' = 'service_role'
);

-- Update lessons admin policy
DROP POLICY IF EXISTS "Lessons are viewable by enrolled users" ON public.lessons;
CREATE POLICY "Lessons are viewable by enrolled users" ON public.lessons FOR SELECT USING (
  is_free = true OR 
  EXISTS (SELECT 1 FROM public.enrollments WHERE user_id = auth.uid() AND course_id = lessons.course_id) OR
  auth.jwt() ->> 'role' = 'admin' OR
  auth.jwt() ->> 'role' = 'service_role'
);

-- Update modules policies to avoid recursion
DROP POLICY IF EXISTS "Modules are viewable by enrolled users" ON public.modules;
CREATE POLICY "Modules are viewable by enrolled users" ON public.modules FOR SELECT USING (
  EXISTS (
    SELECT 1 FROM enrollments 
    WHERE enrollments.user_id = auth.uid() 
    AND enrollments.course_id = modules.course_id
  ) OR
  auth.jwt() ->> 'role' = 'admin' OR
  auth.jwt() ->> 'role' = 'service_role'
);

DROP POLICY IF EXISTS "Admins can manage modules" ON public.modules;
CREATE POLICY "Admins can manage modules" ON public.modules FOR ALL USING (
  auth.jwt() ->> 'role' = 'admin' OR
  auth.jwt() ->> 'role' = 'service_role'
);

-- Update storage policies
DROP POLICY IF EXISTS "Admins can upload lesson videos" ON storage.objects;
CREATE POLICY "Admins can upload lesson videos" ON storage.objects FOR INSERT WITH CHECK (
  bucket_id = 'lesson-videos' AND (
    auth.jwt() ->> 'role' = 'admin' OR
    auth.jwt() ->> 'role' = 'service_role'
  )
);

DROP POLICY IF EXISTS "Enrolled users can view lesson videos" ON storage.objects;
CREATE POLICY "Enrolled users can view lesson videos" ON storage.objects FOR SELECT USING (
  bucket_id = 'lesson-videos' AND (
    EXISTS (
      SELECT 1 FROM lessons l
      JOIN modules m ON l.module_id = m.id
      JOIN enrollments e ON e.course_id = m.course_id
      WHERE e.user_id = auth.uid()
      AND name LIKE l.id::text || '/%'
    ) OR
    auth.jwt() ->> 'role' = 'admin' OR
    auth.jwt() ->> 'role' = 'service_role'
  )
);

DROP POLICY IF EXISTS "Admins can manage lesson videos" ON storage.objects;
CREATE POLICY "Admins can manage lesson videos" ON storage.objects FOR ALL USING (
  bucket_id = 'lesson-videos' AND (
    auth.jwt() ->> 'role' = 'admin' OR
    auth.jwt() ->> 'role' = 'service_role'
  )
);

-- Add comment explaining the fix
COMMENT ON POLICY "Admins can view all profiles" ON public.profiles IS 
'Fixed recursive policy by using auth.jwt() role instead of querying profiles table';
