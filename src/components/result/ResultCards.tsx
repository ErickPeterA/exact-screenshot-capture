import { cn } from "@/lib/utils";
import type { DimensionScore, Recommendation } from "@/journey/engine";
import type { DimensionCode } from "@/journey/services";

const DIM_STYLE: Record<DimensionCode, { bar: string; soft: string; label: string }> = {
  STRATEGY: { bar: "bg-strategy", soft: "bg-strategy-soft", label: "text-strategy" },
  PROCESS: { bar: "bg-process", soft: "bg-process-soft", label: "text-process" },
  PEOPLE: { bar: "bg-people", soft: "bg-people-soft", label: "text-people" },
  FINANCE: { bar: "bg-finance", soft: "bg-finance-soft", label: "text-finance" },
};

const BAND_STYLE: Record<string, string> = {
  ESTRUTURADO: "text-band-strong",
  "EM EVOLUÇÃO": "text-band-evolving",
  "REQUER ATENÇÃO": "text-band-attention",
  "REQUER PRIORIDADE": "text-band-priority",
};

export function MaturityCard({ dimension }: { dimension: DimensionScore }) {
  const style = DIM_STYLE[dimension.dimension];
  return (
    <div className="surface-card overflow-hidden">
      <div className={cn("h-1.5 w-full", style.bar)} aria-hidden />
      <div className="p-5">
        <p className="font-display text-sm font-semibold">{dimension.name}</p>
        <p
          className={cn(
            "mt-2 text-[13px] font-bold tracking-[0.12em] uppercase",
            BAND_STYLE[dimension.label] ?? "text-muted-foreground",
          )}
        >
          {dimension.label}
        </p>
        {dimension.evaluatedQuestions === 0 && (
          <p className="mt-2 text-xs text-muted-foreground">
            Sem perguntas aplicáveis nesta jornada.
          </p>
        )}
      </div>
    </div>
  );
}

export function PriorityCard({
  recommendation,
  index,
}: {
  recommendation: Recommendation;
  index: number;
}) {
  const style = DIM_STYLE[recommendation.dimension];
  return (
    <article className="surface-card p-6">
      <div className="flex items-center gap-3">
        <span
          className={cn(
            "grid size-8 place-items-center rounded-lg font-display text-sm font-bold text-foreground",
            style.soft,
          )}
        >
          {index + 1}
        </span>
        <p className="text-xs font-semibold tracking-[0.14em] text-muted-foreground uppercase">
          Necessidade identificada
        </p>
      </div>
      <h3 className="mt-3 text-lg leading-snug font-semibold">{recommendation.need}</h3>

      <p className="mt-5 text-xs font-semibold tracking-[0.14em] text-muted-foreground uppercase">
        O que percebemos
      </p>
      <p className="mt-1.5 text-[15px] leading-relaxed text-muted-foreground">
        {recommendation.interpretation}
      </p>

      <p className="mt-5 text-xs font-semibold tracking-[0.14em] text-muted-foreground uppercase">
        Solução VG relacionada
      </p>
      <p className={cn("mt-1.5 font-display font-semibold", style.label)}>
        {recommendation.serviceName}
      </p>
    </article>
  );
}

export function OpportunityCard({
  recommendation,
}: {
  recommendation: Recommendation;
}) {
  const style = DIM_STYLE[recommendation.dimension];
  return (
    <article className="rounded-xl border border-border bg-surface-2 p-5">
      <div className="flex items-center gap-2">
        <span className={cn("size-2 rounded-full", style.bar)} aria-hidden />
        <p className="text-xs tracking-wide text-muted-foreground uppercase">
          Oportunidade de evolução
        </p>
      </div>
      <h4 className="mt-2 text-[15px] font-semibold">{recommendation.need}</h4>
      <p className="mt-1.5 text-sm text-muted-foreground">
        {recommendation.interpretation}
      </p>
      <p className="mt-3 text-sm font-medium">{recommendation.serviceName}</p>
    </article>
  );
}

export function StructuredPointCard({
  text,
  dimension,
}: {
  text: string;
  dimension: DimensionCode;
}) {
  const style = DIM_STYLE[dimension];
  return (
    <li className="flex items-start gap-3 rounded-xl border border-border bg-surface p-4">
      <span
        className={cn("mt-1 size-2 shrink-0 rounded-full", style.bar)}
        aria-hidden
      />
      <span className="text-sm leading-relaxed">{text}</span>
    </li>
  );
}
