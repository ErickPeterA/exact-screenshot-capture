import { randomUUID } from "node:crypto";

type JourneyCreatedInput = {
  id: string;
  expiresAt: Date | null;
};

export async function sendJourneyCreatedEvent({ id, expiresAt }: JourneyCreatedInput) {
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
      event_type: "journey.created",
      occurred_at: new Date().toISOString(),
      journey: {
        id,
        expires_at: expiresAt?.toISOString() ?? null,
      },
    }),
    signal: AbortSignal.timeout(10_000),
  });

  if (!response.ok) throw new Error("CRM rejected journey.created event.");
}
