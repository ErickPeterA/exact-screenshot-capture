import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";

import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";

export const adminMetricsFn = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const { assertAdmin, dashboardMetrics } = await import("./admin.server");
    await assertAdmin(context.supabase as never, context.userId);
    return dashboardMetrics();
  });

export const adminJourneysFn = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const { assertAdmin, listJourneys } = await import("./admin.server");
    await assertAdmin(context.supabase as never, context.userId);
    return listJourneys();
  });

export const adminJourneyDetailFn = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((data) => z.object({ sessionId: z.string().uuid() }).parse(data))
  .handler(async ({ context, data }) => {
    const { assertAdmin, journeyDetail } = await import("./admin.server");
    await assertAdmin(context.supabase as never, context.userId);
    return journeyDetail(data.sessionId);
  });

export const adminAnalyticsFn = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const { assertAdmin, analyticsOverview } = await import("./admin.server");
    await assertAdmin(context.supabase as never, context.userId);
    return analyticsOverview();
  });

export const adminIsAdminFn = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const { data } = await context.supabase.rpc("has_role", {
      _user_id: context.userId,
      _role: "admin",
    });
    return { isAdmin: data === true };
  });
