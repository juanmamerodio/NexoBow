-- infra/autonomous/sql/001_autonomous_init.sql
-- Esquema transaccional Postgres 16 para NexoBow Autonomous (Ticket #60).
-- Aislado en la red interna data-tier del VPS.
-- Los datos personales de pacientes permanecen aquí bajo Ley 25.326 y no se replican a Supabase ni a Cloudflare Edge.

CREATE EXTENSION IF NOT EXISTS pgcrypto;

-- 1. Turnos automatizados y estado de confirmación preventiva
CREATE TABLE IF NOT EXISTS appointments (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  client_slug text NOT NULL,
  patient_phone_hash text NOT NULL,
  patient_phone_e164 text NOT NULL,
  patient_first_name text NOT NULL,
  specialty text NOT NULL DEFAULT 'clinica',
  scheduled_at timestamptz NOT NULL,
  status text NOT NULL DEFAULT 'pendiente'
    CHECK (status IN ('pendiente', 'confirmado', 'reprogramado', 'cancelado', 'concretado', 'ausente')),
  confirmed_24h boolean NOT NULL DEFAULT false,
  confirmed_2h boolean NOT NULL DEFAULT false,
  review_requested_at timestamptz,
  external_calendar_event_id text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

-- 2. Lista de espera en orden estricto FIFO con consentimiento explícito Ley 25.326
CREATE TABLE IF NOT EXISTS waitlist_entries (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  client_slug text NOT NULL,
  patient_phone_hash text NOT NULL,
  patient_phone_e164 text NOT NULL,
  patient_first_name text NOT NULL,
  specialty text NOT NULL DEFAULT 'clinica',
  preferred_window text,
  consent_waitlist boolean NOT NULL DEFAULT false,
  opted_out boolean NOT NULL DEFAULT false,
  status text NOT NULL DEFAULT 'esperando'
    CHECK (status IN ('esperando', 'ofertado', 'tomado', 'expirado', 'baja')),
  offered_slot_id uuid REFERENCES appointments(id) ON DELETE SET NULL,
  offer_expires_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

-- 3. Registro idempotente de envíos (evita recordatorios o pedidos duplicados)
CREATE TABLE IF NOT EXISTS reminder_dispatches (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  appointment_id uuid NOT NULL REFERENCES appointments(id) ON DELETE CASCADE,
  reminder_type text NOT NULL
    CHECK (reminder_type IN ('24h', '2h', 'waitlist_offer', 'review_5star')),
  status text NOT NULL DEFAULT 'enviado'
    CHECK (status IN ('pendiente', 'enviado', 'entregado', 'fallido', 'omitido')),
  provider_message_id text,
  dispatched_at timestamptz NOT NULL DEFAULT now(),
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT uq_reminder_dispatches_appointment_type UNIQUE (appointment_id, reminder_type)
);

-- 4. Estado conversacional por prestador y hash telefónico de paciente
CREATE TABLE IF NOT EXISTS conversation_state (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  client_slug text NOT NULL,
  patient_phone_hash text NOT NULL,
  current_intent text,
  pending_slot jsonb NOT NULL DEFAULT '{}'::jsonb
    CHECK (jsonb_typeof(pending_slot) = 'object'),
  handoff_active boolean NOT NULL DEFAULT false,
  opted_out boolean NOT NULL DEFAULT false,
  last_message_at timestamptz NOT NULL DEFAULT now(),
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT uq_conversation_state_client_phone UNIQUE (client_slug, patient_phone_hash)
);

-- 5. Índices operativos y ordenamiento FIFO
CREATE INDEX IF NOT EXISTS idx_appointments_client_scheduled
  ON appointments (client_slug, scheduled_at);

CREATE INDEX IF NOT EXISTS idx_appointments_status_scheduled
  ON appointments (status, scheduled_at);

CREATE INDEX IF NOT EXISTS idx_appointments_client_phone_hash
  ON appointments (client_slug, patient_phone_hash);

CREATE INDEX IF NOT EXISTS idx_waitlist_entries_fifo
  ON waitlist_entries (client_slug, status, created_at ASC);

CREATE INDEX IF NOT EXISTS idx_waitlist_entries_offer_expires
  ON waitlist_entries (status, offer_expires_at)
  WHERE status = 'ofertado';

CREATE INDEX IF NOT EXISTS idx_waitlist_entries_client_phone_hash
  ON waitlist_entries (client_slug, patient_phone_hash);

CREATE INDEX IF NOT EXISTS idx_reminder_dispatches_type_dispatched
  ON reminder_dispatches (reminder_type, dispatched_at DESC);

CREATE INDEX IF NOT EXISTS idx_conversation_state_handoff
  ON conversation_state (client_slug, handoff_active, last_message_at DESC);

-- 6. Función y triggers para actualización automática de updated_at
CREATE OR REPLACE FUNCTION set_autonomous_updated_at()
RETURNS trigger
LANGUAGE plpgsql
SET search_path = public
AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_appointments_updated_at ON appointments;
CREATE TRIGGER trg_appointments_updated_at
  BEFORE UPDATE ON appointments
  FOR EACH ROW
  EXECUTE FUNCTION set_autonomous_updated_at();

DROP TRIGGER IF EXISTS trg_waitlist_entries_updated_at ON waitlist_entries;
CREATE TRIGGER trg_waitlist_entries_updated_at
  BEFORE UPDATE ON waitlist_entries
  FOR EACH ROW
  EXECUTE FUNCTION set_autonomous_updated_at();

DROP TRIGGER IF EXISTS trg_reminder_dispatches_updated_at ON reminder_dispatches;
CREATE TRIGGER trg_reminder_dispatches_updated_at
  BEFORE UPDATE ON reminder_dispatches
  FOR EACH ROW
  EXECUTE FUNCTION set_autonomous_updated_at();

DROP TRIGGER IF EXISTS trg_conversation_state_updated_at ON conversation_state;
CREATE TRIGGER trg_conversation_state_updated_at
  BEFORE UPDATE ON conversation_state
  FOR EACH ROW
  EXECUTE FUNCTION set_autonomous_updated_at();
