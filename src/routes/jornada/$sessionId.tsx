import { createFileRoute, useNavigate, Link } from "@tanstack/react-router";
import { useServerFn } from "@tanstack/react-start";
import { useMutation, useQuery } from "@tanstack/react-query";
import { Play } from "lucide-react";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";

import { Wordmark } from "@/components/brand/Wordmark";
import { Button } from "@/components/ui/button";
import { BOARD_ENTRY_CODE, JourneyBoard } from "@/components/journey/JourneyBoard";
import { QuestionCard } from "@/components/journey/QuestionCard";
import {
  DiscoveryBackpack,
  DiscoveryModal,
  type Discovery,
} from "@/components/journey/DiscoveryLayer";
import { FIRST_NODE, NODE_BY_CODE, NODES, RESULT_NODE, TERRITORY_BY_CODE } from "@/journey/nodes";
import { SERVICE_BY_CODE } from "@/journey/services";
import { answerQuestionFn, getJourneyStateFn, trackEventFn } from "@/lib/journey.functions";

export const Route = createFileRoute("/jornada/$sessionId")({
  head: () => ({
    meta: [
      { title: "Sua jornada de gestão | VG Gestão de Resultados" },
      {
        name: "description",
        content:
          "Percorra os territórios de gestão da sua empresa e responda ao autodiagnóstico guiado da VG.",
      },
      { property: "og:title", content: "Sua jornada de gestão | VG Gestão de Resultados" },
      {
        property: "og:description",
        content: "Autodiagnóstico guiado por territórios de gestão empresarial.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: JourneyPage,
});

type State = Awaited<ReturnType<typeof getJourneyStateFn>>;
const BOARD_NODE_CODES = [...NODES.map((node) => node.code), RESULT_NODE];

function JourneyPage() {
  const { sessionId } = Route.useParams();
  const navigate = useNavigate();
  const getState = useServerFn(getJourneyStateFn);
  const answer = useServerFn(answerQuestionFn);
  const track = useServerFn(trackEventFn);

  const [override, setOverride] = useState<string | null>(null);
  const [discovery, setDiscovery] = useState<Discovery | null>(null);
  const [backpack, setBackpack] = useState<Discovery[]>([]);
  const [visualNodeCode, setVisualNodeCode] = useState<string | null>(null);
  const [focusedNodeCode, setFocusedNodeCode] = useState<string | null>(null);
  const [questionOpen, setQuestionOpen] = useState(true);
  const [actorWalking, setActorWalking] = useState(false);
  const [actorVisible, setActorVisible] = useState(false);
  const [actorTravelMs, setActorTravelMs] = useState(90);
  const [journeyStarted, setJourneyStarted] = useState(false);
  const shownTerritories = useRef<Set<string>>(new Set());
  const discoveryRef = useRef<Discovery | null>(null);
  const pendingResult = useRef(false);
  const movementTimers = useRef<ReturnType<typeof setTimeout>[]>([]);

  const stateQuery = useQuery({
    queryKey: ["journey", sessionId],
    queryFn: () => getState({ data: { sessionId } }),
    staleTime: Infinity,
  });

  const [state, setState] = useState<State | null>(null);
  const current = state ?? stateQuery.data ?? null;

  const clearMovementTimers = useCallback(() => {
    movementTimers.current.forEach((timer) => clearTimeout(timer));
    movementTimers.current = [];
  }, []);

  const scheduleMovementTimer = useCallback((callback: () => void, delay: number) => {
    const timer = setTimeout(callback, delay);
    movementTimers.current.push(timer);
  }, []);

  const animateToBoardNode = useCallback(
    (targetCode: string, onArrive: () => void) => {
      clearMovementTimers();

      const fromCode = visualNodeCode ?? current?.currentNode ?? targetCode;
      const fromIndex = BOARD_NODE_CODES.indexOf(fromCode);
      const toIndex = BOARD_NODE_CODES.indexOf(targetCode);

      if (fromIndex < 0 || toIndex < 0 || fromIndex === toIndex) {
        setActorTravelMs(90);
        setVisualNodeCode(targetCode);
        setActorWalking(false);
        scheduleMovementTimer(onArrive, 180);
        return;
      }

      const direction = toIndex > fromIndex ? 1 : -1;
      const path = Array.from(
        { length: Math.abs(toIndex - fromIndex) },
        (_, index) => fromIndex + direction * (index + 1),
      );
      const totalDuration = Math.min(900, Math.max(500, 450 + path.length * 55));
      const stepDuration = totalDuration / path.length;

      setActorTravelMs(90);
      setActorWalking(true);
      path.forEach((boardIndex, index) => {
        scheduleMovementTimer(
          () => setVisualNodeCode(BOARD_NODE_CODES[boardIndex] ?? targetCode),
          Math.round(stepDuration * (index + 1)),
        );
      });
      scheduleMovementTimer(() => setActorWalking(false), totalDuration + 40);
      scheduleMovementTimer(onArrive, totalDuration + 180);
    },
    [clearMovementTimers, current?.currentNode, scheduleMovementTimer, visualNodeCode],
  );

  useEffect(() => {
    return () => clearMovementTimers();
  }, [clearMovementTimers]);

  const mutation = useMutation({
    mutationFn: (vars: { nodeCode: string; optionCode: string }) =>
      answer({ data: { sessionId, ...vars } }),
    onSuccess: (next, vars) => {
      setOverride(null);
      const targetCode = next?.currentNode ?? RESULT_NODE;
      const completed = Boolean(next?.completed);

      if (!completed) {
        setState(next);
      }
      setFocusedNodeCode(targetCode);

      const node = NODE_BY_CODE[vars.nodeCode];
      const option = node?.options.find((o) => o.code === vars.optionCode);
      const scores = option?.scores ?? {};
      const top = Object.entries(scores)
        .filter(([, v]) => v >= 2)
        .sort((a, b) => b[1] - a[1])[0];
      if (top && node) {
        const service = SERVICE_BY_CODE[top[0]];
        if (service) {
          const item: Discovery = {
            serviceCode: service.code,
            serviceName: service.name,
            text: service.discoveryText,
            interpretation: service.interpretation,
            territory: TERRITORY_BY_CODE[node.territory]?.name ?? "",
          };
          setBackpack((b) => [...b, item]);
          if (!shownTerritories.current.has(node.territory)) {
            shownTerritories.current.add(node.territory);
            discoveryRef.current = item;
            setDiscovery(item);
            void track({
              data: {
                sessionId,
                eventName: "discovery_shown",
                nodeCode: node.code,
                metadata: { serviceCode: service.code },
              },
            });
          }
        }
      }
      animateToBoardNode(targetCode, () => {
        setFocusedNodeCode(null);
        if (completed) {
          pendingResult.current = true;
          if (!discoveryRef.current) goToResult();
          return;
        }
        setQuestionOpen(true);
      });
    },
    onError: () => {
      setActorWalking(false);
      setQuestionOpen(true);
    },
  });

  function goToResult() {
    navigate({ to: "/resultado/$sessionId", params: { sessionId } });
  }

  const nodeCode = override ?? current?.currentNode ?? null;
  const node = nodeCode ? NODE_BY_CODE[nodeCode] : null;
  const territory = node ? TERRITORY_BY_CODE[node.territory] : null;
  const waitingToStart =
    Boolean(current) &&
    current?.answers.length === 0 &&
    current?.currentNode === FIRST_NODE &&
    !journeyStarted &&
    !override;

  const startJourneyOnBoard = useCallback(() => {
    if (!current?.currentNode) return;

    clearMovementTimers();
    setJourneyStarted(true);
    setQuestionOpen(false);
    setFocusedNodeCode(current.currentNode);
    setActorTravelMs(680);
    setVisualNodeCode(BOARD_ENTRY_CODE);
    setActorVisible(true);
    setActorWalking(true);
    scheduleMovementTimer(() => setVisualNodeCode(current.currentNode), 40);
    scheduleMovementTimer(() => setActorWalking(false), 720);
    scheduleMovementTimer(() => {
      setActorTravelMs(90);
      setFocusedNodeCode(null);
      setQuestionOpen(true);
    }, 860);
  }, [clearMovementTimers, current?.currentNode, scheduleMovementTimer]);

  useEffect(() => {
    if (waitingToStart) {
      setActorVisible(false);
      setVisualNodeCode(BOARD_ENTRY_CODE);
      return;
    }
    if (!nodeCode || actorWalking || !questionOpen) return;
    setActorVisible(true);
    setVisualNodeCode(nodeCode);
  }, [actorWalking, nodeCode, questionOpen, waitingToStart]);

  const answeredIndex = current?.path.indexOf(nodeCode ?? "") ?? -1;
  const previousNode = answeredIndex > 0 ? (current?.path[answeredIndex - 1] ?? null) : null;
  const selected = current?.answers.find((a) => a.nodeCode === nodeCode)?.optionCode ?? null;
  const answeredNodeCodes = useMemo(
    () => new Set((current?.answers ?? []).map((answer) => answer.nodeCode)),
    [current?.answers],
  );

  if (stateQuery.isLoading) {
    return <CenterMessage text="Carregando sua jornada..." />;
  }
  if (!current) {
    return (
      <CenterMessage text="Não encontramos essa jornada.">
        <Button asChild className="mt-4">
          <Link to="/jornada/inicio">Iniciar uma nova jornada</Link>
        </Button>
      </CenterMessage>
    );
  }
  if (!node) {
    return (
      <CenterMessage text="Sua jornada está concluída.">
        <Button className="mt-4" onClick={goToResult}>
          Ver meu mapa
        </Button>
      </CenterMessage>
    );
  }

  const totalAnswered = current.answers.length;
  const progress = Math.min(95, Math.round((totalAnswered / 28) * 100));

  return (
    <main className="flex h-svh flex-col overflow-hidden">
      <header className="shrink-0 border-b border-border bg-surface/80 backdrop-blur">
        <div className="mx-auto flex max-w-7xl items-center justify-between gap-4 px-4 py-3 sm:px-6">
          <Wordmark />
          <DiscoveryBackpack discoveries={backpack} />
        </div>
        <div className="h-1 w-full bg-secondary" aria-hidden>
          <div
            className="h-full bg-primary transition-all duration-500"
            style={{ width: `${progress}%` }}
          />
        </div>
      </header>

      <div className="min-h-0 flex-1">
        <JourneyBoard
          currentNodeCode={waitingToStart ? BOARD_ENTRY_CODE : (focusedNodeCode ?? nodeCode)}
          actorNodeCode={visualNodeCode ?? nodeCode}
          answeredNodeCodes={answeredNodeCodes}
          modalOpen={questionOpen && !waitingToStart}
          actorVisible={actorVisible}
          actorWalking={actorWalking}
          actorTravelMs={actorTravelMs}
          startControl={
            waitingToStart ? (
              <Button size="lg" className="gap-2 shadow-lift" onClick={startJourneyOnBoard}>
                <Play className="size-4" />
                Iniciar jornada
              </Button>
            ) : null
          }
        >
          <div className="flex h-full min-h-0 flex-col">
            <div className="min-h-0 flex-1">
              <QuestionCard
                node={node}
                territoryName={territory?.name ?? ""}
                selected={selected}
                saving={mutation.isPending}
                variant="board"
                onSelect={(optionCode) => {
                  setQuestionOpen(false);
                  mutation.mutate({ nodeCode: node.code, optionCode });
                }}
              />
            </div>

            <div className="mt-3 flex shrink-0 items-center justify-between">
              <Button
                variant="ghost"
                size="sm"
                disabled={!previousNode}
                onClick={() => {
                  clearMovementTimers();
                  setFocusedNodeCode(null);
                  setActorWalking(false);
                  setActorVisible(true);
                  setVisualNodeCode(previousNode);
                  setQuestionOpen(true);
                  setOverride(previousNode);
                }}
              >
                ← Revisar resposta anterior
              </Button>
              {override && (
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => {
                    clearMovementTimers();
                    setFocusedNodeCode(null);
                    setActorWalking(false);
                    setActorVisible(true);
                    setVisualNodeCode(current?.currentNode ?? null);
                    setQuestionOpen(true);
                    setOverride(null);
                  }}
                >
                  Voltar para onde parei
                </Button>
              )}
            </div>
          </div>
        </JourneyBoard>
      </div>

      <DiscoveryModal
        discovery={discovery}
        onClose={() => {
          discoveryRef.current = null;
          setDiscovery(null);
          if (pendingResult.current) goToResult();
        }}
      />
    </main>
  );
}

function CenterMessage({ text, children }: { text: string; children?: React.ReactNode }) {
  return (
    <main className="flex min-h-screen items-center justify-center px-6">
      <div className="text-center">
        <p className="text-muted-foreground">{text}</p>
        {children}
      </div>
    </main>
  );
}
