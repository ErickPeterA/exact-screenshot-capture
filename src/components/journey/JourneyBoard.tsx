import { Check, Flag, MapPin } from "lucide-react";
import type { ReactNode } from "react";

import { cn } from "@/lib/utils";
import { NODES, TERRITORY_BY_CODE, type TerritoryCode } from "@/journey/nodes";
import type { TerritoryState } from "@/components/journey/TerritoryProgress";

const BOARD_SIZE = 9;

const TERRITORY_STYLE: Record<
  TerritoryCode,
  {
    tile: string;
    active: string;
    marker: string;
    mobile: string;
  }
> = {
  START: {
    tile: "border-muted-foreground/25 bg-muted/70",
    active: "ring-muted-foreground/30",
    marker: "bg-muted-foreground",
    mobile: "bg-muted-foreground",
  },
  STRATEGY: {
    tile: "border-strategy/25 bg-strategy-soft",
    active: "ring-strategy/35",
    marker: "bg-strategy",
    mobile: "bg-strategy",
  },
  PROCESS: {
    tile: "border-process/35 bg-process-soft",
    active: "ring-process/40",
    marker: "bg-process",
    mobile: "bg-process",
  },
  PEOPLE: {
    tile: "border-people/25 bg-people-soft",
    active: "ring-people/35",
    marker: "bg-people",
    mobile: "bg-people",
  },
  FINANCE: {
    tile: "border-finance/25 bg-finance-soft",
    active: "ring-finance/35",
    marker: "bg-finance",
    mobile: "bg-finance",
  },
  GOVERNANCE: {
    tile: "border-strategy/25 bg-strategy-soft",
    active: "ring-strategy/35",
    marker: "bg-strategy",
    mobile: "bg-strategy",
  },
  RESULT: {
    tile: "border-navy/25 bg-secondary",
    active: "ring-navy/35",
    marker: "bg-navy",
    mobile: "bg-navy",
  },
};

type BoardTile = {
  code: string;
  territory: TerritoryCode;
  title: string;
  shortTitle: string;
};

const TILES: BoardTile[] = [
  ...NODES.map((node) => ({
    code: node.code,
    territory: node.territory,
    title: TERRITORY_BY_CODE[node.territory]?.name ?? node.territory,
    shortTitle: node.code.replace("-", " "),
  })),
  {
    code: "RESULT",
    territory: "RESULT",
    title: "Resultado",
    shortTitle: "Mapa",
  },
];

export function JourneyBoard({
  states,
  currentNodeCode,
  answeredNodeCodes,
  progress,
  territoryIntro,
  children,
}: {
  states: TerritoryState[];
  currentNodeCode: string | null;
  answeredNodeCodes: Set<string>;
  progress: number;
  territoryIntro: string | undefined;
  children: ReactNode;
}) {
  return (
    <section className="mx-auto max-w-7xl px-4 py-5 sm:px-6 md:py-8">
      <div className="mb-4 flex flex-wrap items-center justify-between gap-3 md:mb-6">
        <div>
          <p className="text-xs font-semibold tracking-[0.14em] text-muted-foreground uppercase">
            Tabuleiro da jornada
          </p>
          <p className="mt-1 max-w-xl text-sm text-muted-foreground">{territoryIntro}</p>
        </div>
        <div className="min-w-40 rounded-lg border border-border bg-surface px-3 py-2 shadow-soft">
          <div className="flex items-center justify-between gap-4 text-xs font-semibold text-muted-foreground">
            <span>Avanco</span>
            <span>{progress}%</span>
          </div>
          <div className="mt-2 h-2 rounded-full bg-secondary">
            <div
              className="h-full rounded-full bg-primary transition-all duration-500"
              style={{ width: `${progress}%` }}
            />
          </div>
        </div>
      </div>

      <MobileBoardTrack
        tiles={TILES}
        currentNodeCode={currentNodeCode}
        answeredNodeCodes={answeredNodeCodes}
      />

      <div className="relative rounded-2xl border border-border bg-[linear-gradient(135deg,var(--surface)_0%,var(--surface-2)_100%)] p-3 shadow-card md:grid md:aspect-square md:min-h-[720px] md:grid-cols-9 md:grid-rows-9 md:gap-2">
        {TILES.map((tile, index) => (
          <BoardSpace
            key={tile.code}
            tile={tile}
            index={index}
            status={statusFor(tile.code, currentNodeCode, answeredNodeCodes)}
          />
        ))}

        <div
          className="rounded-xl border border-border bg-surface p-4 shadow-lift sm:p-5"
          style={{ gridColumn: "3 / span 5", gridRow: "3 / span 5" }}
        >
          <div className="mb-4 grid grid-cols-3 gap-2">
            {states.map((state) => {
              const style = TERRITORY_STYLE[state.code];
              return (
                <div
                  key={state.code}
                  className={cn(
                    "flex min-h-12 items-center gap-2 rounded-lg border px-3 py-2 text-xs font-medium",
                    state.status === "current"
                      ? "border-primary/35 bg-secondary text-foreground"
                      : "border-border bg-surface-2 text-muted-foreground",
                  )}
                >
                  <span
                    aria-hidden
                    className={cn(
                      "size-2.5 shrink-0 rounded-full",
                      state.status === "pending" ? "bg-border" : style.mobile,
                      state.status === "current" && "animate-glow",
                    )}
                  />
                  <span className="truncate">{state.name}</span>
                </div>
              );
            })}
          </div>
          {children}
        </div>
      </div>
    </section>
  );
}

