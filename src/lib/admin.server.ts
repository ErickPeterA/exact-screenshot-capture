/** Consultas do painel administrativo (somente após verificação de papel admin). */

import { supabaseAdmin } from "@/integrations/supabase/client.server";
import { bandFor } from "@/journey/engine";

export async function assertAdmin(supabase: {
  rpc: (fn: "has_role", args: { _user_id: string; _role: "admin" }) => Promise<{
    data: unknown;
    error: unknown;
  }>;
}, userId: string) {
  const { data, error } = await supabase.rpc("has_role", {
    _user_id: userId,
    _role: "admin",
  });
  if (error || data !== true) {
    throw new Error("Acesso restrito à equipe VG.");
  }
}

export async function dashboardMetrics() {
  const [sessions, leads, events] = await Promise.all([
    supabaseAdmin.from("journey_sessions").select("id, status, started_at"),
    supabaseAdmin.from("leads").select("id, wants_contact, submitted_at"),
    supabaseAdmin.from("analytics_events").select("event_name"),
  ]);
  const rows = sessions.data ?? [];
  const started = rows.length;
  const completed = rows.filter((r) => r.status === "completed").length;
  const abandoned = rows.filter((r) => r.status === "abandoned").length;
  const inProgress = rows.filter(
    (r) => r.status === "in_progress" || r.status === "started",
  ).length;
  const ctaClicked = (events.data ?? []).filter(
    (e) => e.event_name === "cta_clicked",
  ).length;
  return {
    started,
    completed,
    abandoned,
    inProgress,
    leads: (leads.data ?? []).length,
    completionRate: started ? Math.round((completed / started) * 100) : 0,
    ctaClicked,
  };
}

export async function listJourneys() {
  const { data, error } = await supabaseAdmin
    .from("journey_sessions")
    .select(
      "id, name, company, status, started_at, completed_at, result_snapshots(dimension_scores, priorities), leads(id)",
    )
    .order("started_at", { ascending: false })
    .limit(500);
  if (error) throw new Error(error.message);

  return (data ?? []).map((row) => {
    const snapshot = Array.isArray(row.result_snapshots)
      ? row.result_snapshots[0]
      : row.result_snapshots;
    const dims = (snapshot?.dimension_scores ?? []) as {
      name: string;
      score: number | null;
    }[];
    const scored = dims.filter((d) => typeof d.score === "number");
    const weakest = scored.length
      ? scored.reduce((min, d) => ((d.score ?? 100) < (min.score ?? 100) ? d : min))
      : null;
    const priorities = (snapshot?.priorities ?? []) as { serviceName: string }[];
    return {
      id: row.id,
      name: row.name,
      company: row.company,
      status: row.status,
      startedAt: row.started_at,
      completedAt: row.completed_at,
      hasLead: Array.isArray(row.leads) ? row.leads.length > 0 : Boolean(row.leads),
      weakestDimension: weakest?.name ?? null,
      weakestLabel: weakest ? bandFor(weakest.score ?? null) : null,
      topRecommendation: priorities[0]?.serviceName ?? null,
    };
  });
}

export async function journeyDetail(sessionId: string) {
  const [session, answers, snapshot, lead, events] = await Promise.all([
    supabaseAdmin.from("journey_sessions").select("*").eq("id", sessionId).maybeSingle(),
    supabaseAdmin
      .from("session_answers")
      .select("*")
      .eq("session_id", sessionId)
      .order("created_at"),
    supabaseAdmin
      .from("result_snapshots")
      .select("*")
      .eq("session_id", sessionId)
      .maybeSingle(),
    supabaseAdmin.from("leads").select("*").eq("session_id", sessionId).maybeSingle(),
    supabaseAdmin
      .from("analytics_events")
      .select("event_name, node_code, occurred_at")
      .eq("session_id", sessionId)
      .order("occurred_at"),
  ]);
  if (!session.data) return null;
  return {
    session: session.data,
    answers: answers.data ?? [],
    snapshot: snapshot.data,
    lead: lead.data,
    events: events.data ?? [],
  };
}

export async function analyticsOverview() {
  const { data, error } = await supabaseAdmin
    .from("analytics_events")
    .select("event_name, node_code, occurred_at")
    .order("occurred_at", { ascending: false })
    .limit(1000);
  if (error) throw new Error(error.message);
  const byEvent: Record<string, number> = {};
  const byNode: Record<string, number> = {};
  for (const e of data ?? []) {
    byEvent[e.event_name] = (byEvent[e.event_name] ?? 0) + 1;
    if (e.event_name === "question_answered" && e.node_code) {
      byNode[e.node_code] = (byNode[e.node_code] ?? 0) + 1;
    }
  }
  return {
    byEvent: Object.entries(byEvent).sort((a, b) => b[1] - a[1]),
    byNode: Object.entries(byNode).sort((a, b) => b[1] - a[1]),
    recent: (data ?? []).slice(0, 30),
  };
}
