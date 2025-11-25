-- Drop triggers with correct names
DROP TRIGGER IF EXISTS trigger_create_payment_on_completion ON orders;
DROP TRIGGER IF EXISTS create_payment_on_order_completion ON orders;
DROP TRIGGER IF EXISTS process_completed_order_trigger ON orders;
DROP TRIGGER IF EXISTS trigger_process_completed_order ON orders;

-- Drop functions with CASCADE to remove dependent triggers
DROP FUNCTION IF EXISTS public.create_payment_on_order_completion() CASCADE;
DROP FUNCTION IF EXISTS public.process_completed_order() CASCADE;

-- Drop tables related to internal payments
-- Start with tables that have foreign keys to others
DROP TABLE IF EXISTS public.payment_logs CASCADE;
DROP TABLE IF EXISTS public.order_items CASCADE;
DROP TABLE IF EXISTS public.payments CASCADE;
DROP TABLE IF EXISTS public.orders CASCADE;

-- Add comment explaining the removal
COMMENT ON SCHEMA public IS 'Internal payment tables removed - payments now handled externally via Hotmart';