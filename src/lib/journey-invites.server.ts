import { createHash, randomBytes } from "node:crypto";

import { JOURNEY_VERSION } from "@/journey/config";

import { query } from "./db.server";
import { getState, saveAnswer } from "./journey.server";

export type CreateJourneyInviteInput = {
  external_reference?: string | null;
  crm_client_id?: string | null;
  client_name?: string | null;
  contact_name?: string | null;
  contact_email?: string | null;
  expires_at?: Date | string | null;
};

type InviteRow = {
  id: string;
  status: "created" | "started" | "completed" | "revoked";
  expires_at: string | null;
  revoked_at: string | null;
  client_name: string | null;
  contact_name: string | null;
  external_reference: string | null;
};

export type PublicJourneyAccess =
  | { status: "active"; state: NonNullable<Awaited<ReturnType<typeof getState>>> }
  | { status: "invalid" | "completed" | "revoked" | "expired" };

export function hashJourneyToken(token: string) {
  return createHash("sha256").update(token, "utf8").digest("hex");
}

export async function createJourneyInvite(input: CreateJourneyInviteInput = {}) {
  const token = randomBytes(32).toString("base64url");
  const tokenHash = hashJourneyToken(token);
  const expiresAt = input.expires_at ? new Date(input.expires_at) : null;

  if (expiresAt && Number.isNaN(expiresAt.getTime())) {
    throw new Error("expires_at inválido.");
  }

  const { rows } = await query<{ id: string }>(
    `INSERT INTO journey_invites
      (token_hash, external_reference, crm_client_id, client_name, contact_name, contact_email, expires_at)
     VALUES ($1, $2, $3, $4, $5, $6, $7)
     RETURNING id`,
    [
      tokenHash,
      input.external_reference ?? null,
      input.crm_client_id ?? null,
      input.client_name ?? null,
      input.contact_name ?? null,
      input.contact_email ?? null,
      expiresAt,
    ],
  );

  const baseUrl = (process.env["PUBLIC_APP_URL"] ?? "https://jornada.vgresultados.com.br").replace(
    /\/$/,
    "",
  );

  return {
    invite_id: rows[0]!.id,
    token,
    url: `${baseUrl}/j/${encodeURIComponent(token)}`,
  };
}

async function findInvite(token: string) {
  if (!token || token.length > 256) return null;
  const { rows } = await query<InviteRow>(
    `SELECT id, status, expires_at, revoked_at, client_name, contact_name, external_reference
       FROM journey_invites
      WHERE token_hash = $1`,
    [hashJourneyToken(token)],
  );
  return rows[0] ?? null;
}

function blockedStatus(invite: InviteRow) {
  if (invite.status === "completed") return "completed" as const;
  if (invite.status === "revoked" || invite.revoked_at) return "revoked" as const;
  if (invite.expires_at && new Date(invite.expires_at).getTime() <= Date.now()) {
    return "expired" as const;
  }
  if (invite.status !== "created" && invite.status !== "started") return "invalid" as const;
  return null;
}

export async function openJourneyInvite(token: string): Promise<PublicJourneyAccess> {
  const invite = await findInvite(token);
  if (!invite) return { status: "invalid" };

  const blocked = blockedStatus(invite);
  if (blocked) return { status: blocked };

  const name = invite.contact_name?.trim() || invite.client_name?.trim() || "Cliente";
  const company =
    invite.client_name?.trim() || invite.external_reference?.trim() || "Empresa não informada";

  const { rows } = await query<{ id: string }>(
    `WITH active_invite AS (
       UPDATE journey_invites
          SET status = 'started', started_at = COALESCE(started_at, now())
        WHERE id = $1
          AND status IN ('created', 'started')
          AND revoked_at IS NULL
          AND (expires_at IS NULL OR expires_at > now())
       RETURNING id
     )
     INSERT INTO journey_sessions
       (name, company, journey_version, status, current_node, journey_invite_id)
     SELECT $2, $3, $4, 'started', 'START-01', id
       FROM active_invite
     ON CONFLICT (journey_invite_id) WHERE journey_invite_id IS NOT NULL
     DO UPDATE SET journey_invite_id = EXCLUDED.journey_invite_id
     RETURNING id`,
    [invite.id, name, company, JOURNEY_VERSION],
  );

  const sessionId = rows[0]?.id;
  if (!sessionId) {
    const current = await findInvite(token);
    return { status: current ? (blockedStatus(current) ?? "invalid") : "invalid" };
  }

  const state = await getState(sessionId);
  if (!state) return { status: "invalid" };
  return { status: "active", state };
}

export async function saveInviteAnswer(token: string, nodeCode: string, optionCode: string) {
  const invite = await findInvite(token);
  if (!invite || blockedStatus(invite)) return null;

  const { rows } = await query<{ id: string }>(
    "SELECT id FROM journey_sessions WHERE journey_invite_id = $1",
    [invite.id],
  );
  const sessionId = rows[0]?.id;
  if (!sessionId) return null;

  return saveAnswer(sessionId, nodeCode, optionCode);
}
