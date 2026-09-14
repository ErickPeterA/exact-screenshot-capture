-- PostgreSQL 17 schema for Jornada do Empreendedor. Execute once on the self-hosted database.
CREATE EXTENSION IF NOT EXISTS pgcrypto;

CREATE TABLE journey_sessions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(), journey_version text NOT NULL DEFAULT 'v1',
  name text NOT NULL, company text NOT NULL, status text NOT NULL DEFAULT 'started', current_node text,
  started_at timestamptz NOT NULL DEFAULT now(), completed_at timestamptz,
  last_activity_at timestamptz NOT NULL DEFAULT now(), created_at timestamptz NOT NULL DEFAULT now()
);
CREATE TABLE session_answers (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(), session_id uuid NOT NULL REFERENCES journey_sessions(id) ON DELETE CASCADE,
  node_code text NOT NULL, option_code text NOT NULL, active boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now(), updated_at timestamptz NOT NULL DEFAULT now(), UNIQUE(session_id, node_code)
);
CREATE INDEX session_answers_session_idx ON session_answers(session_id);
CREATE TABLE result_snapshots (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(), session_id uuid NOT NULL UNIQUE REFERENCES journey_sessions(id) ON DELETE CASCADE,
  dimension_scores jsonb NOT NULL DEFAULT '[]'::jsonb, service_scores jsonb NOT NULL DEFAULT '{}'::jsonb,
  priorities jsonb NOT NULL DEFAULT '[]'::jsonb, opportunities jsonb NOT NULL DEFAULT '[]'::jsonb,
  structured_points jsonb NOT NULL DEFAULT '[]'::jsonb, extra jsonb NOT NULL DEFAULT '{}'::jsonb,
  uncertainty_rate numeric NOT NULL DEFAULT 0, journey_version text NOT NULL DEFAULT 'v1', engine_version text NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now()
);
CREATE TABLE analytics_events (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(), session_id uuid REFERENCES journey_sessions(id) ON DELETE CASCADE,
  event_name text NOT NULL, node_code text, metadata jsonb NOT NULL DEFAULT '{}'::jsonb, occurred_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX analytics_events_name_idx ON analytics_events(event_name, occurred_at DESC);
