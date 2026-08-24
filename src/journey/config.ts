/**
 * Configuração central e isolada da Jornada do Empreendedor.
 * Todos os limiares, limites e gatilhos ficam aqui para calibração no piloto.
 */

export const JOURNEY_VERSION = "v1";
export const ENGINE_VERSION = "engine-1.0.0";

/** Faixas de maturidade (configuráveis). */
export const MATURITY_BANDS = [
  { min: 80, max: 100, label: "ESTRUTURADO", tone: "strong" },
  { min: 60, max: 79.999, label: "EM EVOLUÇÃO", tone: "evolving" },
  { min: 40, max: 59.999, label: "REQUER ATENÇÃO", tone: "attention" },
  { min: 0, max: 39.999, label: "REQUER PRIORIDADE", tone: "priority" },
] as const;

export const NEUTRAL_MATURITY_LABEL = "NÃO AVALIADO";

/** Valores internos de maturidade. */
export const MATURITY_VALUES = {
  structured: 100,
  partial: 60,
  gap: 20,
  unknown: 0,
} as const;

/** Score de serviço: referência interna. */
export const SERVICE_SCORE = {
  weakSignal: 1,
  relevant: 2,
  strongCandidate: 3,
  priorityScore: 4,
};

export const LIMITS = {
  maxPriorities: 3,
  maxOpportunities: 3,
  /** Score mínimo para ser considerado prioridade. */
  priorityThreshold: 2,
  /** Score mínimo para aparecer como oportunidade. */
  opportunityThreshold: 1,
};

/** Gatilhos da regra transversal do Diagnóstico Empresarial. */
export const DIAGNOSTIC_TRIGGERS = {
  start03NoOrUnknown: true,
  uncertaintyRateThreshold: 0.2,
  minDimensionsNeedingAttention: 3,
  minRelevantGaps: 5,
  minDimensionsWithGaps: 3,
};

/** Retomada de sessão (calibrável no piloto). */
export const SESSION_RESUME_DAYS = 14;

/** Textos configuráveis da aplicação. */
export const TEXTS = {
  brand: "VG Gestão de Resultados",
  appName: "Jornada do Empreendedor",
  landingSubtitle:
    "Descubra como está a gestão da sua empresa e quais pontos merecem maior atenção.",
  estimatedTime: "Tempo estimado: 5 a 8 minutos",
  instructions:
    "Você percorrerá diferentes áreas da gestão da sua empresa. Responda de acordo com a realidade atual do negócio — não existem respostas certas ou erradas. Ao longo do caminho, você poderá fazer algumas descobertas. No final, reuniremos tudo em um Mapa da sua Empresa, mostrando os pontos que já estão estruturados e aqueles que merecem maior atenção.",
  resultTitle: "Sua Jornada está concluída.",
  resultSubtitle:
    "Com base nas suas respostas, construímos um mapa do momento atual da sua empresa.",
  ctaTitle: "Quer aprofundar este mapa com um especialista da VG?",
  ctaIntent: "Quero conversar com a VG sobre este diagnóstico.",
  ctaButton: "Quero conversar com um especialista",
  // PLACEHOLDER — não é a versão jurídica definitiva. Configurável.
  consentText:
    "Autorizo a VG Gestão de Resultados a tratar os dados informados para contato comercial sobre este diagnóstico, conforme a política de privacidade da VG. [Texto provisório — substituir pela versão jurídica oficial.]",
  diagnosticFirstStepTitle: "Primeiro passo recomendado",
  diagnosticFirstStep: "Aprofundar o cenário da empresa.",
  diagnosticAreasTitle: "Principais áreas que merecem investigação",
};
