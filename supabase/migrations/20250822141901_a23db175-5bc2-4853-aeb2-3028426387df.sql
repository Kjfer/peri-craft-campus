-- Arreglar funciones con search_path para seguridad
DROP FUNCTION IF EXISTS public.user_has_course_access(UUID, UUID);
DROP FUNCTION IF EXISTS public.get_user_active_subscriptions(UUID);

-- Función para verificar si un usuario tiene acceso a un curso (compra individual o suscripción activa)
CREATE OR REPLACE FUNCTION public.user_has_course_access(user_uuid UUID, course_uuid UUID)
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
BEGIN
  -- Verificar si el curso es gratuito
  IF EXISTS (
    SELECT 1 FROM public.courses 
    WHERE id = course_uuid AND price = 0
  ) THEN
    RETURN true;
  END IF;

  -- Verificar compra individual
  IF EXISTS (
    SELECT 1 FROM public.orders o
    JOIN public.order_items oi ON o.id = oi.order_id
    WHERE o.user_id = user_uuid 
      AND oi.course_id = course_uuid 
      AND o.payment_status = 'completed'
  ) THEN
    RETURN true;
  END IF;

  -- Verificar suscripción activa que incluya el curso
  IF EXISTS (
    SELECT 1 FROM public.user_subscriptions us
    JOIN public.plans p ON us.plan_id = p.id
    LEFT JOIN public.plan_courses pc ON p.id = pc.plan_id
    WHERE us.user_id = user_uuid
      AND us.status = 'active'
      AND us.end_date > now()
      AND (p.all_courses_included = true OR pc.course_id = course_uuid)
  ) THEN
    RETURN true;
  END IF;

  RETURN false;
END;
$$;

-- Función para obtener suscripciones activas del usuario
CREATE OR REPLACE FUNCTION public.get_user_active_subscriptions(user_uuid UUID)
RETURNS TABLE (
  subscription_id UUID,
  plan_name TEXT,
  plan_description TEXT,
  status TEXT,
  start_date TIMESTAMPTZ,
  end_date TIMESTAMPTZ,
  days_remaining INTEGER,
  all_courses_included BOOLEAN
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
BEGIN
  RETURN QUERY
  SELECT 
    us.id as subscription_id,
    p.name as plan_name,
    p.description as plan_description,
    us.status,
    us.start_date,
    us.end_date,
    EXTRACT(days FROM us.end_date - now())::INTEGER as days_remaining,
    p.all_courses_included
  FROM public.user_subscriptions us
  JOIN public.plans p ON us.plan_id = p.id
  WHERE us.user_id = user_uuid
    AND us.status = 'active'
    AND us.end_date > now()
  ORDER BY us.end_date DESC;
END;
$$;