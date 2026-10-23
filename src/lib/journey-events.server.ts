import { randomUUID } from "node:crypto";

type JourneyEvent =
  | {
      event_type: "journey.created";
      journey: { id: string; expires_at: string | null };
    }
  | {
      event_type: "journey.started";
      journey: { id: string };
    }
  | {
      event_type: "journey.identified";
      journey: { id: string };
      identification: {
        company: string;
        name: string;
        email: string;
        phone: string;
      };
    };

export async function sendJourneyEvent(event: JourneyEvent) {
  const baseUrl = process.env["CRM_INTERNAL_URL"]?.replace(/\/$/, "");
  const secret = process.env["JOURNEY_EVENTS_SECRET"];
  if (!baseUrl || !secret) throw new Error("Journey events integration is not configured.");

  const response = await fetch(`${baseUrl}/api/internal/journey/events`, {
    method: "POST",
    headers: {
      "content-type": "application/json",
      "x-journey-events-secret": secret,
    },
    body: JSON.stringify({
      event_id: randomUUID(),
      occurred_at: new Date().toISOString(),
      ...event,
    }),
    signal: AbortSignal.timeout(10_000),
  });

  if (!response.ok) throw new Error("CRM rejected journey event.");
}

export function sendJourneyCreatedEvent(id: string, expiresAt: Date | null) {
  return sendJourneyEvent({
    event_type: "journey.created",
    journey: { id, expires_at: expiresAt?.toISOString() ?? null },
  });
}
