import type { ReactNode } from "react";

import { Wordmark } from "@/components/brand/Wordmark";
import {
  MaturityCard,
  OpportunityCard,
  PriorityCard,
  StructuredPointCard,
} from "@/components/result/ResultCards";
import { TEXTS } from "@/journey/config";
import type { JourneyResult } from "@/journey/engine";

export function ResultReport({
  company,
  result: r,
  actions,
}: {
  company: string;
  result: JourneyResult;
  actions?: ReactNode;
}) {
  return (
    <main className="min-h-screen pb-24">
      <header className="hero-gradient text-navy-foreground">
        <div className="mx-auto max-w-5xl px-6 py-8">
          <Wordmark tone="light" />
        </div>
        <div className="mx-auto max-w-5xl px-6 pb-14">
          <p className="text-xs font-semibold tracking-[0.2em] text-navy-foreground/70 uppercase">
            {company}
          </p>
          <h1 className="animate-rise mt-3 font-display text-3xl font-bold text-balance md:text-5xl">
            {TEXTS.resultTitle}
          </h1>
          <p className="mt-4 max-w-2xl text-navy-foreground/80">{TEXTS.resultSubtitle}</p>
        </div>
      </header>

      <div className="mx-auto max-w-5xl px-6">
        <section className="-mt-8" aria-labelledby="mapa">
          <h2 id="mapa" className="sr-only">
            Mapa de maturidade
          </h2>
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            {r.dimensionScores.map((dimension) => (
              <MaturityCard key={dimension.dimension} dimension={dimension} />
            ))}
          </div>
        </section>

        {r.diagnosticMode && (
          <section className="surface-card mt-10 border-l-4 border-l-strategy p-6 md:p-8">
            <p className="text-xs font-semibold tracking-[0.14em] text-muted-foreground uppercase">
              {TEXTS.diagnosticFirstStepTitle}
            </p>
            <h2 className="mt-2 font-display text-xl font-semibold">{TEXTS.diagnosticFirstStep}</h2>
            {r.investigationAreas.length > 0 && (
              <>
                <p className="mt-5 text-xs font-semibold tracking-[0.14em] text-muted-foreground uppercase">
                  {TEXTS.diagnosticAreasTitle}
                </p>
                <ul className="mt-2 flex flex-wrap gap-2">
                  {r.investigationAreas.map((area) => (
                    <li key={area} className="rounded-full bg-secondary px-3 py-1 text-sm">
                      {area}
                    </li>
                  ))}
                </ul>
              </>
            )}
          </section>
        )}

        {r.priorities.length > 0 && (
          <section className="mt-14" aria-labelledby="prioridades">
            <h2 id="prioridades" className="font-display text-2xl font-semibold">
              Pontos que merecem maior atenção
            </h2>
            <div className="mt-6 grid gap-5 md:grid-cols-2">
              {r.priorities.map((priority, index) => (
                <PriorityCard key={priority.serviceCode} recommendation={priority} index={index} />
              ))}
            </div>
          </section>
        )}

        {r.opportunities.length > 0 && (
          <section className="mt-12" aria-labelledby="oportunidades">
            <h2 id="oportunidades" className="font-display text-xl font-semibold">
              Oportunidades de evolução
            </h2>
            <div className="mt-5 grid gap-4 md:grid-cols-3">
              {r.opportunities.map((opportunity) => (
                <OpportunityCard key={opportunity.serviceCode} recommendation={opportunity} />
              ))}
            </div>
          </section>
        )}

        {r.structuredPoints.length > 0 && (
          <section className="mt-12" aria-labelledby="estruturado">
            <h2 id="estruturado" className="font-display text-xl font-semibold">
              O que já está estruturado
            </h2>
            <ul className="mt-5 grid gap-3 md:grid-cols-2">
              {r.structuredPoints.map((point, index) => (
                <StructuredPointCard
                  key={`${point.dimension}-${index}`}
                  text={point.text}
                  dimension={point.dimension}
                />
              ))}
            </ul>
          </section>
        )}

        {actions && <div className="mt-10 flex flex-wrap gap-3">{actions}</div>}
      </div>
    </main>
  );
}
