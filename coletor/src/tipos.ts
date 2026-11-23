export type Fonte = {
  municipio: string;
  uf: string;
  ibge: number;
  /** CNPJ (14 dígitos) → nome. Só estes favorecidos entram: o filtro por localidade da CGU não acha Rolante. */
  favorecidos: Record<string, string>;
  /** Primeiro ano do histórico de pagamentos da CGU. */
  historicoDesde: number;
  cgu: { zip: string; pagina: string };
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
  /** Código de 12 dígitos da CGU (AAAA + autor + número) nas federais; `abase-{codigo}` nas outras. */
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
  abase: EmendaAbase[];
};
