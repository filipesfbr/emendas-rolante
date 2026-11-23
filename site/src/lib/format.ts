// Formatação pt-BR do site.

// Espaço inseparável: "R$" nunca fica sozinho no fim da linha.
const NBSP = '\u00A0';
const nf = (min: number, max = min) => new Intl.NumberFormat('pt-BR', { minimumFractionDigits: min, maximumFractionDigits: max });
const n2 = nf(2);

/** 1480190.36 → "R$ 1.480.190,36" */
export const formatBRL = (reais: number) => `R$${NBSP}${n2.format(reais)}`;

export const formatInt = (n: number) => nf(0).format(n);

/** "2026-10-26" → "26/10/2026" */
export const formatDate = (iso: string) => `${iso.slice(8, 10)}/${iso.slice(5, 7)}/${iso.slice(0, 4)}`;

/** "2026-11" → "11/2026" */
export const formatMes = (mes: string) => `${mes.slice(5, 7)}/${mes.slice(0, 4)}`;

/** "2026-10-27T06:00:12-03:00" → "27/10/2026 às 06:00" (o horário já vem em Brasília) */
export const formatColeta = (iso: string) => `${formatDate(iso)} às ${iso.slice(11, 16)}`;
