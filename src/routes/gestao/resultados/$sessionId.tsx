import { useQuery } from "@tanstack/react-query";
import { createFileRoute, Link } from "@tanstack/react-router";
import { useServerFn } from "@tanstack/react-start";

import { ResultReport } from "@/components/result/ResultReport";
import { Button } from "@/components/ui/button";
import { getJourneyAdminResultFn } from "@/lib/journey.functions";

export const Route = createFileRoute("/gestao/resultados/$sessionId")({
  head: () => ({ meta: [{ title: "Resultado da Jornada | VG Gestão de Resultados" }] }),
  component: AdminResultPage,
});

function AdminResultPage() {
  const { sessionId } = Route.useParams();
  const getAdminResult = useServerFn(getJourneyAdminResultFn);
  const query = useQuery({
    queryKey: ["journey-admin-result", sessionId],
    queryFn: () => getAdminResult({ data: { sessionId } }),
    retry: false,
    staleTime: Infinity,
  });

  if (query.isLoading) return <AdminState text="Carregando resultado..." />;
  if (query.isError) {
    return <AdminState text="Acesso não autorizado. Acesse a Jornada através do CRM." />;
  }
  if (!query.data) return <AdminState text="Resultado não encontrado." />;
  if (!query.data.completed || !query.data.result) {
    return <AdminState text="Esta Jornada ainda não possui um resultado concluído." />;
  }

  return (
    <ResultReport
      company={query.data.session.company}
      result={query.data.result}
      actions={
        <Button variant="ghost" asChild>
          <Link to="/gestao">Voltar para a gestão</Link>
        </Button>
      }
    />
  );
}

function AdminState({ text }: { text: string }) {
  return (
    <main className="flex min-h-screen items-center justify-center px-6">
      <div className="text-center">
        <p className="text-muted-foreground">{text}</p>
        <Button variant="ghost" asChild className="mt-4">
          <Link to="/gestao">Voltar para a gestão</Link>
        </Button>
      </div>
    </main>
  );
}
