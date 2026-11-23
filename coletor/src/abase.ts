import { criarHttp, type OpcoesHttp } from './http.ts';
import { dataClarion, dataIso, texto } from './normalizar.ts';
import type { EmendaAbase, EmpenhoAbase, Fonte } from './tipos.ts';

// Portal da Transparência da Prefeitura (Abase), módulo «Emendas por parlamentar».
// POST form-urlencoded com o token público. Mais de ~1 chamada por segundo devolve 429.
type Envelope<T> = { status: string | boolean; data: T | null; recordsTotal?: number };
type Parlamentar = { crd_codigo: number; nome_parlamentar: string; total_emendas: number };
type ItemEmenda = { cep_codigo: number };
type Dados = {
  cep_codigo: number;
  cep_num_emenda: string | null;
  cep_nome_emenda: string | null;
  cep_ano: number;
  cep_valor: number | null;
  cep_recurso: string | null;
  cep_tipo_emenda: string | null;
  cep_objetivo: string | null;
  cep_finalidade: string | null;
  cep_aplicacao_recurso: string | null;
};
type Autor = { nome_autor: string; partido: string | null };
type Beneficiario = { descricao: string; valor: number | null };
type Receita = { descricao: string; valor: number; data: number | null };
type EmpenhoLista = {
  empenho: number;
  ano: number;
  data_normal: string | null;
  nomecredor: string | null;
  valorempenhado: number;
  valorliquidado: number;
  valorpago: number;
};
type EmpenhoDetalhe = {
  rubrica: string | null;
  descricaoRubrica: string | null;
  descricaoElemento: string | null;
  codigolicitacao: number | null;
  tipoLicitacao: string | null;
  numeroLicitacao: string | null;
};

// Palavras que só aparecem em nome de empresa ou entidade.
const MARCA_PJ =
  /(^|[\s.-])(LTDA|EIRELI|S\/?A|S\.A|S\/S|ME|EPP|CIA|COMPANHIA|ASSOC|ASSOCIA[CÇ][AÃ]O|FUNDA[CÇ][AÃ]O|SOCIEDADE|INSTITUTO|CLUBE|CONSELHO|COOPERATIVA|SINDICATO|CTG|GR[EÊ]MIO)($|[\s.,-])/i;

/**
 * R8: o empenho não traz o documento do credor, então o nome só é gravado quando a despesa é com pessoa
 * jurídica (rubrica «… pessoa jurídica»), é repasse a entidade sem fins lucrativos (3350/4450) ou o nome tem
 * marca de empresa. Rubrica de pessoa física nunca grava o nome.
 * shortcut: a marca de empresa no nome é heurística e esconde empresas sem sufixo («BOM PASTOR LABORATORIO
 * CLINICO»); trocar pelo CNPJ do credor quando a Abase expuser o documento.
 */
export function credorPodeAparecer(d: Pick<EmpenhoDetalhe, 'rubrica' | 'descricaoRubrica' | 'descricaoElemento'>, nome: string): boolean {
  const desc = `${d.descricaoRubrica ?? ''} ${d.descricaoElemento ?? ''}`;
  if (/f[íi]sica/i.test(desc)) return false;
  return /jur[íi]dica/i.test(desc) || /^(3350|4450)/.test((d.rubrica ?? '').replace(/\s/g, '')) || MARCA_PJ.test(nome);
}

export const RECURSOS = { Federal: 'federal', Estadual: 'estadual', Municipal: 'municipal' } as const;

