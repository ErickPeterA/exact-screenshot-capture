import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";

import { requireLocalAdmin } from "./auth-middleware";

export const adminMetricsFn = createServerFn({ method: "POST" })
  .middleware([requireLocalAdmin])
  .handler(async ({ context }) => {
    const { dashboardMetrics } = await import("./admin.server");
    return dashboardMetrics();
  });

export const adminJourneysFn = createServerFn({ method: "POST" })
  .middleware([requireLocalAdmin])
  .handler(async ({ context }) => {
    const { listJourneys } = await import("./admin.server");
    return listJourneys();
  });

export const adminJourneyDetailFn = createServerFn({ method: "POST" })
  .middleware([requireLocalAdmin])
  .inputValidator((data) => z.object({ sessionId: z.string().uuid() }).parse(data))
  .handler(async ({ context, data }) => {
    const { journeyDetail } = await import("./admin.server");
    return journeyDetail(data.sessionId);
  });

export const adminAnalyticsFn = createServerFn({ method: "POST" })
  .middleware([requireLocalAdmin])
  .handler(async ({ context }) => {
    const { analyticsOverview } = await import("./admin.server");
    return analyticsOverview();
  });

export const adminIsAdminFn = createServerFn({ method: "POST" })
  .middleware([requireLocalAdmin])
  .handler(async ({ context }) => {
    return { isAdmin: Boolean(context.user) };
  });
