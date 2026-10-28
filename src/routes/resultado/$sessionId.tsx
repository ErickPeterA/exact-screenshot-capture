import { useMutation, useQuery } from "@tanstack/react-query";
import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useServerFn } from "@tanstack/react-start";
import { useEffect } from "react";

import { ResultReport } from "@/components/result/ResultReport";
import { Button } from "@/components/ui/button";
import { getResultFn, restartJourneyFn, trackEventFn } from "@/lib/journey.functions";

export const Route = createFileRoute("/resultado/$sessionId")({
  head: () => ({
    meta: [
      { title: "O mapa da sua empresa | VG Gestão de Resultados" },
      {
        name: "description",
        content:
          "Veja o resultado do seu autodiagnóstico: maturidade por área, prioridades e oportunidades de evolução da gestão.",
      },
      { property: "og:title", content: "O mapa da sua empresa | VG Gestão de Resultados" },
      {
        property: "og:description",
        content:
          "Maturidade por dimensão, necessidades prioritárias e próximos passos para a gestão do seu negócio.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: ResultPage,
});

function ResultPage() {
  const { sessionId } = Route.useParams();
  const navigate = useNavigate();
  const getResult = useServerFn(getResultFn);
  const track = useServerFn(trackEventFn);
  const restart = useServerFn(restartJourneyFn);
  const query = useQuery({
    queryKey: ["result", sessionId],
    queryFn: () => getResult({ data: { sessionId } }),
    staleTime: Infinity,
  });

  useEffect(() => {
    if (query.data?.completed) void track({ data: { sessionId, eventName: "result_viewed" } });
  }, [query.data?.completed, sessionId, track]);

  const restartMutation = useMutation({
    mutationFn: () => restart({ data: { sessionId } }),
    onSuccess: ({ sessionId: id }) =>
      navigate({ to: "/jornada/$sessionId", params: { sessionId: id } }),
  });

  if (query.isLoading) return <Centered text="Montando o mapa da sua empresa..." />;
  const data = query.data;
  if (!data) return <Centered text="Não encontramos esse resultado." />;
  if (!data.completed || !data.result) {
    return (
      <Centered text="Sua jornada ainda não foi concluída.">
        <Button asChild className="mt-4">
          <Link to="/jornada/$sessionId" params={{ sessionId }}>
            Continuar jornada
          </Link>
        </Button>
      </Centered>
    );
  }

  return (
    <ResultReport
      company={data.session.company}
      result={data.result}
      actions={
        <>
          {!data.isInvited && (
            <Button
              variant="ghost"
              onClick={() => restartMutation.mutate()}
              disabled={restartMutation.isPending}
            >
              Refazer a jornada
            </Button>
          )}
          <Button variant="ghost" asChild>
            <a href="https://vgresultados.com.br/">Conheça a VG Resultados</a>
          </Button>
        </>
      }
    />
  );
}

function Centered({ text, children }: { text: string; children?: React.ReactNode }) {
  return (
    <main className="flex min-h-screen items-center justify-center px-6">
      <div className="text-center">
        <p className="text-muted-foreground">{text}</p>
        {children}
      </div>
    </main>
  );
}
