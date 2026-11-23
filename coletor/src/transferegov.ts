import { criarHttp, type OpcoesHttp } from './http.ts';
import { dataIso, texto } from './normalizar.ts';
import type { Fonte, PlanoTransferegov } from './tipos.ts';

// API PostgREST das transferências especiais (emenda Pix), sem chave. Atualização não documentada:
// em 23/11/2026 os dados paravam em junho de 2026.
type Plano = {
  id_plano_acao: number;
  codigo_plano_acao: string;
  situacao_plano_acao: string;
  nome_parlamentar_emenda_plano_acao: string;
  ano_emenda_parlamentar_plano_acao: number;
  numero_emenda_parlamentar_plano_acao: string;
  codigo_descricao_areas_politicas_publicas_plano_acao: string | null;
  valor_custeio_plano_acao: number;
  valor_investimento_plano_acao: number;
};
type Executor = { id_plano_acao: number; id_executor: number; objeto_executor: string | null };
type Meta = { id_executor: number; sequencial_meta: number; desc_meta: string; un_medida_meta: string | null; qt_uniade_meta: number | null };
type PlanoTrabalho = {
  id_plano_acao: number;
  situacao_plano_trabalho: string;
  data_inicio_execucao_plano_trabalho: string | null;
  data_fim_execucao_plano_trabalho: string | null;
  prazo_execucao_meses_plano_trabalho: number | null;
};
type Empenho = {
  id_plano_acao: number;
  id_empenho: number;
  numero_empenho: string | null;
  descricao_situacao_empenho: string;
  data_emissao_empenho: string | null;
  valor_empenho: number;
};
type Dh = { id_dh: number; id_empenho: number };
type Ob = { id_dh: number; numero_ordem_bancaria: string | null; data_emissao_ob: string | null };

export async function coletarTransferegov(fonte: Fonte, anos: number[], op: Partial<OpcoesHttp> = {}): Promise<Map<string, PlanoTransferegov[]>> {
  const json = criarHttp({ userAgent: fonte.userAgent, intervaloMs: 500, ...op });
  const tabela = <T>(nome: string, filtro: string) => json<T[]>(`${fonte.transferegov.api}${nome}?${filtro}`, {}, `Transferegov ${nome}`);
  const em = (ids: (number | string)[]) => `in.(${ids.join(',')})`;

  const todos = await tabela<Plano>('plano_acao_especial', `cnpj_beneficiario_plano_acao=${em(Object.keys(fonte.favorecidos))}`);
  // Rolante tem planos desde 2020: nenhum é sinal de API ou filtro quebrado.
  if (!todos.length) throw new Error('Transferegov: nenhum plano de ação para os CNPJs de Rolante');
  const planos = todos.filter((p) => anos.includes(p.ano_emenda_parlamentar_plano_acao));
  const porEmenda = new Map<string, PlanoTransferegov[]>();
  if (!planos.length) return porEmenda;

  const ids = planos.map((p) => p.id_plano_acao);
  const executores = await tabela<Executor>('executor_especial', `id_plano_acao=${em(ids)}`);
  const metas = executores.length ? await tabela<Meta>('meta_especial', `id_executor=${em(executores.map((e) => e.id_executor))}`) : [];
  const trabalhos = await tabela<PlanoTrabalho>('plano_trabalho_especial', `id_plano_acao=${em(ids)}`);
  const empenhos = await tabela<Empenho>('empenho_especial', `id_plano_acao=${em(ids)}`);
  const dhs = empenhos.length ? await tabela<Dh>('documento_habil_especial', `id_empenho=${em(empenhos.map((e) => e.id_empenho))}`) : [];
  const obs = dhs.length ? await tabela<Ob>('ordem_pagamento_ordem_bancaria_especial', `id_dh=${em(dhs.map((d) => d.id_dh))}`) : [];

  for (const p of planos.sort((a, b) => a.id_plano_acao - b.id_plano_acao)) {
    const exec = executores.filter((e) => e.id_plano_acao === p.id_plano_acao);
    const pt = trabalhos.find((t) => t.id_plano_acao === p.id_plano_acao);
    const emps = empenhos.filter((e) => e.id_plano_acao === p.id_plano_acao);
    const dhDoPlano = new Set(dhs.filter((d) => emps.some((e) => e.id_empenho === d.id_empenho)).map((d) => d.id_dh));
    const plano: PlanoTransferegov = {
      id: p.id_plano_acao,
      codigo: p.codigo_plano_acao,
      situacao: p.situacao_plano_acao,
      parlamentar: texto(p.nome_parlamentar_emenda_plano_acao) ?? '',
      area: texto(p.codigo_descricao_areas_politicas_publicas_plano_acao),
      valor_custeio: p.valor_custeio_plano_acao,
      valor_investimento: p.valor_investimento_plano_acao,
      objeto: texto(exec.map((e) => e.objeto_executor ?? '').join('\n')),
      metas: metas
        .filter((m) => exec.some((e) => e.id_executor === m.id_executor))
        .sort((a, b) => a.sequencial_meta - b.sequencial_meta)
        .map((m) => ({ descricao: texto(m.desc_meta) ?? '', unidade: texto(m.un_medida_meta), quantidade: m.qt_uniade_meta })),
      plano_trabalho: pt
        ? {
            situacao: pt.situacao_plano_trabalho,
            inicio: dataIso(pt.data_inicio_execucao_plano_trabalho),
            fim: dataIso(pt.data_fim_execucao_plano_trabalho),
            prazo_meses: pt.prazo_execucao_meses_plano_trabalho,
          }
        : null,
      empenhos: emps.map((e) => ({
        numero: e.numero_empenho,
        situacao: e.descricao_situacao_empenho,
        data: dataIso(e.data_emissao_empenho),
        valor: Number(e.valor_empenho),
      })),
      ordens_bancarias: obs
        .filter((o) => dhDoPlano.has(o.id_dh) && o.numero_ordem_bancaria)
        .map((o) => ({ numero: o.numero_ordem_bancaria!, data: dataIso(o.data_emissao_ob) })),
    };
    const chave = p.numero_emenda_parlamentar_plano_acao;
    if (!/^\d{12}$/.test(chave)) throw new Error(`Transferegov plano ${p.id_plano_acao}: código de emenda «${chave}»`);
    porEmenda.set(chave, [...(porEmenda.get(chave) ?? []), plano]);
  }
  return porEmenda;
}
