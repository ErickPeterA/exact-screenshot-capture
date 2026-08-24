import { cn } from "@/lib/utils";
import { TERRITORIES, type TerritoryCode } from "@/journey/nodes";

const ACCENT: Record<TerritoryCode, string> = {
  START: "bg-muted-foreground",
  STRATEGY: "bg-strategy",
  PROCESS: "bg-process",
  PEOPLE: "bg-people",
  FINANCE: "bg-finance",
  GOVERNANCE: "bg-strategy",
  RESULT: "bg-navy",
};

export interface TerritoryState {
  code: TerritoryCode;
  name: string;
  status: "done" | "current" | "pending";
}

export function TerritoryProgress({ states }: { states: TerritoryState[] }) {
  return (
    <nav aria-label="Progresso da jornada" className="w-full">
      <ol className="flex gap-2 overflow-x-auto pb-1 md:flex-col md:overflow-visible md:pb-0">
        {states.map((t) => (
          <li
            key={t.code}
            className={cn(
              "flex shrink-0 items-center gap-2.5 rounded-full border px-3 py-2 text-xs font-medium transition-colors md:rounded-xl md:text-sm",
              t.status === "current"
                ? "border-primary/35 bg-secondary text-foreground shadow-soft"
                : t.status === "done"
                  ? "border-transparent bg-transparent text-muted-foreground"
                  : "border-transparent bg-transparent text-muted-foreground/60",
            )}
            aria-current={t.status === "current" ? "step" : undefined}
          >
            <span
              aria-hidden
              className={cn(
                "size-2.5 rounded-full",
                t.status === "pending"
                  ? "bg-border"
                  : ACCENT[t.code],
                t.status === "current" && "animate-glow",
              )}
            />
            <span className="whitespace-nowrap">{t.name}</span>
            {t.status === "done" && (
              <span aria-hidden className="text-[10px] text-finance">
                ✓
              </span>
            )}
          </li>
        ))}
      </ol>
    </nav>
  );
}

export function buildStates(
  visited: Set<string>,
  current: TerritoryCode | null,
): TerritoryState[] {
  return TERRITORIES.map((t) => ({
    code: t.code,
    name: t.name,
    status:
      t.code === current ? "current" : visited.has(t.code) ? "done" : "pending",
  }));
}
