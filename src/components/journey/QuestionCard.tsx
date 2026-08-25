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
  variant = "default",
}: {
  node: JourneyNode;
  territoryName: string;
  selected?: string | null;
  saving: boolean;
  onSelect: (optionCode: string) => void;
  variant?: "default" | "board";
}) {
  const [pending, setPending] = useState<string | null>(null);

  return (
    <section
      key={node.code}
      className={cn(
        "animate-rise",
        variant === "default"
          ? cn(
              "surface-card border-l-4 p-6 md:p-9",
              TERRITORY_ACCENT[node.territory] ?? "border-l-navy",
            )
          : "flex h-full min-h-0 flex-col p-0",
      )}
      aria-labelledby={`q-${node.code}`}
    >
      <p
        className={cn(
          "font-semibold tracking-[0.14em] text-muted-foreground uppercase",
          variant === "board" ? "text-[10px]" : "text-xs",
        )}
      >
        {territoryName}
      </p>
      <h2
        id={`q-${node.code}`}
        className={cn(
          "leading-snug font-semibold text-balance",
          variant === "board" ? "mt-2 text-sm md:text-lg" : "mt-3 text-xl md:text-2xl",
        )}
      >
        {node.question}
      </h2>
      <p
        className={cn(
          "text-muted-foreground",
          variant === "board" ? "mt-1 text-[11px]" : "mt-2 text-sm",
        )}
      >
        Responda de acordo com a realidade atual — não existem respostas certas ou erradas.
      </p>

      <div
        className={cn(
          "mt-6 grid gap-3",
          variant === "board" && "mt-3 min-h-0 flex-1 content-start gap-1.5 overflow-y-auto pr-1",
        )}
      >
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
                "group w-full border text-left transition-all duration-200",
                variant === "board" ? "rounded-lg px-3 py-2" : "rounded-xl px-4 py-4",
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
                <span className="min-w-0">
                  <span
                    className={cn(
                      "block font-medium",
                      variant === "board" ? "text-[13px]" : "text-[15px]",
                    )}
                  >
                    {option.label}
                  </span>
                  {option.description && (
                    <span
                      className={cn(
                        "mt-1 block text-muted-foreground",
                        variant === "board" ? "text-[11px] leading-snug" : "text-sm",
                      )}
                    >
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
