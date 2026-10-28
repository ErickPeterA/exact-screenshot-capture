import { JOURNEY_VERSION } from "@/journey/config";
import {
  calculateJourneyProgress,
  computeResult,
  resolvePath,
  type JourneyResult,
  type RawAnswer,
} from "@/journey/engine";
import { NODE_BY_CODE } from "@/journey/nodes";

import type { PoolClient, QueryResultRow } from "pg";

import { query, withTransaction } from "./db.server";
import { deliverPersistedJourneyEvent, persistJourneyEvent } from "./journey-events.server";

type Session = {
  id: string;
  name: string;
  company: string;
  status: string;
  journey_version: string;
  started_at: string;
  completed_at: string | null;
  journey_invite_id: string | null;
};

type StoredSnapshot = {
  dimension_scores: JourneyResult["dimensionScores"];
  service_scores: JourneyResult["finalScores"];
  priorities: JourneyResult["priorities"];
  opportunities: JourneyResult["opportunities"];
  structured_points: JourneyResult["structuredPoints"];
  extra: Pick<
    JourneyResult,
    | "diagnosticMode"
    | "diagnosticReasons"
    | "investigationAreas"
    | "ruleLogs"
    | "commercialSummary"
    | "uncertaintyCount"
  > & { rawServiceScores: JourneyResult["serviceScores"] };
  uncertainty_rate: number;
  engine_version: string;
};

function runQuery<Row extends QueryResultRow = QueryResultRow>(
  client: PoolClient | undefined,
  text: string,
  values: unknown[] = [],
) {
  return client ? client.query<Row>(text, values) : query<Row>(text, values);
}

export async function logEvent(
  sessionId: string | null,
  eventName: string,
  nodeCode?: string | null,
  metadata: Record<string, unknown> = {},
  client?: PoolClient,
) {
  await runQuery(
    client,
    "INSERT INTO analytics_events (session_id,event_name,node_code,metadata) VALUES ($1,$2,$3,$4::jsonb)",
    [sessionId, eventName, nodeCode ?? null, JSON.stringify(metadata)],
  );
}

export async function createSession(name: string, company: string) {
  const { rows } = await query<{ id: string }>(
    "INSERT INTO journey_sessions (name,company,journey_version,status,current_node) VALUES ($1,$2,$3,'started','START-01') RETURNING id",
    [name, company, JOURNEY_VERSION],
  );
  const id = rows[0]!.id;
  await logEvent(id, "journey_started");
  return id;
}

export async function loadAnswers(sessionId: string, client?: PoolClient): Promise<RawAnswer[]> {
  const { rows } = await runQuery<{ node_code: string; option_code: string }>(
    client,
    "SELECT node_code,option_code FROM session_answers WHERE session_id=$1 AND active=true",
    [sessionId],
  );
  return rows.map((row) => ({ nodeCode: row.node_code, optionCode: row.option_code }));
}

export async function loadSession(sessionId: string, client?: PoolClient, forUpdate = false) {
  const { rows } = await runQuery<Session>(
    client,
    `SELECT id,name,company,status,journey_version,started_at,completed_at,journey_invite_id
       FROM journey_sessions WHERE id=$1${forUpdate ? " FOR UPDATE" : ""}`,
    [sessionId],
  );
  return rows[0] ?? null;
}

export async function getState(sessionId: string) {
  const session = await loadSession(sessionId);
  if (!session) return null;
  const path = resolvePath(await loadAnswers(sessionId));
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
    answers: path.validAnswers.map((answer) => ({
      nodeCode: answer.nodeCode,
      optionCode: answer.optionCode,
    })),
    path: path.path,
    currentNode: path.currentNode,
    completed: path.completed,
  };
}

async function persistResultSnapshot(
  sessionId: string,
  journeyVersion: string,
  result: JourneyResult,
  client?: PoolClient,
) {
  await runQuery(
    client,
    "INSERT INTO result_snapshots (session_id,dimension_scores,service_scores,priorities,opportunities,structured_points,extra,uncertainty_rate,journey_version,engine_version) VALUES ($1,$2::jsonb,$3::jsonb,$4::jsonb,$5::jsonb,$6::jsonb,$7::jsonb,$8,$9,$10) ON CONFLICT (session_id) DO NOTHING",
    [
      sessionId,
      JSON.stringify(result.dimensionScores),
      JSON.stringify(result.finalScores),
      JSON.stringify(result.priorities),
      JSON.stringify(result.opportunities),
      JSON.stringify(result.structuredPoints),
      JSON.stringify({
        diagnosticMode: result.diagnosticMode,
        diagnosticReasons: result.diagnosticReasons,
        investigationAreas: result.investigationAreas,
        ruleLogs: result.ruleLogs,
        commercialSummary: result.commercialSummary,
        rawServiceScores: result.serviceScores,
        uncertaintyCount: result.uncertaintyCount,
      }),
      result.uncertaintyRate,
      journeyVersion,
      result.engineVersion,
    ],
  );
}

