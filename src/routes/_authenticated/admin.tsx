import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useServerFn } from "@tanstack/react-start";
import { useQuery } from "@tanstack/react-query";
import { useState } from "react";

import { Wordmark } from "@/components/brand/Wordmark";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";
import { supabase } from "@/integrations/supabase/client";
import {
  adminAnalyticsFn,
  adminJourneyDetailFn,
  adminJourneysFn,
  adminMetricsFn,
} from "@/lib/admin.functions";
import { NODE_BY_CODE } from "@/journey/nodes";

export const Route = createFileRoute("/_authenticated/admin")({
  head: () => ({
    meta: [
      { title: "Painel interno | VG Gestão de Resultados" },
      {
        name: "description",
        content:
          "Acompanhe jornadas concluídas, leads captados e indicadores de uso do autodiagnóstico VG.",
      },
      { property: "og:title", content: "Painel interno | VG Gestão de Resultados" },
      {
        property: "og:description",
        content: "Indicadores, jornadas e leads do diagnóstico VG.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: AdminPage,
});

function AdminPage() {
  const navigate = useNavigate();
  const metricsFn = useServerFn(adminMetricsFn);
  const journeysFn = useServerFn(adminJourneysFn);
  const analyticsFn = useServerFn(adminAnalyticsFn);
  const detailFn = useServerFn(adminJourneyDetailFn);

  const [search, setSearch] = useState("");
  const [openId, setOpenId] = useState<string | null>(null);

  const metrics = useQuery({ queryKey: ["admin", "metrics"], queryFn: () => metricsFn() });
  const journeys = useQuery({
    queryKey: ["admin", "journeys"],
    queryFn: () => journeysFn(),
  });
  const analytics = useQuery({
    queryKey: ["admin", "analytics"],
    queryFn: () => analyticsFn(),
  });
  const detail = useQuery({
    queryKey: ["admin", "detail", openId],
    queryFn: () => detailFn({ data: { sessionId: openId! } }),
    enabled: Boolean(openId),
  });

  const denied =
    metrics.isError && /restrito/i.test(String((metrics.error as Error)?.message));

  if (denied) {
    return (
      <main className="flex min-h-screen items-center justify-center px-6 text-center">
        <div>
          <h1 className="font-display text-xl font-semibold">Acesso restrito</h1>
          <p className="mt-2 text-sm text-muted-foreground">
            Sua conta não tem permissão para ver o painel interno.
          </p>
          <Button
            variant="ghost"
            className="mt-4"
            onClick={async () => {
              await supabase.auth.signOut();
              navigate({ to: "/auth" });
            }}
          >
            Sair
          </Button>
        </div>
      </main>
    );
  }

  const rows = (journeys.data ?? []).filter((r) => {
    const q = search.trim().toLowerCase();
    if (!q) return true;
    return (
      (r.name ?? "").toLowerCase().includes(q) ||
      (r.company ?? "").toLowerCase().includes(q)
    );
  });

  return (
    <main className="min-h-screen">
      <header className="border-b border-border bg-surface">
        <div className="mx-auto flex max-w-6xl items-center justify-between px-6 py-5">
          <Wordmark />
          <Button
            variant="ghost"
            size="sm"
            onClick={async () => {
              await supabase.auth.signOut();
              navigate({ to: "/auth" });
            }}
          >
            Sair
          </Button>
        </div>
      </header>

      <div className="mx-auto max-w-6xl px-6 py-10">
        <h1 className="font-display text-2xl font-semibold">Painel interno</h1>

        <section className="mt-6 grid gap-4 sm:grid-cols-2 lg:grid-cols-5">
          <Metric label="Jornadas iniciadas" value={metrics.data?.started} />
          <Metric label="Concluídas" value={metrics.data?.completed} />
          <Metric label="Em andamento" value={metrics.data?.inProgress} />
          <Metric
            label="Taxa de conclusão"
            value={
              metrics.data ? `${metrics.data.completionRate}%` : undefined
            }
          />
          <Metric label="Leads captados" value={metrics.data?.leads} />
        </section>

        <Tabs defaultValue="journeys" className="mt-10">
          <TabsList>
            <TabsTrigger value="journeys">Jornadas</TabsTrigger>
            <TabsTrigger value="analytics">Indicadores</TabsTrigger>
          </TabsList>

          <TabsContent value="journeys" className="mt-5">
            <Input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Buscar por nome ou empresa"
              className="max-w-sm"
            />
            <div className="surface-card mt-4 overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Empresa</TableHead>
                    <TableHead>Responsável</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Área mais frágil</TableHead>
                    <TableHead>Principal recomendação</TableHead>
                    <TableHead>Lead</TableHead>
                    <TableHead>Data</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {rows.map((r) => (
                    <TableRow
                      key={r.id}
                      className="cursor-pointer"
                      onClick={() => setOpenId(r.id)}
                    >
                      <TableCell className="font-medium">{r.company}</TableCell>
                      <TableCell>{r.name}</TableCell>
                      <TableCell>{statusLabel(r.status)}</TableCell>
                      <TableCell>{r.weakestDimension ?? "—"}</TableCell>
                      <TableCell>{r.topRecommendation ?? "—"}</TableCell>
                      <TableCell>{r.hasLead ? "Sim" : "—"}</TableCell>
                      <TableCell>
                        {new Date(r.startedAt as string).toLocaleDateString("pt-BR")}
                      </TableCell>
                    </TableRow>
                  ))}
                  {rows.length === 0 && (
                    <TableRow>
                      <TableCell colSpan={7} className="text-muted-foreground">
                        {journeys.isLoading ? "Carregando..." : "Nenhuma jornada ainda."}
                      </TableCell>
                    </TableRow>
                  )}
                </TableBody>
              </Table>
            </div>
          </TabsContent>

          <TabsContent value="analytics" className="mt-5 grid gap-6 md:grid-cols-2">
            <div className="surface-card p-6">
              <h2 className="font-display text-sm font-semibold">Eventos registrados</h2>
              <ul className="mt-4 grid gap-2 text-sm">
                {(analytics.data?.byEvent ?? []).map(([name, count]) => (
                  <li key={name} className="flex justify-between">
                    <span className="text-muted-foreground">{name}</span>
                    <span className="font-medium">{count}</span>
                  </li>
                ))}
              </ul>
            </div>
            <div className="surface-card p-6">
              <h2 className="font-display text-sm font-semibold">
                Perguntas mais respondidas
              </h2>
              <ul className="mt-4 grid gap-2 text-sm">
                {(analytics.data?.byNode ?? []).slice(0, 12).map(([code, count]) => (
                  <li key={code} className="flex justify-between gap-4">
                    <span className="truncate text-muted-foreground">
                      {code} — {NODE_BY_CODE[code]?.question ?? ""}
                    </span>
                    <span className="font-medium">{count}</span>
                  </li>
                ))}
              </ul>
            </div>
          </TabsContent>
        </Tabs>
      </div>

      <Sheet open={Boolean(openId)} onOpenChange={(o) => !o && setOpenId(null)}>
        <SheetContent className="w-full overflow-y-auto sm:max-w-xl">
          <SheetHeader>
            <SheetTitle>{detail.data?.session?.company ?? "Jornada"}</SheetTitle>
            <SheetDescription>
              {detail.data?.session?.name} — {statusLabel(detail.data?.session?.status)}
            </SheetDescription>
          </SheetHeader>
          <div className="grid gap-6 px-4 pb-10 text-sm">
            {detail.isLoading && <p className="text-muted-foreground">Carregando...</p>}
            {detail.data?.lead && (
              <div className="surface-card p-4">
                <p className="font-semibold">Contato</p>
                <p className="mt-1 text-muted-foreground">
                  {detail.data.lead.email}
                  {detail.data.lead.whatsapp ? ` · ${detail.data.lead.whatsapp}` : ""}
                </p>
              </div>
            )}
            <div>
              <p className="font-semibold">Respostas</p>
              <ul className="mt-2 grid gap-2">
                {(detail.data?.answers ?? []).map((a) => {
                  const node = NODE_BY_CODE[a.node_code];
                  const option = node?.options.find((o) => o.code === a.option_code);
                  return (
                    <li key={a.id} className="rounded-lg border border-border p-3">
                      <p className="text-muted-foreground">{node?.question}</p>
                      <p className="mt-1 font-medium">{option?.label}</p>
                    </li>
                  );
                })}
              </ul>
            </div>
          </div>
        </SheetContent>
      </Sheet>
    </main>
  );
}

function Metric({ label, value }: { label: string; value?: number | string }) {
  return (
    <div className="surface-card p-5">
      <p className="text-xs tracking-wide text-muted-foreground uppercase">{label}</p>
      <p className="mt-2 font-display text-2xl font-bold">{value ?? "—"}</p>
    </div>
  );
}

function statusLabel(status?: string | null) {
  switch (status) {
    case "completed":
      return "Concluída";
    case "in_progress":
      return "Em andamento";
    case "started":
      return "Iniciada";
    case "abandoned":
      return "Abandonada";
    default:
      return "—";
  }
}
