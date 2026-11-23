import { RECURSOS } from './abase.ts';
import type { DadosCgu, Emenda, EmendaAbase, Esfera, PlanoTransferegov, PropostaFns } from './tipos.ts';

const CODIGO_CGU = /^\d{12}$/;

/**
 * Junta as fontes de um ano numa lista de emendas. Federal casa pela chave de 12 dígitos da CGU
 * (AAAA + autor + número), que FNS, Transferegov e Abase também usam. Estadual e municipal vêm só da Abase.
 * Cada fonte fica no seu campo: nada é somado entre fontes nem entre esferas.
 */
export function juntar(
  ano: number,
  cgu: DadosCgu,
  fns: Map<string, PropostaFns[]>,
  transferegov: Map<string, PlanoTransferegov[]>,
  abase: EmendaAbase[],
): Emenda[] {
  const doAno = (codigo: string) => codigo.startsWith(String(ano));
  const abaseFederal = new Map<string, EmendaAbase[]>();
  const proprias: Emenda[] = [];
  for (const a of abase) {
    const esfera: Esfera = RECURSOS[a.recurso as keyof typeof RECURSOS];
    if (esfera === 'federal' && CODIGO_CGU.test(a.numero)) {
      abaseFederal.set(a.numero, [...(abaseFederal.get(a.numero) ?? []), a]);
      continue;
    }
    proprias.push({ chave: `abase-${a.codigo}`, esfera, ano, autor: a.autores[0]?.nome ?? '', cgu: null, fns: [], transferegov: [], abase: [a] });
  }

  const chaves = new Set(
    [
      ...cgu.pagamentos.map((p) => p.emenda),
      ...cgu.parcerias.map((p) => p.emenda),
      ...cgu.planos_te.map((p) => p.emenda),
      ...fns.keys(),
      ...transferegov.keys(),
      ...abaseFederal.keys(),
    ].filter(doAno),
  );

  const federais = [...chaves].map((chave): Emenda => {
    const pagamentos = cgu.pagamentos.filter((p) => p.emenda === chave);
    const parcerias = cgu.parcerias.filter((p) => p.emenda === chave);
    const planos_te = cgu.planos_te.filter((p) => p.emenda === chave);
    const temCgu = pagamentos.length + parcerias.length + planos_te.length > 0;
    const f = fns.get(chave) ?? [];
    const t = transferegov.get(chave) ?? [];
    const a = abaseFederal.get(chave) ?? [];
    const autorCgu = pagamentos[0]?.autor ?? null;
    return {
      chave,
      esfera: 'federal',
      ano,
      autor: autorCgu ?? f[0]?.parlamentar ?? t[0]?.parlamentar ?? a[0]?.autores[0]?.nome ?? '',
      cgu: temCgu ? { tipo: pagamentos[0]?.tipo ?? null, autor: autorCgu, pagamentos, parcerias, planos_te } : null,
      fns: f,
      transferegov: t,
      abase: a,
    };
  });

  const ordem: Record<Esfera, number> = { federal: 0, estadual: 1, municipal: 2 };
  return [...federais, ...proprias].sort(
    (x, y) => ordem[x.esfera] - ordem[y.esfera] || x.autor.localeCompare(y.autor, 'pt-BR') || x.chave.localeCompare(y.chave),
  );
}
