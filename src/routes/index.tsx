import { createFileRoute, Link } from "@tanstack/react-router";

import { Wordmark } from "@/components/brand/Wordmark";
import { Button } from "@/components/ui/button";
import { TEXTS } from "@/journey/config";
import { DIMENSIONS } from "@/journey/services";

const ACCENT_BAR: Record<string, string> = {
  STRATEGY: "bg-strategy",
  PROCESS: "bg-process",
  PEOPLE: "bg-people",
  FINANCE: "bg-finance",
};

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "Jornada do Empreendedor | VG Gestão de Resultados" },
      {
        name: "description",
        content:
          "Autodiagnóstico guiado de gestão: descubra em 5 a 8 minutos o que já está estruturado na sua empresa e o que merece atenção.",
      },
      { property: "og:title", content: "Jornada do Empreendedor | VG Gestão de Resultados" },
      {
        property: "og:description",
        content:
          "Percorra os territórios da gestão — estratégia, processos, pessoas e financeiro — e receba o mapa do momento atual da sua empresa.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: Landing,
});

function Landing() {
  return (
    <main className="min-h-screen">
      <section className="hero-gradient relative overflow-hidden text-navy-foreground">
        <div className="mx-auto max-w-5xl px-6 py-8">
          <Wordmark tone="light" />
        </div>
        <div className="mx-auto max-w-5xl px-6 pt-6 pb-20 md:pt-14 md:pb-28">
          <p className="animate-rise text-xs font-semibold tracking-[0.22em] text-navy-foreground/70 uppercase">
            Autodiagnóstico guiado
          </p>
          <h1 className="animate-rise mt-4 max-w-3xl font-display text-4xl leading-[1.05] font-bold text-balance md:text-6xl">
            {TEXTS.appName}
          </h1>
          <p className="animate-rise mt-5 max-w-2xl text-lg text-navy-foreground/80">
            {TEXTS.landingSubtitle}
          </p>

          <div className="animate-rise mt-9 flex flex-col items-start gap-3 sm:flex-row sm:items-center">
            <Button asChild size="lg" variant="secondary" className="px-7">
              <Link to="/jornada/inicio">Iniciar Jornada</Link>
            </Button>
            <span className="text-sm text-navy-foreground/70">
              {TEXTS.estimatedTime}
            </span>
          </div>
        </div>
      </section>

      <section className="mx-auto -mt-12 max-w-5xl px-6">
        <div className="surface-card p-6 md:p-9">
          <h2 className="font-display text-lg font-semibold">Como funciona</h2>
          <p className="mt-3 max-w-3xl leading-relaxed text-muted-foreground">
            {TEXTS.instructions}
          </p>

          <div className="mt-8 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            {DIMENSIONS.map((d, i) => (
              <div
                key={d.code}
                className="rounded-xl border border-border bg-surface-2 p-5"
              >
                <span
                  aria-hidden
                  className={`block h-1 w-10 rounded-full ${ACCENT_BAR[d.code]}`}
                />
                <p className="mt-4 font-display text-sm font-semibold">{d.name}</p>
                <p className="mt-1 text-sm text-muted-foreground">
                  Território {i + 1} da jornada
                </p>
              </div>
            ))}
          </div>
        </div>
      </section>

      <footer className="mx-auto mt-16 max-w-5xl px-6 pb-12 text-sm text-muted-foreground">
        <p>
          {TEXTS.brand} — as respostas são usadas apenas para gerar o seu mapa de
          gestão.
        </p>
      </footer>
    </main>
  );
}
