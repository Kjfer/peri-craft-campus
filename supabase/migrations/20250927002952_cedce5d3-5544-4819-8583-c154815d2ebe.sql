-- Confirmar que los triggers estén funcionando para crear perfiles automáticamente
-- y verificar la confirmación de email

-- Primero verificar si el trigger existe
SELECT 
  t.trigger_name,
  t.event_manipulation,
  t.event_object_schema,
  t.event_object_table,
  t.action_statement
FROM information_schema.triggers t
WHERE t.event_object_schema = 'auth' 
  AND t.event_object_table = 'users'
  AND t.trigger_name = 'on_auth_user_created';

-- Si no existe, crearlo
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER SET search_path = public
AS $$
BEGIN
  INSERT INTO public.profiles (
    user_id, 
    email, 
    full_name,
    phone,
    country
  )
  VALUES (
    NEW.id,
    NEW.email,
    COALESCE(NEW.raw_user_meta_data->>'full_name', NEW.email),
    NEW.raw_user_meta_data->>'phone',
    NEW.raw_user_meta_data->>'country'
  );
  RETURN NEW;
END;
$$;

-- Crear el trigger si no existe
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE PROCEDURE public.handle_new_user();