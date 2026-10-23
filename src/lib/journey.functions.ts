import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";

const uuid = z.string().uuid();
const publicToken = z.string().min(20).max(256);
const inviteInput = z.object({
  clientName: z.string().trim().min(2).max(160),
});

function inviteExpiresAt() {
  const expiresAt = new Date();
  expiresAt.setDate(expiresAt.getDate() + 7);
  return expiresAt;
}

export const startJourneyFn = createServerFn({ method: "POST" })
  .inputValidator((data) =>
    z
      .object({
        name: z.string().trim().min(2).max(120),
        company: z.string().trim().min(2).max(160),
      })
      .parse(data),
  )
  .handler(async ({ data }) => {
    const { createSession } = await import("./journey.server");
    const id = await createSession(data.name, data.company);
    return { sessionId: id };
  });

export const getJourneyStateFn = createServerFn({ method: "POST" })
  .inputValidator((data) => z.object({ sessionId: uuid }).parse(data))
  .handler(async ({ data }) => {
    const { getState } = await import("./journey.server");
    return getState(data.sessionId);
  });

export const answerQuestionFn = createServerFn({ method: "POST" })
  .inputValidator((data) =>
    z
      .object({
        sessionId: uuid,
        nodeCode: z.string().min(1).max(32),
        optionCode: z.string().min(1).max(32),
      })
      .parse(data),
  )
  .handler(async ({ data }) => {
    const { saveAnswer } = await import("./journey.server");
    return saveAnswer(data.sessionId, data.nodeCode, data.optionCode);
  });

export const openJourneyInviteFn = createServerFn({ method: "POST" })
  .inputValidator((data) => z.object({ token: publicToken }).parse(data))
  .handler(async ({ data }) => {
    const { openJourneyInvite } = await import("./journey-invites.server");
    return openJourneyInvite(data.token);
  });

export const startJourneyInviteFn = createServerFn({ method: "POST" })
  .inputValidator((data) =>
    z
      .object({
        token: publicToken,
        name: z.string().trim().min(2).max(120),
        company: z.string().trim().min(2).max(160),
        role: z.enum(["owner", "director", "manager", "professional", "other"]),
        teamSize: z.enum(["solo", "2-10", "11-50", "51-200", "201+"]),
        mainChallenge: z.string().trim().min(10).max(500),
      })
      .parse(data),
  )
  .handler(async ({ data }) => {
    const { startJourneyInvite } = await import("./journey-invites.server");
    return startJourneyInvite(data.token, data.name, data.company, {
      role: data.role,
      teamSize: data.teamSize,
      mainChallenge: data.mainChallenge,
    });
  });

export const listJourneyInvitesFn = createServerFn({ method: "GET" }).handler(async () => {
  const { listJourneyInvites } = await import("./journey-invites.server");
  const { requireJourneyAdminSession } = await import("./journey-admin-auth.server");
  await requireJourneyAdminSession();
  return listJourneyInvites();
});

export const getJourneyAdminSessionFn = createServerFn({ method: "GET" }).handler(async () => {
  const { getJourneyAdminSession } = await import("./journey-admin-auth.server");
  return getJourneyAdminSession();
});

export const logoutJourneyAdminFn = createServerFn({ method: "POST" }).handler(async () => {
  const { deleteCookie, getCookie } = await import("@tanstack/react-start/server");
  const { JOURNEY_ADMIN_COOKIE, revokeJourneyAdminSession } =
    await import("./journey-admin-auth.server");
  await revokeJourneyAdminSession(getCookie(JOURNEY_ADMIN_COOKIE));
  deleteCookie(JOURNEY_ADMIN_COOKIE, {
    path: "/",
    httpOnly: true,
    sameSite: "lax",
    secure: process.env["NODE_ENV"] === "production",
  });
  return { ok: true };
});

