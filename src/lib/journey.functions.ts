import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";

const uuid = z.string().uuid();

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

export const getResultFn = createServerFn({ method: "POST" })
  .inputValidator((data) => z.object({ sessionId: uuid }).parse(data))
  .handler(async ({ data }) => {
    const { buildResult } = await import("./journey.server");
    return buildResult(data.sessionId);
  });

export const submitLeadFn = createServerFn({ method: "POST" })
  .inputValidator((data) =>
    z
      .object({
        sessionId: uuid,
        email: z.string().trim().email().max(180),
        whatsapp: z.string().trim().max(40).optional(),
        wantsContact: z.boolean(),
        consent: z.literal(true),
      })
      .parse(data),
  )
  .handler(async ({ data }) => {
    const { saveLead } = await import("./journey.server");
    await saveLead(data);
    return { ok: true };
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
          "cta_clicked",
          "lead_submitted",
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
