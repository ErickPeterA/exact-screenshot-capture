CREATE TABLE journey_event_outbox (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  event_id uuid NOT NULL UNIQUE,
  event_type text NOT NULL,
  journey_invite_id uuid REFERENCES journey_invites(id) ON DELETE SET NULL,
  payload jsonb NOT NULL,
  attempts integer NOT NULL DEFAULT 0 CHECK (attempts >= 0),
  next_attempt_at timestamptz NOT NULL DEFAULT now(),
  processing_at timestamptz,
  processing_token uuid,
  delivered_at timestamptz,
  last_error_status integer,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX journey_event_outbox_pending_idx
  ON journey_event_outbox (next_attempt_at, processing_at, created_at)
  WHERE delivered_at IS NULL;

CREATE INDEX journey_event_outbox_invite_idx
  ON journey_event_outbox (journey_invite_id, created_at);
