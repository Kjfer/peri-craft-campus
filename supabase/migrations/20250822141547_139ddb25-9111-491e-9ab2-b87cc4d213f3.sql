-- Crear tabla de planes de suscripción
CREATE TABLE public.plans (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  description TEXT NOT NULL,
  price NUMERIC NOT NULL,
  duration_months INTEGER NOT NULL,
  currency TEXT NOT NULL DEFAULT 'USD',
  is_active BOOLEAN NOT NULL DEFAULT true,
  all_courses_included BOOLEAN NOT NULL DEFAULT false,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Crear tabla de cursos incluidos en planes (relación many-to-many)
CREATE TABLE public.plan_courses (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  plan_id UUID NOT NULL REFERENCES public.plans(id) ON DELETE CASCADE,
  course_id UUID NOT NULL REFERENCES public.courses(id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(plan_id, course_id)
);

-- Crear tabla de suscripciones de usuarios
CREATE TABLE public.user_subscriptions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  plan_id UUID NOT NULL REFERENCES public.plans(id) ON DELETE CASCADE,
  payment_id TEXT,
  status TEXT NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'expired', 'cancelled')),
  start_date TIMESTAMPTZ NOT NULL DEFAULT now(),
  end_date TIMESTAMPTZ NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Habilitar RLS en todas las tablas
ALTER TABLE public.plans ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.plan_courses ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.user_subscriptions ENABLE ROW LEVEL SECURITY;

-- Políticas RLS para plans (público puede ver planes activos)
CREATE POLICY "plans_public_view" ON public.plans
FOR SELECT
USING (is_active = true);

CREATE POLICY "plans_admin_manage" ON public.plans
FOR ALL
USING (EXISTS (
  SELECT 1 FROM public.profiles 
  WHERE user_id = auth.uid() AND role = 'admin'::user_role
));

-- Políticas RLS para plan_courses (público puede ver)
CREATE POLICY "plan_courses_public_view" ON public.plan_courses
FOR SELECT
USING (true);

CREATE POLICY "plan_courses_admin_manage" ON public.plan_courses
FOR ALL
USING (EXISTS (
  SELECT 1 FROM public.profiles 
  WHERE user_id = auth.uid() AND role = 'admin'::user_role
));

-- Políticas RLS para user_subscriptions
CREATE POLICY "user_subscriptions_own_view" ON public.user_subscriptions
FOR SELECT
USING (auth.uid() = user_id);

CREATE POLICY "user_subscriptions_own_insert" ON public.user_subscriptions
FOR INSERT
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "user_subscriptions_admin_view" ON public.user_subscriptions
FOR SELECT
USING (EXISTS (
  SELECT 1 FROM public.profiles 
  WHERE user_id = auth.uid() AND role = 'admin'::user_role
));

-- Trigger para actualizar updated_at en plans
CREATE TRIGGER update_plans_updated_at
BEFORE UPDATE ON public.plans
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();

-- Trigger para actualizar updated_at en user_subscriptions
CREATE TRIGGER update_user_subscriptions_updated_at
BEFORE UPDATE ON public.user_subscriptions
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();

-- Función para verificar si un usuario tiene acceso a un curso (compra individual o suscripción activa)
CREATE OR REPLACE FUNCTION public.user_has_course_access(user_uuid UUID, course_uuid UUID)
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
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

-- Índices para mejorar rendimiento
CREATE INDEX idx_user_subscriptions_user_id ON public.user_subscriptions(user_id);
CREATE INDEX idx_user_subscriptions_status ON public.user_subscriptions(status);
CREATE INDEX idx_user_subscriptions_end_date ON public.user_subscriptions(end_date);
CREATE INDEX idx_plan_courses_plan_id ON public.plan_courses(plan_id);
CREATE INDEX idx_plan_courses_course_id ON public.plan_courses(course_id);