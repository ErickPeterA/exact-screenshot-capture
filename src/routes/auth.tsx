import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useServerFn } from "@tanstack/react-start";
import { useState } from "react";
import { Wordmark } from "@/components/brand/Wordmark";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { loginFn } from "@/lib/auth.functions";

export const Route = createFileRoute("/auth")({ ssr: false, component: AuthPage });
function AuthPage() {
  const navigate = useNavigate(), login = useServerFn(loginFn);
  const [email,setEmail]=useState(""), [password,setPassword]=useState(""), [error,setError]=useState<string|null>(null), [loading,setLoading]=useState(false);
  async function signIn(event: React.FormEvent) { event.preventDefault(); setLoading(true); setError(null); try { await login({data:{email:email.trim(),password}}); navigate({to:"/admin"}); } catch { setError("E-mail ou senha inválidos."); } finally { setLoading(false); } }
  return <main className="flex min-h-screen flex-col"><header className="mx-auto w-full max-w-5xl px-6 py-8"><Wordmark /></header><div className="mx-auto flex w-full max-w-md flex-1 items-center px-6 pb-20"><div className="surface-card w-full p-8"><h1 className="font-display text-2xl font-semibold">Acesso interno</h1><p className="mt-2 text-sm text-muted-foreground">Área restrita à equipe VG Gestão de Resultados.</p><form className="mt-7 grid gap-5" onSubmit={signIn}><div className="grid gap-2"><Label htmlFor="email">E-mail</Label><Input id="email" type="email" autoComplete="email" value={email} onChange={(e)=>setEmail(e.target.value)} required /></div><div className="grid gap-2"><Label htmlFor="password">Senha</Label><Input id="password" type="password" autoComplete="current-password" value={password} onChange={(e)=>setPassword(e.target.value)} required /></div>{error&&<p role="alert" className="text-sm text-destructive">{error}</p>}<Button type="submit" size="lg" disabled={loading}>{loading?"Entrando...":"Entrar"}</Button></form></div></div></main>;
}
