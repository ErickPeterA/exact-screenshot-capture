import { randomUUID } from "node:crypto";

import type { PoolClient } from "pg";

import { query, withTransaction } from "./db.server";

export type JourneyEvent =
  | { event_type: "journey.created"; journey: { id: string; expires_at: string | null } }
  | { event_type: "journey.shared"; journey: { id: string } }
  | { event_type: "journey.revoked"; journey: { id: string } }
  | { event_type: "journey.expired"; journey: { id: string } }
  | { event_type: "journey.started"; journey: { id: string } }
  | {
      event_type: "journey.identified";
      journey: { id: string };
      identification: { company: string; name: string; email: string; phone: string };
    }
  | { event_type: "journey.progress"; journey: { id: string; progress: number } }
  | {
      event_type: "journey.completed";
      journey: { id: string; progress: 100 };
      diagnostic: { summary: Record<string, unknown>; result_reference: string };
    };

export type JourneyEventPayload = JourneyEvent & { event_id: string; occurred_at: string };

type OutboxRow = {
  id: string;
  event_id: string;
  event_type: JourneyEvent["event_type"];
  payload: JourneyEventPayload;
  attempts: number;
  processing_token: string;
};

const WORKER_INTERVAL_MS = 60_000;
const WORKER_BATCH_SIZE = 25;
const ABANDONED_CLAIM_SECONDS = 5 * 60;

export class JourneyEventHttpError extends Error {
  constructor(public readonly status: number) {
    super(`CRM journey event request failed with HTTP ${status}.`);
    this.name = "JourneyEventHttpError";
  }
}

export function retryDelaySeconds(failedAttempts: number) {
  const schedule = [60, 120, 300, 600, 1_200, 1_800, 3_600];
  return schedule[Math.min(Math.max(failedAttempts, 1) - 1, schedule.length - 1)]!;
}

export async function sendJourneyEvent(payload: JourneyEventPayload) {
  const baseUrl = process.env["CRM_INTERNAL_URL"]?.replace(/\/$/, "");
  const secret = process.env["JOURNEY_EVENTS_SECRET"];
  if (!baseUrl || !secret) throw new Error("Journey events integration is not configured.");

  const response = await fetch(`${baseUrl}/api/internal/journey/events`, {
    method: "POST",
    headers: {
      "content-type": "application/json",
      "x-journey-events-secret": secret,
    },
    body: JSON.stringify(payload),
    signal: AbortSignal.timeout(10_000),
  });

  // The current contract only confirms success through a 2xx response. The
  // CRM applies event_id idempotency and must acknowledge duplicates with 2xx.
  if (!response.ok) throw new JourneyEventHttpError(response.status);
}

export async function persistJourneyEvent(event: JourneyEvent, client?: PoolClient) {
  const eventId = randomUUID();
  const payload: JourneyEventPayload = {
    event_id: eventId,
    occurred_at: new Date().toISOString(),
    ...event,
  };
  const statement = `INSERT INTO journey_event_outbox
      (event_id, event_type, journey_invite_id, payload, next_attempt_at)
     VALUES ($1, $2, $3, $4::jsonb, now())
     RETURNING id`;
  const values = [eventId, event.event_type, event.journey.id, JSON.stringify(payload)];
  const { rows } = client
    ? await client.query<{ id: string }>(statement, values)
    : await query<{ id: string }>(statement, values);

  return { id: rows[0]!.id, eventId, eventType: event.event_type };
}

export async function deliverPersistedJourneyEvent(event: {
  id: string;
  eventId: string;
  eventType: string;
}) {
  return attemptImmediateDelivery(event.id, event.eventId, event.eventType);
}

export async function enqueueJourneyEvent(event: JourneyEvent) {
  const persisted = await persistJourneyEvent(event);
  const delivered = await deliverPersistedJourneyEvent(persisted);
  return { eventId: persisted.eventId, delivered };
}

export function enqueueJourneyCreatedEvent(id: string, expiresAt: Date | null) {
  return enqueueJourneyEvent({
    event_type: "journey.created",
    journey: { id, expires_at: expiresAt?.toISOString() ?? null },
  });
}

