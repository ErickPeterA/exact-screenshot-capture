import "./lib/error-capture";

import { consumeLastCapturedError } from "./lib/error-capture";
import { renderErrorPage } from "./lib/error-page";
import { query } from "./lib/db.server";
import {
  createJourneyAdminSession,
  exchangeCrmSsoCode,
  serializeJourneyAdminCookie,
} from "./lib/journey-admin-auth.server";

type ServerEntry = {
  fetch: (request: Request, env: unknown, ctx: unknown) => Promise<Response> | Response;
};

let serverEntryPromise: Promise<ServerEntry> | undefined;

async function getServerEntry(): Promise<ServerEntry> {
  if (!serverEntryPromise) {
    serverEntryPromise = import("@tanstack/react-start/server-entry").then(
      (m) => (m.default ?? m) as ServerEntry,
    );
  }
  return serverEntryPromise;
}

// h3 swallows in-handler throws into a normal 500 Response with body
// {"unhandled":true,"message":"HTTPError"} — try/catch alone never fires for those.
async function normalizeCatastrophicSsrResponse(response: Response): Promise<Response> {
  if (response.status < 500) return response;
  const contentType = response.headers.get("content-type") ?? "";
  if (!contentType.includes("application/json")) return response;

  const body = await response.clone().text();
  if (!isH3SwallowedErrorBody(body)) return response;

  console.error(consumeLastCapturedError() ?? new Error(`h3 swallowed SSR error: ${body}`));
  return new Response(renderErrorPage(), {
    status: 500,
    headers: { "content-type": "text/html; charset=utf-8" },
  });
}

function isH3SwallowedErrorBody(body: string): boolean {
  try {
    const payload = JSON.parse(body) as { unhandled?: unknown; message?: unknown };
    return payload.unhandled === true && payload.message === "HTTPError";
  } catch {
    return false;
  }
}

export default {
  async fetch(request: Request, env: unknown, ctx: unknown) {
    try {
      if (request.method === "GET" && new URL(request.url).pathname === "/auth/sso") {
        return await handleSsoCallback(request);
      }
      if (request.method === "GET" && new URL(request.url).pathname === "/health") {
        try {
          await query("SELECT 1");
          return Response.json({ status: "ok", database: "jornada" });
        } catch (error) {
          console.error("Health check database query failed", error);
          return Response.json({ status: "error", database: "unavailable" }, { status: 503 });
        }
      }
      const handler = await getServerEntry();
      const response = await handler.fetch(request, env, ctx);
      return await normalizeCatastrophicSsrResponse(response);
    } catch (error) {
      console.error(error);
      return new Response(renderErrorPage(), {
        status: 500,
        headers: { "content-type": "text/html; charset=utf-8" },
      });
    }
  },
};

async function handleSsoCallback(request: Request) {
  const url = new URL(request.url);
  const code = url.searchParams.get("code") ?? "";
  const next = safeJourneyAdminNext(url.searchParams.get("next"));
  try {
    const user = await exchangeCrmSsoCode(code);
    const session = await createJourneyAdminSession(user);
    // Keep this as a plain HTTP redirect. This callback is handled before
    // TanStack Start, so throwing TanStack's redirect Response would be
    // caught by the error boundary. A relative Location also prevents a
    // reverse proxy's internal host/protocol from leaking into the redirect.
    const headers = new Headers({
      location: next,
      "cache-control": "no-store",
    });
    headers.append("set-cookie", serializeJourneyAdminCookie(session.token, session.expiresAt));
    return new Response(null, { status: 303, headers });
  } catch {
    return new Response(renderSsoError(), {
      status: 401,
      headers: { "content-type": "text/html; charset=utf-8", "cache-control": "no-store" },
    });
  }
}

export function safeJourneyAdminNext(value: string | null): string {
  const hasControlCharacter = value
    ? Array.from(value).some((character) => {
        const code = character.charCodeAt(0);
        return code <= 31 || code === 127;
      })
    : false;
  if (!value || value.includes("\\") || hasControlCharacter) return "/gestao";
  if (value.includes("?") || value.includes("#")) return "/gestao";
  try {
    if (decodeURIComponent(value) !== value) return "/gestao";
    const parsed = new URL(value, "http://journey.internal");
    if (parsed.origin !== "http://journey.internal" || parsed.pathname !== value) return "/gestao";
    if (value !== "/gestao" && !value.startsWith("/gestao/")) return "/gestao";
    return value;
  } catch {
    return "/gestao";
  }
}

function renderSsoError() {
  return '<!doctype html><html lang="pt-BR"><head><meta charset="utf-8"><title>Acesso indisponível</title></head><body><main><h1>Não foi possível acessar a Jornada</h1><p>Volte ao CRM e tente novamente.</p></main></body></html>';
}
