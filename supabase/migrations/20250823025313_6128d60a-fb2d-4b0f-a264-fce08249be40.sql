-- Fix function search path security warnings

-- Update prevent_role_escalation function with proper search_path
CREATE OR REPLACE FUNCTION public.prevent_role_escalation()
RETURNS TRIGGER 
LANGUAGE plpgsql 
SECURITY DEFINER
SET search_path TO 'public'
AS $$
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
$$;

-- Update log_role_change function with proper search_path
CREATE OR REPLACE FUNCTION public.log_role_change()
RETURNS TRIGGER 
LANGUAGE plpgsql 
SECURITY DEFINER
SET search_path TO 'public'
AS $$
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
$$;

-- Update check_enrollment_rate_limit function with proper search_path
CREATE OR REPLACE FUNCTION public.check_enrollment_rate_limit(p_user_id uuid, p_course_id uuid)
RETURNS boolean 
LANGUAGE plpgsql 
SECURITY DEFINER
SET search_path TO 'public'
AS $$
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
$$;