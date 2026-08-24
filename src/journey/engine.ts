/**
 * Motor determinístico da Jornada.
 * Sempre reconstrói o resultado a partir das respostas válidas atuais.
 * Nenhuma pontuação é acumulada de forma incremental.
 */

import {
  DIAGNOSTIC_TRIGGERS,
  ENGINE_VERSION,
  LIMITS,
  MATURITY_BANDS,
  NEUTRAL_MATURITY_LABEL,
  SERVICE_SCORE,
} from "./config";
import {
  FIRST_NODE,
  NODE_BY_CODE,
  RESULT_NODE,
  TERRITORIES,
  nextNodeFor,
  type AnswerOption,
  type JourneyNode,
} from "./nodes";
import { DIMENSIONS, SERVICE_BY_CODE, type DimensionCode } from "./services";

export interface RawAnswer {
  nodeCode: string;
  optionCode: string;
}

export interface ResolvedAnswer extends RawAnswer {
  node: JourneyNode;
  option: AnswerOption;
}

export interface PathState {
  /** Respostas válidas na ordem do caminho atual. */
  validAnswers: ResolvedAnswer[];
  /** Códigos de nós respondidos que deixaram de ser válidos. */
  invalidatedNodes: string[];
  /** Sequência de nós percorridos. */
  path: string[];
  /** Próximo nó a responder — null quando chegou ao RESULT. */
  currentNode: string | null;
  completed: boolean;
}

/** Percorre a máquina de estados a partir das respostas registradas. */
export function resolvePath(answers: RawAnswer[]): PathState {
  const byNode = new Map(answers.map((a) => [a.nodeCode, a]));
  const used = new Set<string>();
  const validAnswers: ResolvedAnswer[] = [];
  const path: string[] = [];

  let cursor: string | null = FIRST_NODE;
  let guard = 0;

  while (cursor && cursor !== RESULT_NODE && guard++ < 200) {
    const node: JourneyNode | undefined = NODE_BY_CODE[cursor];
    if (!node) break;
    path.push(cursor);
    const answer = byNode.get(cursor);
    if (!answer) {
      return {
        validAnswers,
        invalidatedNodes: answers
          .map((a) => a.nodeCode)
          .filter((code) => !used.has(code)),
        path,
        currentNode: cursor,
        completed: false,
      };
    }
    const option = node.options.find((o) => o.code === answer.optionCode);
    if (!option) {
      return {
        validAnswers,
        invalidatedNodes: answers
          .map((a) => a.nodeCode)
          .filter((code) => !used.has(code)),
        path,
        currentNode: cursor,
        completed: false,
      };
    }
    used.add(cursor);
    validAnswers.push({ ...answer, node, option });
    cursor = nextNodeFor(cursor, option.code);
  }

  return {
    validAnswers,
    invalidatedNodes: answers.map((a) => a.nodeCode).filter((c) => !used.has(c)),
    path,
    currentNode: null,
    completed: true,
  };
}

// ── Maturidade ────────────────────────────────────────────────

export interface DimensionScore {
  dimension: DimensionCode;
  name: string;
  score: number | null;
  label: string;
  evaluatedQuestions: number;
}

export function bandFor(score: number | null): string {
  if (score === null) return NEUTRAL_MATURITY_LABEL;
  const band = MATURITY_BANDS.find((b) => score >= b.min && score <= b.max);
  return band ? band.label : NEUTRAL_MATURITY_LABEL;
}

export function scoreMaturity(answers: ResolvedAnswer[]): DimensionScore[] {
  return DIMENSIONS.map((dim) => {
    const applicable = answers.filter(
      (a) =>
        a.node.maturityBearing &&
        a.node.dimension === dim.code &&
        !a.option.excludeFromMaturity &&
        typeof a.option.maturity === "number",
    );
    if (applicable.length === 0) {
      return {
        dimension: dim.code,
        name: dim.name,
        score: null,
        label: NEUTRAL_MATURITY_LABEL,
        evaluatedQuestions: 0,
      };
    }
    const total = applicable.reduce((sum, a) => sum + (a.option.maturity ?? 0), 0);
    const score = Math.round((total / applicable.length) * 100) / 100;
    return {
      dimension: dim.code,
      name: dim.name,
      score,
      label: bandFor(score),
      evaluatedQuestions: applicable.length,
    };
  });
}

