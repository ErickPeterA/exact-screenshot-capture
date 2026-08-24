/** Acesso a dados e orquestração server-side da jornada. */

import { supabaseAdmin } from "@/integrations/supabase/client.server";
import { JOURNEY_VERSION } from "@/journey/config";
import { computeResult, resolvePath, type RawAnswer } from "@/journey/engine";
import { NODE_BY_CODE } from "@/journey/nodes";

export async function logEvent(
  sessionId: string | null,
  eventName: string,
  nodeCode?: string | null,
  metadata: Record<string, unknown> = {},
) {
  await supabaseAdmin.from("analytics_events").insert({
    session_id: sessionId,
    event_name: eventName,
    node_code: nodeCode ?? null,
    metadata: metadata as never,
  });
}

export async function createSession(name: string, company: string) {
  const { data, error } = await supabaseAdmin
    .from("journey_sessions")
    .insert({
      name,
      company,
      journey_version: JOURNEY_VERSION,
      status: "started",
      current_node: "START-01",
    })
    .select("id")
    .single();
  if (error) throw new Error(error.message);
  await logEvent(data.id, "journey_started");
  return data.id;
}

export async function loadAnswers(sessionId: string): Promise<RawAnswer[]> {
  const { data, error } = await supabaseAdmin
    .from("session_answers")
    .select("node_code, option_code")
    .eq("session_id", sessionId)
    .eq("active", true);
  if (error) throw new Error(error.message);
  return (data ?? []).map((r) => ({
    nodeCode: r.node_code,
    optionCode: r.option_code,
  }));
}

export async function loadSession(sessionId: string) {
  const { data, error } = await supabaseAdmin
    .from("journey_sessions")
    .select("*")
    .eq("id", sessionId)
    .maybeSingle();
  if (error) throw new Error(error.message);
  return data;
}

export async function getState(sessionId: string) {
  const session = await loadSession(sessionId);
  if (!session) return null;
  const answers = await loadAnswers(sessionId);
  const path = resolvePath(answers);
  return {
    session: {
      id: session.id,
      name: session.name,
      company: session.company,
      status: session.status,
      journeyVersion: session.journey_version,
      startedAt: session.started_at,
      completedAt: session.completed_at,
    },
    answers: path.validAnswers.map((a) => ({
      nodeCode: a.nodeCode,
      optionCode: a.optionCode,
    })),
    path: path.path,
    currentNode: path.currentNode,
    completed: path.completed,
  };
}

export async function saveAnswer(
  sessionId: string,
  nodeCode: string,
  optionCode: string,
) {
  const node = NODE_BY_CODE[nodeCode];
  if (!node) throw new Error("Pergunta inválida.");
  if (!node.options.some((o) => o.code === optionCode))
    throw new Error("Opção inválida.");

  const { error } = await supabaseAdmin.from("session_answers").upsert(
    {
      session_id: sessionId,
      node_code: nodeCode,
      option_code: optionCode,
      active: true,
      updated_at: new Date().toISOString(),
    },
    { onConflict: "session_id,node_code" },
  );
  if (error) throw new Error(error.message);

  // Recalcula o caminho e invalida respostas que deixaram de existir nele.
  const answers = await loadAnswers(sessionId);
  const path = resolvePath(answers);
  if (path.invalidatedNodes.length) {
    await supabaseAdmin
      .from("session_answers")
      .update({ active: false, updated_at: new Date().toISOString() })
      .eq("session_id", sessionId)
      .in("node_code", path.invalidatedNodes);
  }

  await supabaseAdmin
    .from("journey_sessions")
    .update({
      current_node: path.currentNode,
      status: path.completed ? "completed" : "in_progress",
      completed_at: path.completed ? new Date().toISOString() : null,
      last_activity_at: new Date().toISOString(),
    })
    .eq("id", sessionId);

  await logEvent(sessionId, "question_answered", nodeCode, { optionCode });

  return getState(sessionId);
}

export async function buildResult(sessionId: string) {
  const session = await loadSession(sessionId);
  if (!session) return null;
  const answers = await loadAnswers(sessionId);
  const path = resolvePath(answers);
  const result = computeResult(answers);

  if (path.completed) {
    await supabaseAdmin.from("result_snapshots").upsert(
      {
        session_id: sessionId,
        dimension_scores: result.dimensionScores as never,
        service_scores: result.finalScores as never,
        priorities: result.priorities as never,
        opportunities: result.opportunities as never,
        structured_points: result.structuredPoints as never,
        extra: {
          diagnosticMode: result.diagnosticMode,
          diagnosticReasons: result.diagnosticReasons,
          investigationAreas: result.investigationAreas,
          ruleLogs: result.ruleLogs,
          commercialSummary: result.commercialSummary,
          rawServiceScores: result.serviceScores,
        } as never,
        uncertainty_rate: result.uncertaintyRate,
        journey_version: session.journey_version,
        engine_version: result.engineVersion,
      },
      { onConflict: "session_id" },
    );
    if (session.status !== "completed") {
      await supabaseAdmin
        .from("journey_sessions")
        .update({ status: "completed", completed_at: new Date().toISOString() })
        .eq("id", sessionId);
    }
  }

  const { data: lead } = await supabaseAdmin
    .from("leads")
    .select("id")
    .eq("session_id", sessionId)
    .maybeSingle();

  return {
    session: {
      id: session.id,
      name: session.name,
      company: session.company,
      journeyVersion: session.journey_version,
    },
    completed: path.completed,
    hasLead: Boolean(lead),
    result,
  };
}

export async function saveLead(input: {
  sessionId: string;
  email: string;
  whatsapp?: string;
  wantsContact: boolean;
  consent: boolean;
}) {
  const { error } = await supabaseAdmin.from("leads").upsert(
    {
      session_id: input.sessionId,
      email: input.email,
      whatsapp: input.whatsapp ?? null,
      wants_contact: input.wantsContact,
      consent: input.consent,
      submitted_at: new Date().toISOString(),
    },
    { onConflict: "session_id" },
  );
  if (error) throw new Error(error.message);
  await logEvent(input.sessionId, "lead_submitted");
  return true;
}

export async function restart(sessionId: string) {
  const session = await loadSession(sessionId);
  if (!session) throw new Error("Sessão não encontrada.");
  await supabaseAdmin
    .from("journey_sessions")
    .update({ status: "abandoned" })
    .eq("id", sessionId);
  const newId = await createSession(session.name, session.company);
  await logEvent(newId, "journey_restarted", null, { previousSession: sessionId });
  return newId;
}
