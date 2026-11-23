import type { Emenda, Esfera } from '../../../coletor/src/tipos.ts';
import { formatDate } from './format.ts';

export const ESFERAS: Esfera[] = ['federal', 'estadual', 'municipal'];
export const NOME_ESFERA: Record<Esfera, { um: string; varios: string }> = {
  federal: { um: 'Federal', varios: 'Federais' },
  estadual: { um: 'Estadual', varios: 'Estaduais' },
  municipal: { um: 'Municipal', varios: 'Municipais' },
};

/** Valor sempre com a fonte junto: as fontes não se misturam num número só. */
export type Valor = { valor: number; fonte: string };

const soma = (v: number[]) => v.reduce((s, x) => s + Math.round(x * 100), 0) / 100;

/** Valor destinado a Rolante, na fonte mais próxima da prefeitura que tiver a emenda. */
export function indicado(e: Emenda): Valor | null {
  if (e.abase.length) return { valor: soma(e.abase.map((a) => a.valor)), fonte: 'Prefeitura' };
  if (e.fns.length) return { valor: soma(e.fns.map((f) => f.valor_emenda)), fonte: 'FNS' };
  if (e.transferegov.length) return { valor: soma(e.transferegov.map((t) => t.valor_custeio + t.valor_investimento)), fonte: 'Transferegov' };
  if (e.rs) return { valor: e.rs.valor, fonte: 'SEFAZ/RS' };
  return null;
}

/** A despesa do Estado foi lida nesta coleta. Sem ela, “sem empenho” seria falso: é “não coletada”. */
export const execucaoColetada = (e: Emenda) => Boolean(e.rs?.exercicios_lidos.length);

/** Soma de uma fase da despesa do Estado (CAGE). Anulação vem negativa e entra na soma. */
export const faseRs = (e: Emenda, fase: string) => soma(e.rs?.execucao.filter((l) => l.fase === fase).map((l) => l.valor) ?? []);

/**
 * O que chegou a Rolante. Federal: o que a União pagou (CGU, por mês). Estadual: o que o Estado pagou (despesa
 * da CAGE), à prefeitura ou à entidade de destino. Municipal: não se aplica, o dinheiro já é da prefeitura.
 * Uma fonte só por esfera, para o total da esfera não misturar fontes.
 */
export function chegou(e: Emenda): Valor | null {
  if (e.esfera === 'municipal') return null;
  if (e.esfera === 'federal') return { valor: soma(e.cgu?.pagamentos.map((p) => p.valor) ?? []), fonte: 'CGU' };
  return execucaoColetada(e) ? { valor: faseRs(e, 'Pagamento'), fonte: 'CAGE/RS' } : null;
}

/**
 * O que a prefeitura já pagou com a emenda (empenhos na Abase). Sem a emenda na Abase, não há como saber.
 * Municipal: nunca. A Abase liga à emenda municipal os empenhos da dotação inteira (o mesmo empenho de
 * R$ 1.287.000 aparece nas 9 emendas de R$ 143.000 à Fundação Hospitalar) e nenhum campo separa a parte dela.
 */
export function prefeituraPagou(e: Emenda): Valor | null {
  if (!e.abase.length || e.esfera === 'municipal') return null;
  return { valor: soma(e.abase.flatMap((a) => a.empenhos.map((x) => x.pago))), fonte: 'Prefeitura' };
}

/** Totais de uma esfera. Nunca somar esferas diferentes entre si. */
export function totais(lista: Emenda[]) {
  const s = (f: (e: Emenda) => Valor | null) => {
    const v = lista.map(f).filter((x): x is Valor => x !== null);
    return v.length ? soma(v.map((x) => x.valor)) : null;
  };
  return { quantidade: lista.length, indicado: s(indicado), chegou: s(chegou), pagou: s(prefeituraPagou) };
}

/** Partido como cada fonte informa, sem escolher um: as fontes divergem e o partido muda com o tempo. */
export function partidos(e: Emenda): { partido: string; fonte: string }[] {
  const lista = [
    ...e.fns.map((f) => ({ partido: f.partido, fonte: 'FNS' })),
    ...(e.rs ? [{ partido: e.rs.partido, fonte: 'SEFAZ/RS' }] : []),
    ...e.abase.flatMap((a) => a.autores.map((x) => ({ partido: x.partido, fonte: 'Prefeitura' }))),
  ];
  const vistos = new Set<string>();
  return lista.filter((p): p is { partido: string; fonte: string } => {
    const k = `${p.partido}|${p.fonte}`;
    if (!p.partido || vistos.has(k)) return false;
    vistos.add(k);
    return true;
  });
}

/** Autores como a prefeitura registra (pode haver mais de um); senão, o nome que a fonte federal dá. */
export const autores = (e: Emenda) => (e.abase[0]?.autores.length ? e.abase[0].autores.map((a) => a.nome) : [e.autor]);

/** Texto curto do que é a emenda, como vem da fonte (sem resumo). */
export function titulo(e: Emenda): string {
  return (
    e.abase[0]?.nome ||
    e.rs?.itens[0]?.subtitulo ||
    e.transferegov[0]?.metas[0]?.descricao ||
    e.cgu?.planos_te[0]?.objeto ||
    e.cgu?.parcerias[0]?.objeto ||
    e.fns[0]?.tipo ||
    e.cgu?.tipo ||
    'Sem descrição nas fontes'
  );
}

export const AVISO_PARADO =
  'Dinheiro parado não é irregular por si só: a emenda Pix (transferência especial) tem 36 meses para ser executada.';

/** Fatos de atraso tirados das fontes, sem juízo. Sempre mostrados com o `AVISO_PARADO`. */
export function alertas(e: Emenda): string[] {
  const a: string[] = [];
  for (const f of e.fns) {
    if (f.empenhado > 0 && f.pago === 0) {
      a.push(`Empenhada pelo Ministério da Saúde e sem pagamento até a coleta. Situação no FNS: “${f.situacao ?? 'sem situação'}”${f.data_situacao ? ` em ${formatDate(f.data_situacao)}` : ''}.`);
    }
  }
  for (const t of e.transferegov) {
    if (t.situacao.startsWith('IMPEDIDO')) a.push(`Plano de ação ${t.codigo} com impedimento no Transferegov: “${t.situacao}”.`);
  }
  // Sem a despesa do Estado lida não há fato a mostrar: “sem empenho” seria falso.
  if (e.rs && e.rs.valor > 0 && execucaoColetada(e)) {
    if (!e.rs.execucao.length) a.push(`Destinada no orçamento do RS de ${e.rs.ano} e sem nenhum empenho na despesa do Estado até a coleta.`);
    else if (faseRs(e, 'Pagamento') === 0) a.push('Empenhada pelo Estado e sem pagamento na despesa do RS até a coleta.');
  }
  const receitas = e.abase.flatMap((x) => x.receitas).filter((r) => r.data);
  if (receitas.length && !e.abase.some((x) => x.empenhos.length)) {
    const primeira = receitas.map((r) => r.data!).sort()[0]!;
    a.push(`Dinheiro na conta da prefeitura desde ${formatDate(primeira)} e nenhuma despesa empenhada até a coleta.`);
  }
  return a;
}