// ── Scores de serviço e incerteza ─────────────────────────────

export function scoreServices(answers: ResolvedAnswer[]): Record<string, number> {
  const scores: Record<string, number> = {};
  for (const a of answers) {
    for (const [code, delta] of Object.entries(a.option.scores ?? {})) {
      scores[code] = (scores[code] ?? 0) + delta;
    }
  }
  return scores;
}

export function calculateUncertainty(answers: ResolvedAnswer[]): {
  count: number;
  rate: number;
} {
  const count = answers.reduce((sum, a) => sum + (a.option.uncertainty ?? 0), 0);
  const rate = answers.length ? count / answers.length : 0;
  return { count, rate: Math.round(rate * 1000) / 1000 };
}

function tagsOf(answers: ResolvedAnswer[]): Set<string> {
  const set = new Set<string>();
  for (const a of answers) for (const t of a.option.tags ?? []) set.add(t);
  return set;
}

function answerOf(answers: ResolvedAnswer[], nodeCode: string) {
  return answers.find((a) => a.nodeCode === nodeCode);
}

// ── Regra transversal do Diagnóstico ──────────────────────────

export function diagnosticTrigger(
  answers: ResolvedAnswer[],
  dimensionScores: DimensionScore[],
  uncertaintyRate: number,
): { triggered: boolean; reasons: string[] } {
  const reasons: string[] = [];
  const start03 = answerOf(answers, "START-03");

  if (
    DIAGNOSTIC_TRIGGERS.start03NoOrUnknown &&
    start03 &&
    ["NAO", "NAO_SEI"].includes(start03.optionCode)
  ) {
    reasons.push("Baixa clareza sobre problemas e prioridades atuais (START-03).");
  }
  if (uncertaintyRate >= DIAGNOSTIC_TRIGGERS.uncertaintyRateThreshold) {
    reasons.push(
      `Taxa de incerteza de ${Math.round(uncertaintyRate * 100)}% nas respostas.`,
    );
  }
  const needingAttention = dimensionScores.filter(
    (d) => d.score !== null && d.score < 60,
  );
  if (needingAttention.length >= DIAGNOSTIC_TRIGGERS.minDimensionsNeedingAttention) {
    reasons.push(
      `${needingAttention.length} verticais em "Requer atenção" ou "Requer prioridade".`,
    );
  }
  const gapAnswers = answers.filter(
    (a) => a.node.maturityBearing && (a.option.maturity ?? 100) <= 20,
  );
  const gapDimensions = new Set(gapAnswers.map((a) => a.node.dimension));
  if (
    gapAnswers.length >= DIAGNOSTIC_TRIGGERS.minRelevantGaps &&
    gapDimensions.size >= DIAGNOSTIC_TRIGGERS.minDimensionsWithGaps
  ) {
    reasons.push(
      `${gapAnswers.length} lacunas relevantes distribuídas por ${gapDimensions.size} verticais.`,
    );
  }
  return { triggered: reasons.length > 0, reasons };
}

// ── Regras entre serviços ─────────────────────────────────────

type RuleLog = { rule: string; detail: string };

interface RuleContext {
  scores: Record<string, number>;
  blocked: Set<string>;
  demoted: Set<string>;
  logs: RuleLog[];
}

function block(ctx: RuleContext, code: string, rule: string, detail: string) {
  if ((ctx.scores[code] ?? 0) > 0 || ctx.blocked.has(code)) {
    ctx.logs.push({ rule, detail });
  }
  ctx.blocked.add(code);
  delete ctx.scores[code];
}

function demote(ctx: RuleContext, code: string, rule: string, detail: string) {
  if ((ctx.scores[code] ?? 0) > 0 && !ctx.demoted.has(code)) {
    ctx.demoted.add(code);
    ctx.logs.push({ rule, detail });
  }
}

