-- Reestructurar la tabla payments para manejar correctamente todos los tipos de pago

-- Primero, agregar las nuevas columnas necesarias
ALTER TABLE public.payments 
ADD COLUMN IF NOT EXISTS order_id UUID REFERENCES public.orders(id),
ADD COLUMN IF NOT EXISTS plan_id UUID REFERENCES public.subscriptions(id),
ADD COLUMN IF NOT EXISTS payment_provider_id TEXT,
ADD COLUMN IF NOT EXISTS payment_provider TEXT DEFAULT 'mercadopago';

-- Migrar los datos existentes
UPDATE public.payments 
SET payment_provider_id = external_payment_id 
WHERE external_payment_id IS NOT NULL;

-- Eliminar columnas que ya no necesitamos
ALTER TABLE public.payments 
DROP COLUMN IF EXISTS payment_status,
DROP COLUMN IF EXISTS external_payment_id,
DROP COLUMN IF EXISTS course_id;

-- Agregar índices para mejorar el rendimiento
CREATE INDEX IF NOT EXISTS idx_payments_order_id ON public.payments(order_id);
CREATE INDEX IF NOT EXISTS idx_payments_plan_id ON public.payments(plan_id);
CREATE INDEX IF NOT EXISTS idx_payments_provider_id ON public.payments(payment_provider_id);
CREATE INDEX IF NOT EXISTS idx_payments_provider ON public.payments(payment_provider);

-- Agregar constraint para asegurar que cada payment tiene un origen (order o plan)
ALTER TABLE public.payments 
ADD CONSTRAINT chk_payment_origin 
CHECK ((order_id IS NOT NULL AND plan_id IS NULL) OR (order_id IS NULL AND plan_id IS NOT NULL));

-- Actualizar las políticas RLS para incluir los nuevos campos
DROP POLICY IF EXISTS "Users can view their own payments" ON public.payments;
DROP POLICY IF EXISTS "Users can create their own payments" ON public.payments;
DROP POLICY IF EXISTS "auth_users_insert_own_payments" ON public.payments;
DROP POLICY IF EXISTS "auth_users_view_own_payments" ON public.payments;

-- Crear políticas RLS actualizadas
CREATE POLICY "users_view_own_payments" ON public.payments
FOR SELECT
USING (auth.uid() = user_id);

CREATE POLICY "users_insert_own_payments" ON public.payments
FOR INSERT
WITH CHECK (auth.uid() = user_id);

-- Política para que las edge functions puedan actualizar payments (usando service role)
CREATE POLICY "service_manage_payments" ON public.payments
FOR ALL
USING (true);

-- Comentario para documentar la nueva estructura
COMMENT ON TABLE public.payments IS 'Tabla para registrar todos los pagos realizados por usuarios, tanto de órdenes de cursos como de planes de suscripción';
COMMENT ON COLUMN public.payments.order_id IS 'ID de la orden asociada al pago (para compras de cursos)';
COMMENT ON COLUMN public.payments.plan_id IS 'ID del plan de suscripción asociado al pago';
COMMENT ON COLUMN public.payments.payment_provider_id IS 'ID del pago en el proveedor (ej: ID de MercadoPago, PayPal, etc.)';
COMMENT ON COLUMN public.payments.payment_provider IS 'Proveedor de pago utilizado (mercadopago, paypal, stripe, etc.)';
COMMENT ON COLUMN public.payments.payment_method IS 'Método de pago específico (visa, yape, plin, etc.)';