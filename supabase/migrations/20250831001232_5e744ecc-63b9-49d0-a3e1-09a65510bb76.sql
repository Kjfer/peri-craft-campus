-- Security Enhancement Migration
-- Adds audit logging for role changes and standardizes RLS policies

-- 1. Add reason column to role_audit_log table for better tracking
ALTER TABLE public.role_audit_log 
ADD COLUMN IF NOT EXISTS reason TEXT;

-- 2. Create security_events table for comprehensive audit logging
CREATE TABLE IF NOT EXISTS public.security_events (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  event_type TEXT NOT NULL,
  user_id UUID REFERENCES auth.users(id),
  target_user_id UUID REFERENCES auth.users(id),
  event_data JSONB,
  ip_address INET,
  user_agent TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Enable RLS on security_events
ALTER TABLE public.security_events ENABLE ROW LEVEL SECURITY;

-- Policy: Only admins can view security events
CREATE POLICY "Admins can view security events" ON public.security_events
FOR SELECT USING (
  EXISTS (
    SELECT 1 FROM public.profiles 
    WHERE profiles.user_id = auth.uid() AND profiles.role = 'admin'::user_role
  )
);

-- Policy: System can insert security events (for triggers and functions)
CREATE POLICY "System can insert security events" ON public.security_events
FOR INSERT WITH CHECK (true);

-- 3. Create enhanced role change logging function
CREATE OR REPLACE FUNCTION public.log_enhanced_role_change()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = 'public'
AS $$
BEGIN
  -- Log to role_audit_log (existing table)
  IF TG_OP = 'UPDATE' AND OLD.role IS DISTINCT FROM NEW.role THEN
    INSERT INTO public.role_audit_log (user_id, changed_by, old_role, new_role)
    VALUES (NEW.user_id, auth.uid(), OLD.role, NEW.role);
  ELSIF TG_OP = 'INSERT' THEN
    INSERT INTO public.role_audit_log (user_id, changed_by, old_role, new_role)
    VALUES (NEW.user_id, auth.uid(), NULL, NEW.role);
  END IF;

  -- Log to security_events for enhanced tracking
  INSERT INTO public.security_events (
    event_type, 
    user_id, 
    target_user_id, 
    event_data
  ) VALUES (
    CASE 
      WHEN TG_OP = 'UPDATE' THEN 'role_change'
      WHEN TG_OP = 'INSERT' THEN 'role_assignment'
      ELSE 'role_event'
    END,
    auth.uid(),
    NEW.user_id,
    jsonb_build_object(
      'old_role', CASE WHEN TG_OP = 'UPDATE' THEN OLD.role ELSE NULL END,
      'new_role', NEW.role,
      'table_name', 'profiles',
      'operation', TG_OP
    )
  );

  RETURN NEW;
END;
$$;

-- 4. Update existing trigger to use enhanced function
DROP TRIGGER IF EXISTS log_role_change ON public.profiles;
CREATE TRIGGER log_enhanced_role_change
  AFTER INSERT OR UPDATE ON public.profiles
  FOR EACH ROW EXECUTE FUNCTION public.log_enhanced_role_change();

-- 5. Create function to log security events from application
CREATE OR REPLACE FUNCTION public.log_security_event(
  p_event_type TEXT,
  p_target_user_id UUID DEFAULT NULL,
  p_event_data JSONB DEFAULT NULL,
  p_ip_address INET DEFAULT NULL,
  p_user_agent TEXT DEFAULT NULL
)
RETURNS UUID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = 'public'
AS $$
DECLARE
  event_id UUID;
BEGIN
  INSERT INTO public.security_events (
    event_type,
    user_id,
    target_user_id,
    event_data,
    ip_address,
    user_agent
  ) VALUES (
    p_event_type,
    auth.uid(),
    p_target_user_id,
    p_event_data,
    p_ip_address,
    p_user_agent
  ) RETURNING id INTO event_id;
  
  RETURN event_id;
END;
$$;

-- 6. Create rate limiting table for sensitive operations
CREATE TABLE IF NOT EXISTS public.rate_limits (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id),
  operation_type TEXT NOT NULL,
  attempt_count INTEGER NOT NULL DEFAULT 1,
  window_start TIMESTAMPTZ NOT NULL DEFAULT now(),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(user_id, operation_type, window_start)
);

-- Enable RLS on rate_limits
ALTER TABLE public.rate_limits ENABLE ROW LEVEL SECURITY;

-- Policy: Users can view their own rate limits
CREATE POLICY "Users can view own rate limits" ON public.rate_limits
FOR SELECT USING (auth.uid() = user_id);

-- Policy: System can manage rate limits
CREATE POLICY "System can manage rate limits" ON public.rate_limits
FOR ALL USING (true) WITH CHECK (true);

-- 7. Create rate limiting function
CREATE OR REPLACE FUNCTION public.check_rate_limit(
  p_operation_type TEXT,
  p_max_attempts INTEGER DEFAULT 5,
  p_window_minutes INTEGER DEFAULT 60
)
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = 'public'
AS $$
DECLARE
  current_attempts INTEGER;
  window_start TIMESTAMPTZ;
BEGIN
  -- Calculate window start time
  window_start := date_trunc('hour', now()) + 
                  (EXTRACT(minute FROM now())::INTEGER / p_window_minutes) * 
                  (p_window_minutes || ' minutes')::INTERVAL;
  
  -- Check current attempts in this window
  SELECT COALESCE(attempt_count, 0) INTO current_attempts
  FROM public.rate_limits
  WHERE user_id = auth.uid()
    AND operation_type = p_operation_type
    AND window_start = window_start;
  
  -- If within limits, increment counter
  IF current_attempts < p_max_attempts THEN
    INSERT INTO public.rate_limits (user_id, operation_type, attempt_count, window_start)
    VALUES (auth.uid(), p_operation_type, 1, window_start)
    ON CONFLICT (user_id, operation_type, window_start)
    DO UPDATE SET 
      attempt_count = rate_limits.attempt_count + 1,
      created_at = now();
    
    RETURN TRUE;
  END IF;
  
  RETURN FALSE;
END;
$$;