function MobileBoardTrack({
  tiles,
  currentNodeCode,
  answeredNodeCodes,
}: {
  tiles: BoardTile[];
  currentNodeCode: string | null;
  answeredNodeCodes: Set<string>;
}) {
  return (
    <div className="mb-5 overflow-x-auto pb-2 md:hidden" aria-label="Trilha da jornada">
      <ol className="flex min-w-max gap-2">
        {tiles.map((tile, index) => {
          const status = statusFor(tile.code, currentNodeCode, answeredNodeCodes);
          const style = TERRITORY_STYLE[tile.territory];
          return (
            <li
              key={tile.code}
              className={cn(
                "grid h-20 w-20 shrink-0 place-items-center rounded-xl border text-center shadow-soft",
                style.tile,
                status === "current" && "ring-2 ring-offset-2 ring-offset-background",
                status === "current" && style.active,
                status === "pending" && "opacity-55",
              )}
              aria-current={status === "current" ? "step" : undefined}
            >
              <TileStatus status={status} marker={style.marker} />
              <span className="text-[10px] font-bold text-foreground">{index + 1}</span>
              <span className="max-w-16 truncate text-[10px] font-semibold text-muted-foreground">
                {tile.shortTitle}
              </span>
            </li>
          );
        })}
      </ol>
    </div>
  );
}

function BoardSpace({
  tile,
  index,
  status,
}: {
  tile: BoardTile;
  index: number;
  status: "done" | "current" | "pending";
}) {
  const position = perimeterPosition(index);
  const style = TERRITORY_STYLE[tile.territory];

  return (
    <div
      className={cn(
        "relative hidden min-h-0 flex-col justify-between rounded-xl border p-2 shadow-soft transition-all md:flex",
        style.tile,
        status === "current" &&
          "z-10 scale-[1.03] shadow-lift ring-2 ring-offset-2 ring-offset-background",
        status === "current" && style.active,
        status === "pending" && "opacity-60",
      )}
      style={{ gridColumn: position.column, gridRow: position.row }}
      aria-current={status === "current" ? "step" : undefined}
    >
      <div className="flex items-center justify-between gap-1">
        <span className="text-[11px] font-bold text-foreground">{index + 1}</span>
        <TileStatus status={status} marker={style.marker} />
      </div>
      <div>
        <p className="truncate text-[10px] font-semibold text-muted-foreground">{tile.title}</p>
        <p className="mt-0.5 truncate text-xs font-bold text-foreground">{tile.shortTitle}</p>
      </div>
    </div>
  );
}

function TileStatus({
  status,
  marker,
}: {
  status: "done" | "current" | "pending";
  marker: string;
}) {
  if (status === "done") {
    return (
      <span className="grid size-5 place-items-center rounded-full bg-finance text-navy-foreground">
        <Check className="size-3" />
      </span>
    );
  }
  if (status === "current") {
    return (
      <span className={cn("grid size-6 place-items-center rounded-full text-white", marker)}>
        <MapPin className="size-3.5" />
      </span>
    );
  }
  return (
    <span className="grid size-5 place-items-center rounded-full border border-border bg-surface text-muted-foreground">
      <Flag className="size-3" />
    </span>
  );
}

function statusFor(
  tileCode: string,
  currentNodeCode: string | null,
  answeredNodeCodes: Set<string>,
): "done" | "current" | "pending" {
  if (tileCode === currentNodeCode) return "current";
  if (answeredNodeCodes.has(tileCode)) return "done";
  if (tileCode === "RESULT" && currentNodeCode === null) return "current";
  return "pending";
}

function perimeterPosition(index: number) {
  const side = BOARD_SIZE - 1;
  const bottomStart = BOARD_SIZE + side;
  const leftStart = BOARD_SIZE + side * 2;

  if (index < BOARD_SIZE) {
    return { row: 1, column: index + 1 };
  }
  if (index < bottomStart) {
    return { row: index - BOARD_SIZE + 2, column: BOARD_SIZE };
  }
  if (index < leftStart) {
    return { row: BOARD_SIZE, column: BOARD_SIZE - 1 - (index - bottomStart) };
  }
  return { row: BOARD_SIZE - 1 - (index - leftStart), column: 1 };
}