function applyMutualExclusions(ctx: RuleContext, answers: ResolvedAnswer[]) {
  const tags = tagsOf(answers);

  // Arquitetura x Mapeamento/Auditoria — exclusão por estágio.
  if (tags.has("process:new_operation")) {
    block(
      ctx,
      "SRV_PRO_MAPEAMENTO",
      "mutual_exclusion",
      "Operação nova a ser desenhada: Arquitetura de Processos prevalece.",
    );
    block(
      ctx,
      "SRV_PRO_AUDITORIA",
      "stage_dependency",
      "Sem processo formalizado, Auditoria não se aplica.",
    );
  }
  // Auditoria pressupõe padrão formal.
  if (tags.has("process:not_formalized")) {
    block(
      ctx,
      "SRV_PRO_AUDITORIA",
      "stage_dependency",
      "Processos ainda não formalizados: Mapeamento antecede Auditoria.",
    );
  }

  // Assessoria GP x Terceirização GP — modelo operacional.
  if (tags.has("gp:internal_execution")) {
    block(
      ctx,
      "SRV_PES_TERCEIRIZACAO_GP",
      "operating_model",
      "Execução de GP permanece interna: Assessoria é o modelo aderente.",
    );
  } else if (tags.has("gp:outsource")) {
    block(
      ctx,
      "SRV_PES_ASSESSORIA_GP",
      "operating_model",
      "A empresa deseja que a VG execute as rotinas de GP.",
    );
  } else {
    const a = ctx.scores["SRV_PES_ASSESSORIA_GP"] ?? 0;
    const t = ctx.scores["SRV_PES_TERCEIRIZACAO_GP"] ?? 0;
    if (a > 0 && t > 0) {
      const loser = a >= t ? "SRV_PES_TERCEIRIZACAO_GP" : "SRV_PES_ASSESSORIA_GP";
      demote(ctx, loser, "operating_model", "Modelos de GP mutuamente exclusivos.");
    }
  }

  // Conselho: estruturação x participação.
  if (tags.has("gov:structured")) {
    block(
      ctx,
      "SRV_EST_CONSELHO_ESTRUTURA",
      "mutual_exclusion",
      "Conselho já estruturado: cabe participação, não estruturação.",
    );
  } else if (tags.has("gov:not_structured")) {
    block(
      ctx,
      "SRV_EST_CONSELHO_PARTICIPACAO",
      "mutual_exclusion",
      "Conselho ainda não estruturado: estruturação vem antes.",
    );
  }

  // BPO Básico x Avançado.
  const basico = ctx.scores["SRV_FIN_BPO_BASICO"] ?? 0;
  const avancado = ctx.scores["SRV_FIN_BPO_AVANCADO"] ?? 0;
  if (basico > 0 && avancado > 0) {
    const loser = avancado > basico ? "SRV_FIN_BPO_BASICO" : "SRV_FIN_BPO_AVANCADO";
    demote(ctx, loser, "mutual_exclusion", "Apenas um modelo de BPO como recomendação principal.");
  }

  // Terceirização financeira prevalece sobre Consultoria.
  if (tags.has("finance:outsource")) {
    block(
      ctx,
      "SRV_FIN_CONSULTORIA",
      "operating_model",
      "A empresa optou por terceirizar a execução financeira.",
    );
  }
}

function applyDependenciesAndPrecedence(ctx: RuleContext, answers: ResolvedAnswer[]) {
  const tags = tagsOf(answers);

  // Planejamento Estratégico → Gestão por Indicadores.
  if ((ctx.scores["SRV_EST_PLANEJAMENTO"] ?? 0) >= 2 && tags.has("strategy:unclear")) {
    demote(
      ctx,
      "SRV_EST_INDICADORES",
      "precedence",
      "Sem direção clara, o Planejamento Estratégico antecede a implantação de indicadores.",
    );
    demote(
      ctx,
      "SRV_EST_MENTORIA",
      "precedence",
      "Planejamento estruturado antecede o acompanhamento recorrente.",
    );
  }

  // Descrição de Cargos → Plano de Cargos e Carreira.
  if ((ctx.scores["SRV_PES_DESCRICAO_CARGOS"] ?? 0) >= 2 && tags.has("people:roles_informal")) {
    demote(
      ctx,
      "SRV_PES_CARGOS_CARREIRA",
      "precedence",
      "A descrição das funções antecede ou integra o plano de carreira.",
    );
  }

  // Base de processos → Projeto de Melhoria.
  const baseProcess = Math.max(
    ctx.scores["SRV_PRO_ARQUITETURA"] ?? 0,
    ctx.scores["SRV_PRO_MAPEAMENTO"] ?? 0,
    ctx.scores["SRV_PRO_AUDITORIA"] ?? 0,
  );
  if (baseProcess >= 3 && (ctx.scores["SRV_PRO_MELHORIA"] ?? 0) > 0) {
    demote(
      ctx,
      "SRV_PRO_MELHORIA",
      "stage_dependency",
      "A base de processos precisa estar definida antes da implantação das melhorias.",
    );
  }

  // Consultoria Financeira → Assessoria Financeira.
  if ((ctx.scores["SRV_FIN_CONSULTORIA"] ?? 0) >= 2) {
    demote(
      ctx,
      "SRV_FIN_ASSESSORIA",
      "precedence",
      "A estruturação financeira antecede o acompanhamento técnico recorrente.",
    );
  }
}