export function criarAbase(fonte: Fonte, op: Partial<OpcoesHttp> = {}) {
  const json = criarHttp({ userAgent: fonte.userAgent, intervaloMs: fonte.abase.intervaloMs, ...op });

  async function post<T>(caminho: string, params: Record<string, string | number>): Promise<Envelope<T>> {
    const corpo = new URLSearchParams({ token: fonte.abase.token, draw: '1', start: '0', length: '20000' });
    for (const [k, v] of Object.entries(params)) corpo.set(k, String(v));
    const r = await json<Envelope<T>>(
      new URL(`Usuario/${caminho}`, fonte.abase.api),
      { method: 'POST', headers: { 'Content-Type': 'application/x-www-form-urlencoded' }, body: corpo.toString() },
      `Abase ${caminho.split('/').pop()} ${JSON.stringify(params)}`,
    );
    if (r.status !== 'success' && r.status !== true) throw new Error(`Abase ${caminho}: status ${JSON.stringify(r.status)}`);
    return r;
  }
  /** Lista com `recordsTotal`: linhas recebidas têm de bater com o total anunciado. */
  async function lista<T>(caminho: string, params: Record<string, string | number>): Promise<T[]> {
    const r = await post<T[]>(caminho, params);
    const linhas = r.data ?? [];
    if (r.recordsTotal !== undefined && linhas.length !== r.recordsTotal) {
      throw new Error(`Abase ${caminho}: vieram ${linhas.length} de ${r.recordsTotal} linhas`);
    }
    return linhas;
  }

  async function empenho(e: EmpenhoLista): Promise<EmpenhoAbase> {
    // `tipo=0` devolve 500; `tipo=2` traz rubrica e licitação.
    const q = new URLSearchParams({ token: fonte.abase.token, tipo: '2', ano: String(e.ano), entidade: '0', empenho: String(e.empenho) });
    const r = await json<Envelope<EmpenhoDetalhe[]>>(
      new URL(`Usuario/Despesas/BuscaPorCodigo?${q}`, fonte.abase.api),
      {},
      `Abase empenho ${e.ano}/${e.empenho}`,
    );
    const d = r.data?.[0];
    if (r.status !== 'success' || !d) throw new Error(`Abase empenho ${e.ano}/${e.empenho}: sem detalhe`);
    const nome = texto(e.nomecredor);
    return {
      empenho: e.empenho,
      data: dataIso(e.data_normal),
      credor: nome && credorPodeAparecer(d, nome) ? nome : null,
      empenhado: e.valorempenhado,
      liquidado: e.valorliquidado,
      pago: e.valorpago,
      licitacao: d.codigolicitacao ? { codigo: d.codigolicitacao, modalidade: texto(d.tipoLicitacao), numero: texto(d.numeroLicitacao) } : null,
    };
  }

  /** Todas as emendas do ano, sem repetir as que têm mais de um autor. */
  async function emendas(ano: number): Promise<EmendaAbase[]> {
    const parlamentares = await lista<Parlamentar>('EmendasPorParlamentar/ListaEmendasPorParlamentar', {
      ano,
      numeroEmenda: '',
      nomeParlamentar: '',
      origem: '',
    });
    const codigos = new Set<number>();
    for (const p of parlamentares) {
      const doParlamentar = (await post<ItemEmenda[]>('EmendasPorParlamentar/ListaEmendasDoParlamentar', {
        crdCodigo: p.crd_codigo,
        ano,
        numeroEmenda: '',
        origem: '',
      })).data ?? [];
      if (doParlamentar.length !== p.total_emendas) {
        throw new Error(`Abase ${ano}: parlamentar ${p.crd_codigo} tem ${p.total_emendas} emendas na lista e ${doParlamentar.length} no detalhe`);
      }
      for (const e of doParlamentar) codigos.add(e.cep_codigo);
    }

    const saida: EmendaAbase[] = [];
    for (const cepCodigo of [...codigos].sort((a, b) => a - b)) {
      const d = (await post<Dados>('EmendasPorParlamentar/DadosEmenda', { cepCodigo })).data;
      if (!d) throw new Error(`Abase emenda ${cepCodigo}: sem dados`);
      if (!d.cep_recurso || !(d.cep_recurso in RECURSOS)) throw new Error(`Abase emenda ${cepCodigo}: recurso novo «${d.cep_recurso}»`);
      const autores = (await post<Autor[]>('EmendasPorParlamentar/ListarAutoresEmenda', { cepCodigo })).data ?? [];
      const beneficiarios = (await post<Beneficiario[]>('EmendasPorParlamentar/ListarBeneficiariosEmenda', { cepCodigo })).data ?? [];
      const receitas = await lista<Receita>('EmendasPorParlamentar/ListarReceitas', { cepCodigo });
      const empenhos: EmpenhoAbase[] = [];
      for (const e of await lista<EmpenhoLista>('EmendasPorParlamentar/ListarEmpenhos', { cepCodigo })) empenhos.push(await empenho(e));

      saida.push({
        codigo: d.cep_codigo,
        numero: d.cep_num_emenda?.trim() ?? '',
        nome: texto(d.cep_nome_emenda) ?? '',
        recurso: d.cep_recurso,
        tipo: texto(d.cep_tipo_emenda),
        objetivo: texto(d.cep_objetivo),
        finalidade: texto(d.cep_finalidade),
        aplicacao: texto(d.cep_aplicacao_recurso),
        valor: d.cep_valor ?? 0,
        autores: autores.map((a) => ({ nome: texto(a.nome_autor) ?? '', partido: texto(a.partido) })),
        beneficiarios: beneficiarios.map((b) => ({ descricao: texto(b.descricao) ?? '', valor: b.valor ?? 0 })),
        receitas: receitas.map((r) => ({ data: dataClarion(r.data), descricao: texto(r.descricao) ?? '', valor: r.valor })),
        empenhos: empenhos.sort((a, b) => (a.data ?? '').localeCompare(b.data ?? '') || a.empenho - b.empenho),
      });
      console.log(`Abase ${ano} ${d.cep_recurso} ${d.cep_num_emenda}: ${receitas.length} receitas · ${empenhos.length} empenhos`);
    }
    return saida;
  }

  return { emendas };
}
