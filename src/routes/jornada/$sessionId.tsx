import { createFileRoute, useNavigate, Link } from "@tanstack/react-router";
import { useServerFn } from "@tanstack/react-start";
import { useMutation, useQuery } from "@tanstack/react-query";
import { useMemo, useRef, useState } from "react";

import { Wordmark } from "@/components/brand/Wordmark";
import { Button } from "@/components/ui/button";
import { JourneyBoard } from "@/components/journey/JourneyBoard";
import { QuestionCard } from "@/components/journey/QuestionCard";
import {
  DiscoveryBackpack,
  DiscoveryModal,
  type Discovery,
} from "@/components/journey/DiscoveryLayer";
import { buildStates } from "@/components/journey/TerritoryProgress";
import { NODE_BY_CODE, TERRITORY_BY_CODE, type TerritoryCode } from "@/journey/nodes";
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

function JourneyPage() {
  const { sessionId } = Route.useParams();
  const navigate = useNavigate();
  const getState = useServerFn(getJourneyStateFn);
  const answer = useServerFn(answerQuestionFn);
  const track = useServerFn(trackEventFn);

  const [override, setOverride] = useState<string | null>(null);
  const [discovery, setDiscovery] = useState<Discovery | null>(null);
  const [backpack, setBackpack] = useState<Discovery[]>([]);
  const shownTerritories = useRef<Set<string>>(new Set());
  const pendingResult = useRef(false);

  const stateQuery = useQuery({
    queryKey: ["journey", sessionId],
    queryFn: () => getState({ data: { sessionId } }),
    staleTime: Infinity,
  });

  const [state, setState] = useState<State | null>(null);
  const current = state ?? stateQuery.data ?? null;

  const mutation = useMutation({
    mutationFn: (vars: { nodeCode: string; optionCode: string }) =>
      answer({ data: { sessionId, ...vars } }),
    onSuccess: (next, vars) => {
      setState(next);
      setOverride(null);
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
            text: service.discoveryText,
            territory: TERRITORY_BY_CODE[node.territory]?.name ?? "",
          };
          setBackpack((b) => [...b, item]);
          if (!shownTerritories.current.has(node.territory)) {
            shownTerritories.current.add(node.territory);
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
      if (next?.completed) {
        pendingResult.current = true;
        if (!discovery) goToResult();
      }
    },
  });

  function goToResult() {
    navigate({ to: "/resultado/$sessionId", params: { sessionId } });
  }

  const nodeCode = override ?? current?.currentNode ?? null;
  const node = nodeCode ? NODE_BY_CODE[nodeCode] : null;
  const territory = node ? TERRITORY_BY_CODE[node.territory] : null;

  const states = useMemo(
    () =>
      buildStates(
        new Set(
          (current?.path ?? [])
            .map((c) => NODE_BY_CODE[c]?.territory)
            .filter((t): t is TerritoryCode => Boolean(t)),
        ),
        (node?.territory ?? null) as TerritoryCode | null,
      ),
    [current?.path, node?.territory],
  );

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
          states={states}
          currentNodeCode={nodeCode}
          answeredNodeCodes={answeredNodeCodes}
          progress={progress}
          territoryIntro={territory?.intro}
        >
          <aside className="hidden">
            <p className="mb-3 hidden text-xs font-semibold tracking-[0.14em] text-muted-foreground uppercase md:block">
              Territórios
            </p>
            <p className="mt-4 hidden text-sm text-muted-foreground md:block">{territory?.intro}</p>
          </aside>

          <div className="flex h-full flex-col justify-center">
            <QuestionCard
              node={node}
              territoryName={territory?.name ?? ""}
              selected={selected}
              saving={mutation.isPending}
              variant="board"
              onSelect={(optionCode) => mutation.mutate({ nodeCode: node.code, optionCode })}
            />

            <div className="mt-5 flex items-center justify-between">
              <Button
                variant="ghost"
                size="sm"
                disabled={!previousNode}
                onClick={() => setOverride(previousNode)}
              >
                ← Revisar resposta anterior
              </Button>
              {override && (
                <Button variant="ghost" size="sm" onClick={() => setOverride(null)}>
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