function applyScopeHierarchy(ctx: RuleContext, answers: ResolvedAnswer[]) {
  const tags = tagsOf(answers);

  // Gestão Comercial é mais ampla que Política Comercial.
  if (
    (ctx.scores["SRV_EST_GESTAO_COMERCIAL"] ?? 0) >= 2 &&
    (ctx.scores["SRV_EST_POLITICA_COMERCIAL"] ?? 0) > 0
  ) {
    demote(
      ctx,
      "SRV_EST_POLITICA_COMERCIAL",
      "scope_hierarchy",
      "A Política Comercial aparece como componente da Gestão Comercial.",
    );
  }

  // Lideranças (continuado) precede Treinamentos (pontual).
  if (
    tags.has("people:leadership_recurrent") &&
    (ctx.scores["SRV_PES_LIDERANCAS"] ?? 0) >= 2 &&
    (ctx.scores["SRV_PES_TREINAMENTOS"] ?? 0) > 0
  ) {
    demote(
      ctx,
      "SRV_PES_TREINAMENTOS",
      "scope_hierarchy",
      "A necessidade recorrente dos gestores prevalece sobre a capacitação pontual.",
    );
  }

  // Plano de Negócios prioritário; Pesquisa de Mercado complementar.
  if (
    (ctx.scores["SRV_EST_PLANO_NEGOCIOS"] ?? 0) >= 2 &&
    (ctx.scores["SRV_EST_PESQUISA_MERCADO"] ?? 0) > 0
  ) {
    demote(
      ctx,
      "SRV_EST_PESQUISA_MERCADO",
      "complementary",
      "A Pesquisa de Mercado complementa o Plano de Negócios.",
    );
  }
}

// ── Resultado ─────────────────────────────────────────────────

export interface Recommendation {
  serviceCode: string;
  serviceName: string;
  dimension: DimensionCode;
  need: string;
  interpretation: string;
  score: number;
  evidence: string[];
}

export interface StructuredPoint {
  dimension: DimensionCode;
  text: string;
}

export interface JourneyResult {
  engineVersion: string;
  dimensionScores: DimensionScore[];
  serviceScores: Record<string, number>;
  finalScores: Record<string, number>;
  priorities: Recommendation[];
  opportunities: Recommendation[];
  structuredPoints: StructuredPoint[];
  uncertaintyCount: number;
  uncertaintyRate: number;
  diagnosticMode: boolean;
  diagnosticReasons: string[];
  investigationAreas: string[];
  ruleLogs: RuleLog[];
  commercialSummary: { scenario: string; need: string; solution: string }[];
}

function evidenceFor(serviceCode: string, answers: ResolvedAnswer[]): string[] {
  return answers
    .filter((a) => (a.option.scores ?? {})[serviceCode])
    .map((a) => `${a.nodeCode}: "${a.option.label}"`);
}

function toRecommendation(
  code: string,
  score: number,
  answers: ResolvedAnswer[],
): Recommendation | null {
  const service = SERVICE_BY_CODE[code];
  if (!service) return null;
  return {
    serviceCode: code,
    serviceName: service.name,
    dimension: service.dimension,
    need: service.need,
    interpretation: service.interpretation,
    score,
    evidence: evidenceFor(code, answers),
  };
}