async function claimOutboxEvents(limit: number, outboxId?: string) {
  const processingToken = randomUUID();
  return withTransaction(async (client: PoolClient) => {
    const idFilter = outboxId ? "AND id = $4" : "";
    const values: unknown[] = [processingToken, limit, ABANDONED_CLAIM_SECONDS];
    if (outboxId) values.push(outboxId);
    const { rows } = await client.query<OutboxRow>(
      `WITH candidates AS (
         SELECT id
           FROM journey_event_outbox
          WHERE delivered_at IS NULL
            AND (next_attempt_at IS NULL OR next_attempt_at <= now())
            AND (
              processing_at IS NULL
              OR processing_at <= now() - ($3 * interval '1 second')
            )
            ${idFilter}
          ORDER BY next_attempt_at NULLS FIRST, created_at
          FOR UPDATE SKIP LOCKED
          LIMIT $2
       )
       UPDATE journey_event_outbox AS outbox
          SET processing_at = now(), processing_token = $1, updated_at = now()
         FROM candidates
        WHERE outbox.id = candidates.id
       RETURNING outbox.id, outbox.event_id, outbox.event_type, outbox.payload,
                 outbox.attempts, outbox.processing_token`,
      values,
    );
    return rows;
  });
}

async function deliverClaimedEvent(event: OutboxRow) {
  try {
    await sendJourneyEvent(event.payload);
    const result = await query(
      `UPDATE journey_event_outbox
          SET delivered_at = now(), processing_at = NULL, processing_token = NULL,
              updated_at = now(), last_error_status = NULL
        WHERE id = $1 AND processing_token = $2 AND delivered_at IS NULL`,
      [event.id, event.processing_token],
    );
    if (result.rowCount) {
      console.info("Journey event delivered", {
        event_id: event.event_id,
        event_type: event.event_type,
        attempts: event.attempts,
      });
      return true;
    }
    return false;
  } catch (error) {
    const failedAttempts = event.attempts + 1;
    const status = error instanceof JourneyEventHttpError ? error.status : null;
    const result = await query(
      `UPDATE journey_event_outbox
          SET attempts = $2,
              next_attempt_at = now() + ($3 * interval '1 second'),
              last_error_status = $4,
              processing_at = NULL,
              processing_token = NULL,
              updated_at = now()
        WHERE id = $1 AND processing_token = $5 AND delivered_at IS NULL`,
      [event.id, failedAttempts, retryDelaySeconds(failedAttempts), status, event.processing_token],
    );
    if (result.rowCount) {
      console.error("Journey event delivery failed", {
        event_id: event.event_id,
        event_type: event.event_type,
        attempts: failedAttempts,
        status,
      });
    }
    return false;
  }
}

async function claimAndDeliverBatch(limit: number, outboxId?: string) {
  const events = await claimOutboxEvents(limit, outboxId);
  const results = await Promise.all(events.map(deliverClaimedEvent));
  return { claimed: events.length, delivered: results.filter(Boolean).length };
}

async function attemptImmediateDelivery(id: string, eventId: string, eventType: string) {
  try {
    return (await claimAndDeliverBatch(1, id)).delivered === 1;
  } catch {
    console.error("Journey event immediate delivery could not be processed", {
      event_id: eventId,
      event_type: eventType,
    });
    return false;
  }
}

export async function processJourneyEventOutbox() {
  return (await claimAndDeliverBatch(WORKER_BATCH_SIZE)).claimed;
}

let workerTimer: ReturnType<typeof setInterval> | undefined;
let workerRunning = false;

export function startJourneyEventOutboxWorker() {
  if (workerTimer) return;
  const run = async () => {
    if (workerRunning) return;
    workerRunning = true;
    try {
      await processJourneyEventOutbox();
    } catch {
      console.error("Journey event outbox worker cycle failed");
    } finally {
      workerRunning = false;
    }
  };
  void run();
  workerTimer = setInterval(() => void run(), WORKER_INTERVAL_MS);
  workerTimer.unref?.();
}
