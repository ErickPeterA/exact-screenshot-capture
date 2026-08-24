import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";

import { Wordmark } from "@/components/brand/Wordmark";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { supabase } from "@/integrations/supabase/client";

export const Route = createFileRoute("/auth")({
  ssr: false,
  head: () => ({
    meta: [
      { title: "Acesso interno | VG Gestão de Resultados" },
      {
        name: "description",
        content:
          "Área restrita da equipe VG para acompanhar jornadas, leads e indicadores do diagnóstico.",
      },
      { property: "og:title", content: "Acesso interno | VG Gestão de Resultados" },
      { property: "og:description", content: "Login da equipe VG Gestão de Resultados." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: AuthPage,
});

function AuthPage() {
  const navigate = useNavigate();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    void supabase.auth.getUser().then(({ data }) => {
      if (data.user) navigate({ to: "/admin" });
    });
  }, [navigate]);

  async function signIn(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError(null);
    const { error: authError } = await supabase.auth.signInWithPassword({
      email: email.trim(),
      password,
    });
    setLoading(false);
    if (authError) {
      setError("E-mail ou senha inválidos.");
      return;
    }
    navigate({ to: "/admin" });
  }

  return (
    <main className="flex min-h-screen flex-col">
      <header className="mx-auto w-full max-w-5xl px-6 py-8">
        <Wordmark />
      </header>
      <div className="mx-auto flex w-full max-w-md flex-1 items-center px-6 pb-20">
        <div className="surface-card w-full p-8">
          <h1 className="font-display text-2xl font-semibold">Acesso interno</h1>
          <p className="mt-2 text-sm text-muted-foreground">
            Área restrita à equipe VG Gestão de Resultados.
          </p>
          <form className="mt-7 grid gap-5" onSubmit={signIn}>
            <div className="grid gap-2">
              <Label htmlFor="email">E-mail</Label>
              <Input
                id="email"
                type="email"
                autoComplete="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
              />
            </div>
            <div className="grid gap-2">
              <Label htmlFor="password">Senha</Label>
              <Input
                id="password"
                type="password"
                autoComplete="current-password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
              />
            </div>
            {error && (
              <p role="alert" className="text-sm text-destructive">
                {error}
              </p>
            )}
            <Button type="submit" size="lg" disabled={loading}>
              {loading ? "Entrando..." : "Entrar"}
            </Button>
          </form>
        </div>
      </div>
    </main>
  );
}
