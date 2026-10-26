import { Link, createFileRoute } from "@tanstack/react-router";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { Copy, ExternalLink, Plus, RotateCcw } from "lucide-react";
import { useState } from "react";

import { Wordmark } from "@/components/brand/Wordmark";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  createJourneyInviteFn,
  getJourneyAdminSessionFn,
  getJourneyAdminResultPathFn,
  getJourneyInviteUrlFn,
  listJourneyInvitesFn,
  logoutJourneyAdminFn,
  regenerateJourneyInviteFn,
  revokeJourneyInviteFn,
} from "@/lib/journey.functions";

export const Route = createFileRoute("/gestao")({
  head: () => ({ meta: [{ title: "Gestão de Jornadas | VG Gestão de Resultados" }] }),
  component: ManagementPage,
});

const statusMeta = {
  created: { label: "Não iniciada", variant: "secondary" as const },
  started: { label: "Em andamento", variant: "default" as const },
  completed: { label: "Concluída", variant: "outline" as const },
  revoked: { label: "Revogada", variant: "destructive" as const },
  expired: { label: "Expirada", variant: "outline" as const },
};

function formatDate(value: string | null) {
  return value
    ? new Intl.DateTimeFormat("pt-BR", { dateStyle: "short", timeStyle: "short" }).format(
        new Date(value),
      )
    : "—";
}

