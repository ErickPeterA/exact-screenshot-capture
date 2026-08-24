/** Catálogo dos 30 serviços VG. Códigos estáveis — nomes podem mudar. */

export type DimensionCode = "STRATEGY" | "PROCESS" | "PEOPLE" | "FINANCE";

export const DIMENSIONS: {
  code: DimensionCode;
  name: string;
  order: number;
  accent: string;
}[] = [
  { code: "STRATEGY", name: "Estratégia", order: 1, accent: "strategy" },
  { code: "PROCESS", name: "Processos", order: 2, accent: "process" },
  { code: "PEOPLE", name: "Pessoas", order: 3, accent: "people" },
  { code: "FINANCE", name: "Financeiro", order: 4, accent: "finance" },
];

export interface Service {
  code: string;
  name: string;
  dimension: DimensionCode;
  /** Tema da descoberta (linguagem empresarial, sem vender). */
  discoveryText: string;
  /** Necessidade identificada — mostrada primeiro no resultado. */
  need: string;
  /** O que percebemos — interpretação. */
  interpretation: string;
}

export const SERVICES: Service[] = [
  // ── Estratégia ──────────────────────────────────────────────
  {
    code: "SRV_EST_PLANEJAMENTO",
    name: "Planejamento Estratégico",
    dimension: "STRATEGY",
    discoveryText: "Direção e prioridades de médio e longo prazo",
    need: "Definir uma direção clara para os próximos anos.",
    interpretation:
      "As respostas indicam que objetivos, prioridades e desdobramentos ainda podem ganhar maior clareza e formalização.",
  },
  {
    code: "SRV_EST_DIAGNOSTICO",
    name: "Diagnóstico Empresarial",
    dimension: "STRATEGY",
    discoveryText: "Clareza sobre cenário, causas e prioridades",
    need: "Aprofundar o entendimento do cenário atual da empresa.",
    interpretation:
      "Há sinais de que o cenário, as causas e as prioridades ainda não estão suficientemente visíveis para orientar decisões.",
  },
  {
    code: "SRV_EST_INDICADORES",
    name: "Gestão por Indicadores – OKRs e KPIs",
    dimension: "STRATEGY",
    discoveryText: "Objetivos, indicadores e acompanhamento de resultados",
    need: "Acompanhar resultados com indicadores e responsáveis definidos.",
    interpretation:
      "Objetivos e metas ainda podem ganhar indicadores, periodicidade e análise estruturada dos resultados.",
  },
  {
    code: "SRV_EST_MENTORIA",
    name: "Mentoria Estratégica",
    dimension: "STRATEGY",
    discoveryText: "Apoio recorrente para decisões estratégicas",
    need: "Contar com apoio recorrente na análise de cenários e decisões.",
    interpretation:
      "Sócios e gestores indicaram necessidade de um espaço contínuo de reflexão e priorização.",
  },
  {
    code: "SRV_EST_CONSELHO_ESTRUTURA",
    name: "Estruturação e Acompanhamento do Conselho de Gestão",
    dimension: "STRATEGY",
    discoveryText: "Estruturação de uma rotina formal de governança",
    need: "Estruturar uma rotina formal de governança e decisão.",
    interpretation:
      "A empresa tem porte e complexidade compatíveis com governança, mas a rotina ainda não está estruturada.",
  },
  {
    code: "SRV_EST_CONSELHO_PARTICIPACAO",
    name: "Participação em Conselho de Gestão",
    dimension: "STRATEGY",
    discoveryText: "Visão externa e facilitação em conselho já existente",
    need: "Trazer visão externa e análise crítica para as decisões.",
    interpretation:
      "A rotina de governança já existe e pode ganhar profundidade com facilitação especializada.",
  },
  {
    code: "SRV_EST_PLANO_NEGOCIOS",
    name: "Plano de Negócios",
    dimension: "STRATEGY",
    discoveryText: "Estrutura e viabilidade de novo negócio, unidade ou projeto",
    need: "Validar modelo, investimento, cenários e viabilidade.",
    interpretation:
      "O novo negócio, unidade ou projeto ainda não teve estrutura e viabilidade plenamente validadas.",
  },
  {
    code: "SRV_EST_PESQUISA_MERCADO",
    name: "Pesquisa de Mercado",
    dimension: "STRATEGY",
    discoveryText: "Informações externas para reduzir incertezas de decisão",
    need: "Reduzir incerteza em decisões que dependem do mercado.",
    interpretation:
      "Existem decisões relevantes apoiadas em informações externas ainda pouco consolidadas.",
  },
  {
    code: "SRV_EST_POLITICA_COMERCIAL",
    name: "Política Comercial",
    dimension: "STRATEGY",
    discoveryText: "Regras, critérios e alçadas comerciais claras",
    need: "Formalizar regras, critérios e alçadas comerciais.",
    interpretation:
      "Metas, descontos, comissões e alçadas ainda podem ganhar formalização e entendimento comum.",
  },
  {
    code: "SRV_EST_GESTAO_COMERCIAL",
    name: "Gestão Comercial",
    dimension: "STRATEGY",
    discoveryText: "Organização e acompanhamento da operação de vendas",
    need: "Organizar objetivos, processo e acompanhamento da área comercial.",
    interpretation:
      "A operação comercial ainda pode ganhar processo, responsabilidades, indicadores e rituais de acompanhamento.",
  },

  // ── Pessoas ─────────────────────────────────────────────────
  {
    code: "SRV_PES_ASSESSORIA_GP",
    name: "Assessoria em Gestão de Pessoas",
    dimension: "PEOPLE",
    discoveryText: "Suporte técnico e método para a equipe interna de GP",
    need: "Dar método e suporte técnico para quem executa GP internamente.",
    interpretation:
      "Existe estrutura interna de Gestão de Pessoas que se beneficiaria de orientação técnica recorrente.",
  },
  {
    code: "SRV_PES_TERCEIRIZACAO_GP",
    name: "Terceirização em Gestão de Pessoas",
    dimension: "PEOPLE",
    discoveryText: "Execução especializada de rotinas de Gestão de Pessoas",
    need: "Delegar a execução de rotinas de Gestão de Pessoas.",
    interpretation:
      "A empresa indicou preferência por ter as rotinas de GP executadas por um time especializado externo.",
  },
  {
    code: "SRV_PES_CLIMA",
    name: "Diagnóstico de Clima Organizacional",
    dimension: "PEOPLE",
    discoveryText: "Entendimento estruturado da percepção da equipe",
    need: "Conhecer de forma estruturada a percepção da equipe.",
    interpretation:
      "A leitura sobre ambiente, liderança e reconhecimento ainda é informal ou está desatualizada.",
  },
  {
    code: "SRV_PES_CULTURA",
    name: "Diagnóstico de Cultura Organizacional",
    dimension: "PEOPLE",
    discoveryText: "Compreensão dos valores e comportamentos reais da organização",
    need: "Compreender os valores e comportamentos que predominam na prática.",
    interpretation:
      "Ainda há pouca clareza sobre o alinhamento entre cultura praticada e cultura desejada.",
  },
  {
    code: "SRV_PES_ESCUTA_ATIVA",
    name: "Escuta Ativa",
    dimension: "PEOPLE",
    discoveryText: "Canal contínuo e confidencial de escuta dos colaboradores",
    need: "Manter um canal contínuo e seguro de escuta dos colaboradores.",
    interpretation:
      "A empresa vê valor em acompanhar temas recorrentes da equipe ao longo do tempo.",
  },
  {
    code: "SRV_PES_CARGOS_CARREIRA",
    name: "Plano de Cargos e Carreira",
    dimension: "PEOPLE",
    discoveryText: "Níveis, critérios de crescimento e caminhos de evolução profissional",
    need: "Definir níveis, critérios de crescimento e evolução profissional.",
    interpretation:
      "Os caminhos de crescimento ainda não estão claramente definidos para a equipe.",
  },
  {
    code: "SRV_PES_REMUNERACAO",
    name: "Pesquisa Salarial e Estrutura de Remuneração",
    dimension: "PEOPLE",
    discoveryText: "Referências de mercado, faixas e coerência remuneratória",
    need: "Apoiar decisões salariais com referências confiáveis de mercado.",
    interpretation:
      "Faixas e critérios de remuneração ainda podem ganhar consistência e base comparativa.",
  },
  {
    code: "SRV_PES_LIDERANCAS",
    name: "Desenvolvimento de Lideranças",
    dimension: "PEOPLE",
    discoveryText: "Desenvolvimento continuado das competências dos gestores",
    need: "Desenvolver de forma continuada as competências dos gestores.",
    interpretation:
      "Liderança, feedback, delegação e acompanhamento de resultados aparecem como temas de desenvolvimento.",
  },
  {
    code: "SRV_PES_TREINAMENTOS",
    name: "Treinamentos Corporativos",
    dimension: "PEOPLE",
    discoveryText: "Capacitação pontual em competências específicas",
    need: "Capacitar a equipe em competências específicas.",
    interpretation:
      "Há necessidades pontuais de alinhamento de práticas e conhecimentos na equipe.",
  },
  {
    code: "SRV_PES_POLITICA_GP",
    name: "Política de Gestão de Pessoas",
    dimension: "PEOPLE",
    discoveryText: "Formalização das regras e diretrizes de Gestão de Pessoas",
    need: "Formalizar regras e diretrizes de Gestão de Pessoas.",
    interpretation:
      "Temas como férias, ponto, conduta e benefícios ainda podem ganhar formalização e clareza.",
  },
  {
    code: "SRV_PES_DESCRICAO_CARGOS",
    name: "Descrição de Cargos",
    dimension: "PEOPLE",
    discoveryText: "Clareza de funções, responsabilidades, requisitos e competências",
    need: "Dar clareza às funções e responsabilidades da equipe.",
    interpretation:
      "Responsabilidades, requisitos e relações hierárquicas ainda podem ganhar maior formalização.",
  },

  // ── Processos ───────────────────────────────────────────────
  {
    code: "SRV_PRO_ARQUITETURA",
    name: "Arquitetura de Processos",
    dimension: "PROCESS",
    discoveryText: "Desenho de uma operação nova ainda não estruturada",
    need: "Desenhar do zero uma operação, unidade ou processo novo.",
    interpretation:
      "Existe algo sendo estruturado que ainda não acontece na prática e precisa ser desenhado.",
  },
  {
    code: "SRV_PRO_MAPEAMENTO",
    name: "Mapeamento e Modelagem de Processos",
    dimension: "PROCESS",
    discoveryText: "Formalização e organização de processos que já acontecem",
    need: "Formalizar e padronizar os processos que já acontecem.",
    interpretation:
      "Os fluxos existem na prática, mas ainda não estão desenhados e padronizados de forma clara.",
  },
  {
    code: "SRV_PRO_MELHORIA",
    name: "Implantação de Projeto de Melhoria",
    dimension: "PROCESS",
    discoveryText: "Transformação de melhorias definidas em mudanças efetivas",
    need: "Transformar melhorias já identificadas em mudanças efetivas.",
    interpretation:
      "Existem melhorias reconhecidas que ainda não foram colocadas em prática.",
  },
  {
    code: "SRV_PRO_AUDITORIA",
    name: "Auditoria de Processos",
    dimension: "PROCESS",
    discoveryText: "Verificação de aderência, execução, riscos e efetividade",
    need: "Verificar se o padrão definido está sendo cumprido.",
    interpretation:
      "Há processos formalizados cuja aderência e adequação ainda precisam ser verificadas.",
  },

  // ── Financeiro ──────────────────────────────────────────────
  {
    code: "SRV_FIN_CONSULTORIA",
    name: "Consultoria Financeira",
    dimension: "FINANCE",
    discoveryText: "Estruturação ou reorganização da gestão financeira",
    need: "Estruturar ou reorganizar a gestão financeira.",
    interpretation:
      "Controles, relatórios e indicadores financeiros ainda não sustentam plenamente as decisões.",
  },
  {
    code: "SRV_FIN_ASSESSORIA",
    name: "Assessoria Financeira",
    dimension: "FINANCE",
    discoveryText: "Acompanhamento técnico da equipe financeira interna",
    need: "Acompanhar tecnicamente a equipe financeira interna.",
    interpretation:
      "Existe responsável financeiro interno que se beneficiaria de revisão e orientação recorrentes.",
  },
  {
    code: "SRV_FIN_BPO_BASICO",
    name: "BPO Financeiro Básico",
    dimension: "FINANCE",
    discoveryText: "Terceirização da organização, conciliação e fechamento gerencial",
    need: "Terceirizar organização, conciliação e fechamento gerencial.",
    interpretation:
      "A empresa prefere manter contas a pagar e receber internamente e delegar a parte gerencial.",
  },
  {
    code: "SRV_FIN_BPO_AVANCADO",
    name: "BPO Financeiro Avançado",
    dimension: "FINANCE",
    discoveryText:
      "Terceirização ampliada de contas a pagar, receber e rotinas financeiras",
    need: "Terceirizar de forma ampliada as rotinas financeiras.",
    interpretation:
      "A empresa indicou intenção de delegar boa parte da operação financeira do dia a dia.",
  },
  {
    code: "SRV_FIN_PRECIFICACAO",
    name: "Precificação de Produtos e Serviços",
    dimension: "FINANCE",
    discoveryText: "Segurança sobre custos, margens, rentabilidade e preços",
    need: "Dar segurança de que os preços sustentam custos e margens.",
    interpretation:
      "Ainda há dúvidas sobre a relação entre preços praticados, custos e rentabilidade.",
  },
];

export const SERVICE_BY_CODE: Record<string, Service> = Object.fromEntries(
  SERVICES.map((s) => [s.code, s]),
);

export const DIMENSION_BY_CODE = Object.fromEntries(
  DIMENSIONS.map((d) => [d.code, d]),
) as Record<DimensionCode, (typeof DIMENSIONS)[number]>;