async function loadResultSnapshot(sessionId: string, client?: PoolClient) {
  const { rows } = await runQuery<StoredSnapshot>(
    client,
    "SELECT dimension_scores,service_scores,priorities,opportunities,structured_points,extra,uncertainty_rate,engine_version FROM result_snapshots WHERE session_id=$1",
    [sessionId],
  );
  return rows[0] ?? null;
}

function resultFromSnapshot(snapshot: StoredSnapshot): JourneyResult {
  const extra = snapshot.extra;
  return {
    engineVersion: snapshot.engine_version,
    dimensionScores: snapshot.dimension_scores,
    serviceScores: extra.rawServiceScores,
    finalScores: snapshot.service_scores,
    priorities: snapshot.priorities,
    opportunities: snapshot.opportunities,
    structuredPoints: snapshot.structured_points,
    uncertaintyCount: extra.uncertaintyCount,
    uncertaintyRate: Number(snapshot.uncertainty_rate),
    diagnosticMode: extra.diagnosticMode,
    diagnosticReasons: extra.diagnosticReasons,
    investigationAreas: extra.investigationAreas,
    ruleLogs: extra.ruleLogs,
    commercialSummary: extra.commercialSummary,
  };
}

export async function getPersistedResult(sessionId: string) {
  const session = await loadSession(sessionId);
  if (!session) return null;
  const snapshot = await loadResultSnapshot(sessionId);
  return {
    session: {
      id: session.id,
      name: session.name,
      company: session.company,
      journeyVersion: session.journey_version,
    },
    completed: Boolean(snapshot),
    result: snapshot ? resultFromSnapshot(snapshot) : null,
  };
}

function diagnosticSummary(snapshot: StoredSnapshot): Record<string, unknown> {
  return {
    engineVersion: snapshot.engine_version,
    dimensionScores: snapshot.dimension_scores,
    serviceScores: snapshot.service_scores,
    priorities: snapshot.priorities,
    opportunities: snapshot.opportunities,
    structuredPoints: snapshot.structured_points,
    diagnosticMode: snapshot.extra.diagnosticMode,
    diagnosticReasons: snapshot.extra.diagnosticReasons,
    investigationAreas: snapshot.extra.investigationAreas,
    commercialSummary: snapshot.extra.commercialSummary,
    uncertaintyCount: snapshot.extra.uncertaintyCount,
    uncertaintyRate: Number(snapshot.uncertainty_rate),
  };
}

async function lastEmittedProgress(sessionId: string, client: PoolClient) {
  const { rows } = await client.query<{ progress: number | null }>(
    `SELECT MAX((metadata->>'progress')::int) AS progress FROM analytics_events WHERE session_id=$1 AND event_name='journey_progress_emitted' AND metadata->>'progress' ~ '^[0-9]+$'`,
    [sessionId],
  );
  return rows[0]?.progress ?? 0;
}

async function emitProgressIfIncreased(
  sessionId: string,
  inviteId: string,
  previousProgress: number,
  progress: number,
  client: PoolClient,
) {
  if (progress <= previousProgress || progress <= (await lastEmittedProgress(sessionId, client))) {
    return null;
  }
  await logEvent(sessionId, "journey_progress_emitted", null, { progress }, client);
  return persistJourneyEvent(
    { event_type: "journey.progress", journey: { id: inviteId, progress } },
    client,
  );
}

