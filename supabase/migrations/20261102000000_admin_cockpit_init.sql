-- supabase/migrations/20261102000000_admin_cockpit_init.sql
-- Migración inicial del Cockpit Administrativo NexoBow
-- Establece la tabla admin_profiles y políticas RLS restrictivas para el ADMIN_OWNER_EMAIL

CREATE SCHEMA IF NOT EXISTS public;

-- 1. Tabla de Perfiles Administrativos
CREATE TABLE IF NOT EXISTS public.admin_profiles (
  id uuid PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  email text UNIQUE NOT NULL,
  role text NOT NULL DEFAULT 'owner',
  full_name text DEFAULT 'Juanma Merodio',
  avatar_url text,
  last_login_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

-- 2. Habilitar Row Level Security (RLS) Estricto
ALTER TABLE public.admin_profiles ENABLE ROW LEVEL SECURITY;

-- 3. Función auxiliar para verificar si el usuario autenticado es el propietario
CREATE OR REPLACE FUNCTION public.is_admin_owner()
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  jwt_email text;
  configured_owner text;
BEGIN
  jwt_email := lower(trim(coalesce(auth.jwt() ->> 'email', '')));
  configured_owner := lower(trim(coalesce(current_setting('app.admin_owner_email', true), 'juanma@nexobow.site')));
  
  IF jwt_email = '' THEN
    RETURN false;
  END IF;

  RETURN (jwt_email = configured_owner);
END;
$$;

-- 4. Políticas RLS
DROP POLICY IF EXISTS "Admin owner has full access to admin_profiles" ON public.admin_profiles;
CREATE POLICY "Admin owner has full access to admin_profiles"
  ON public.admin_profiles
  FOR ALL
  TO authenticated
  USING (
    public.is_admin_owner() OR (auth.jwt() ->> 'email' = coalesce(current_setting('app.admin_owner_email', true), 'juanma@nexobow.site'))
  )
  WITH CHECK (
    public.is_admin_owner() OR (auth.jwt() ->> 'email' = coalesce(current_setting('app.admin_owner_email', true), 'juanma@nexobow.site'))
  );

-- 5. Trigger para sincronizar perfil en auth.users
CREATE OR REPLACE FUNCTION public.handle_admin_user_created()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  configured_owner text;
BEGIN
  configured_owner := lower(trim(coalesce(current_setting('app.admin_owner_email', true), 'juanma@nexobow.site')));

  IF lower(trim(NEW.email)) = configured_owner THEN
    INSERT INTO public.admin_profiles (id, email, role, full_name)
    VALUES (NEW.id, NEW.email, 'owner', coalesce(NEW.raw_user_meta_data->>'full_name', 'Juanma Merodio'))
    ON CONFLICT (id) DO UPDATE
    SET email = EXCLUDED.email,
        updated_at = now();
  END IF;

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS on_auth_user_created_admin ON auth.users;
CREATE TRIGGER on_auth_user_created_admin
  AFTER INSERT ON auth.users
  FOR EACH ROW
  EXECUTE FUNCTION public.handle_admin_user_created();
