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
  getJourneyInviteUrlFn,
  listJourneyInvitesFn,
  logoutJourneyAdminFn,
  markJourneyInviteSharedFn,
  regenerateJourneyInviteFn,
  revokeJourneyInviteFn,
} from "@/lib/journey.functions";

export const Route = createFileRoute("/gestao")({
  head: () => ({ meta: [{ title: "Gestão de Jornadas | VG Gestão de Resultados" }] }),
  component: ManagementPage,
});

const statusMeta = {
  created: { label: "Não iniciada", variant: "secondary" as const },
  shared: { label: "Compartilhada", variant: "secondary" as const },
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
  const logout = useServerFn(logoutJourneyAdminFn);
  const createInvite = useServerFn(createJourneyInviteFn);
  const getInviteUrl = useServerFn(getJourneyInviteUrlFn);
  const revokeInvite = useServerFn(revokeJourneyInviteFn);
  const markShared = useServerFn(markJourneyInviteSharedFn);
  const regenerateInvite = useServerFn(regenerateJourneyInviteFn);
  const [nameDialogOpen, setNameDialogOpen] = useState(false);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [clientName, setClientName] = useState("");
  const [pendingInviteId, setPendingInviteId] = useState<string | null>(null);
  const [generatedUrl, setGeneratedUrl] = useState<string | null>(null);
  const [generatedInviteId, setGeneratedInviteId] = useState<string | null>(null);
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
  const createMutation = useMutation({
    mutationFn: ({ inviteId, name }: { inviteId: string | null; name: string }) =>
      inviteId
        ? regenerateInvite({ data: { inviteId, clientName: name } })
        : createInvite({ data: { clientName: name } }),
    onSuccess: (invite) => {
      setGeneratedUrl(invite.url);
      setGeneratedInviteId(invite.invite_id);
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
    mutationFn: async ({
      inviteId,
      open,
      markAsShared,
    }: {
      inviteId: string;
      open: boolean;
      markAsShared: boolean;
    }) => {
      const result = await getInviteUrl({ data: { inviteId } });
      if (!result.available) return { copied: false as const, open, sharingFailed: false };
      if (open) {
        window.location.assign(result.url);
        return { copied: false as const, open, sharingFailed: false };
      }
      await navigator.clipboard.writeText(result.url);
      if (markAsShared) {
        try {
          await markShared({ data: { inviteId } });
        } catch {
          return { copied: true as const, open, sharingFailed: true };
        }
      }
      return { copied: true as const, open, sharingFailed: false };
    },
    onSuccess: (result) => {
      if (result.copied) {
        setNotice(
          result.sharingFailed
            ? "Link copiado, mas não foi possível atualizar o status da Jornada."
            : "Link copiado.",
        );
        void refresh();
      } else if (!result.open) setNotice("Link antigo indisponível.");
    },
    onError: () => setNotice("Não foi possível copiar este link."),
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
    setGeneratedInviteId(null);
    setCopyFeedback(null);
    setNameDialogOpen(true);
  };
  const openReplacement = (inviteId: string, currentClientName: string | null) => {
    setClientName(currentClientName ?? "");
    setPendingInviteId(inviteId);
    setGeneratedUrl(null);
    setGeneratedInviteId(null);
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
      if (generatedInviteId) {
        try {
          await markShared({ data: { inviteId: generatedInviteId } });
          setGeneratedInviteId(null);
          void refresh();
        } catch {
          setCopyFeedback("Link copiado, mas não foi possível atualizar o status da Jornada.");
          return;
        }
      }
      setCopyFeedback("Link copiado.");
    } catch {
      setCopyFeedback("Não foi possível copiar automaticamente. Copie o link exibido.");
    }
  };

  const invites = invitesQuery.data ?? [];
  const counts = { created: 0, started: 0, completed: 0, revoked: 0 };
  invites.forEach((invite) => {
    if (invite.status === "shared") counts.created += 1;
    else if (invite.status in counts) counts[invite.status as keyof typeof counts] += 1;
  });

  return (
    <main className="min-h-screen bg-[radial-gradient(circle_at_top_left,_#d1fae5_0,_#f0fdf4_28%,_#f8fafc_68%)] pb-16">
      <header className="sticky top-0 z-20 border-b border-emerald-100/80 bg-white/85 shadow-[0_1px_20px_rgba(6,78,59,0.06)] backdrop-blur-xl">
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
              className="border-emerald-200 bg-white/70 text-emerald-950 hover:bg-emerald-50"
              onClick={() => logoutMutation.mutate()}
              disabled={logoutMutation.isPending}
            >
              Sair
            </Button>
            <Button
              className="bg-gradient-to-r from-emerald-700 to-teal-600 text-white shadow-lg shadow-emerald-900/15 hover:from-emerald-800 hover:to-teal-700"
              onClick={openCreate}
              disabled={createMutation.isPending}
            >
              <Plus /> Gerar Jornada
            </Button>
          </div>
        </div>
      </header>
      <div className="mx-auto max-w-7xl px-6 py-9">
        <div className="relative overflow-hidden rounded-3xl bg-gradient-to-br from-emerald-950 via-emerald-800 to-teal-600 px-7 py-8 text-white shadow-2xl shadow-emerald-950/20 md:px-10 md:py-10">
          <div className="pointer-events-none absolute -top-24 -right-16 h-64 w-64 rounded-full bg-lime-300/20 blur-3xl" />
          <div className="pointer-events-none absolute -bottom-28 left-1/3 h-56 w-56 rounded-full bg-cyan-300/15 blur-3xl" />
          <div className="relative flex flex-wrap items-end justify-between gap-4">
            <div>
              <p className="text-xs font-semibold tracking-[0.2em] text-emerald-100 uppercase">
                Área interna
              </p>
              <h1 className="mt-2 font-display text-3xl font-semibold tracking-tight md:text-4xl">
                Jornada do Empreendedor
              </h1>
              <p className="mt-3 max-w-2xl text-sm leading-relaxed text-emerald-50/80">
                Acompanhe convites, acessos e resultados em um só lugar.
              </p>
            </div>
            {invitesQuery.isFetching && (
              <span className="rounded-full border border-white/20 bg-white/10 px-3 py-1.5 text-xs text-emerald-50 backdrop-blur">
                Atualizando…
              </span>
            )}
          </div>
        </div>
        {notice && (
          <p
            className="mt-5 rounded-2xl border border-emerald-200/80 bg-white/80 px-5 py-3 text-sm text-emerald-950 shadow-sm backdrop-blur"
            role="status"
          >
            {notice}
          </p>
        )}
        <section
          className="relative z-10 -mt-2 grid gap-4 px-3 sm:grid-cols-2 lg:grid-cols-4"
          aria-label="Resumo das jornadas"
        >
          <Summary label="Não iniciadas" value={counts.created} />
          <Summary label="Em andamento" value={counts.started} />
          <Summary label="Concluídas" value={counts.completed} />
          <Summary label="Revogadas" value={counts.revoked} />
        </section>
        <section
          className="mt-8 overflow-hidden rounded-3xl border border-emerald-100 bg-white/90 shadow-xl shadow-emerald-950/8 backdrop-blur"
          aria-labelledby="lista-jornadas"
        >
          <div className="flex items-center justify-between border-b border-emerald-100 bg-gradient-to-r from-emerald-50/90 to-teal-50/50 px-6 py-5">
            <div>
              <h2
                id="lista-jornadas"
                className="font-display text-lg font-semibold text-emerald-950"
              >
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
              <Button
                className="mt-5 bg-emerald-700 text-white hover:bg-emerald-800"
                onClick={openCreate}
                disabled={createMutation.isPending}
              >
                <Plus /> Gerar Jornada
              </Button>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full min-w-[860px] text-left text-sm">
                <thead className="border-b border-emerald-100 bg-emerald-50/70 text-xs tracking-wide text-emerald-900/70 uppercase">
                  <tr>
                    <th className="w-[25%] px-6 py-4 font-semibold">Cliente/Empresa</th>
                    <th className="w-[24%] px-6 py-4 font-semibold">E-mail</th>
                    <th className="w-[13%] px-6 py-4 font-semibold">Status</th>
                    <th className="w-[16%] px-6 py-4 font-semibold">Expira em</th>
                    <th className="px-6 py-4 text-right font-semibold">Ações</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-emerald-100/70">
                  {invites.map((invite) => {
                    const status = statusMeta[invite.status];
                    const actionable =
                      invite.status === "created" ||
                      invite.status === "shared" ||
                      invite.status === "started";
                    return (
                      <tr
                        key={invite.id}
                        className="align-middle transition-colors hover:bg-emerald-50/55"
                      >
                        <td className="px-6 py-5">
                          <span className="block max-w-[260px] truncate font-semibold text-foreground">
                            {invite.client_name ?? "—"}
                          </span>
                        </td>
                        <td className="px-6 py-5 text-muted-foreground">
                          {invite.contact_email ?? "—"}
                        </td>
                        <td className="px-6 py-5">
                          <Badge variant={status.variant}>{status.label}</Badge>
                        </td>
                        <td className="px-6 py-5 whitespace-nowrap text-muted-foreground">
                          {formatDate(invite.expires_at)}
                        </td>
                        <td className="px-6 py-5">
                          <div className="flex flex-wrap justify-end gap-2">
                            {invite.status === "completed" && invite.session_id && (
                              <Button
                                size="sm"
                                className="bg-emerald-700 text-white shadow-sm hover:bg-emerald-800"
                                asChild
                              >
                                <Link
                                  to="/gestao/resultados/$sessionId"
                                  params={{ sessionId: invite.session_id }}
                                >
                                  <ExternalLink /> Ver resposta
                                </Link>
                              </Button>
                            )}
                            {actionable && invite.link_available && (
                              <Button
                                size="sm"
                                variant="outline"
                                className="border-emerald-200 text-emerald-800 hover:bg-emerald-50 hover:text-emerald-950"
                                onClick={() =>
                                  recoverLinkMutation.mutate({
                                    inviteId: invite.id,
                                    open: false,
                                    markAsShared: invite.status === "created",
                                  })
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
                                className="border-emerald-200 text-emerald-800 hover:bg-emerald-50 hover:text-emerald-950"
                                onClick={() =>
                                  recoverLinkMutation.mutate({
                                    inviteId: invite.id,
                                    open: true,
                                    markAsShared: false,
                                  })
                                }
                                disabled={recoverLinkMutation.isPending}
                              >
                                <ExternalLink /> Acompanhar
                              </Button>
                            )}
                            {actionable && (
                              <Button
                                size="sm"
                                variant="ghost"
                                className="text-destructive hover:bg-destructive/10 hover:text-destructive"
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
                                variant="outline"
                                className="border-emerald-200 text-emerald-800 hover:bg-emerald-50 hover:text-emerald-950"
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
        <DialogContent className="border-emerald-100 shadow-2xl shadow-emerald-950/15">
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
              className="bg-emerald-700 text-white hover:bg-emerald-800"
              disabled={clientName.trim().length < 2 || createMutation.isPending}
            >
              {createMutation.isPending ? "Gerando…" : "Confirmar e gerar link"}
            </Button>
          </form>
        </DialogContent>
      </Dialog>
      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="border-emerald-100 shadow-2xl shadow-emerald-950/15">
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
              <Button
                className="bg-gradient-to-r from-emerald-700 to-teal-600 text-white hover:from-emerald-800 hover:to-teal-700"
                onClick={copyLink}
              >
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
    <div className="group relative overflow-hidden rounded-2xl border border-emerald-100 bg-white/95 p-5 shadow-lg shadow-emerald-950/7 transition duration-300 hover:-translate-y-0.5 hover:shadow-xl hover:shadow-emerald-950/10">
      <div className="absolute inset-x-0 top-0 h-1 bg-gradient-to-r from-emerald-600 via-teal-500 to-lime-400" />
      <div className="absolute -top-10 -right-10 h-24 w-24 rounded-full bg-emerald-100/60 transition-transform duration-300 group-hover:scale-125" />
      <p className="relative text-sm font-medium text-emerald-900/65">{label}</p>
      <p className="relative mt-2 font-display text-3xl font-semibold text-emerald-950">{value}</p>
    </div>
  );
}