export const getJourneyAdminResultPathFn = createServerFn({ method: "POST" })
  .inputValidator((data) => z.object({ sessionId: uuid }).parse(data))
  .handler(async ({ data }) => {
    const { requireJourneyAdminSession } = await import("./journey-admin-auth.server");
    const { query } = await import("./db.server");
    await requireJourneyAdminSession();
    const { rows } = await query<{ id: string }>(
      "SELECT id FROM journey_sessions WHERE id = $1 AND journey_invite_id IS NOT NULL",
      [data.sessionId],
    );
    if (!rows[0]) throw new Error("Resultado não encontrado.");
    return { sessionId: rows[0].id };
  });

export const createJourneyInviteFn = createServerFn({ method: "POST" })
  .inputValidator((data) => inviteInput.parse(data))
  .handler(async ({ data }) => {
    const { createJourneyInvite } = await import("./journey-invites.server");
    const { requireJourneyAdminSession } = await import("./journey-admin-auth.server");
    await requireJourneyAdminSession();
    return createJourneyInvite({
      client_name: data.clientName,
      expires_at: inviteExpiresAt(),
    });
  });

export const revokeJourneyInviteFn = createServerFn({ method: "POST" })
  .inputValidator((data) => z.object({ inviteId: uuid }).parse(data))
  .handler(async ({ data }) => {
    const { revokeJourneyInvite } = await import("./journey-invites.server");
    const { requireJourneyAdminSession } = await import("./journey-admin-auth.server");
    await requireJourneyAdminSession();
    return revokeJourneyInvite(data.inviteId);
  });

export const regenerateJourneyInviteFn = createServerFn({ method: "POST" })
  .inputValidator((data) => z.object({ inviteId: uuid }).merge(inviteInput).parse(data))
  .handler(async ({ data }) => {
    const { regenerateJourneyInvite } = await import("./journey-invites.server");
    const { requireJourneyAdminSession } = await import("./journey-admin-auth.server");
    await requireJourneyAdminSession();
    return regenerateJourneyInvite(data.inviteId, {
      client_name: data.clientName,
      expires_at: inviteExpiresAt(),
    });
  });

export const answerInviteQuestionFn = createServerFn({ method: "POST" })
  .inputValidator((data) =>
    z
      .object({
        token: publicToken,
        nodeCode: z.string().min(1).max(32),
        optionCode: z.string().min(1).max(32),
      })
      .parse(data),
  )
  .handler(async ({ data }) => {
    const { saveInviteAnswer } = await import("./journey-invites.server");
    const state = await saveInviteAnswer(data.token, data.nodeCode, data.optionCode);
    if (!state) throw new Error("Este convite não está mais disponível.");
    return state;
  });

export const getResultFn = createServerFn({ method: "POST" })
  .inputValidator((data) => z.object({ sessionId: uuid }).parse(data))
  .handler(async ({ data }) => {
    const { buildResult } = await import("./journey.server");
    return buildResult(data.sessionId);
  });

export const trackEventFn = createServerFn({ method: "POST" })
  .inputValidator((data) =>
    z
      .object({
        sessionId: uuid.nullable().optional(),
        eventName: z.enum([
          "journey_started",
          "territory_started",
          "question_answered",
          "discovery_shown",
          "territory_completed",
          "journey_abandoned",
          "result_viewed",
          "journey_restarted",
        ]),
        nodeCode: z.string().max(32).nullable().optional(),
        metadata: z.record(z.string(), z.unknown()).optional(),
      })
      .parse(data),
  )
  .handler(async ({ data }) => {
    const { logEvent } = await import("./journey.server");
    await logEvent(
      data.sessionId ?? null,
      data.eventName,
      data.nodeCode ?? null,
      data.metadata ?? {},
    );
    return { ok: true };
  });

export const restartJourneyFn = createServerFn({ method: "POST" })
  .inputValidator((data) => z.object({ sessionId: uuid }).parse(data))
  .handler(async ({ data }) => {
    const { restart } = await import("./journey.server");
    return { sessionId: await restart(data.sessionId) };
  });
