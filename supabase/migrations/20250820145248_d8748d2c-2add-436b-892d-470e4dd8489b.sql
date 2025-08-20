-- Harden access to financial tables: orders and payments
-- Ensure RLS is enabled (idempotent)
ALTER TABLE public.orders ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.payments ENABLE ROW LEVEL SECURITY;

-- Explicit policies scoped to authenticated role (additive, do not remove existing ones)
-- Orders: allow authenticated users to manage only their own rows
CREATE POLICY IF NOT EXISTS auth_users_view_own_orders ON public.orders
FOR SELECT TO authenticated
USING (auth.uid() = user_id);

CREATE POLICY IF NOT EXISTS auth_users_insert_own_orders ON public.orders
FOR INSERT TO authenticated
WITH CHECK (auth.uid() = user_id);

CREATE POLICY IF NOT EXISTS auth_users_update_own_orders ON public.orders
FOR UPDATE TO authenticated
USING (auth.uid() = user_id);

-- Payments: allow authenticated users to manage only their own rows
CREATE POLICY IF NOT EXISTS auth_users_view_own_payments ON public.payments
FOR SELECT TO authenticated
USING (auth.uid() = user_id);

CREATE POLICY IF NOT EXISTS auth_users_insert_own_payments ON public.payments
FOR INSERT TO authenticated
WITH CHECK (auth.uid() = user_id);
