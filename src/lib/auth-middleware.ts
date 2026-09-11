import { createMiddleware } from "@tanstack/react-start";
import { requireAdmin } from "./auth.server";

export const requireLocalAdmin = createMiddleware({ type: "function" }).server(async ({ next }) => {
  const user = await requireAdmin();
  return next({ context: { userId: user.id, user } });
});
