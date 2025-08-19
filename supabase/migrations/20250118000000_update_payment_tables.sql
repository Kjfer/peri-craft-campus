-- Actualizar estructura de tablas para cumplir con los requisitos
-- Agregar campos faltantes a la tabla orders

ALTER TABLE public.orders 
ADD COLUMN IF NOT EXISTS order_number TEXT UNIQUE,
ADD COLUMN IF NOT EXISTS payment_status TEXT DEFAULT 'pending',
ADD COLUMN IF NOT EXISTS payment_id TEXT;

-- Actualizar tabla order_items para incluir solo price (no unit_price y total_price)
ALTER TABLE public.order_items 
ADD COLUMN IF NOT EXISTS price DECIMAL(10,2);

-- Actualizar datos existentes si es necesario
UPDATE public.order_items 
SET price = unit_price 
WHERE price IS NULL AND unit_price IS NOT NULL;

-- Agregar campos faltantes a la tabla payments
ALTER TABLE public.payments 
ADD COLUMN IF NOT EXISTS transaction_id TEXT,
ADD COLUMN IF NOT EXISTS payment_status payment_status DEFAULT 'pending';

-- Agregar campos faltantes a la tabla profiles
ALTER TABLE public.profiles 
ADD COLUMN IF NOT EXISTS phone TEXT,
ADD COLUMN IF NOT EXISTS country TEXT;

-- Función para generar order_number único
CREATE OR REPLACE FUNCTION public.generate_order_number()
RETURNS TEXT 
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  order_num TEXT;
  counter INTEGER;
BEGIN
  -- Generar número de orden con formato PERI-YYYYMMDD-XXXX
  SELECT COUNT(*) + 1 INTO counter 
  FROM orders 
  WHERE DATE(created_at) = CURRENT_DATE;
  
  order_num := 'PERI-' || TO_CHAR(CURRENT_DATE, 'YYYYMMDD') || '-' || LPAD(counter::TEXT, 4, '0');
  
  RETURN order_num;
END;
$$;

-- Trigger para generar order_number automáticamente
CREATE OR REPLACE FUNCTION public.set_order_number()
RETURNS TRIGGER 
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF NEW.order_number IS NULL THEN
    NEW.order_number := generate_order_number();
  END IF;
  RETURN NEW;
END;
$$;

-- Crear trigger si no existe
DROP TRIGGER IF EXISTS set_order_number_trigger ON public.orders;
CREATE TRIGGER set_order_number_trigger
  BEFORE INSERT ON public.orders
  FOR EACH ROW EXECUTE FUNCTION public.set_order_number();

-- Índices adicionales para optimización
CREATE INDEX IF NOT EXISTS idx_orders_payment_status ON public.orders(payment_status);
CREATE INDEX IF NOT EXISTS idx_orders_order_number ON public.orders(order_number);
CREATE INDEX IF NOT EXISTS idx_payments_transaction_id ON public.payments(transaction_id);
CREATE INDEX IF NOT EXISTS idx_profiles_country ON public.profiles(country);
