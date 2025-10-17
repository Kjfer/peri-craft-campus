-- Modificar el trigger para que solo cree perfiles DESPUÉS de confirmar el email
CREATE OR REPLACE FUNCTION public.handle_user_profile()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
BEGIN
  -- SOLO crear perfil si el email está confirmado
  IF NEW.email_confirmed_at IS NOT NULL THEN
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
    ON CONFLICT (user_id) DO UPDATE SET
      email = EXCLUDED.email,
      full_name = COALESCE(EXCLUDED.full_name, profiles.full_name),
      phone = COALESCE(EXCLUDED.phone, profiles.phone),
      country = COALESCE(EXCLUDED.country, profiles.country),
      date_of_birth = COALESCE(EXCLUDED.date_of_birth, profiles.date_of_birth),
      updated_at = NOW();
  END IF;
    
  RETURN NEW;
END;
$$;

-- Asegurar que el trigger existe y se ejecuta en INSERT y UPDATE
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
DROP TRIGGER IF EXISTS on_auth_user_confirmed ON auth.users;

CREATE TRIGGER on_auth_user_confirmed
  AFTER INSERT OR UPDATE ON auth.users
  FOR EACH ROW
  EXECUTE FUNCTION public.handle_user_profile();