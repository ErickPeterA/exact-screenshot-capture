import { createFileRoute } from "@tanstack/react-router";
import { useMutation, useQuery } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { useState } from "react";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { JourneyExperience } from "@/routes/jornada/$sessionId";
import {
  answerInviteQuestionFn,
  openJourneyInviteFn,
  startJourneyInviteFn,
} from "@/lib/journey.functions";

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
  const startInvite = useServerFn(startJourneyInviteFn);
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
  if (access.status === "needs_details") {
    return (
      <InviteDetailsForm
        token={token}
        onStarted={() => accessQuery.refetch()}
        startInvite={startInvite}
      />
    );
  }

  return (
    <JourneyExperience
      initialState={access.state}
      answerQuestion={(vars) => answer({ data: { token, ...vars } })}
    />
  );
}

function InviteDetailsForm({
  token,
  onStarted,
  startInvite,
}: {
  token: string;
  onStarted: () => void;
  startInvite: ReturnType<typeof useServerFn<typeof startJourneyInviteFn>>;
}) {
  const [name, setName] = useState("");
  const [company, setCompany] = useState("");
  const startMutation = useMutation({
    mutationFn: () => startInvite({ data: { token, name: name.trim(), company: company.trim() } }),
    onSuccess: () => onStarted(),
  });
  const valid = name.trim().length >= 2 && company.trim().length >= 2;

  return (
    <main className="flex min-h-screen items-center justify-center px-6">
      <form
        className="surface-card w-full max-w-lg p-7 md:p-9"
        onSubmit={(event) => {
          event.preventDefault();
          if (valid) startMutation.mutate();
        }}
      >
        <h1 className="font-display text-2xl font-semibold">Antes de comeÃ§ar</h1>
        <p className="mt-2 text-sm text-muted-foreground">
          Informe seus dados para iniciar sua Jornada.
        </p>
        <div className="mt-7 grid gap-5">
          <div className="grid gap-2">
            <Label htmlFor="invite-name">Seu nome</Label>
            <Input
              id="invite-name"
              value={name}
              onChange={(event) => setName(event.target.value)}
              required
            />
          </div>
          <div className="grid gap-2">
            <Label htmlFor="invite-company">Nome da empresa</Label>
            <Input
              id="invite-company"
              value={company}
              onChange={(event) => setCompany(event.target.value)}
              required
            />
          </div>
          {startMutation.isError && (
            <p role="alert" className="text-sm text-destructive">
              NÃ£o foi possÃ­vel iniciar esta Jornada.
            </p>
          )}
          <Button type="submit" size="lg" disabled={!valid || startMutation.isPending}>
            {startMutation.isPending ? "Preparando sua jornada..." : "ComeÃ§ar jornada"}
          </Button>
        </div>
      </form>
    </main>
  );
}

function Message({ text }: { text: string }) {
  return (
    <main className="flex min-h-screen items-center justify-center px-6">
      <p className="text-center text-muted-foreground">{text}</p>
    </main>
  );
}