function ManagementPage() {
  const queryClient = useQueryClient();
  const listInvites = useServerFn(listJourneyInvitesFn);
  const getAdminSession = useServerFn(getJourneyAdminSessionFn);
  const getAdminResultPath = useServerFn(getJourneyAdminResultPathFn);
  const logout = useServerFn(logoutJourneyAdminFn);
  const createInvite = useServerFn(createJourneyInviteFn);
  const getInviteUrl = useServerFn(getJourneyInviteUrlFn);
  const revokeInvite = useServerFn(revokeJourneyInviteFn);
  const regenerateInvite = useServerFn(regenerateJourneyInviteFn);
  const [nameDialogOpen, setNameDialogOpen] = useState(false);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [clientName, setClientName] = useState("");
  const [pendingInviteId, setPendingInviteId] = useState<string | null>(null);
  const [generatedUrl, setGeneratedUrl] = useState<string | null>(null);
  const [copyFeedback, setCopyFeedback] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);

  const adminQuery = useQuery({
    queryKey: ["journey-admin-session"],
    queryFn: () => getAdminSession(),
    retry: false,
  });
  const invitesQuery = useQuery({
    queryKey: ["management-invites"],
    queryFn: () => listInvites(),
    enabled: Boolean(adminQuery.data),
  });
  const logoutMutation = useMutation({
    mutationFn: () => logout(),
    onSettled: () => {
      queryClient.removeQueries({ queryKey: ["journey-admin-session"] });
      queryClient.removeQueries({ queryKey: ["management-invites"] });
      window.location.assign("/gestao");
    },
  });
  const openResultMutation = useMutation({
    mutationFn: (sessionId: string) => getAdminResultPath({ data: { sessionId } }),
    onSuccess: ({ sessionId }) => window.location.assign(`/resultado/${sessionId}`),
  });
  const createMutation = useMutation({
    mutationFn: ({ inviteId, name }: { inviteId: string | null; name: string }) =>
      inviteId
        ? regenerateInvite({ data: { inviteId, clientName: name } })
        : createInvite({ data: { clientName: name } }),
    onSuccess: (invite) => {
      setGeneratedUrl(invite.url);
      setNotice(invite.sync_warning);
      setNameDialogOpen(false);
      setDialogOpen(true);
      void refresh();
    },
  });
  const revokeMutation = useMutation({
    mutationFn: (inviteId: string) => revokeInvite({ data: { inviteId } }),
    onSuccess: () => {
      setNotice("Jornada revogada. O link não pode mais ser utilizado.");
      void refresh();
    },
    onError: () =>
      setNotice("Não foi possível revogar esta Jornada. Atualize a lista e tente novamente."),
  });
  const recoverLinkMutation = useMutation({
    mutationFn: async ({ inviteId, open }: { inviteId: string; open: boolean }) => {
      const result = await getInviteUrl({ data: { inviteId } });
      if (!result.available) return { copied: false as const, open };
      if (open) {
        window.location.assign(result.url);
        return { copied: false as const, open };
      }
      await navigator.clipboard.writeText(result.url);
      return { copied: true as const, open };
    },
    onSuccess: (result) => {
      if (result.copied) setNotice("Link copiado.");
      else if (!result.open) setNotice("Link antigo indisponível.");
    },
    onError: () => setNotice("Não foi possível recuperar este link."),
  });
  const refresh = () => queryClient.invalidateQueries({ queryKey: ["management-invites"] });

  if (adminQuery.isLoading) {
    return (
      <main className="flex min-h-screen items-center justify-center px-6 text-muted-foreground">
        Verificando acesso…
      </main>
    );
  }
  if (!adminQuery.data) {
    return (
      <main className="flex min-h-screen items-center justify-center px-6">
        <div className="max-w-md text-center">
          <h1 className="font-display text-2xl font-semibold">Acesse a Jornada através do CRM.</h1>
          <p className="mt-3 text-sm text-muted-foreground">
            Esta área é exclusiva para usuários autenticados pelo CRM.
          </p>
        </div>
      </main>
    );
  }

  const openCreate = () => {
    setClientName("");
    setPendingInviteId(null);
    setGeneratedUrl(null);
    setCopyFeedback(null);
    setNameDialogOpen(true);
  };
  const openReplacement = (inviteId: string, currentClientName: string | null) => {
    setClientName(currentClientName ?? "");
    setPendingInviteId(inviteId);
    setGeneratedUrl(null);
    setCopyFeedback(null);
    setNameDialogOpen(true);
  };
  const submitCreate = () => {
    const name = clientName.trim();
    if (name.length < 2) return;
    createMutation.mutate({ inviteId: pendingInviteId, name });
  };
  const copyLink = async () => {
    if (!generatedUrl) return;
    try {
      await navigator.clipboard.writeText(generatedUrl);
      setCopyFeedback("Link copiado.");
    } catch {
      setCopyFeedback("Não foi possível copiar automaticamente. Copie o link exibido.");
    }
  };

  const invites = invitesQuery.data ?? [];
  const counts = { created: 0, started: 0, completed: 0, revoked: 0 };
  invites.forEach((invite) => {
    if (invite.status in counts) counts[invite.status as keyof typeof counts] += 1;
  });

  return (
    <main className="min-h-screen bg-surface-2 pb-12">
      <header className="border-b bg-background">
        <div className="mx-auto flex max-w-7xl items-center justify-between px-6 py-5">
          <Link to="/" aria-label="Ir para a página inicial">
            <Wordmark />
          </Link>
          <div className="flex items-center gap-3">
            <div className="hidden text-right text-sm sm:block">
              <p className="font-medium">{adminQuery.data.name ?? "Usuário CRM"}</p>
              <p className="text-muted-foreground">
                {adminQuery.data.email ?? adminQuery.data.role ?? ""}
              </p>
            </div>
            <Button
              variant="outline"
              onClick={() => logoutMutation.mutate()}
              disabled={logoutMutation.isPending}
            >
              Sair
            </Button>
            <Button onClick={openCreate} disabled={createMutation.isPending}>
              <Plus /> Gerar Jornada
            </Button>
          </div>
        </div>
      </header>
      <div className="mx-auto max-w-7xl px-6 py-9">
        <div className="flex flex-wrap items-end justify-between gap-4">
          <div>
            <p className="text-sm font-medium text-muted-foreground">Área interna</p>
            <h1 className="font-display text-3xl font-semibold">Jornada do Empreendedor</h1>
          </div>
          {invitesQuery.isFetching && (
            <span className="text-sm text-muted-foreground">Atualizando…</span>
          )}
        </div>
        {notice && (
          <p className="mt-4 text-sm text-muted-foreground" role="status">
            {notice}
          </p>
        )}
        <section
          className="mt-7 grid gap-4 sm:grid-cols-2 lg:grid-cols-4"
          aria-label="Resumo das jornadas"
        >
          <Summary label="Não iniciadas" value={counts.created} />
          <Summary label="Em andamento" value={counts.started} />
          <Summary label="Concluídas" value={counts.completed} />
          <Summary label="Revogadas" value={counts.revoked} />
        </section>
        <section className="surface-card mt-8 overflow-hidden" aria-labelledby="lista-jornadas">
          <div className="flex items-center justify-between border-b px-6 py-5">
            <div>
              <h2 id="lista-jornadas" className="font-display text-lg font-semibold">
                Jornadas geradas
              </h2>
              <p className="mt-1 text-sm text-muted-foreground">
                As mais recentes aparecem primeiro.
              </p>
            </div>
          </div>
          {invitesQuery.isLoading ? (
            <div className="p-8 text-sm text-muted-foreground">Carregando Jornadas…</div>
          ) : invitesQuery.isError ? (
            <div className="p-8 text-sm text-destructive">
              Não foi possível carregar as Jornadas. Tente novamente.
            </div>
          ) : invites.length === 0 ? (
            <div className="p-10 text-center">
              <p className="font-medium">Nenhuma Jornada gerada ainda.</p>
              <p className="mt-1 text-sm text-muted-foreground">
                Crie o primeiro link para enviar a um cliente.
              </p>
              <Button className="mt-5" onClick={openCreate} disabled={createMutation.isPending}>
                <Plus /> Gerar Jornada
              </Button>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full min-w-[1080px] text-left text-sm">
                <thead className="bg-muted/50 text-xs text-muted-foreground">
                  <tr>
                    {[
                      "Cliente/Empresa",
                      "Contato",
                      "E-mail",
                      "Status",
                      "Criada em",
                      "Iniciada em",
                      "Concluída em",
                      "Expira em",
                      "Ações",
                    ].map((heading) => (
                      <th key={heading} className="px-4 py-3 font-medium">
                        {heading}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody className="divide-y">
                  {invites.map((invite) => {
                    const status = statusMeta[invite.status];
                    const actionable = invite.status === "created" || invite.status === "started";
                    return (
                      <tr key={invite.id} className="align-top">
                        <td className="px-4 py-4 font-medium">{invite.client_name ?? "—"}</td>
                        <td className="px-4 py-4">{invite.contact_name ?? "—"}</td>
                        <td className="px-4 py-4 text-muted-foreground">
                          {invite.contact_email ?? "—"}
                        </td>
                        <td className="px-4 py-4">
                          <Badge variant={status.variant}>{status.label}</Badge>
                        </td>
                        <td className="px-4 py-4 whitespace-nowrap">
                          {formatDate(invite.created_at)}
                        </td>
                        <td className="px-4 py-4 whitespace-nowrap">
                          {formatDate(invite.started_at)}
                        </td>
                        <td className="px-4 py-4 whitespace-nowrap">
                          {formatDate(invite.completed_at)}
                        </td>
                        <td className="px-4 py-4 whitespace-nowrap">
                          {formatDate(invite.expires_at)}
                        </td>
                        <td className="px-4 py-4">
                          <div className="flex flex-wrap gap-2">
                            {invite.status === "completed" && invite.session_id && (
                              <Button
                                size="sm"
                                variant="outline"
                                onClick={() => openResultMutation.mutate(invite.session_id!)}
                                disabled={openResultMutation.isPending}
                              >
                                <ExternalLink /> Ver resposta
                              </Button>
                            )}
                            {actionable && invite.link_available && (
                              <Button
                                size="sm"
                                variant="outline"
                                onClick={() =>
                                  recoverLinkMutation.mutate({ inviteId: invite.id, open: false })
                                }
                                disabled={recoverLinkMutation.isPending}
                              >
                                <Copy /> Copiar link
                              </Button>
                            )}
                            {invite.status === "started" && invite.link_available && (
                              <Button
                                size="sm"
                                variant="outline"
                                onClick={() =>
                                  recoverLinkMutation.mutate({ inviteId: invite.id, open: true })
                                }
                                disabled={recoverLinkMutation.isPending}
                              >
                                <ExternalLink /> Acompanhar
                              </Button>
                            )}
                            {actionable && (
                              <Button
                                size="sm"
                                variant="outline"
                                onClick={() => {
                                  if (
                                    window.confirm(
                                      "Revogar esta Jornada? O link deixará de funcionar imediatamente.",
                                    )
                                  )
                                    revokeMutation.mutate(invite.id);
                                }}
                                disabled={revokeMutation.isPending}
                              >
                                Revogar
                              </Button>
                            )}
                            {(invite.status === "expired" || invite.status === "revoked") && (
                              <Button
                                size="sm"
                                variant="ghost"
                                onClick={() => openReplacement(invite.id, invite.client_name)}
                                disabled={createMutation.isPending}
                              >
                                <RotateCcw /> Gerar novo link
                              </Button>
                            )}
                            {actionable && !invite.link_available && (
                              <span className="basis-full text-xs text-muted-foreground">
                                Link antigo indisponível
                              </span>
                            )}
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </section>
      </div>
      <Dialog open={nameDialogOpen} onOpenChange={setNameDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Gerar novo link</DialogTitle>
            <DialogDescription>
              Informe o nome do cliente. O link será válido por 7 dias.
            </DialogDescription>
          </DialogHeader>
          <form
            className="grid gap-4"
            onSubmit={(event) => {
              event.preventDefault();
              submitCreate();
            }}
          >
            <div className="grid gap-2">
              <Label htmlFor="client-name">Nome do Cliente</Label>
              <Input
                id="client-name"
                value={clientName}
                onChange={(event) => setClientName(event.target.value)}
                autoFocus
                required
              />
            </div>
            {createMutation.isError && (
              <p role="alert" className="text-sm text-destructive">
                Não foi possível gerar o link. Tente novamente.
              </p>
            )}
            <Button
              type="submit"
              disabled={clientName.trim().length < 2 || createMutation.isPending}
            >
              {createMutation.isPending ? "Gerando…" : "Confirmar e gerar link"}
            </Button>
          </form>
        </DialogContent>
      </Dialog>
      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Link gerado</DialogTitle>
            <DialogDescription>
              Este link poderá ser copiado novamente na lista enquanto estiver válido.
            </DialogDescription>
          </DialogHeader>
          {generatedUrl && (
            <div className="grid gap-3">
              <Label htmlFor="generated-link">Link gerado</Label>
              <Input id="generated-link" readOnly value={generatedUrl} />
              <Button onClick={copyLink}>
                <Copy /> Copiar link
              </Button>
              {copyFeedback && (
                <p className="text-sm text-muted-foreground" role="status">
                  {copyFeedback}
                </p>
              )}
            </div>
          )}
        </DialogContent>
      </Dialog>
    </main>
  );
}

function Summary({ label, value }: { label: string; value: number }) {
  return (
    <div className="rounded-xl border bg-background p-5">
      <p className="text-sm text-muted-foreground">{label}</p>
      <p className="mt-2 font-display text-3xl font-semibold">{value}</p>
    </div>
  );
}
