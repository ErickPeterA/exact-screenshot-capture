import { createHash, randomBytes } from "node:crypto";

import { JOURNEY_VERSION } from "@/journey/config";

import { query } from "./db.server";
import {
  JourneyEventHttpError,
  sendJourneyCreatedEvent,
  sendJourneyEvent,
} from "./journey-events.server";
import { getState, logEvent, saveAnswer } from "./journey.server";
import { decryptJourneyToken, encryptJourneyToken } from "./journey-link-crypto.server";

export type ParticipantProfile = Record<string, never>;

export type JourneyIdentification = {
  name: string;
  company: string;
  email: string;
  phone: string;
};

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

type AdminInviteRow = {
  id: string;
  status: "created" | "started" | "completed" | "revoked";
  client_name: string | null;
  contact_name: string | null;
  contact_email: string | null;
  contact_phone: string | null;
  external_reference: string | null;
  crm_client_id: string | null;
  created_at: string;
  started_at: string | null;
  completed_at: string | null;
  revoked_at: string | null;
  expires_at: string | null;
  session_id: string | null;
  link_available: boolean;
};

export type JourneyInviteForManagement = Omit<AdminInviteRow, "status"> & {
  status: AdminInviteRow["status"] | "expired";
};

export type PublicJourneyAccess =
  | { status: "active"; state: NonNullable<Awaited<ReturnType<typeof getState>>> }
  | { status: "needs_details" }
  | { status: "invalid" | "completed" | "revoked" | "expired" };

export function hashJourneyToken(token: string) {
  return createHash("sha256").update(token, "utf8").digest("hex");
}

function logJourneyEventFailure(eventType: string, error: unknown) {
  const status = error instanceof JourneyEventHttpError ? ` HTTP ${error.status}.` : "";
  console.error(`Failed to deliver ${eventType} event to CRM.${status}`);
}

