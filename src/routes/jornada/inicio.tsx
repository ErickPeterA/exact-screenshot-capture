import { createFileRoute, useNavigate, Link } from "@tanstack/react-router";
import { useServerFn } from "@tanstack/react-start";
import { useMutation } from "@tanstack/react-query";
import { useState } from "react";

import { Wordmark } from "@/components/brand/Wordmark";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { startJourneyFn } from "@/lib/journey.functions";

export const Route = createFileRoute("/jornada/inicio")({
  head: () => ({
    meta: [
      { title: "Comece sua jornada | VG Gestão de Resultados" },
      {
        name: "description",
        content:
          "Informe seu nome e empresa para iniciar o autodiagnóstico de gestão da VG Gestão de Resultados.",
      },
      { property: "og:title", content: "Comece sua jornada | VG Gestão de Resultados" },
      {
        property: "og:description",
        content: "Identificação rápida para iniciar o mapa de gestão da sua empresa.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: Inicio,
});

function Inicio() {
  const navigate = useNavigate();
  const start = useServerFn(startJourneyFn);
  const [name, setName] = useState("");
  const [company, setCompany] = useState("");
  const [error, setError] = useState<string | null>(null);

  const mutation = useMutation({
    mutationFn: () => start({ data: { name: name.trim(), company: company.trim() } }),
    onSuccess: ({ sessionId }) => {
      navigate({ to: "/jornada/$sessionId", params: { sessionId } });
    },
    onError: () => setError("Não foi possível iniciar agora. Tente novamente."),
  });

  const valid = name.trim().length >= 2 && company.trim().length >= 2;

  return (
    <main className="flex min-h-screen flex-col">
      <header className="mx-auto w-full max-w-5xl px-6 py-8">
        <Link to="/" aria-label="Voltar para a página inicial">
          <Wordmark />
        </Link>
      </header>

      <div className="mx-auto flex w-full max-w-lg flex-1 items-center px-6 pb-16">
        <div className="surface-card animate-rise w-full p-7 md:p-9">
          <h1 className="font-display text-2xl font-semibold">Antes de começar</h1>
          <p className="mt-2 text-sm text-muted-foreground">
            Usamos essas informações apenas para personalizar o seu mapa de gestão.
          </p>

          <form
            className="mt-7 grid gap-5"
            onSubmit={(e) => {
              e.preventDefault();
              setError(null);
              if (valid) mutation.mutate();
            }}
          >
            <div className="grid gap-2">
              <Label htmlFor="name">Seu nome</Label>
              <Input
                id="name"
                value={name}
                autoComplete="name"
                onChange={(e) => setName(e.target.value)}
                placeholder="Como podemos te chamar?"
                required
              />
            </div>
            <div className="grid gap-2">
              <Label htmlFor="company">Nome da empresa</Label>
              <Input
                id="company"
                value={company}
                autoComplete="organization"
                onChange={(e) => setCompany(e.target.value)}
                placeholder="Razão social ou nome fantasia"
                required
              />
            </div>

            {error && (
              <p role="alert" className="text-sm text-destructive">
                {error}
              </p>
            )}

            <Button type="submit" size="lg" disabled={!valid || mutation.isPending}>
              {mutation.isPending ? "Preparando sua jornada..." : "Começar jornada"}
            </Button>
          </form>
        </div>
      </div>
    </main>
  );
}
