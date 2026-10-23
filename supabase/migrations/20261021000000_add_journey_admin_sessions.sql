CREATE TABLE journey_admin_sessions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  token_hash text UNIQUE NOT NULL,
  crm_user_id text NOT NULL,
  user_name text,
  user_email text,
  role text,
  permissions jsonb NOT NULL DEFAULT '[]'::jsonb,
  created_at timestamptz NOT NULL DEFAULT now(),
  expires_at timestamptz NOT NULL,
  revoked_at timestamptz,
  last_seen_at timestamptz
);

CREATE INDEX journey_admin_sessions_active_idx
  ON journey_admin_sessions (token_hash, expires_at)
  WHERE revoked_at IS NULL;
