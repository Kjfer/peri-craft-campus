-- Remove overly permissive policy; service role already bypasses RLS
DROP POLICY IF EXISTS "service_manage_payments" ON public.payments;