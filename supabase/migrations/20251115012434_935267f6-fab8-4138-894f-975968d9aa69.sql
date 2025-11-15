-- Enable REPLICA IDENTITY FULL for orders table to receive full row data in realtime updates
ALTER TABLE public.orders REPLICA IDENTITY FULL;