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
  const [email, setEmail] = useState("");
  const [phone, setPhone] = useState("");
  const [role, setRole] = useState<
    "" | "owner" | "director" | "manager" | "professional" | "other"
  >("");
  const [teamSize, setTeamSize] = useState<"" | "solo" | "2-10" | "11-50" | "51-200" | "201+">("");
  const [mainChallenge, setMainChallenge] = useState("");
  const startMutation = useMutation({
    mutationFn: () => {
      if (!role || !teamSize) throw new Error("Preencha todos os campos.");
      return startInvite({
        data: {
          token,
          name: name.trim(),
          company: company.trim(),
          email: email.trim(),
          phone: phone.trim(),
          role,
          teamSize,
          mainChallenge: mainChallenge.trim(),
        },
      });
    },
    onSuccess: () => onStarted(),
  });
  const valid =
    name.trim().length >= 2 &&
    company.trim().length >= 2 &&
    email.includes("@") &&
    phone.trim().length >= 7 &&
    Boolean(role) &&
    Boolean(teamSize) &&
    mainChallenge.trim().length >= 10;

  return (
    <main className="flex min-h-screen items-center justify-center px-6">
      <form
        className="surface-card w-full max-w-lg p-7 md:p-9"
        onSubmit={(event) => {
          event.preventDefault();
          if (valid) startMutation.mutate();
        }}
      >
        <h1 className="font-display text-2xl font-semibold">Antes de começar</h1>
        <p className="mt-2 text-sm text-muted-foreground">
          Estas informações ajudam a contextualizar o diagnóstico. Em seguida, você será levado ao
          mapa da Jornada para responder às perguntas.
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
          <div className="grid gap-2">
            <Label htmlFor="invite-email">E-mail</Label>
            <Input
              id="invite-email"
              type="email"
              value={email}
              onChange={(event) => setEmail(event.target.value)}
              autoComplete="email"
              required
            />
          </div>
          <div className="grid gap-2">
            <Label htmlFor="invite-phone">Telefone</Label>
            <Input
              id="invite-phone"
              type="tel"
              value={phone}
              onChange={(event) => setPhone(event.target.value)}
              autoComplete="tel"
              placeholder="(00) 00000-0000"
              required
            />
          </div>
          <div className="grid gap-2">
            <Label htmlFor="invite-role">Qual é o seu papel na empresa?</Label>
            <select
              id="invite-role"
              className="h-10 rounded-md border border-input bg-background px-3 text-sm"
              value={role}
              onChange={(event) => setRole(event.target.value as typeof role)}
              required
            >
              <option value="" disabled>
                Selecione uma opção
              </option>
              <option value="owner">Proprietário(a) ou sócio(a)</option>
              <option value="director">Direção</option>
              <option value="manager">Gestão ou liderança</option>
              <option value="professional">Profissional da equipe</option>
              <option value="other">Outro</option>
            </select>
          </div>
          <div className="grid gap-2">
            <Label htmlFor="invite-team-size">Quantas pessoas trabalham na empresa?</Label>
            <select
              id="invite-team-size"
              className="h-10 rounded-md border border-input bg-background px-3 text-sm"
              value={teamSize}
              onChange={(event) => setTeamSize(event.target.value as typeof teamSize)}
              required
            >
              <option value="" disabled>
                Selecione uma opção
              </option>
              <option value="solo">Somente eu</option>
              <option value="2-10">2 a 10 pessoas</option>
              <option value="11-50">11 a 50 pessoas</option>
              <option value="51-200">51 a 200 pessoas</option>
              <option value="201+">Mais de 200 pessoas</option>
            </select>
          </div>
          <div className="grid gap-2">
            <Label htmlFor="invite-challenge">Qual é o principal desafio da empresa hoje?</Label>
            <textarea
              id="invite-challenge"
              className="min-h-24 rounded-md border border-input bg-background px-3 py-2 text-sm"
              value={mainChallenge}
              onChange={(event) => setMainChallenge(event.target.value)}
              placeholder="Conte brevemente o que mais precisa melhorar ou organizar."
              maxLength={500}
              required
            />
          </div>
          {startMutation.isError && (
            <p role="alert" className="text-sm text-destructive">
              Não foi possível iniciar esta Jornada.
            </p>
          )}
          <Button type="submit" size="lg" disabled={!valid || startMutation.isPending}>
            {startMutation.isPending ? "Preparando sua jornada..." : "Começar jornada"}
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
