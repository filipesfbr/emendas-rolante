// Conversões compartilhadas pelos coletores. Os campos das fontes são copiados um a um (lista de permitidos)
// nos módulos de cada fonte: campo novo numa API nunca chega ao repositório.

// CPF solto, formatado ou só dígitos. Os vizinhos não podem ser dígito, ponto, barra ou hífen,
// para não pegar pedaço de CNPJ formatado ("12.345.678/0001-90") nem de número maior.
const CPF_SOLTO = /(?<![\d./-])\d{3}\.?\d{3}\.?\d{3}-?\d{2}(?![\d./-])/g;

/** R8: número de CPF dentro de um texto é mascarado inteiro, sem dígitos. */
export const mascararCpf = (s: string) => s.replace(CPF_SOLTO, '***.***.***-**');

/** Todo texto livre das fontes passa por aqui. Vazio vira `null`. */
export function texto(s: string | null | undefined): string | null {
  const t = s?.trim();
  return t ? mascararCpf(t) : null;
}

// Abase conta datas em dias desde 28/12/1800 (formato Clarion); 0 = sem data.
const EPOCA_CLARION = Date.UTC(1800, 11, 28);

export const dataClarion = (dias: number | null | undefined): string | null =>
  dias ? new Date(EPOCA_CLARION + dias * 86_400_000).toISOString().slice(0, 10) : null;

/** FNS manda milissegundos desde 1970, meia-noite de Brasília (UTC−3). */
export const dataMs = (ms: number | null | undefined): string | null =>
  ms ? new Date(ms - 3 * 3600_000).toISOString().slice(0, 10) : null;

/** "2026-06-18T00:00:00" ou "2026-06-18" → "2026-06-18". */
export const dataIso = (s: string | null | undefined): string | null => (s && /^\d{4}-\d{2}-\d{2}/.test(s) ? s.slice(0, 10) : null);

/** "23/07/2025" → "2025-07-23". */
export function dataBr(s: string | null | undefined): string | null {
  const m = s && /^(\d{2})\/(\d{2})\/(\d{4})/.exec(s);
  return m ? `${m[3]}-${m[2]}-${m[1]}` : null;
}

/** "1.480.190,36" → 1480190.36. Texto que não é número quebra a coleta (nunca vira zero). */
export function valorBr(s: string): number {
  const limpo = s.trim().replace(/\./g, '').replace(',', '.');
  if (!/^-?\d+(\.\d+)?$/.test(limpo)) throw new Error(`valor inválido: ${JSON.stringify(s)}`);
  return Number(limpo);
}

/** Soma em centavos inteiros: reais com 2 casas não passam por soma de float. */
export const somaCentavos = (valores: number[]) => valores.reduce((s, v) => s + Math.round(v * 100), 0);

/**
 * Uma linha de CSV da CGU: campos entre aspas, separados por `;`, aspas internas dobradas.
 * Devolve `null` quando a linha não fecha as aspas (o campo continua na próxima linha).
 */
export function linhaCsv(linha: string): string[] | null {
  const campos: string[] = [];
  let i = 0;
  while (i <= linha.length) {
    if (linha[i] !== '"') {
      // Campo sem aspas (não visto nos arquivos da CGU, mas aceito).
      const fim = linha.indexOf(';', i);
      campos.push(linha.slice(i, fim < 0 ? undefined : fim));
      if (fim < 0) break;
      i = fim + 1;
      continue;
    }
    let valor = '';
    let j = i + 1;
    for (;;) {
      const aspas = linha.indexOf('"', j);
      if (aspas < 0) return null;
      valor += linha.slice(j, aspas);
      if (linha[aspas + 1] === '"') {
        valor += '"';
        j = aspas + 2;
        continue;
      }
      j = aspas + 1;
      break;
    }
    campos.push(valor);
    if (j >= linha.length) break;
    if (linha[j] !== ';') return null;
    i = j + 1;
  }
  return campos;
}
