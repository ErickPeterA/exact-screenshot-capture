CREATE TABLE journey_invites (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  token_hash text UNIQUE NOT NULL,
  external_reference text,
  crm_client_id text,
  client_name text,
  contact_name text,
  contact_email text,
  status text NOT NULL DEFAULT 'created'
    CHECK (status IN ('created', 'started', 'completed', 'revoked')),
  expires_at timestamptz,
  started_at timestamptz,
  completed_at timestamptz,
  revoked_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE journey_sessions
  ADD COLUMN journey_invite_id uuid
  REFERENCES journey_invites(id);

CREATE UNIQUE INDEX journey_sessions_journey_invite_id_uidx
  ON journey_sessions(journey_invite_id)
  WHERE journey_invite_id IS NOT NULL;