export async function saveAnswer(sessionId: string, nodeCode: string, optionCode: string) {
  const node = NODE_BY_CODE[nodeCode];
  if (!node) throw new Error("Pergunta inválida.");
  if (!node.options.some((option) => option.code === optionCode))
    throw new Error("Opção inválida.");

  const transition = await withTransaction(async (client) => {
    const sessionBefore = await loadSession(sessionId, client, true);
    if (!sessionBefore) throw new Error("Sessão não encontrada.");
    if (sessionBefore.status === "completed") {
      throw new Error("Esta Jornada já foi concluída.");
    }
    if (sessionBefore.journey_invite_id) {
      const { rows } = await client.query<{ status: string }>(
        "SELECT status FROM journey_invites WHERE id=$1 FOR UPDATE",
        [sessionBefore.journey_invite_id],
      );
      if (rows[0]?.status !== "started") {
        throw new Error("Este convite não está mais disponível.");
      }
    }

    const pathBefore = resolvePath(await loadAnswers(sessionId, client));
    const previousProgress = calculateJourneyProgress(
      pathBefore.validAnswers.length,
      pathBefore.completed,
    );
    await client.query(
      "INSERT INTO session_answers (session_id,node_code,option_code,active,updated_at) VALUES ($1,$2,$3,true,now()) ON CONFLICT (session_id,node_code) DO UPDATE SET option_code=EXCLUDED.option_code,active=true,updated_at=now()",
      [sessionId, nodeCode, optionCode],
    );

    let answers = await loadAnswers(sessionId, client);
    const path = resolvePath(answers);
    if (path.invalidatedNodes.length) {
      await client.query(
        "UPDATE session_answers SET active=false,updated_at=now() WHERE session_id=$1 AND node_code=ANY($2::text[])",
        [sessionId, path.invalidatedNodes],
      );
      answers = await loadAnswers(sessionId, client);
    }

    const events: Array<Awaited<ReturnType<typeof persistJourneyEvent>>> = [];
    if (path.completed) {
      await persistResultSnapshot(
        sessionId,
        sessionBefore.journey_version,
        computeResult(answers),
        client,
      );
      const snapshot = await loadResultSnapshot(sessionId, client);
      if (!snapshot) throw new Error("Snapshot do resultado não encontrado.");
      await client.query(
        "UPDATE journey_sessions SET current_node=NULL,status='completed',completed_at=COALESCE(completed_at,now()),last_activity_at=now() WHERE id=$1",
        [sessionId],
      );
      if (sessionBefore.journey_invite_id) {
        const { rows } = await client.query<{ id: string }>(
          "UPDATE journey_invites SET status='completed',completed_at=COALESCE(completed_at,now()) WHERE id=$1 AND status='started' RETURNING id",
          [sessionBefore.journey_invite_id],
        );
        const completedInvite = rows[0];
        if (!completedInvite) throw new Error("Este convite não está mais disponível.");
        await logEvent(sessionId, "journey_completed", null, {}, client);
        events.push(
          await persistJourneyEvent(
            {
              event_type: "journey.completed",
              journey: { id: completedInvite.id, progress: 100 },
              diagnostic: { summary: diagnosticSummary(snapshot), result_reference: sessionId },
            },
            client,
          ),
        );
      }
    } else {
      await client.query(
        "UPDATE journey_sessions SET current_node=$2,status='in_progress',completed_at=NULL,last_activity_at=now() WHERE id=$1",
        [sessionId, path.currentNode],
      );
      if (sessionBefore.journey_invite_id) {
        const progress = calculateJourneyProgress(path.validAnswers.length, false);
        const progressEvent = await emitProgressIfIncreased(
          sessionId,
          sessionBefore.journey_invite_id,
          previousProgress,
          progress,
          client,
        );
        if (progressEvent) events.push(progressEvent);
      }
    }
    await logEvent(sessionId, "question_answered", nodeCode, { optionCode }, client);
    return events;
  });

  for (const event of transition) await deliverPersistedJourneyEvent(event);
  return getState(sessionId);
}

export async function buildResult(sessionId: string) {
  const session = await loadSession(sessionId);
  if (!session) return null;
  const answers = await loadAnswers(sessionId);
  const path = resolvePath(answers);
  if (!path.completed)
    return {
      session: {
        id: session.id,
        name: session.name,
        company: session.company,
        journeyVersion: session.journey_version,
      },
      completed: false,
      result: null,
      isInvited: Boolean(session.journey_invite_id),
    };
  const snapshot = await loadResultSnapshot(sessionId);
  if (!snapshot || session.status !== "completed") {
    return {
      session: {
        id: session.id,
        name: session.name,
        company: session.company,
        journeyVersion: session.journey_version,
      },
      completed: false,
      result: null,
      isInvited: Boolean(session.journey_invite_id),
    };
  }
  return {
    session: {
      id: session.id,
      name: session.name,
      company: session.company,
      journeyVersion: session.journey_version,
    },
    completed: true,
    isInvited: Boolean(session.journey_invite_id),
    result: resultFromSnapshot(snapshot),
  };
}

export async function restart(sessionId: string) {
  const session = await loadSession(sessionId);
  if (!session) throw new Error("Sessão não encontrada.");
  if (session.journey_invite_id)
    throw new Error("Uma jornada criada por convite não pode ser reiniciada.");
  await query("UPDATE journey_sessions SET status='abandoned' WHERE id=$1", [sessionId]);
  const newId = await createSession(session.name, session.company);
  await logEvent(newId, "journey_restarted", null, { previousSession: sessionId });
  return newId;
}
