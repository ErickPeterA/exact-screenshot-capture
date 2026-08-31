import { Check, Flag, LockKeyhole, MapPin, Trophy } from "lucide-react";
import type { CSSProperties, ReactNode } from "react";

import { NODES, TERRITORY_BY_CODE, type TerritoryCode } from "@/journey/nodes";
import { cn } from "@/lib/utils";

const DESKTOP_COLUMNS = 8;
const MOBILE_COLUMNS = 4;

const TERRITORY_STYLE: Record<
  TerritoryCode,
  {
    tile: string;
    active: string;
    marker: string;
    path: string;
  }
> = {
  START: {
    tile: "border-muted-foreground/25 bg-muted/80",
    active: "ring-muted-foreground/35",
    marker: "bg-muted-foreground",
    path: "from-muted to-muted-foreground/25",
  },
  STRATEGY: {
    tile: "border-strategy/30 bg-strategy-soft",
    active: "ring-strategy/45",
    marker: "bg-strategy",
    path: "from-strategy-soft to-strategy/20",
  },
  PROCESS: {
    tile: "border-process/40 bg-process-soft",
    active: "ring-process/45",
    marker: "bg-process",
    path: "from-process-soft to-process/20",
  },
  PEOPLE: {
    tile: "border-people/30 bg-people-soft",
    active: "ring-people/45",
    marker: "bg-people",
    path: "from-people-soft to-people/20",
  },
  FINANCE: {
    tile: "border-finance/35 bg-finance-soft",
    active: "ring-finance/45",
    marker: "bg-finance",
    path: "from-finance-soft to-finance/20",
  },
  GOVERNANCE: {
    tile: "border-strategy/30 bg-strategy-soft",
    active: "ring-strategy/45",
    marker: "bg-strategy",
    path: "from-strategy-soft to-strategy/20",
  },
  RESULT: {
    tile: "border-navy/30 bg-secondary",
    active: "ring-navy/45",
    marker: "bg-navy",
    path: "from-secondary to-navy/20",
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

const DESKTOP_ROWS = Math.ceil(TILES.length / DESKTOP_COLUMNS);
const MOBILE_ROWS = Math.ceil(TILES.length / MOBILE_COLUMNS);

export function JourneyBoard({
  currentNodeCode,
  actorNodeCode,
  answeredNodeCodes,
  modalOpen = true,
  actorWalking = false,
  children,
}: {
  currentNodeCode: string | null;
  actorNodeCode?: string | null;
  answeredNodeCodes: Set<string>;
  modalOpen?: boolean;
  actorWalking?: boolean;
  children: ReactNode;
}) {
  const actorCode = actorNodeCode ?? currentNodeCode ?? "RESULT";
  const desktopActor = centerForCode(actorCode, DESKTOP_COLUMNS, DESKTOP_ROWS);
  const mobileActor = centerForCode(actorCode, MOBILE_COLUMNS, MOBILE_ROWS);
  const modalOriginCode = currentNodeCode ?? actorCode;
  const desktopModalOrigin = centerForCode(modalOriginCode, DESKTOP_COLUMNS, DESKTOP_ROWS);
  const mobileModalOrigin = centerForCode(modalOriginCode, MOBILE_COLUMNS, MOBILE_ROWS);

  return (
    <section
      className="mx-auto flex h-full w-full max-w-7xl flex-col px-3 py-3 sm:px-5"
      aria-label="Tabuleiro da Jornada do Empreendedor"
    >
      <div
        className="journey-snake-board relative min-h-0 flex-1 overflow-hidden rounded-lg border border-border bg-surface shadow-lift"
        style={
          {
            "--board-desktop-columns": DESKTOP_COLUMNS,
            "--board-desktop-rows": DESKTOP_ROWS,
            "--board-mobile-columns": MOBILE_COLUMNS,
            "--board-mobile-rows": MOBILE_ROWS,
            "--actor-desktop-x": `${desktopActor.x}%`,
            "--actor-desktop-y": `${desktopActor.y}%`,
            "--actor-mobile-x": `${mobileActor.x}%`,
            "--actor-mobile-y": `${mobileActor.y}%`,
            "--modal-desktop-origin-x": `${desktopModalOrigin.x}%`,
            "--modal-desktop-origin-y": `${desktopModalOrigin.y}%`,
            "--modal-mobile-origin-x": `${mobileModalOrigin.x}%`,
            "--modal-mobile-origin-y": `${mobileModalOrigin.y}%`,
          } as CSSProperties
        }
      >
        <BoardPath columns={MOBILE_COLUMNS} rows={MOBILE_ROWS} className="md:hidden" />
        <BoardPath columns={DESKTOP_COLUMNS} rows={DESKTOP_ROWS} className="hidden md:block" />

        <ol className="journey-snake-grid relative z-10 size-full p-3 sm:p-4 md:p-6">
          {TILES.map((tile, index) => {
            const status = statusFor(tile.code, currentNodeCode, answeredNodeCodes);
            const desktopPosition = snakePosition(index, DESKTOP_COLUMNS);
            const mobilePosition = snakePosition(index, MOBILE_COLUMNS);
            const startsTerritory = index === 0 || TILES[index - 1]?.territory !== tile.territory;
            const endsTerritory =
              index === TILES.length - 1 || TILES[index + 1]?.territory !== tile.territory;

            return (
              <BoardSpace
                key={tile.code}
                tile={tile}
                index={index}
                status={status}
                startsTerritory={startsTerritory}
                endsTerritory={endsTerritory}
                style={
                  {
                    "--desktop-column": desktopPosition.column,
                    "--desktop-row": desktopPosition.row,
                    "--mobile-column": mobilePosition.column,
                    "--mobile-row": mobilePosition.row,
                  } as CSSProperties
                }
              />
            );
          })}
        </ol>

        <PixelEntrepreneur walking={actorWalking} />

        <div
          className={cn(
            "absolute inset-0 z-30 grid place-items-center bg-navy/10 p-3 backdrop-blur-[2px] transition-opacity duration-150 sm:p-5",
            modalOpen ? "opacity-100" : "pointer-events-none opacity-0",
          )}
          aria-hidden={!modalOpen}
        >
          <div
            className={cn(
              "journey-question-modal flex max-h-[76svh] min-h-[360px] w-full max-w-2xl overflow-hidden rounded-lg border border-border bg-surface/95 p-5 shadow-lift sm:min-h-[420px] sm:p-6",
              modalOpen ? "is-open" : "is-closed",
            )}
          >
            {children}
          </div>
        </div>
      </div>
    </section>
  );
}

function BoardPath({
  columns,
  rows,
  className,
}: {
  columns: number;
  rows: number;
  className?: string;
}) {
  const points = TILES.map((_, index) => {
    const position = snakePosition(index, columns);
    const x = ((position.column - 0.5) / columns) * 1000;
    const y = ((position.row - 0.5) / rows) * 1000;
    return `${x},${y}`;
  }).join(" ");

  return (
    <svg
      className={cn(
        "pointer-events-none absolute inset-0 z-0 size-full p-3 sm:p-4 md:p-6",
        className,
      )}
      viewBox="0 0 1000 1000"
      preserveAspectRatio="none"
      aria-hidden
    >
      <polyline
        points={points}
        fill="none"
        stroke="currentColor"
        strokeWidth="48"
        strokeLinecap="round"
        strokeLinejoin="round"
        className="text-navy/10"
      />
      <polyline
        points={points}
        fill="none"
        stroke="currentColor"
        strokeWidth="18"
        strokeLinecap="round"
        strokeLinejoin="round"
        strokeDasharray="8 18"
        className="text-surface/80"
      />
    </svg>
  );
}

function BoardSpace({
  tile,
  index,
  status,
  startsTerritory,
  endsTerritory,
  style,
}: {
  tile: BoardTile;
  index: number;
  status: "done" | "current" | "pending";
  startsTerritory: boolean;
  endsTerritory: boolean;
  style: CSSProperties;
}) {
  const territoryStyle = TERRITORY_STYLE[tile.territory];

  return (
    <li
      className={cn(
        "journey-snake-tile relative flex min-h-0 flex-col justify-between overflow-hidden rounded-md border p-1.5 shadow-soft transition-all duration-200 sm:p-2",
        "before:absolute before:inset-x-0 before:top-0 before:h-1 before:bg-gradient-to-r",
        territoryStyle.path,
        territoryStyle.tile,
        status === "current" &&
          "z-20 scale-[1.04] shadow-lift ring-2 ring-offset-2 ring-offset-background",
        status === "current" && territoryStyle.active,
        status === "done" && "opacity-95",
        status === "pending" && "opacity-55 grayscale-[0.1]",
        startsTerritory && "outline outline-1 outline-offset-[-3px] outline-white/70",
        endsTerritory &&
          "after:absolute after:right-1 after:bottom-1 after:size-1.5 after:bg-foreground/20",
      )}
      style={style}
      aria-current={status === "current" ? "step" : undefined}
    >
      <div className="relative z-10 flex items-start justify-between gap-1">
        <span className="font-display text-[10px] leading-none font-bold text-foreground sm:text-xs">
          {index + 1}
        </span>
        <TileStatus
          status={status}
          marker={territoryStyle.marker}
          checkpoint={startsTerritory}
          result={tile.code === "RESULT"}
        />
      </div>
      <div className="relative z-10 min-w-0">
        <p className="hidden truncate text-[10px] font-semibold text-muted-foreground md:block">
          {tile.title}
        </p>
        <p className="truncate font-display text-[10px] leading-tight font-bold text-foreground sm:text-xs">
          {tile.shortTitle}
        </p>
      </div>
    </li>
  );
}

function TileStatus({
  status,
  marker,
  checkpoint,
  result,
}: {
  status: "done" | "current" | "pending";
  marker: string;
  checkpoint: boolean;
  result: boolean;
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
  if (result) {
    return (
      <span className="grid size-5 place-items-center rounded-full border border-border bg-surface text-navy">
        <Trophy className="size-3" />
      </span>
    );
  }
  if (checkpoint) {
    return (
      <span className="grid size-5 place-items-center rounded-full border border-border bg-surface text-muted-foreground">
        <Flag className="size-3" />
      </span>
    );
  }
  return (
    <span className="grid size-5 place-items-center rounded-full border border-border bg-surface text-muted-foreground">
      <LockKeyhole className="size-3" />
    </span>
  );
}

function PixelEntrepreneur({ walking }: { walking: boolean }) {
  return (
    <div
      className={cn(
        "pixel-entrepreneur pointer-events-none absolute z-20",
        walking ? "is-walking" : "is-idle",
      )}
      aria-hidden
    >
      <span className="pixel-head" />
      <span className="pixel-body" />
      <span className="pixel-tie" />
      <span className="pixel-leg left" />
      <span className="pixel-leg right" />
      <span className="pixel-case" />
      <span className="pixel-shadow" />
    </div>
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

function snakePosition(index: number, columns: number) {
  const row = Math.floor(index / columns) + 1;
  const offset = index % columns;
  const column = row % 2 === 1 ? offset + 1 : columns - offset;
  return { row, column };
}

function centerForCode(code: string, columns: number, rows: number) {
  const index = Math.max(
    0,
    TILES.findIndex((tile) => tile.code === code),
  );
  const position = snakePosition(index, columns);

  return {
    x: ((position.column - 0.5) / columns) * 100,
    y: ((position.row - 0.5) / rows) * 100,
  };
}
