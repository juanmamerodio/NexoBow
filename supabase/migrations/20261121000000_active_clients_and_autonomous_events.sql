-- supabase/migrations/20261121000000_active_clients_and_autonomous_events.sql
-- Migración para Prestadores Activos (Entrega 72h hábiles, 6 Hitos, Prueba 30d, Año 1 365d)
-- y Eventos Agregados sin PII del Motor Gate 1 NexoBow Autonomous (Ticket #59)

CREATE SCHEMA IF NOT EXISTS public;

-- 1. Tipos Enumerados
DO $$ BEGIN
  CREATE TYPE public.client_tier_type AS ENUM (
    'starter_tier1',
    'autonomous_tier2',
    'growth_tier3'
  );
EXCEPTION
  WHEN duplicate_object THEN null;
END $$;

DO $$ BEGIN
  CREATE TYPE public.delivery_sla_status AS ENUM (
    'en_curso',
    'entregado_en_tiempo',
    'alerta_24h',
    'vencido_sla',
    'pausado'
  );
EXCEPTION
  WHEN duplicate_object THEN null;
END $$;

DO $$ BEGIN
  CREATE TYPE public.autonomous_event_type AS ENUM (
    'heartbeat',
    'appointment_confirmed',
    'appointment_rescheduled',
    'appointment_cancelled',
    'waitlist_filled',
    'review_invite_sent',
    'human_handoff'
  );
EXCEPTION
  WHEN duplicate_object THEN null;
END $$;

-- 2. Tabla de Prestadores Activos (lead_id bigint anclado a public.leads.id)
CREATE TABLE IF NOT EXISTS public.active_clients (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  lead_id bigint UNIQUE REFERENCES public.leads(id) ON DELETE SET NULL,
  slug text UNIQUE NOT NULL,
  provider_name text NOT NULL,
  niche text NOT NULL DEFAULT 'clinica',
  tier public.client_tier_type NOT NULL DEFAULT 'starter_tier1',
  primary_domain text,
  maps_place_id text,
  review_url text CHECK (review_url IS NULL OR review_url ~* '^https://'),
  delivery_status public.delivery_sla_status NOT NULL DEFAULT 'en_curso',
  checklist jsonb NOT NULL DEFAULT '{
    "material_received": false,
    "copy_approved": false,
    "production_aeo_built": false,
    "domain_ssl_verified": false,
    "review_booster_ready": false,
    "delivery_confirmed": false
  }'::jsonb CHECK (jsonb_typeof(checklist) = 'object'),
  aeo_verified boolean NOT NULL DEFAULT false,
  promoted_at timestamptz NOT NULL DEFAULT now(),
  delivery_deadline_at timestamptz NOT NULL,
  delivered_at timestamptz,
  trial_ends_at timestamptz NOT NULL,
  hosting_renews_at timestamptz NOT NULL,
  metadata jsonb NOT NULL DEFAULT '{}'::jsonb CHECK (jsonb_typeof(metadata) = 'object'),
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

-- 3. Tabla de Eventos Agregados Gate 1 (sin columnas de datos personales)
CREATE TABLE IF NOT EXISTS public.autonomous_events (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  client_slug text NOT NULL,
  event_type public.autonomous_event_type NOT NULL,
  period_date date NOT NULL DEFAULT CURRENT_DATE,
  count_delta integer NOT NULL DEFAULT 1 CHECK (count_delta >= 0 AND count_delta <= 10000),
  engine_version text NOT NULL DEFAULT 'gate1-v1',
  summary jsonb NOT NULL DEFAULT '{}'::jsonb CHECK (jsonb_typeof(summary) = 'object'),
  received_at timestamptz NOT NULL DEFAULT now()
);

-- 4. Índices de Consulta Operativa y Alertas
CREATE INDEX IF NOT EXISTS idx_active_clients_tier ON public.active_clients (tier);
CREATE INDEX IF NOT EXISTS idx_active_clients_delivery_status ON public.active_clients (delivery_status);
CREATE INDEX IF NOT EXISTS idx_active_clients_delivery_deadline ON public.active_clients (delivery_deadline_at);
CREATE INDEX IF NOT EXISTS idx_active_clients_trial_ends ON public.active_clients (trial_ends_at);
CREATE INDEX IF NOT EXISTS idx_autonomous_events_client_slug_date ON public.autonomous_events (client_slug, period_date DESC);
CREATE INDEX IF NOT EXISTS idx_autonomous_events_type_received ON public.autonomous_events (event_type, received_at DESC);

-- 5. Habilitar Row Level Security (RLS) Estricto
ALTER TABLE public.active_clients ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.autonomous_events ENABLE ROW LEVEL SECURITY;

-- 6. Políticas RLS para Propietario (public.is_admin_owner)
DROP POLICY IF EXISTS "Admin owner has full access to active_clients" ON public.active_clients;
CREATE POLICY "Admin owner has full access to active_clients"
  ON public.active_clients
  FOR ALL
  TO authenticated
  USING ((SELECT public.is_admin_owner()))
  WITH CHECK ((SELECT public.is_admin_owner()));

DROP POLICY IF EXISTS "Admin owner has full access to autonomous_events" ON public.autonomous_events;
CREATE POLICY "Admin owner has full access to autonomous_events"
  ON public.autonomous_events
  FOR ALL
  TO authenticated
  USING ((SELECT public.is_admin_owner()))
  WITH CHECK ((SELECT public.is_admin_owner()));

-- 7. Trigger para Sincronización Automática de updated_at en active_clients
CREATE OR REPLACE FUNCTION public.handle_active_clients_updated_at()
RETURNS trigger
LANGUAGE plpgsql
SET search_path = public
AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS on_active_client_updated ON public.active_clients;
CREATE TRIGGER on_active_client_updated
  BEFORE UPDATE ON public.active_clients
  FOR EACH ROW
  EXECUTE FUNCTION public.handle_active_clients_updated_at();