export function computeResult(rawAnswers: RawAnswer[]): JourneyResult {
  const { validAnswers } = resolvePath(rawAnswers);

  const serviceScores = scoreServices(validAnswers);
  const dimensionScores = scoreMaturity(validAnswers);
  const { count: uncertaintyCount, rate: uncertaintyRate } =
    calculateUncertainty(validAnswers);

  const ctx: RuleContext = {
    scores: { ...serviceScores },
    blocked: new Set(),
    demoted: new Set(),
    logs: [],
  };

  const diagnostic = diagnosticTrigger(validAnswers, dimensionScores, uncertaintyRate);
  if (diagnostic.triggered) {
    ctx.scores["SRV_EST_DIAGNOSTICO"] = Math.max(
      ctx.scores["SRV_EST_DIAGNOSTICO"] ?? 0,
      SERVICE_SCORE.priorityScore,
    );
    ctx.logs.push({
      rule: "transversal",
      detail: `Diagnóstico Empresarial assume prioridade. ${diagnostic.reasons.join(" ")}`,
    });
  }

  applyMutualExclusions(ctx, validAnswers);
  applyDependenciesAndPrecedence(ctx, validAnswers);
  applyScopeHierarchy(ctx, validAnswers);

  const ranked = Object.entries(ctx.scores)
    .filter(([code, score]) => score > 0 && !ctx.blocked.has(code) && SERVICE_BY_CODE[code])
    .sort((a, b) => {
      if (b[1] !== a[1]) return b[1] - a[1];
      return a[0].localeCompare(b[0]);
    });

  const priorityCodes = ranked
    .filter(([code, score]) => !ctx.demoted.has(code) && score >= LIMITS.priorityThreshold)
    .slice(0, diagnostic.triggered ? 1 : LIMITS.maxPriorities);

  const prioritySet = new Set(priorityCodes.map(([code]) => code));

  const opportunityCodes = ranked
    .filter(
      ([code, score]) =>
        !prioritySet.has(code) && score >= LIMITS.opportunityThreshold,
    )
    .slice(0, LIMITS.maxOpportunities);

  const priorities = priorityCodes
    .map(([code, score]) => toRecommendation(code, score, validAnswers))
    .filter((r): r is Recommendation => Boolean(r));

  const opportunities = opportunityCodes
    .map(([code, score]) => toRecommendation(code, score, validAnswers))
    .filter((r): r is Recommendation => Boolean(r));

  const structuredPoints: StructuredPoint[] = validAnswers
    .filter(
      (a) =>
        a.node.maturityBearing &&
        a.option.maturity === 100 &&
        a.node.structuredPoint &&
        a.node.dimension,
    )
    .map((a) => ({
      dimension: a.node.dimension as DimensionCode,
      text: a.node.structuredPoint as string,
    }));

  const investigationAreas = diagnostic.triggered
    ? dimensionScores
        .filter((d) => d.score !== null && d.score < 60)
        .map((d) => d.name)
    : [];

  const commercialSummary = priorities.map((p) => ({
    scenario: p.evidence.join(" · ") || "Sinais distribuídos ao longo da jornada",
    need: p.need,
    solution: p.serviceName,
  }));

  return {
    engineVersion: ENGINE_VERSION,
    dimensionScores,
    serviceScores,
    finalScores: ctx.scores,
    priorities,
    opportunities,
    structuredPoints,
    uncertaintyCount,
    uncertaintyRate,
    diagnosticMode: diagnostic.triggered,
    diagnosticReasons: diagnostic.reasons,
    investigationAreas,
    ruleLogs: ctx.logs,
    commercialSummary,
  };
}

/** Progresso por território, para a camada visual. */
export function territoryProgress(path: string[], currentNode: string | null) {
  const visited = new Set(path.map((code) => NODE_BY_CODE[code]?.territory));
  const currentTerritory = currentNode
    ? NODE_BY_CODE[currentNode]?.territory
    : "RESULT";
  return TERRITORIES.map((t) => {
    const status =
      t.code === currentTerritory
        ? "current"
        : visited.has(t.code)
          ? "done"
          : "pending";
    return { ...t, status };
  });
}
