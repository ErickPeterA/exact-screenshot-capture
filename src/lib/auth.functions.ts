import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";

export const loginFn = createServerFn({ method: "POST" })
  .inputValidator((data) => z.object({ email: z.string().trim().email().max(180), password: z.string().min(1).max(256) }).parse(data))
  .handler(async ({ data }) => (await import("./auth.server")).login(data.email, data.password));

export const logoutFn = createServerFn({ method: "POST" })
  .handler(async () => { await (await import("./auth.server")).logout(); return { ok: true }; });

export const adminSessionFn = createServerFn({ method: "POST" })
  .handler(async () => {
    const user = await (await import("./auth.server")).currentUser();
    return { authenticated: Boolean(user?.is_admin), email: user?.email ?? null };
  });
