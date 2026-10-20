import { createFileRoute } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";

import { JourneyExperience } from "@/routes/jornada/$sessionId";
import { answerInviteQuestionFn, openJourneyInviteFn } from "@/lib/journey.functions";

export const Route = createFileRoute("/j/$token")({
  head: () => ({
    meta: [
      { title: "Sua jornada de gestão | VG Gestão de Resultados" },
      { name: "robots", content: "noindex, nofollow" },
    ],
  }),
  component: PublicJourneyPage,
});

function PublicJourneyPage() {
  const { token } = Route.useParams();
  const openInvite = useServerFn(openJourneyInviteFn);
  const answer = useServerFn(answerInviteQuestionFn);

  const accessQuery = useQuery({
    queryKey: ["journey-invite", token],
    queryFn: () => openInvite({ data: { token } }),
    staleTime: Infinity,
    retry: false,
  });

  if (accessQuery.isLoading) return <Message text="Carregando sua Jornada..." />;
  if (accessQuery.isError) return <Message text="Não foi possível abrir esta Jornada." />;

  const access = accessQuery.data;
  if (!access || access.status === "invalid") {
    return <Message text="Este link de Jornada é inválido." />;
  }
  if (access.status === "completed") {
    return <Message text="Esta Jornada já foi concluída." />;
  }
  if (access.status === "revoked") {
    return <Message text="Este link de Jornada foi revogado." />;
  }
  if (access.status === "expired") {
    return <Message text="Este link de Jornada expirou." />;
  }

  return (
    <JourneyExperience
      initialState={access.state}
      answerQuestion={(vars) => answer({ data: { token, ...vars } })}
    />
  );
}

function Message({ text }: { text: string }) {
  return (
    <main className="flex min-h-screen items-center justify-center px-6">
      <p className="text-center text-muted-foreground">{text}</p>
    </main>
  );
}
