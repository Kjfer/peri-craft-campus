-- Drop existing policies to avoid conflicts (if they exist)
DROP POLICY IF EXISTS auth_users_view_own_orders ON public.orders;
DROP POLICY IF EXISTS auth_users_insert_own_orders ON public.orders;
DROP POLICY IF EXISTS auth_users_update_own_orders ON public.orders;
DROP POLICY IF EXISTS auth_users_view_own_payments ON public.payments;
DROP POLICY IF EXISTS auth_users_insert_own_payments ON public.payments;

-- Ensure RLS is enabled on financial tables
ALTER TABLE public.orders ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.payments ENABLE ROW LEVEL SECURITY;

-- Create secure policies for orders table
-- Only authenticated users can access their own orders
CREATE POLICY auth_users_view_own_orders ON public.orders
FOR SELECT TO authenticated
USING (auth.uid() = user_id);

CREATE POLICY auth_users_insert_own_orders ON public.orders
FOR INSERT TO authenticated
WITH CHECK (auth.uid() = user_id);

CREATE POLICY auth_users_update_own_orders ON public.orders
FOR UPDATE TO authenticated
USING (auth.uid() = user_id);

-- Create secure policies for payments table
-- Only authenticated users can access their own payments
CREATE POLICY auth_users_view_own_payments ON public.payments
FOR SELECT TO authenticated
USING (auth.uid() = user_id);

CREATE POLICY auth_users_insert_own_payments ON public.payments
FOR INSERT TO authenticated
WITH CHECK (auth.uid() = user_id);

-- Ensure no public/anon access to financial data
-- (This is already handled by RLS being enabled and no policies for anon role)