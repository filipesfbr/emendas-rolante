import { criarHttp, type OpcoesHttp } from './http.ts';
import { dataMs, somaCentavos, texto } from './normalizar.ts';
import type { Fonte, PropostaFns } from './tipos.ts';

// API interna do front do Fundo Nacional de Saúde (consultafns), sem documentação: pode mudar sem aviso.
type Pagina<T> = { resultado: { itensPagina: T[]; totalItens: number; totalPaginas: number } };
type Grupo = { coTipoProposta: string; dsTipoRecurso: string; vlProposta: number };
type ItemLista = { nuProposta: string; vlProposta: number };
type Detalhe = {
  resultado: {
    nuProposta: string;
    cnpj: string;
    coTipoProposta: string;
    vlProposta: number;
    nuPortaria: string | null;
    dtPortaria: number | null;
    situacao: { descricaoSituacaoproposta: string | null; dataSituacaoProjeto: number | null } | null;
    vlEmpenhado: number | null;
    vlPago: number | null;
    parlamentares: { sgPartido: string | null; noApelidoPolitico: string; vlIndObjeto: number; coEmendaPolitica: string; nuAnoExercicio: string }[];
    pagamentos: { dtCriacaoSiafi: number | null; nuOb: string; vlLiquido: number }[];
  } | null;
};

/** Propostas de emenda do FNS para o município, por emenda (chave AAAA + `coEmendaPolitica`, igual à da CGU). */
export async function coletarFns(fonte: Fonte, anos: number[], op: Partial<OpcoesHttp> = {}): Promise<Map<string, PropostaFns[]>> {
  const json = criarHttp({ userAgent: fonte.userAgent, intervaloMs: 500, ...op });
  const consultar = <T>(ano: number, extra: Record<string, string>, page = 1) =>
    json<Pagina<T>>(
      `${fonte.fns.api}consultar?${new URLSearchParams({ ano: String(ano), sgUf: fonte.uf, coMunicipioIbge: String(fonte.ibge), ...extra, count: '100', page: String(page) })}`,
      {},
      `FNS ${ano} ${extra.tpProposta ?? 'grupos'}`,
    );

  const porEmenda = new Map<string, PropostaFns[]>();
  for (const ano of anos) {
    const grupos = (await consultar<Grupo>(ano, {})).resultado.itensPagina;
    for (const g of grupos) {
      if (g.dsTipoRecurso === 'PROGRAMA') continue; // custeio de programa: não é emenda
      if (!g.dsTipoRecurso.includes('EMENDA')) throw new Error(`FNS ${ano}: tipo de recurso novo «${g.dsTipoRecurso}»`);

      const itens: ItemLista[] = [];
      for (let page = 1; ; page++) {
        const r = (await consultar<ItemLista>(ano, { tpProposta: g.coTipoProposta, tpRecurso: g.dsTipoRecurso }, page)).resultado;
        itens.push(...r.itensPagina);
        if (page >= r.totalPaginas) {
          if (itens.length !== r.totalItens) throw new Error(`FNS ${ano} ${g.coTipoProposta}: vieram ${itens.length} de ${r.totalItens}`);
          break;
        }
      }
      // A lista tem de fechar, ao centavo, com o total do grupo que o próprio FNS mostra.
      if (somaCentavos(itens.map((i) => i.vlProposta)) !== somaCentavos([g.vlProposta])) {
        throw new Error(`FNS ${ano} ${g.coTipoProposta}: soma das propostas não bate com o total do grupo`);
      }

      for (const { nuProposta } of itens) {
        const d = (await json<Detalhe>(`${fonte.fns.api}obter-proposta?nuProposta=${nuProposta}`, {}, `FNS proposta ${nuProposta}`)).resultado;
        if (!d) throw new Error(`FNS proposta ${nuProposta}: sem detalhe`);
        // Fundação privada e outras entidades do município ficam fora, como na CGU.
        if (!fonte.favorecidos[d.cnpj]) continue;
        if (!d.parlamentares.length) throw new Error(`FNS proposta ${nuProposta}: emenda sem parlamentar`);
        for (const p of d.parlamentares) {
          const chave = `${p.nuAnoExercicio}${p.coEmendaPolitica}`;
          if (!/^\d{12}$/.test(chave)) throw new Error(`FNS proposta ${nuProposta}: código de emenda «${chave}»`);
          const proposta: PropostaFns = {
            proposta: d.nuProposta,
            tipo: d.coTipoProposta,
            favorecido: d.cnpj,
            valor_proposta: d.vlProposta,
            valor_emenda: p.vlIndObjeto,
            parlamentares_na_proposta: d.parlamentares.length,
            empenhado: d.vlEmpenhado ?? 0,
            pago: d.vlPago ?? 0,
            portaria: d.nuPortaria,
            data_portaria: dataMs(d.dtPortaria),
            situacao: texto(d.situacao?.descricaoSituacaoproposta),
            data_situacao: dataMs(d.situacao?.dataSituacaoProjeto),
            parlamentar: texto(p.noApelidoPolitico) ?? '',
            partido: texto(p.sgPartido),
            pagamentos: d.pagamentos.map((x) => ({ data: dataMs(x.dtCriacaoSiafi), ob: x.nuOb, valor: x.vlLiquido })),
          };
          porEmenda.set(chave, [...(porEmenda.get(chave) ?? []), proposta]);
        }
      }
    }
  }
  return porEmenda;
}
