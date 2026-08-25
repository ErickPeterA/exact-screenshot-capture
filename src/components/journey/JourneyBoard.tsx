import { Check, Flag, MapPin } from "lucide-react";
import type { ReactNode } from "react";

import { cn } from "@/lib/utils";
import { NODES, TERRITORY_BY_CODE, type TerritoryCode } from "@/journey/nodes";

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
  currentNodeCode,
  answeredNodeCodes,
  children,
}: {
  currentNodeCode: string | null;
  answeredNodeCodes: Set<string>;
  children: ReactNode;
}) {
  return (
    <section className="mx-auto flex h-full w-full max-w-7xl flex-col px-3 py-2 sm:px-4">
      <MobileBoardTrack
        tiles={TILES}
        currentNodeCode={currentNodeCode}
        answeredNodeCodes={answeredNodeCodes}
      />

      <div className="hidden min-h-0 flex-1 items-center justify-center md:flex">
        <div
          className="aspect-square rounded-2xl border border-border bg-[linear-gradient(135deg,var(--surface)_0%,var(--surface-2)_100%)] p-2 shadow-card"
          style={{
            width: "min(100%, calc(100svh - 6.25rem), 920px)",
            height: "min(100%, calc(100svh - 6.25rem), 920px)",
          }}
        >
          <div className="grid size-full grid-cols-9 grid-rows-9 gap-1.5">
            {TILES.map((tile, index) => (
              <BoardSpace
                key={tile.code}
                tile={tile}
                index={index}
                status={statusFor(tile.code, currentNodeCode, answeredNodeCodes)}
              />
            ))}

            <div
              className="min-h-0 overflow-hidden rounded-xl border border-border bg-surface/95 p-3 shadow-lift"
              style={{ gridColumn: "3 / span 5", gridRow: "3 / span 5" }}
            >
              {children}
            </div>
          </div>
        </div>
      </div>

      <div className="min-h-0 flex-1 overflow-hidden rounded-xl border border-border bg-surface p-3 shadow-lift md:hidden">
        {children}
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
    <div className="mb-2 shrink-0 overflow-x-auto pb-1 md:hidden" aria-label="Trilha da jornada">
      <ol className="flex min-w-max gap-1.5">
        {tiles.map((tile, index) => {
          const status = statusFor(tile.code, currentNodeCode, answeredNodeCodes);
          const style = TERRITORY_STYLE[tile.territory];
          return (
            <li
              key={tile.code}
              className={cn(
                "grid h-14 w-14 shrink-0 place-items-center rounded-lg border text-center shadow-soft",
                style.tile,
                status === "current" && "ring-2 ring-offset-2 ring-offset-background",
                status === "current" && style.active,
                status === "pending" && "opacity-55",
              )}
              aria-current={status === "current" ? "step" : undefined}
            >
              <TileStatus status={status} marker={style.marker} compact />
              <span className="text-[9px] font-bold text-foreground">{index + 1}</span>
              <span className="max-w-12 truncate text-[9px] font-semibold text-muted-foreground">
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
        "relative hidden min-h-0 overflow-hidden flex-col justify-between rounded-lg border p-1.5 shadow-soft transition-all md:flex",
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
        <TileStatus status={status} marker={style.marker} compact />
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
  compact = false,
}: {
  status: "done" | "current" | "pending";
  marker: string;
  compact?: boolean;
}) {
  if (status === "done") {
    return (
      <span
        className={cn(
          "grid place-items-center rounded-full bg-finance text-navy-foreground",
          compact ? "size-4" : "size-5",
        )}
      >
        <Check className={compact ? "size-2.5" : "size-3"} />
      </span>
    );
  }
  if (status === "current") {
    return (
      <span
        className={cn(
          "grid place-items-center rounded-full text-white",
          compact ? "size-5" : "size-6",
          marker,
        )}
      >
        <MapPin className={compact ? "size-3" : "size-3.5"} />
      </span>
    );
  }
  return (
    <span
      className={cn(
        "grid place-items-center rounded-full border border-border bg-surface text-muted-foreground",
        compact ? "size-4" : "size-5",
      )}
    >
      <Flag className={compact ? "size-2.5" : "size-3"} />
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
