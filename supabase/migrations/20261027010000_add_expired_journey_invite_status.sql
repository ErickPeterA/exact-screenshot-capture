ALTER TABLE journey_invites
  DROP CONSTRAINT journey_invites_status_check;

ALTER TABLE journey_invites
  ADD CONSTRAINT journey_invites_status_check
  CHECK (status IN ('created', 'shared', 'started', 'completed', 'revoked', 'expired'));
