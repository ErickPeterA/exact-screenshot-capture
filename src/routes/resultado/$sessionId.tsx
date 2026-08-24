import { createFileRoute, useNavigate, Link } from "@tanstack/react-router";
import { useServerFn } from "@tanstack/react-start";
import { useMutation, useQuery } from "@tanstack/react-query";
import { useEffect, useState } from "react";

import { Wordmark } from "@/components/brand/Wordmark";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import {
  MaturityCard,
  OpportunityCard,
  PriorityCard,
  StructuredPointCard,
} from "@/components/result/ResultCards";
import { TEXTS } from "@/journey/config";
import {
  getResultFn,
  restartJourneyFn,
  submitLeadFn,
  trackEventFn,
} from "@/lib/journey.functions";

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
    if (query.data?.completed) {
      void track({ data: { sessionId, eventName: "result_viewed" } });
    }
  }, [query.data?.completed, sessionId, track]);

  const restartMutation = useMutation({
    mutationFn: () => restart({ data: { sessionId } }),
    onSuccess: ({ sessionId: id }) =>
      navigate({ to: "/jornada/$sessionId", params: { sessionId: id } }),
  });

  if (query.isLoading) {
    return <Centered text="Montando o mapa da sua empresa..." />;
  }
  const data = query.data;
  if (!data) return <Centered text="Não encontramos esse resultado." />;
  if (!data.completed) {
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

  const r = data.result;

  return (
    <main className="min-h-screen pb-24">
      <header className="hero-gradient text-navy-foreground">
        <div className="mx-auto max-w-5xl px-6 py-8">
          <Wordmark tone="light" />
        </div>
        <div className="mx-auto max-w-5xl px-6 pb-14">
          <p className="text-xs font-semibold tracking-[0.2em] text-navy-foreground/70 uppercase">
            {data.session.company}
          </p>
          <h1 className="animate-rise mt-3 font-display text-3xl font-bold text-balance md:text-5xl">
            {TEXTS.resultTitle}
          </h1>
          <p className="mt-4 max-w-2xl text-navy-foreground/80">
            {TEXTS.resultSubtitle}
          </p>
        </div>
      </header>

      <div className="mx-auto max-w-5xl px-6">
        <section className="-mt-8" aria-labelledby="mapa">
          <h2 id="mapa" className="sr-only">
            Mapa de maturidade
          </h2>
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            {r.dimensionScores.map((d) => (
              <MaturityCard key={d.dimension} dimension={d} />
            ))}
          </div>
        </section>

        {r.diagnosticMode && (
          <section className="surface-card mt-10 border-l-4 border-l-strategy p-6 md:p-8">
            <p className="text-xs font-semibold tracking-[0.14em] text-muted-foreground uppercase">
              {TEXTS.diagnosticFirstStepTitle}
            </p>
            <h2 className="mt-2 font-display text-xl font-semibold">
              {TEXTS.diagnosticFirstStep}
            </h2>
            {r.investigationAreas.length > 0 && (
              <>
                <p className="mt-5 text-xs font-semibold tracking-[0.14em] text-muted-foreground uppercase">
                  {TEXTS.diagnosticAreasTitle}
                </p>
                <ul className="mt-2 flex flex-wrap gap-2">
                  {r.investigationAreas.map((area) => (
                    <li
                      key={area}
                      className="rounded-full bg-secondary px-3 py-1 text-sm"
                    >
                      {area}
                    </li>
                  ))}
                </ul>
              </>
            )}
          </section>
        )}

        {r.priorities.length > 0 && (
          <section className="mt-14" aria-labelledby="prioridades">
            <h2 id="prioridades" className="font-display text-2xl font-semibold">
              Pontos que merecem maior atenção
            </h2>
            <div className="mt-6 grid gap-5 md:grid-cols-2">
              {r.priorities.map((p, i) => (
                <PriorityCard key={p.serviceCode} recommendation={p} index={i} />
              ))}
            </div>
          </section>
        )}

        {r.opportunities.length > 0 && (
          <section className="mt-12" aria-labelledby="oportunidades">
            <h2 id="oportunidades" className="font-display text-xl font-semibold">
              Oportunidades de evolução
            </h2>
            <div className="mt-5 grid gap-4 md:grid-cols-3">
              {r.opportunities.map((o) => (
                <OpportunityCard key={o.serviceCode} recommendation={o} />
              ))}
            </div>
          </section>
        )}

        {r.structuredPoints.length > 0 && (
          <section className="mt-12" aria-labelledby="estruturado">
            <h2 id="estruturado" className="font-display text-xl font-semibold">
              O que já está estruturado
            </h2>
            <ul className="mt-5 grid gap-3 md:grid-cols-2">
              {r.structuredPoints.map((p, i) => (
                <StructuredPointCard
                  key={`${p.dimension}-${i}`}
                  text={p.text}
                  dimension={p.dimension}
                />
              ))}
            </ul>
          </section>
        )}

        <LeadCapture sessionId={sessionId} alreadySent={data.hasLead} />

        <div className="mt-10 flex flex-wrap gap-3">
          <Button
            variant="ghost"
            onClick={() => restartMutation.mutate()}
            disabled={restartMutation.isPending}
          >
            Refazer a jornada
          </Button>
          <Button variant="ghost" asChild>
            <Link to="/">Voltar ao início</Link>
          </Button>
        </div>
      </div>
    </main>
  );
}

