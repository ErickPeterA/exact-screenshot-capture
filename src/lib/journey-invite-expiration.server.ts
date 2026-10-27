import { withTransaction } from "./db.server";
import {
  deliverPersistedJourneyEvent,
  persistJourneyEvent,
  type JourneyEvent,
} from "./journey-events.server";

const EXPIRATION_INTERVAL_MS = 60_000;
const EXPIRATION_BATCH_SIZE = 100;

export async function expireJourneyInvites() {
  const events = await withTransaction(async (client) => {
    const { rows } = await client.query<{ id: string }>(
      `WITH candidates AS (
         SELECT id
           FROM journey_invites
          WHERE status IN ('created', 'shared', 'started')
            AND revoked_at IS NULL
            AND expires_at IS NOT NULL
            AND expires_at <= now()
          ORDER BY expires_at, created_at
          FOR UPDATE SKIP LOCKED
          LIMIT $1
       )
       UPDATE journey_invites AS invite
          SET status = 'expired'
         FROM candidates
        WHERE invite.id = candidates.id
       RETURNING invite.id`,
      [EXPIRATION_BATCH_SIZE],
    );

    const persisted: Array<Awaited<ReturnType<typeof persistJourneyEvent>>> = [];
    for (const invite of rows) {
      const event: JourneyEvent = {
        event_type: "journey.expired",
        journey: { id: invite.id },
      };
      persisted.push(await persistJourneyEvent(event, client));
    }
    return persisted;
  });

  await Promise.all(events.map(deliverPersistedJourneyEvent));
  return events.length;
}

let expirationTimer: ReturnType<typeof setInterval> | undefined;
let expirationRunning = false;

export function startJourneyInviteExpirationWorker() {
  if (expirationTimer) return;
  const run = async () => {
    if (expirationRunning) return;
    expirationRunning = true;
    try {
      await expireJourneyInvites();
    } catch {
      console.error("Journey invite expiration worker cycle failed");
    } finally {
      expirationRunning = false;
    }
  };
  void run();
  expirationTimer = setInterval(() => void run(), EXPIRATION_INTERVAL_MS);
  expirationTimer.unref?.();
}
