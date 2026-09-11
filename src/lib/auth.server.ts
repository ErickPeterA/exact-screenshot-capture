import { compare } from "bcryptjs";
import { createHash, randomBytes } from "node:crypto";
import { getRequest, setCookie } from "@tanstack/react-start/server";
import { query } from "./db.server";

const COOKIE_NAME = "vg_admin_session";
const SESSION_TTL_SECONDS = 60 * 60 * 24 * 7;

type LocalUser = { id: string; email: string; is_admin: boolean };

function tokenHash(token: string) {
  return createHash("sha256").update(token, "utf8").digest("hex");
}

function readCookie(name: string) {
  const header = getRequest().headers.get("cookie") ?? "";
  return header.split(";").map((value) => value.trim()).find((value) => value.startsWith(`${name}=`))?.slice(name.length + 1);
}

function setSessionCookie(token: string, maxAge = SESSION_TTL_SECONDS) {
  setCookie(COOKIE_NAME, token, {
    httpOnly: true,
    sameSite: "lax",
    secure: process.env["NODE_ENV"] === "production",
    path: "/",
    maxAge,
  });
}

export async function currentUser(): Promise<LocalUser | null> {
  const token = readCookie(COOKIE_NAME);
  if (!token) return null;
  const { rows } = await query<LocalUser>(
    `SELECT u.id, u.email, EXISTS (
       SELECT 1 FROM user_roles r WHERE r.user_id = u.id AND r.role = 'admin'
     ) AS is_admin
     FROM app_sessions s
     JOIN app_users u ON u.id = s.user_id
     WHERE s.token_hash = $1 AND s.revoked_at IS NULL AND s.expires_at > now()`,
    [tokenHash(token)],
  );
  return rows[0] ?? null;
}

export async function requireAdmin() {
  const user = await currentUser();
  if (!user?.is_admin) throw new Error("Acesso restrito à equipe VG.");
  return user;
}

export async function login(email: string, password: string) {
  const { rows } = await query<{ id: string; email: string; password_hash: string; is_admin: boolean }>(
    `SELECT u.id, u.email, u.password_hash, EXISTS (
       SELECT 1 FROM user_roles r WHERE r.user_id = u.id AND r.role = 'admin'
     ) AS is_admin
     FROM app_users u WHERE lower(u.email) = lower($1)`,
    [email],
  );
  const user = rows[0];
  if (!user || !(await compare(password, user.password_hash)) || !user.is_admin) {
    throw new Error("E-mail ou senha inválidos.");
  }
  const token = randomBytes(32).toString("base64url");
  await query(
    "INSERT INTO app_sessions (user_id, token_hash, expires_at) VALUES ($1, $2, now() + interval '7 days')",
    [user.id, tokenHash(token)],
  );
  setSessionCookie(token);
  return { id: user.id, email: user.email, isAdmin: true };
}

export async function logout() {
  const token = readCookie(COOKIE_NAME);
  if (token) await query("UPDATE app_sessions SET revoked_at = now() WHERE token_hash = $1 AND revoked_at IS NULL", [tokenHash(token)]);
  setSessionCookie("", 0);
}