export async function createJourneyInvite(input: CreateJourneyInviteInput = {}) {
  const token = randomBytes(32).toString("base64url");
  const tokenHash = hashJourneyToken(token);
  const tokenEncrypted = encryptJourneyToken(token);
  const expiresAt = input.expires_at ? new Date(input.expires_at) : null;

  if (expiresAt && Number.isNaN(expiresAt.getTime())) {
    throw new Error("expires_at inválido.");
  }

  const { rows } = await query<{ id: string }>(
    `INSERT INTO journey_invites
      (token_hash, token_encrypted, external_reference, crm_client_id, client_name, contact_name, contact_email, expires_at)
     VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
     RETURNING id`,
    [
      tokenHash,
      tokenEncrypted,
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

  let syncWarning: string | null = null;
  try {
    await sendJourneyCreatedEvent(rows[0]!.id, expiresAt);
  } catch (error) {
    // Do not include the internal URL, secret, public token, or underlying error in logs.
    logJourneyEventFailure("journey.created", error);
    syncWarning = "Link gerado, mas não foi possível sincronizar com o CRM.";
  }

  return {
    invite_id: rows[0]!.id,
    token,
    url: `${baseUrl}/j/${encodeURIComponent(token)}`,
    sync_warning: syncWarning,
  };
}

function managementStatus(invite: AdminInviteRow): JourneyInviteForManagement["status"] {
  if (
    invite.expires_at &&
    new Date(invite.expires_at).getTime() <= Date.now() &&
    invite.status !== "completed" &&
    invite.status !== "revoked"
  ) {
    return "expired";
  }
  return invite.status;
}

function toManagementInvite(invite: AdminInviteRow): JourneyInviteForManagement {
  return { ...invite, status: managementStatus(invite) };
}

export async function listJourneyInvites(): Promise<JourneyInviteForManagement[]> {
  const { rows } = await query<AdminInviteRow>(
    `SELECT
       invites.id, invites.status, invites.client_name, invites.contact_name, invites.contact_email,
       invites.contact_phone,
       invites.external_reference, invites.crm_client_id, invites.created_at, invites.started_at,
       invites.completed_at, invites.revoked_at, invites.expires_at, sessions.id AS session_id,
       invites.token_encrypted IS NOT NULL AS link_available
     FROM journey_invites AS invites
     LEFT JOIN journey_sessions AS sessions ON sessions.journey_invite_id = invites.id
     ORDER BY invites.created_at DESC`,
  );
  return rows.map(toManagementInvite);
}

export async function getJourneyInviteUrl(inviteId: string) {
  const { rows } = await query<{
    token_encrypted: string | null;
    status: string;
    expires_at: string | null;
    revoked_at: string | null;
  }>(
    `SELECT token_encrypted, status, expires_at, revoked_at
       FROM journey_invites
      WHERE id = $1`,
    [inviteId],
  );
  const invite = rows[0];
  if (!invite) throw new Error("Jornada não encontrada.");
  if (invite.status === "completed" || invite.status === "revoked" || invite.revoked_at) {
    throw new Error("Este link não está mais disponível.");
  }
  if (invite.expires_at && new Date(invite.expires_at).getTime() <= Date.now()) {
    throw new Error("Este link expirou.");
  }
  if (!invite.token_encrypted) return { available: false as const };

  const token = decryptJourneyToken(invite.token_encrypted);
  const baseUrl = (process.env["PUBLIC_APP_URL"] ?? "https://jornada.vgresultados.com.br").replace(
    /\/$/,
    "",
  );
  return { available: true as const, url: `${baseUrl}/j/${encodeURIComponent(token)}` };
}

export async function revokeJourneyInvite(inviteId: string) {
  const { rows } = await query<{ id: string }>(
    `UPDATE journey_invites
        SET status = 'revoked', revoked_at = now()
      WHERE id = $1
        AND status IN ('created', 'started')
        AND revoked_at IS NULL
      RETURNING id`,
    [inviteId],
  );
  if (!rows[0]) throw new Error("Esta Jornada não está disponível para revogação.");
  return { id: rows[0].id };
}

export async function regenerateJourneyInvite(inviteId: string, input: CreateJourneyInviteInput) {
  const { rows } = await query<{ id: string }>(
    `UPDATE journey_invites
        SET status = 'revoked', revoked_at = now()
      WHERE id = $1
        AND status <> 'completed'
      RETURNING id`,
    [inviteId],
  );
  if (!rows[0]) throw new Error("Não foi possível gerar um novo link para esta Jornada.");
  return createJourneyInvite(input);
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

  const { rows } = await query<{ id: string }>(
    "SELECT id FROM journey_sessions WHERE journey_invite_id = $1",
    [invite.id],
  );
  const sessionId = rows[0]?.id;
  if (!sessionId) return { status: "needs_details" };

  const state = await getState(sessionId);
  return state ? { status: "active", state } : { status: "invalid" };
}

export async function startJourneyInvite(
  token: string,
  identification: JourneyIdentification,
  profile: ParticipantProfile,
): Promise<PublicJourneyAccess> {
  const invite = await findInvite(token);
  if (!invite) return { status: "invalid" };

  const blocked = blockedStatus(invite);
  if (blocked) return { status: blocked };

  const { rows } = await query<{ id: string; journey_id: string; started_now: boolean }>(
    `WITH eligible AS MATERIALIZED (
       SELECT id, status = 'created' AS started_now
         FROM journey_invites
        WHERE id = $1
          AND status IN ('created', 'started')
          AND revoked_at IS NULL
          AND (expires_at IS NULL OR expires_at > now())
        FOR UPDATE
     ), active_invite AS (
       UPDATE journey_invites AS invite
          SET status = 'started',
              started_at = COALESCE(invite.started_at, now()),
              contact_name = $2,
              client_name = $3,
              contact_email = $4,
              contact_phone = $5
         FROM eligible
        WHERE invite.id = eligible.id
       RETURNING invite.id, eligible.started_now
     )
     INSERT INTO journey_sessions
       (name, company, journey_version, status, current_node, journey_invite_id)
     SELECT $2, $3, $6, 'started', 'START-01', id
       FROM active_invite
     ON CONFLICT (journey_invite_id) WHERE journey_invite_id IS NOT NULL
     DO UPDATE SET name = EXCLUDED.name, company = EXCLUDED.company
     RETURNING id, journey_invite_id AS journey_id,
       (SELECT started_now FROM active_invite) AS started_now`,
    [
      invite.id,
      identification.name,
      identification.company,
      identification.email,
      identification.phone,
      JOURNEY_VERSION,
    ],
  );

  const sessionId = rows[0]?.id;
  if (!sessionId) {
    const current = await findInvite(token);
    return { status: current ? (blockedStatus(current) ?? "invalid") : "invalid" };
  }

  const journeyId = rows[0]!.journey_id;
  if (rows[0]!.started_now) {
    try {
      await sendJourneyEvent({ event_type: "journey.started", journey: { id: journeyId } });
    } catch (error) {
      logJourneyEventFailure("journey.started", error);
    }

    await logEvent(sessionId, "participant_profile_submitted", null, {
      ...identification,
      ...profile,
    });

    try {
      await sendJourneyEvent({
        event_type: "journey.identified",
        journey: { id: journeyId },
        identification,
      });
    } catch (error) {
      logJourneyEventFailure("journey.identified", error);
    }
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
