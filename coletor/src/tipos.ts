export type Fonte = {
  municipio: string;
  uf: string;
  ibge: number;
  /** CNPJ (14 dígitos) → nome. Só estes favorecidos entram: o filtro por localidade da CGU não acha Rolante. */
  favorecidos: Record<string, string>;
  /** Primeiro ano coletado e exibido, em todas as fontes e esferas (recorte de 23/11/2026: 2025 em diante). */
  anoMinimo: number;
  cgu: { zip: string; pagina: string };
  /** SEFAZ/CAGE do RS. `despesas` tem `{ano}` no lugar do exercício; `codMunicipio` é o código do RS, não o do IBGE. */
  rs: { destinacao: string; despesas: string; portal: string; codMunicipio: number };
  fns: { api: string; portal: string };
  transferegov: { api: string; portal: string };
  abase: { api: string; token: string; portal: string; intervaloMs: number; desde: number };
  repositorio: string;
  userAgent: string;
};

export type Esfera = 'federal' | 'estadual' | 'municipal';

/** Uma linha do `EmendasParlamentares_PorFavorecido.csv` (CGU): só valor pago, por mês. */
export type PagamentoCgu = {
  emenda: string;
  ano_emenda: number;
  autor: string;
  tipo: string;
  /** "AAAA-MM" do pagamento. */
  mes: string;
  favorecido: string;
  valor: number;
};

/** `EmendasParlamentares_Parcerias.csv` (transferências com finalidade definida). */
export type ParceriaCgu = {
  emenda: string;
  parceria: string;
  situacao: string;
  repassador: string;
  favorecido: string;
  objeto: string;
  inicio: string | null;
  fim: string | null;
  valor: number;
};

/** `EmendasParlamentares_PlanodeTrabalhoTransferenciasEspeciais.csv` (emenda Pix). */
export type PlanoTeCgu = {
  emenda: string;
  plano_acao: string;
  situacao_plano_acao: string;
  situacao_plano_trabalho: string;
  favorecido: string;
  objeto: string;
  valor: number;
};

export type DadosCgu = { pagamentos: PagamentoCgu[]; parcerias: ParceriaCgu[]; planos_te: PlanoTeCgu[] };

/** Proposta do Fundo Nacional de Saúde, vista por uma emenda (uma proposta pode ter mais de um parlamentar). */
export type PropostaFns = {
  proposta: string;
  tipo: string;
  favorecido: string;
  valor_proposta: number;
  /** Parte desta emenda na proposta (`vlIndObjeto`). */
  valor_emenda: number;
  parlamentares_na_proposta: number;
  empenhado: number;
  pago: number;
  portaria: string | null;
  data_portaria: string | null;
  situacao: string | null;
  data_situacao: string | null;
  parlamentar: string;
  partido: string | null;
  pagamentos: { data: string | null; ob: string; valor: number }[];
};

/** Plano de ação da transferência especial (emenda Pix) no Transferegov. Dados bancários nunca são copiados. */
export type PlanoTransferegov = {
  id: number;
  codigo: string;
  situacao: string;
  parlamentar: string;
  area: string | null;
  valor_custeio: number;
  valor_investimento: number;
  objeto: string | null;
  metas: { descricao: string; unidade: string | null; quantidade: number | null }[];
  plano_trabalho: { situacao: string; inicio: string | null; fim: string | null; prazo_meses: number | null } | null;
  empenhos: { numero: string | null; situacao: string; data: string | null; valor: number }[];
  ordens_bancarias: { numero: string; data: string | null }[];
};

/** Lançamento da despesa do Estado (CAGE) com a ação «Ep <nº>». Sem o histórico em texto livre. */
export type LancamentoRs = {
  /** Exercício do arquivo de despesa (o pagamento pode cair no ano seguinte ao da emenda). */
  exercicio: number;
  data: string | null;
  fase: string;
  /** Nome e CNPJ só quando o favorecido tem CNPJ; pessoa física fica `null` (R8). */
  favorecido: string | null;
  cnpj: string | null;
  orgao: string;
  valor: number;
};

/** Emenda estadual destinada a Rolante (CSV da SEFAZ/CAGE), com a execução na despesa do Estado. */
export type EmendaRs = {
  ano: number;
  numero: string;
  deputado: string;
  partido: string | null;
  /** Soma das linhas da emenda no CSV de destinação (uma emenda pode ter mais de um subtítulo). */
  valor: number;
  /** `acao` = CodProjeto + CodSubtitulo: é o `Cod_Acao` da despesa do Estado, a chave da execução. */
  itens: { acao: string; orgao: string | null; projeto: string | null; subtitulo: string; complemento: string | null; valor: number }[];
  /** Destino como o subtítulo descreve («Fundacao Hospitalar de Rolante», «Atencao Basica»). */
  destino: string | null;
  /** Exercícios da despesa do Estado lidos nesta coleta. Vazio: execução não coletada (não é «sem empenho»). */
  exercicios_lidos: number[];
  execucao: LancamentoRs[];
};

export type EmpenhoAbase = {
  empenho: number;
  data: string | null;
  /** `null` quando a despesa não é com pessoa jurídica: pode ser pessoa física, e o nome não é gravado (R8). */
  credor: string | null;
  empenhado: number;
  liquidado: number;
  pago: number;
  licitacao: { codigo: number; modalidade: string | null; numero: string | null } | null;
};

/** Emenda no módulo «Emendas por parlamentar» do Portal da Transparência da Prefeitura (Abase). */
export type EmendaAbase = {
  codigo: number;
  numero: string;
  nome: string;
  recurso: string;
  tipo: string | null;
  objetivo: string | null;
  finalidade: string | null;
  aplicacao: string | null;
  valor: number;
  autores: { nome: string; partido: string | null }[];
  beneficiarios: { descricao: string; valor: number }[];
  receitas: { data: string | null; descricao: string; valor: number }[];
  empenhos: EmpenhoAbase[];
};

export type Emenda = {
  /** Código de 12 dígitos da CGU nas federais; `rs-{ano}-{nº}` nas estaduais do RS; `abase-{codigo}` nas outras. */
  chave: string;
  esfera: Esfera;
  ano: number;
  autor: string;
  cgu: {
    tipo: string | null;
    autor: string | null;
    pagamentos: PagamentoCgu[];
    parcerias: ParceriaCgu[];
    planos_te: PlanoTeCgu[];
  } | null;
  fns: PropostaFns[];
  transferegov: PlanoTransferegov[];
  rs: EmendaRs | null;
  abase: EmendaAbase[];
};
