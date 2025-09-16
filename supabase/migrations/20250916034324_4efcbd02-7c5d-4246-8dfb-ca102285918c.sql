-- Create payment_logs table for failed payment attempts
CREATE TABLE public.payment_logs (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL,
  order_id UUID,
  payment_method TEXT,
  error_message TEXT,
  webhook_response JSONB,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS for payment_logs
ALTER TABLE public.payment_logs ENABLE ROW LEVEL SECURITY;

-- Create policies for payment_logs
CREATE POLICY "Admins can view all payment logs" 
ON public.payment_logs 
FOR SELECT 
USING (EXISTS (
  SELECT 1 FROM profiles 
  WHERE profiles.user_id = auth.uid() AND profiles.role = 'admin'::user_role
));

CREATE POLICY "System can insert payment logs" 
ON public.payment_logs 
FOR INSERT 
WITH CHECK (true);

-- Create admin_settings table for configurable settings
CREATE TABLE public.admin_settings (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  setting_key TEXT NOT NULL UNIQUE,
  setting_value TEXT NOT NULL,
  description TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS for admin_settings
ALTER TABLE public.admin_settings ENABLE ROW LEVEL SECURITY;

-- Create policies for admin_settings
CREATE POLICY "Admins can manage admin settings" 
ON public.admin_settings 
FOR ALL 
USING (EXISTS (
  SELECT 1 FROM profiles 
  WHERE profiles.user_id = auth.uid() AND profiles.role = 'admin'::user_role
));

-- Insert default webhook URL setting
INSERT INTO public.admin_settings (setting_key, setting_value, description) 
VALUES ('webhook_validation_url', 'https://mi-n8n-url/webhook/validar-pago', 'URL del webhook de n8n para validación de pagos');

-- Create trigger for updating updated_at
CREATE TRIGGER update_admin_settings_updated_at
BEFORE UPDATE ON public.admin_settings
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();