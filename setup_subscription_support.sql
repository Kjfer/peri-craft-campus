-- Complete setup script for subscription support
-- Run this script to set up everything at once

\echo '🚀 Setting up subscription support...'

-- Step 1: Add subscription support to orders table
\echo '1. Adding subscription support to order_items...'
\i supabase/migrations/20250919000000_add_subscription_support_to_orders.sql

-- Step 2: Create payment triggers
\echo '2. Creating payment and enrollment triggers...'
\i supabase/migrations/20250919000001_create_payment_triggers.sql

-- Step 3: Verify setup
\echo '3. Verifying trigger setup...'
SELECT 
    'Trigger: ' || trigger_name || ' on ' || event_object_table as status
FROM information_schema.triggers 
WHERE trigger_name IN (
    'trigger_order_completion',
    'trigger_payment_completion', 
    'trigger_subscription_status_change'
)
ORDER BY event_object_table;

-- Step 4: Show table structure
\echo '4. Showing updated table structure...'
SELECT 
    column_name, 
    data_type, 
    is_nullable,
    column_default
FROM information_schema.columns 
WHERE table_name = 'order_items'
ORDER BY ordinal_position;

\echo '✅ Setup completed! You can now:'
\echo '   - Process course payments and get automatic enrollments'
\echo '   - Process subscription payments and get automatic user_subscriptions'
\echo '   - Use mixed carts with both courses and subscriptions'
\echo ''
\echo '📋 To test the setup, run: \i test_triggers.sql'