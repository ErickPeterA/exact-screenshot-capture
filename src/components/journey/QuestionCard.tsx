import { useState } from "react";

import { cn } from "@/lib/utils";
import type { JourneyNode } from "@/journey/nodes";

const TERRITORY_ACCENT: Record<string, string> = {
  START: "border-l-muted-foreground",
  STRATEGY: "border-l-strategy",
  PROCESS: "border-l-process",
  PEOPLE: "border-l-people",
  FINANCE: "border-l-finance",
  GOVERNANCE: "border-l-strategy",
};

export function QuestionCard({
  node,
  territoryName,
  selected,
  saving,
  onSelect,
}: {
  node: JourneyNode;
  territoryName: string;
  selected?: string | null;
  saving: boolean;
  onSelect: (optionCode: string) => void;
}) {
  const [pending, setPending] = useState<string | null>(null);

  return (
    <section
      key={node.code}
      className={cn(
        "surface-card animate-rise border-l-4 p-6 md:p-9",
        TERRITORY_ACCENT[node.territory] ?? "border-l-navy",
      )}
      aria-labelledby={`q-${node.code}`}
    >
      <p className="text-xs font-semibold tracking-[0.14em] text-muted-foreground uppercase">
        {territoryName}
      </p>
      <h2
        id={`q-${node.code}`}
        className="mt-3 text-xl leading-snug font-semibold text-balance md:text-2xl"
      >
        {node.question}
      </h2>
      <p className="mt-2 text-sm text-muted-foreground">
        Responda de acordo com a realidade atual — não existem respostas certas ou
        erradas.
      </p>

      <div className="mt-6 grid gap-3">
        {node.options.map((option) => {
          const isSelected = (pending ?? selected) === option.code;
          return (
            <button
              key={option.code}
              type="button"
              disabled={saving}
              onClick={() => {
                setPending(option.code);
                onSelect(option.code);
              }}
              aria-pressed={isSelected}
              className={cn(
                "group w-full rounded-xl border px-4 py-4 text-left transition-all duration-200",
                "hover:border-primary/40 hover:bg-secondary hover:shadow-soft",
                "focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2",
                isSelected
                  ? "border-primary/60 bg-secondary shadow-card"
                  : "border-border bg-surface",
                saving && "opacity-70",
              )}
            >
              <span className="flex items-start gap-3">
                <span
                  aria-hidden
                  className={cn(
                    "mt-0.5 grid size-5 shrink-0 place-items-center rounded-full border text-[11px] transition-colors",
                    isSelected
                      ? "border-primary bg-primary text-primary-foreground"
                      : "border-border text-transparent",
                  )}
                >
                  ✓
                </span>
                <span>
                  <span className="block text-[15px] font-medium">{option.label}</span>
                  {option.description && (
                    <span className="mt-1 block text-sm text-muted-foreground">
                      {option.description}
                    </span>
                  )}
                </span>
              </span>
            </button>
          );
        })}
      </div>
    </section>
  );
}
