import { createHash, randomBytes } from "node:crypto";

import { getCookie } from "@tanstack/react-start/server";

import { query } from "./db.server";

export const JOURNEY_ADMIN_COOKIE = "journey_admin_session";
export const JOURNEY_ADMIN_SESSION_SECONDS = 60 * 60 * 12;

export type CrmSsoUser = {
  user_id: string;
  name: string | null;
  email: string | null;
  role: string | null;
  permissions: unknown;
};

export type JourneyAdminSession = Omit<CrmSsoUser, "user_id"> & {
  id: string;
  crm_user_id: string;
  expires_at: string;
};

function hashToken(token: string) {
  return createHash("sha256").update(token, "utf8").digest("hex");
}

function normalizePermissions(value: unknown) {
  return Array.isArray(value) || (typeof value === "object" && value !== null) ? value : [];
}

export async function createJourneyAdminSession(user: CrmSsoUser) {
  const token = randomBytes(32).toString("base64url");
  const expiresAt = new Date(Date.now() + JOURNEY_ADMIN_SESSION_SECONDS * 1000);
  await query(
    `INSERT INTO journey_admin_sessions
      (token_hash, crm_user_id, user_name, user_email, role, permissions, expires_at)
     VALUES ($1, $2, $3, $4, $5, $6::jsonb, $7)`,
    [
      hashToken(token),
      user.user_id,
      user.name,
      user.email,
      user.role,
      JSON.stringify(normalizePermissions(user.permissions)),
      expiresAt,
    ],
  );
  return { token, expiresAt };
}

export async function getJourneyAdminSessionFromToken(token: string | undefined) {
  if (!token || token.length > 256) return null;
  const { rows } = await query<JourneyAdminSession>(
    `UPDATE journey_admin_sessions
        SET last_seen_at = now()
      WHERE token_hash = $1
        AND revoked_at IS NULL
        AND expires_at > now()
      RETURNING id, crm_user_id, user_name AS name, user_email AS email, role, permissions, expires_at`,
    [hashToken(token)],
  );
  return rows[0] ?? null;
}

export async function getJourneyAdminSession() {
  return getJourneyAdminSessionFromToken(getCookie(JOURNEY_ADMIN_COOKIE));
}

export async function requireJourneyAdminSession() {
  const session = await getJourneyAdminSession();
  if (!session) throw new Error("Acesso administrativo não autorizado.");
  return session;
}

export async function revokeJourneyAdminSession(token: string | undefined) {
  if (!token || token.length > 256) return;
  await query(
    "UPDATE journey_admin_sessions SET revoked_at = COALESCE(revoked_at, now()) WHERE token_hash = $1",
    [hashToken(token)],
  );
}

export function serializeJourneyAdminCookie(token: string, expiresAt: Date) {
  const secure = process.env["NODE_ENV"] === "production" ? "; Secure" : "";
  return `${JOURNEY_ADMIN_COOKIE}=${token}; Path=/; HttpOnly; SameSite=Lax; Max-Age=${JOURNEY_ADMIN_SESSION_SECONDS}; Expires=${expiresAt.toUTCString()}${secure}`;
}

export async function exchangeCrmSsoCode(code: string): Promise<CrmSsoUser> {
  const baseUrl = process.env["CRM_INTERNAL_URL"]?.replace(/\/$/, "");
  const secret = process.env["JOURNEY_SSO_SECRET"];
  if (!baseUrl || !secret) throw new Error("SSO não configurado.");
  if (!code || code.length > 256) throw new Error("Código SSO inválido.");

  let response: Response;
  try {
    response = await fetch(`${baseUrl}/api/internal/sso/journey/exchange`, {
      method: "POST",
      headers: { "content-type": "application/json", "x-journey-sso-secret": secret },
      body: JSON.stringify({ code }),
      signal: AbortSignal.timeout(10_000),
    });
  } catch {
    throw new Error("Não foi possível validar o acesso no CRM.");
  }
  if (!response.ok) throw new Error("Não foi possível validar o acesso no CRM.");

  const payload: unknown = await response.json().catch(() => null);
  if (!payload || typeof payload !== "object") throw new Error("Resposta SSO inválida.");
  const user = payload as Partial<CrmSsoUser>;
  if (typeof user.user_id !== "string" || !user.user_id) throw new Error("Resposta SSO inválida.");
  return {
    user_id: user.user_id,
    name: typeof user.name === "string" ? user.name : null,
    email: typeof user.email === "string" ? user.email : null,
    role: typeof user.role === "string" ? user.role : null,
    permissions: normalizePermissions(user.permissions),
  };
}