function LeadCapture({
  sessionId,
  alreadySent,
}: {
  sessionId: string;
  alreadySent: boolean;
}) {
  const submit = useServerFn(submitLeadFn);
  const track = useServerFn(trackEventFn);
  const [email, setEmail] = useState("");
  const [whatsapp, setWhatsapp] = useState("");
  const [wantsContact, setWantsContact] = useState(true);
  const [consent, setConsent] = useState(false);
  const [done, setDone] = useState(alreadySent);
  const [error, setError] = useState<string | null>(null);

  const mutation = useMutation({
    mutationFn: () =>
      submit({
        data: {
          sessionId,
          email: email.trim(),
          whatsapp: whatsapp.trim() || undefined,
          wantsContact,
          consent: true as const,
        },
      }),
    onSuccess: () => setDone(true),
    onError: () => setError("Não conseguimos registrar agora. Tente novamente."),
  });

  if (done) {
    return (
      <section className="surface-card mt-14 p-7 text-center md:p-10">
        <h2 className="font-display text-xl font-semibold">Recebemos seu contato</h2>
        <p className="mt-2 text-muted-foreground">
          Um especialista da VG vai retomar este mapa com você em breve.
        </p>
      </section>
    );
  }

  const valid = /.+@.+\..+/.test(email) && consent;

  return (
    <section className="surface-card mt-14 p-7 md:p-10" aria-labelledby="cta">
      <h2 id="cta" className="font-display text-xl font-semibold text-balance">
        {TEXTS.ctaTitle}
      </h2>
      <p className="mt-2 text-sm text-muted-foreground">{TEXTS.ctaIntent}</p>

      <form
        className="mt-6 grid gap-5 md:max-w-xl"
        onSubmit={(e) => {
          e.preventDefault();
          setError(null);
          if (!valid) return;
          void track({ data: { sessionId, eventName: "cta_clicked" } });
          mutation.mutate();
        }}
      >
        <div className="grid gap-2">
          <Label htmlFor="email">E-mail</Label>
          <Input
            id="email"
            type="email"
            value={email}
            autoComplete="email"
            onChange={(e) => setEmail(e.target.value)}
            required
          />
        </div>
        <div className="grid gap-2">
          <Label htmlFor="whatsapp">WhatsApp (opcional)</Label>
          <Input
            id="whatsapp"
            value={whatsapp}
            inputMode="tel"
            onChange={(e) => setWhatsapp(e.target.value)}
          />
        </div>

        <label className="flex items-start gap-3 text-sm">
          <Checkbox
            checked={wantsContact}
            onCheckedChange={(v) => setWantsContact(v === true)}
          />
          <span>Quero ser contatado por um especialista da VG.</span>
        </label>

        <label className="flex items-start gap-3 text-sm text-muted-foreground">
          <Checkbox
            checked={consent}
            onCheckedChange={(v) => setConsent(v === true)}
            aria-describedby="consent-text"
          />
          <span id="consent-text">{TEXTS.consentText}</span>
        </label>

        {error && (
          <p role="alert" className="text-sm text-destructive">
            {error}
          </p>
        )}

        <Button type="submit" size="lg" disabled={!valid || mutation.isPending}>
          {mutation.isPending ? "Enviando..." : TEXTS.ctaButton}
        </Button>
      </form>
    </section>
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
