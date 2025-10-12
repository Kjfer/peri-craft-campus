-- Arreglar el trigger que crea perfiles para manejar confirmación de email correctamente
DROP TRIGGER IF EXISTS trigger_create_profile_on_confirm ON auth.users CASCADE;
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users CASCADE;
DROP TRIGGER IF EXISTS on_user_confirm_email ON auth.users CASCADE;
DROP FUNCTION IF EXISTS public.handle_new_user() CASCADE;
DROP FUNCTION IF EXISTS public.create_profile_on_confirm() CASCADE;

-- Crear función mejorada que maneja tanto creación como confirmación
CREATE OR REPLACE FUNCTION public.handle_user_profile()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  -- Insertar o actualizar perfil cuando el usuario se crea o confirma su email
  INSERT INTO public.profiles (
    id,
    user_id, 
    email,
    full_name,
    phone,
    country,
    date_of_birth,
    created_at,
    updated_at
  ) VALUES (
    NEW.id,
    NEW.id,
    NEW.email,
    COALESCE(NEW.raw_user_meta_data->>'full_name', ''),
    NEW.raw_user_meta_data->>'phone',
    NEW.raw_user_meta_data->>'country',
    (NEW.raw_user_meta_data->>'date_of_birth')::date,
    NOW(),
    NOW()
  )
  ON CONFLICT (id) DO UPDATE SET
    email = EXCLUDED.email,
    full_name = COALESCE(EXCLUDED.full_name, profiles.full_name),
    phone = COALESCE(EXCLUDED.phone, profiles.phone),
    country = COALESCE(EXCLUDED.country, profiles.country),
    date_of_birth = COALESCE(EXCLUDED.date_of_birth, profiles.date_of_birth),
    updated_at = NOW();
    
  RETURN NEW;
END;
$$;

-- Crear trigger para INSERT (cuando se crea el usuario)
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW
  EXECUTE FUNCTION public.handle_user_profile();

-- Crear trigger para UPDATE (cuando se confirma el email o actualiza datos)
CREATE TRIGGER on_auth_user_updated
  AFTER UPDATE ON auth.users
  FOR EACH ROW
  EXECUTE FUNCTION public.handle_user_profile();