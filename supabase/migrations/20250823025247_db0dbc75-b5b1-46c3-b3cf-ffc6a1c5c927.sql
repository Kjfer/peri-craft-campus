-- Phase 1: Critical Security Fixes

-- 1. Fix plan_courses RLS policy - restrict public access to business strategy data
DROP POLICY IF EXISTS "plan_courses_public_view" ON public.plan_courses;

CREATE POLICY "plan_courses_authenticated_view" 
ON public.plan_courses 
FOR SELECT 
USING (auth.role() = 'authenticated');

-- 2. Add role escalation prevention trigger
CREATE OR REPLACE FUNCTION public.prevent_role_escalation()
RETURNS TRIGGER AS $$
BEGIN
  IF TG_OP = 'UPDATE' THEN
    -- Block non-admins from changing roles
    IF NEW.role IS DISTINCT FROM OLD.role THEN
      IF NOT EXISTS (
        SELECT 1 FROM public.profiles p
        WHERE p.user_id = auth.uid() AND p.role = 'admin'::user_role
      ) THEN
        RAISE EXCEPTION 'Only admins can change user roles';
      END IF;
    END IF;
    RETURN NEW;
  ELSIF TG_OP = 'INSERT' THEN
    -- Force default student role on insert for non-admins
    IF NEW.role IS DISTINCT FROM 'student'::user_role THEN
      IF NOT EXISTS (
        SELECT 1 FROM public.profiles p
        WHERE p.user_id = auth.uid() AND p.role = 'admin'::user_role
      ) THEN
        NEW.role := 'student'::user_role;
      END IF;
    END IF;
    RETURN NEW;
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Apply trigger to profiles table
DROP TRIGGER IF EXISTS prevent_role_escalation_trigger ON public.profiles;
CREATE TRIGGER prevent_role_escalation_trigger
  BEFORE INSERT OR UPDATE ON public.profiles
  FOR EACH ROW
  EXECUTE FUNCTION public.prevent_role_escalation();

-- 3. Add audit logging for role changes
CREATE TABLE IF NOT EXISTS public.role_audit_log (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  changed_by uuid,
  old_role user_role,
  new_role user_role NOT NULL,
  changed_at timestamp with time zone DEFAULT now(),
  reason text
);

-- Enable RLS on audit log
ALTER TABLE public.role_audit_log ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins can view audit log" 
ON public.role_audit_log 
FOR SELECT 
USING (EXISTS (
  SELECT 1 FROM public.profiles 
  WHERE user_id = auth.uid() AND role = 'admin'::user_role
));

-- 4. Create function to log role changes
CREATE OR REPLACE FUNCTION public.log_role_change()
RETURNS TRIGGER AS $$
BEGIN
  IF TG_OP = 'UPDATE' AND OLD.role IS DISTINCT FROM NEW.role THEN
    INSERT INTO public.role_audit_log (user_id, changed_by, old_role, new_role)
    VALUES (NEW.user_id, auth.uid(), OLD.role, NEW.role);
  ELSIF TG_OP = 'INSERT' THEN
    INSERT INTO public.role_audit_log (user_id, changed_by, old_role, new_role)
    VALUES (NEW.user_id, auth.uid(), NULL, NEW.role);
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Apply audit trigger
DROP TRIGGER IF EXISTS role_audit_trigger ON public.profiles;
CREATE TRIGGER role_audit_trigger
  AFTER INSERT OR UPDATE ON public.profiles
  FOR EACH ROW
  EXECUTE FUNCTION public.log_role_change();

-- 5. Improve course access security with rate limiting
CREATE TABLE IF NOT EXISTS public.enrollment_attempts (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  course_id uuid NOT NULL,
  attempted_at timestamp with time zone DEFAULT now(),
  ip_address inet,
  success boolean DEFAULT false
);

-- Enable RLS on enrollment attempts
ALTER TABLE public.enrollment_attempts ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view their own enrollment attempts" 
ON public.enrollment_attempts 
FOR SELECT 
USING (auth.uid() = user_id);

CREATE POLICY "Users can create enrollment attempts" 
ON public.enrollment_attempts 
FOR INSERT 
WITH CHECK (auth.uid() = user_id);

-- 6. Add function to check enrollment rate limiting
CREATE OR REPLACE FUNCTION public.check_enrollment_rate_limit(p_user_id uuid, p_course_id uuid)
RETURNS boolean AS $$
DECLARE
  attempt_count integer;
BEGIN
  -- Count attempts in the last hour
  SELECT COUNT(*) INTO attempt_count
  FROM public.enrollment_attempts
  WHERE user_id = p_user_id
    AND course_id = p_course_id
    AND attempted_at > now() - interval '1 hour';
  
  -- Allow max 5 attempts per hour per course
  RETURN attempt_count < 5;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;