/**
 * Matriz de perguntas, opções, efeitos e rotas — fonte de verdade da jornada V1.
 * Estrutura desacoplada da interface: alterar aqui muda a jornada.
 */

import type { DimensionCode } from "./services";

export type TerritoryCode =
  | "START"
  | "STRATEGY"
  | "PROCESS"
  | "PEOPLE"
  | "FINANCE"
  | "GOVERNANCE"
  | "RESULT";

export interface Territory {
  code: TerritoryCode;
  name: string;
  order: number;
  /** Vertical de maturidade associada (Governança pertence à Estratégia). */
  dimension: DimensionCode | null;
  intro: string;
}

export const TERRITORIES: Territory[] = [
  {
    code: "START",
    name: "Ponto de partida",
    order: 0,
    dimension: null,
    intro: "Vamos entender o momento atual do seu negócio.",
  },
  {
    code: "STRATEGY",
    name: "Estratégia",
    order: 1,
    dimension: "STRATEGY",
    intro: "Direção, mercado e a forma como a empresa vende.",
  },
  {
    code: "PROCESS",
    name: "Processos",
    order: 2,
    dimension: "PROCESS",
    intro: "Como o trabalho acontece e é padronizado no dia a dia.",
  },
  {
    code: "PEOPLE",
    name: "Pessoas",
    order: 3,
    dimension: "PEOPLE",
    intro: "Funções, carreira, cultura e desenvolvimento da equipe.",
  },
  {
    code: "FINANCE",
    name: "Financeiro",
    order: 4,
    dimension: "FINANCE",
    intro: "Controles, informação para decisão e rentabilidade.",
  },
  {
    code: "GOVERNANCE",
    name: "Gestão e Governança",
    order: 5,
    dimension: "STRATEGY",
    intro: "Indicadores, rituais de decisão e acompanhamento.",
  },
];

export interface AnswerOption {
  code: string;
  label: string;
  /** Texto de apoio opcional (opções tipo A/B/C). */
  description?: string;
  /** 100 | 60 | 20 | 0 — somente em nós maturity_bearing. */
  maturity?: number;
  excludeFromMaturity?: boolean;
  uncertainty?: number;
  /** service_code -> delta */
  scores?: Record<string, number>;
  /** tags livres usadas pelas regras de negócio */
  tags?: string[];
  next?: string;
}

export interface JourneyNode {
  code: string;
  territory: TerritoryCode;
  dimension: DimensionCode | null;
  question: string;
  maturityBearing: boolean;
  /** Rota padrão quando a opção não define next. */
  next?: string;
  options: AnswerOption[];
  /** Texto usado nos "pontos estruturados" quando maturidade = 100. */
  structuredPoint?: string;
}

export const RESULT_NODE = "RESULT";
export const FIRST_NODE = "START-01";

