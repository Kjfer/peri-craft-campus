-- Agregar columna receipt_url a orders si no existe
ALTER TABLE public.orders ADD COLUMN IF NOT EXISTS receipt_url text;

-- Crear trigger para registrar payment solo cuando la orden sea completada
CREATE OR REPLACE FUNCTION public.create_payment_on_order_completion()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
BEGIN
  -- Solo cuando cambia a 'completed' desde cualquier otro estado
  IF OLD.payment_status != NEW.payment_status AND NEW.payment_status = 'completed' THEN
    
    -- Verificar si ya existe un registro de payment para esta orden
    IF NOT EXISTS (
      SELECT 1 FROM public.payments WHERE order_id = NEW.id
    ) THEN
      
      -- Crear el registro de payment
      INSERT INTO public.payments (
        order_id,
        user_id,
        amount,
        currency,
        payment_method,
        payment_provider,
        payment_provider_id,
        receipt_url,
        created_at,
        updated_at
      ) VALUES (
        NEW.id,
        NEW.user_id,
        NEW.total_amount,
        NEW.currency,
        NEW.payment_method,
        CASE 
          WHEN NEW.payment_method = 'yape_qr' THEN 'yape'
          WHEN NEW.payment_method = 'paypal' THEN 'paypal'
          WHEN NEW.payment_method = 'mercadopago' THEN 'mercadopago'
          ELSE 'manual'
        END,
        NEW.payment_id,
        NEW.receipt_url,
        NOW(),
        NOW()
      );
      
      RAISE LOG 'Created payment record for completed order: %', NEW.id;
    END IF;
  END IF;
  
  RETURN NEW;
END;
$$;

-- Crear trigger
DROP TRIGGER IF EXISTS trigger_create_payment_on_completion ON public.orders;
CREATE TRIGGER trigger_create_payment_on_completion
  AFTER UPDATE ON public.orders
  FOR EACH ROW
  EXECUTE FUNCTION public.create_payment_on_order_completion();