export const NODES: JourneyNode[] = [
  // ── Ponto de partida ────────────────────────────────────────
  {
    code: "START-01",
    territory: "START",
    dimension: null,
    maturityBearing: false,
    question: "Qual cenário representa melhor o momento atual do negócio?",
    options: [
      { code: "A", label: "Empresa em operação", next: "START-03" },
      {
        code: "B",
        label: "Novo negócio que ainda não iniciou",
        tags: ["context:new_business"],
        next: "START-02",
      },
      {
        code: "C",
        label: "Empresa em operação avaliando nova unidade, projeto ou expansão",
        tags: ["context:expansion_project"],
        next: "START-02",
      },
    ],
  },
  {
    code: "START-02",
    territory: "START",
    dimension: null,
    maturityBearing: false,
    next: "START-03",
    question:
      "Para esse novo negócio, unidade ou projeto, vocês já validaram modelo, estrutura, investimento, cenários e viabilidade?",
    options: [
      { code: "SIM", label: "Sim" },
      { code: "PARCIAL", label: "Parcialmente", scores: { SRV_EST_PLANO_NEGOCIOS: 2 } },
      { code: "NAO", label: "Não", scores: { SRV_EST_PLANO_NEGOCIOS: 3 } },
      {
        code: "NAO_SEI",
        label: "Não sei",
        scores: { SRV_EST_PLANO_NEGOCIOS: 3 },
        uncertainty: 1,
      },
    ],
  },
  {
    code: "START-03",
    territory: "START",
    dimension: null,
    maturityBearing: false,
    next: "STR-01",
    question:
      "Você consegue apontar com clareza os principais problemas e prioridades atuais da empresa?",
    options: [
      { code: "SIM", label: "Sim", tags: ["clarity:high"] },
      { code: "PARCIAL", label: "Parcialmente", scores: { SRV_EST_DIAGNOSTICO: 1 } },
      {
        code: "NAO",
        label: "Não",
        scores: { SRV_EST_DIAGNOSTICO: 3 },
        tags: ["clarity:low"],
      },
      {
        code: "NAO_SEI",
        label: "Não sei",
        scores: { SRV_EST_DIAGNOSTICO: 3 },
        uncertainty: 1,
        tags: ["clarity:low"],
      },
    ],
  },

  // ── Estratégia ──────────────────────────────────────────────
  {
    code: "STR-01",
    territory: "STRATEGY",
    dimension: "STRATEGY",
    maturityBearing: true,
    next: "STR-02",
    structuredPoint: "Direção estratégica clara para os próximos anos",
    question:
      "A empresa possui uma direção clara para os próximos anos, com prioridades e objetivos definidos?",
    options: [
      { code: "SIM", label: "Sim", maturity: 100 },
      {
        code: "PARCIAL",
        label: "Parcialmente",
        maturity: 60,
        scores: { SRV_EST_PLANEJAMENTO: 2 },
        tags: ["strategy:unclear"],
      },
      {
        code: "NAO",
        label: "Não",
        maturity: 20,
        scores: { SRV_EST_PLANEJAMENTO: 3 },
        tags: ["strategy:unclear"],
      },
      {
        code: "NAO_SEI",
        label: "Não sei",
        maturity: 0,
        scores: { SRV_EST_PLANEJAMENTO: 2 },
        uncertainty: 1,
        tags: ["strategy:unclear"],
      },
    ],
  },
  {
    code: "STR-02",
    territory: "STRATEGY",
    dimension: "STRATEGY",
    maturityBearing: true,
    next: "STR-03",
    structuredPoint: "Objetivos desdobrados em metas e ações revisadas",
    question:
      "Esses objetivos estão traduzidos em metas, prioridades e ações que são revisadas ao longo do tempo?",
    options: [
      { code: "SIM", label: "Sim", maturity: 100 },
      {
        code: "PARCIAL",
        label: "Parcialmente",
        maturity: 60,
        scores: { SRV_EST_PLANEJAMENTO: 1 },
      },
      { code: "NAO", label: "Não", maturity: 20, scores: { SRV_EST_PLANEJAMENTO: 2 } },
      { code: "NAO_SEI", label: "Não sei", maturity: 0, uncertainty: 1 },
    ],
  },
  {
    code: "STR-03",
    territory: "STRATEGY",
    dimension: "STRATEGY",
    maturityBearing: false,
    next: "MKT-01",
    question:
      "Sócios ou gestores sentem necessidade de apoio recorrente para analisar cenários, priorizar ações e tomar decisões estratégicas?",
    options: [
      { code: "SIM", label: "Sim", scores: { SRV_EST_MENTORIA: 3 } },
      { code: "AS_VEZES", label: "Às vezes", scores: { SRV_EST_MENTORIA: 2 } },
      { code: "NAO", label: "Não" },
    ],
  },
  {
    code: "MKT-01",
    territory: "STRATEGY",
    dimension: "STRATEGY",
    maturityBearing: false,
    next: "COM-01",
    question:
      "Existe alguma decisão relevante que dependa de entender melhor mercado, concorrência, público, localização, potencial ou oportunidades externas?",
    options: [
      { code: "SIM", label: "Sim", scores: { SRV_EST_PESQUISA_MERCADO: 3 } },
      {
        code: "TALVEZ",
        label: "Talvez / informação insuficiente",
        scores: { SRV_EST_PESQUISA_MERCADO: 2 },
      },
      { code: "NAO", label: "Não" },
    ],
  },
  {
    code: "COM-01",
    territory: "STRATEGY",
    dimension: "STRATEGY",
    maturityBearing: true,
    next: "COM-02",
    structuredPoint: "Operação comercial organizada e acompanhada",
    question:
      "A área comercial possui objetivos, processo de vendas, responsabilidades, indicadores e rituais de acompanhamento claramente definidos?",
    options: [
      { code: "SIM", label: "Sim", maturity: 100 },
      {
        code: "PARCIAL",
        label: "Parcialmente",
        maturity: 60,
        scores: { SRV_EST_GESTAO_COMERCIAL: 2 },
      },
      {
        code: "NAO",
        label: "Não",
        maturity: 20,
        scores: { SRV_EST_GESTAO_COMERCIAL: 3 },
      },
      { code: "NAO_APLICA", label: "Não se aplica", excludeFromMaturity: true },
    ],
  },
  {
    code: "COM-02",
    territory: "STRATEGY",
    dimension: "STRATEGY",
    maturityBearing: true,
    next: "PROC-01",
    structuredPoint: "Regras e critérios comerciais formalizados",
    question:
      "Metas, descontos, negociações, comissões, premiações, alçadas e critérios comerciais estão formalizados e compreendidos?",
    options: [
      { code: "SIM", label: "Sim", maturity: 100 },
      {
        code: "PARCIAL",
        label: "Parcialmente",
        maturity: 60,
        scores: { SRV_EST_POLITICA_COMERCIAL: 2 },
      },
      {
        code: "NAO",
        label: "Não",
        maturity: 20,
        scores: { SRV_EST_POLITICA_COMERCIAL: 3 },
      },
      { code: "NAO_APLICA", label: "Não se aplica", excludeFromMaturity: true },
    ],
  },

  // ── Processos ───────────────────────────────────────────────
  {
    code: "PROC-01",
    territory: "PROCESS",
    dimension: "PROCESS",
    maturityBearing: false,
    question:
      "Você está estruturando uma operação, unidade ou processo novo que ainda não existe na prática e precisa ser desenhado do zero?",
    options: [
      {
        code: "SIM",
        label: "Sim",
        scores: { SRV_PRO_ARQUITETURA: 3 },
        tags: ["process:new_operation"],
        next: "PROC-04",
      },
      { code: "NAO", label: "Não", next: "PROC-02" },
    ],
  },
  {
    code: "PROC-02",
    territory: "PROCESS",
    dimension: "PROCESS",
    maturityBearing: true,
    structuredPoint: "Processos formalizados e padronizados",
    question:
      "Nos processos que já acontecem, os principais fluxos estão formalmente desenhados, padronizados e claros?",
    options: [
      { code: "SIM", label: "Sim", maturity: 100, tags: ["process:formalized"], next: "PROC-03" },
      {
        code: "PARCIAL",
        label: "Parcialmente",
        maturity: 60,
        scores: { SRV_PRO_MAPEAMENTO: 2 },
        tags: ["process:formalized"],
        next: "PROC-03",
      },
      {
        code: "NAO",
        label: "Não",
        maturity: 20,
        scores: { SRV_PRO_MAPEAMENTO: 3 },
        tags: ["process:not_formalized"],
        next: "PROC-04",
      },
      {
        code: "NAO_SEI",
        label: "Não sei",
        maturity: 0,
        scores: { SRV_PRO_MAPEAMENTO: 3 },
        uncertainty: 1,
        tags: ["process:not_formalized"],
        next: "PROC-04",
      },
    ],
  },
  {
    code: "PROC-03",
    territory: "PROCESS",
    dimension: "PROCESS",
    maturityBearing: true,
    next: "PROC-04",
    structuredPoint: "Padrões de processo cumpridos e adequados",
    question:
      "Nos processos formalizados, é necessário verificar se o padrão definido está sendo cumprido e continua adequado?",
    options: [
      { code: "NAO", label: "Não", maturity: 100 },
      {
        code: "ALGUNS",
        label: "Em alguns processos",
        maturity: 60,
        scores: { SRV_PRO_AUDITORIA: 2 },
      },
      { code: "SIM", label: "Sim", maturity: 20, scores: { SRV_PRO_AUDITORIA: 3 } },
      {
        code: "NAO_SEI",
        label: "Não sei",
        maturity: 0,
        scores: { SRV_PRO_AUDITORIA: 2 },
        uncertainty: 1,
      },
    ],
  },
  {
    code: "PROC-04",
    territory: "PROCESS",
    dimension: "PROCESS",
    maturityBearing: false,
    next: "PEO-01",
    question:
      "Já existem melhorias claramente definidas por diagnóstico, mapeamento ou auditoria que precisam ser colocadas em prática?",
    options: [
      { code: "SIM", label: "Sim", scores: { SRV_PRO_MELHORIA: 3 } },
      {
        code: "PARCIAL",
        label: "Parcialmente / algumas",
        scores: { SRV_PRO_MELHORIA: 2 },
      },
      { code: "NAO", label: "Não" },
    ],
  },

  // ── Pessoas ─────────────────────────────────────────────────
  {
    code: "PEO-01",
    territory: "PEOPLE",
    dimension: "PEOPLE",
    maturityBearing: true,
    next: "PEO-02",
    structuredPoint: "Funções e responsabilidades bem definidas",
    question:
      "Responsabilidades, atividades, requisitos, competências e relações hierárquicas de cada função estão formalizados?",
    options: [
      { code: "SIM", label: "Sim", maturity: 100 },
      {
        code: "PARCIAL",
        label: "Parcialmente",
        maturity: 60,
        scores: { SRV_PES_DESCRICAO_CARGOS: 2 },
        tags: ["people:roles_informal"],
      },
      {
        code: "NAO",
        label: "Não",
        maturity: 20,
        scores: { SRV_PES_DESCRICAO_CARGOS: 3 },
        tags: ["people:roles_informal"],
      },
      {
        code: "NAO_SEI",
        label: "Não sei",
        maturity: 0,
        scores: { SRV_PES_DESCRICAO_CARGOS: 2 },
        uncertainty: 1,
        tags: ["people:roles_informal"],
      },
    ],
  },
  {
    code: "PEO-02",
    territory: "PEOPLE",
    dimension: "PEOPLE",
    maturityBearing: true,
    next: "PEO-03",
    structuredPoint: "Critérios de crescimento e carreira definidos",
    question:
      "A empresa possui níveis, critérios de crescimento, promoção e evolução profissional claramente definidos?",
    options: [
      { code: "SIM", label: "Sim", maturity: 100 },
      {
        code: "PARCIAL",
        label: "Parcialmente",
        maturity: 60,
        scores: { SRV_PES_CARGOS_CARREIRA: 2 },
      },
      {
        code: "NAO",
        label: "Não",
        maturity: 20,
        scores: { SRV_PES_CARGOS_CARREIRA: 3 },
      },
      { code: "NAO_APLICA", label: "Não se aplica", excludeFromMaturity: true },
    ],
  },
  {
    code: "PEO-03",
    territory: "PEOPLE",
    dimension: "PEOPLE",
    maturityBearing: true,
    next: "PEO-04",
    structuredPoint: "Critérios de remuneração apoiados em referências",
    question:
      "A empresa possui referências confiáveis de mercado, faixas salariais e critérios de remuneração para apoiar decisões?",
    options: [
      { code: "SIM", label: "Sim", maturity: 100 },
      {
        code: "PARCIAL",
        label: "Parcialmente",
        maturity: 60,
        scores: { SRV_PES_REMUNERACAO: 2 },
      },
      { code: "NAO", label: "Não", maturity: 20, scores: { SRV_PES_REMUNERACAO: 3 } },
      {
        code: "NAO_SEI",
        label: "Não sei",
        maturity: 0,
        scores: { SRV_PES_REMUNERACAO: 2 },
        uncertainty: 1,
      },
    ],
  },
  {
    code: "PEO-04",
    territory: "PEOPLE",
    dimension: "PEOPLE",
    maturityBearing: true,
    next: "PEO-05",
    structuredPoint: "Percepção da equipe conhecida de forma estruturada",
    question:
      "A gestão conhece, por meio de levantamento estruturado e atual, como os colaboradores percebem ambiente, liderança, comunicação e reconhecimento?",
    options: [
      { code: "SIM", label: "Sim, de forma atual", maturity: 100 },
      {
        code: "PARCIAL",
        label: "Parcialmente / dado antigo",
        maturity: 60,
        scores: { SRV_PES_CLIMA: 2 },
      },
      { code: "NAO", label: "Não", maturity: 20, scores: { SRV_PES_CLIMA: 3 } },
      {
        code: "NAO_SEI",
        label: "Não sei",
        maturity: 0,
        scores: { SRV_PES_CLIMA: 2 },
        uncertainty: 1,
      },
    ],
  },
  {
    code: "PEO-05",
    territory: "PEOPLE",
    dimension: "PEOPLE",
    maturityBearing: true,
    next: "PEO-06",
    structuredPoint: "Cultura praticada compreendida pela gestão",
    question:
      "A empresa compreende quais valores, comportamentos e práticas realmente predominam no dia a dia e seu alinhamento com a cultura desejada?",
    options: [
      { code: "SIM", label: "Sim", maturity: 100 },
      {
        code: "PARCIAL",
        label: "Parcialmente",
        maturity: 60,
        scores: { SRV_PES_CULTURA: 2 },
      },
      { code: "NAO", label: "Não", maturity: 20, scores: { SRV_PES_CULTURA: 3 } },
      {
        code: "NAO_SEI",
        label: "Não sei",
        maturity: 0,
        scores: { SRV_PES_CULTURA: 2 },
        uncertainty: 1,
      },
    ],
  },
  {
    code: "PEO-06",
    territory: "PEOPLE",
    dimension: "PEOPLE",
    maturityBearing: false,
    next: "PEO-07",
    question:
      "Faria sentido manter um canal contínuo, seguro e confidencial para ouvir colaboradores e identificar temas recorrentes ao longo do tempo?",
    options: [
      { code: "SIM", label: "Sim", scores: { SRV_PES_ESCUTA_ATIVA: 3 } },
      { code: "TALVEZ", label: "Talvez", scores: { SRV_PES_ESCUTA_ATIVA: 1 } },
      { code: "NAO", label: "Não" },
    ],
  },
  {
    code: "PEO-07",
    territory: "PEOPLE",
    dimension: "PEOPLE",
    maturityBearing: false,
    next: "PEO-08",
    question:
      "Os gestores precisam desenvolver, de forma continuada, competências de liderança, feedback, delegação, conflitos e acompanhamento de resultados?",
    options: [
      {
        code: "SIM",
        label: "Sim",
        scores: { SRV_PES_LIDERANCAS: 3 },
        tags: ["people:leadership_recurrent"],
      },
      {
        code: "EM_PARTE",
        label: "Em parte",
        scores: { SRV_PES_LIDERANCAS: 2 },
        tags: ["people:leadership_recurrent"],
      },
      { code: "NAO", label: "Não" },
    ],
  },
  {
    code: "PEO-08",
    territory: "PEOPLE",
    dimension: "PEOPLE",
    maturityBearing: false,
    next: "PEO-09",
    question:
      "A equipe precisa desenvolver alguma competência específica ou alinhar práticas e conhecimentos por meio de capacitação pontual?",
    options: [
      { code: "SIM", label: "Sim", scores: { SRV_PES_TREINAMENTOS: 3 } },
      { code: "TALVEZ", label: "Talvez", scores: { SRV_PES_TREINAMENTOS: 1 } },
      { code: "NAO", label: "Não" },
    ],
  },
  {
    code: "PEO-09",
    territory: "PEOPLE",
    dimension: "PEOPLE",
    maturityBearing: true,
    next: "PEO-10",
    structuredPoint: "Diretrizes de Gestão de Pessoas formalizadas",
    question:
      "Regras e diretrizes de Gestão de Pessoas — como férias, ponto, banco de horas, conduta, benefícios e responsabilidades — estão formalizadas e claras?",
    options: [
      { code: "SIM", label: "Sim", maturity: 100 },
      {
        code: "PARCIAL",
        label: "Parcialmente",
        maturity: 60,
        scores: { SRV_PES_POLITICA_GP: 2 },
      },
      { code: "NAO", label: "Não", maturity: 20, scores: { SRV_PES_POLITICA_GP: 3 } },
      {
        code: "NAO_SEI",
        label: "Não sei",
        maturity: 0,
        scores: { SRV_PES_POLITICA_GP: 2 },
        uncertainty: 1,
      },
    ],
  },
  {
    code: "PEO-10",
    territory: "PEOPLE",
    dimension: "PEOPLE",
    maturityBearing: false,
    next: "FIN-01",
    question:
      "Qual situação representa melhor a necessidade atual de apoio contínuo em Gestão de Pessoas?",
    options: [
      {
        code: "A",
        label: "Temos equipe ou responsável interno",
        description: "Executa as rotinas, mas precisa de método e suporte.",
        scores: { SRV_PES_ASSESSORIA_GP: 3 },
        tags: ["gp:internal_execution"],
      },
      {
        code: "B",
        label: "Queremos que a VG execute",
        description: "A VG assume processos e rotinas contratados.",
        scores: { SRV_PES_TERCEIRIZACAO_GP: 3 },
        tags: ["gp:outsource"],
      },
      { code: "C", label: "Não há necessidade de apoio contínuo" },
      {
        code: "D",
        label: "Não sei qual modelo faz sentido",
        scores: { SRV_PES_ASSESSORIA_GP: 1, SRV_PES_TERCEIRIZACAO_GP: 1 },
        uncertainty: 1,
      },
    ],
  },

  // ── Financeiro ──────────────────────────────────────────────
  {
    code: "FIN-01",
    territory: "FINANCE",
    dimension: "FINANCE",
    maturityBearing: true,
    structuredPoint: "Gestão financeira organizada e confiável",
    question:
      "A gestão financeira possui processos, controles, relatórios e indicadores organizados e gera informações confiáveis para decisão?",
    options: [
      { code: "SIM", label: "Sim", maturity: 100, next: "FIN-03" },
      {
        code: "PARCIAL",
        label: "Parcialmente",
        maturity: 60,
        tags: ["finance:gap"],
        next: "FIN-02",
      },
      {
        code: "NAO",
        label: "Não",
        maturity: 20,
        tags: ["finance:gap"],
        next: "FIN-02",
      },
      {
        code: "NAO_SEI",
        label: "Não sei",
        maturity: 0,
        uncertainty: 1,
        tags: ["finance:gap"],
        next: "FIN-02",
      },
    ],
  },
  {
    code: "FIN-02",
    territory: "FINANCE",
    dimension: "FINANCE",
    maturityBearing: false,
    question:
      "Considerando que a gestão financeira precisa ser estruturada ou reorganizada, qual caminho faz mais sentido?",
    options: [
      {
        code: "A",
        label: "Manter a execução interna",
        description: "Estruturar e reorganizar a gestão com apoio técnico.",
        scores: { SRV_FIN_CONSULTORIA: 3 },
        tags: ["finance:internal_execution"],
        next: "FIN-03",
      },
      {
        code: "B",
        label: "Terceirizar rotinas financeiras",
        tags: ["finance:outsource"],
        next: "FIN-04",
      },
      {
        code: "C",
        label: "Ainda não sei",
        scores: { SRV_FIN_CONSULTORIA: 1 },
        uncertainty: 1,
        next: "FIN-04",
      },
    ],
  },
  {
    code: "FIN-03",
    territory: "FINANCE",
    dimension: "FINANCE",
    maturityBearing: false,
    next: "FIN-04",
    question:
      "A empresa já possui equipe ou responsável financeiro e precisa de acompanhamento técnico recorrente para revisar controles, analisar resultados e orientar melhorias?",
    options: [
      { code: "SIM", label: "Sim", scores: { SRV_FIN_ASSESSORIA: 3 } },
      { code: "AS_VEZES", label: "Às vezes", scores: { SRV_FIN_ASSESSORIA: 2 } },
      { code: "NAO", label: "Não" },
    ],
  },
  {
    code: "FIN-04",
    territory: "FINANCE",
    dimension: "FINANCE",
    maturityBearing: false,
    next: "FIN-05",
    question:
      "Em relação à terceirização financeira, qual situação representa melhor a necessidade da empresa?",
    options: [
      {
        code: "A",
        label: "Manter contas a pagar e receber internamente",
        description: "Terceirizar organização, conciliação e fechamento gerencial.",
        scores: { SRV_FIN_BPO_BASICO: 3 },
        tags: ["finance:outsource"],
      },
      {
        code: "B",
        label: "Terceirizar também as rotinas do dia a dia",
        description: "Contas a pagar, contas a receber, agendamentos e rotinas adicionais.",
        scores: { SRV_FIN_BPO_AVANCADO: 3 },
        tags: ["finance:outsource"],
      },
      { code: "C", label: "Não desejamos terceirizar" },
      {
        code: "D",
        label: "Ainda não sabemos",
        scores: { SRV_FIN_BPO_BASICO: 1, SRV_FIN_BPO_AVANCADO: 1 },
        uncertainty: 1,
      },
    ],
  },
  {
    code: "FIN-05",
    territory: "FINANCE",
    dimension: "FINANCE",
    maturityBearing: true,
    next: "GOV-01",
    structuredPoint: "Preços alinhados a custos e margens",
    question:
      "A empresa tem segurança de que seus preços refletem custos, margens e rentabilidade necessários ao negócio?",
    options: [
      { code: "SIM", label: "Sim", maturity: 100 },
      {
        code: "PARCIAL",
        label: "Parcialmente",
        maturity: 60,
        scores: { SRV_FIN_PRECIFICACAO: 2 },
      },
      { code: "NAO", label: "Não", maturity: 20, scores: { SRV_FIN_PRECIFICACAO: 3 } },
      {
        code: "NAO_SEI",
        label: "Não sei",
        maturity: 0,
        scores: { SRV_FIN_PRECIFICACAO: 3 },
        uncertainty: 1,
      },
    ],
  },

  // ── Gestão e Governança ─────────────────────────────────────
  {
    code: "GOV-01",
    territory: "GOVERNANCE",
    dimension: "STRATEGY",
    maturityBearing: true,
    next: "GOV-02",
    structuredPoint: "Indicadores e rotina de análise de resultados",
    question:
      "Objetivos e metas possuem indicadores definidos, responsáveis, periodicidade de acompanhamento e análise dos resultados?",
    options: [
      { code: "SIM", label: "Sim", maturity: 100 },
      {
        code: "PARCIAL",
        label: "Parcialmente",
        maturity: 60,
        scores: { SRV_EST_INDICADORES: 2 },
      },
      { code: "NAO", label: "Não", maturity: 20, scores: { SRV_EST_INDICADORES: 3 } },
      {
        code: "NAO_SEI",
        label: "Não sei",
        maturity: 0,
        scores: { SRV_EST_INDICADORES: 3 },
        uncertainty: 1,
      },
    ],
  },
  {
    code: "GOV-02",
    territory: "GOVERNANCE",
    dimension: "STRATEGY",
    maturityBearing: false,
    question:
      "Pelo porte, complexidade e número de sócios ou lideranças, faz sentido manter uma rotina formal de governança para analisar resultados e tomar decisões?",
    options: [
      { code: "SIM", label: "Sim", tags: ["gov:applicable"], next: "GOV-03" },
      { code: "NAO", label: "Não / Não se aplica", next: RESULT_NODE },
    ],
  },
  {
    code: "GOV-03",
    territory: "GOVERNANCE",
    dimension: "STRATEGY",
    maturityBearing: true,
    structuredPoint: "Rotina de governança estruturada",
    question:
      "Essa rotina ou conselho já está estruturada com pauta, indicadores, dinâmica de reunião, responsabilidades e acompanhamento dos planos de ação?",
    options: [
      {
        code: "SIM",
        label: "Sim",
        maturity: 100,
        tags: ["gov:structured"],
        next: "GOV-04",
      },
      {
        code: "PARCIAL",
        label: "Parcialmente",
        maturity: 60,
        scores: { SRV_EST_CONSELHO_ESTRUTURA: 2 },
        tags: ["gov:not_structured"],
        next: RESULT_NODE,
      },
      {
        code: "NAO",
        label: "Não",
        maturity: 20,
        scores: { SRV_EST_CONSELHO_ESTRUTURA: 3 },
        tags: ["gov:not_structured"],
        next: RESULT_NODE,
      },
    ],
  },
  {
    code: "GOV-04",
    territory: "GOVERNANCE",
    dimension: "STRATEGY",
    maturityBearing: false,
    next: RESULT_NODE,
    question:
      "Com o conselho ou reunião de gestão já estruturado, faria sentido contar com visão externa, análise crítica e facilitação especializada nas decisões?",
    options: [
      { code: "SIM", label: "Sim", scores: { SRV_EST_CONSELHO_PARTICIPACAO: 3 } },
      { code: "TALVEZ", label: "Talvez", scores: { SRV_EST_CONSELHO_PARTICIPACAO: 1 } },
      { code: "NAO", label: "Não" },
    ],
  },
];

export const NODE_BY_CODE: Record<string, JourneyNode> = Object.fromEntries(
  NODES.map((n) => [n.code, n]),
);

export const TERRITORY_BY_CODE = Object.fromEntries(
  TERRITORIES.map((t) => [t.code, t]),
) as Record<TerritoryCode, Territory>;

export function nextNodeFor(nodeCode: string, optionCode: string): string | null {
  const node = NODE_BY_CODE[nodeCode];
  if (!node) return null;
  const option = node.options.find((o) => o.code === optionCode);
  if (!option) return null;
  return option.next ?? node.next ?? RESULT_NODE;
}
