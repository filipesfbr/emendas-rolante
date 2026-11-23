import { dataBr, texto, valorBr } from './normalizar.ts';
import type { DadosCgu, Fonte, PagamentoCgu, ParceriaCgu, PlanoTeCgu } from './tipos.ts';
import { comZip, lerCsv as lerCsvZip } from './zip.ts';

// Cabeçalhos conferidos em 23/11/2026. Coluna nova, removida ou renomeada quebra a coleta (nunca grava vazio).
export const CABECALHOS = {
  'EmendasParlamentares_PorFavorecido.csv': [
    'Código da Emenda', 'Código do Autor da Emenda', 'Nome do Autor da Emenda', 'Número da emenda', 'Tipo de Emenda', 'Ano/Mês',
    'Código do Favorecido', 'Favorecido', 'Natureza Jurídica', 'Tipo Favorecido', 'UF Favorecido', 'Município Favorecido', 'Valor Recebido',
  ],
  'EmendasParlamentares_Parcerias.csv': [
    'Emenda Parlamentar', 'Autor da Emenda', 'Código da Parceria', 'Situação da Parceria', 'Ente Repassador', 'CNPJ Ente Repassador',
    'Beneficiário (Ente Recebedor)', 'CNPJ Beneficiário (Ente Recebedor)', 'UF', 'Município', 'Objeto', 'Início Período Execução',
    'Fim Período Execução', 'Valor (R$)',
  ],
  'EmendasParlamentares_PlanodeTrabalhoTransferenciasEspeciais.csv': [
    'Emenda Parlamentar', 'Autor da Emenda', 'Programa do Plano de Trabalho', 'Situação do Plano de Trabalho', 'CNPJ do Beneficiário',
    'Beneficiário', 'UF do Beneficiário', 'Plano de Ação', 'Situação do Plano de Ação', 'Detalhamento do Objeto', 'Valor',
  ],
} as const;
type Arquivo = keyof typeof CABECALHOS;
const lerCsv = (zip: string, arquivo: Arquivo, cada: (r: Record<string, string>) => void) =>
  lerCsvZip(zip, arquivo, CABECALHOS[arquivo], `CGU ${arquivo}`, cada);

const ano = (codigo: string) => Number(codigo.slice(0, 4));

/**
 * Baixa o ZIP de emendas do Portal da Transparência (CGU, ~47 MB, sem chave) e separa o que é de Rolante pelo
 * CNPJ do favorecido. Histórico de pagamentos desde `anoMinimo`; parcerias e planos só dos `anos` de detalhe.
 */
export async function coletarCgu(fonte: Fonte, anos: number[]): Promise<DadosCgu & { atualizado_em: string | null; ate: string }> {
  const cnpjs = new Set(Object.keys(fonte.favorecidos));
  const pagamentos: PagamentoCgu[] = [];
  const parcerias: ParceriaCgu[] = [];
  const planos_te: PlanoTeCgu[] = [];
  let ate = '';
  // O ZIP de 23/11/2026 tinha 47 MB. Bem menor que isso é página de erro ou arquivo cortado.
  const atualizado_em = await comZip(fonte.cgu.zip, { userAgent: fonte.userAgent, minimo: 10_000_000, rotulo: 'CGU' }, async (zip, modificado) => {
    await lerCsv(zip, 'EmendasParlamentares_PorFavorecido.csv', (r) => {
      const mes = r['Ano/Mês']!;
      if (mes > ate) ate = mes;
      if (!cnpjs.has(r['Código do Favorecido']!) || Number(mes.slice(0, 4)) < fonte.anoMinimo) return;
      pagamentos.push({
        emenda: r['Código da Emenda']!,
        ano_emenda: ano(r['Código da Emenda']!),
        autor: texto(r['Nome do Autor da Emenda']) ?? '',
        tipo: r['Tipo de Emenda']!,
        mes: `${mes.slice(0, 4)}-${mes.slice(4, 6)}`,
        favorecido: r['Código do Favorecido']!,
        valor: valorBr(r['Valor Recebido']!),
      });
    });
    await lerCsv(zip, 'EmendasParlamentares_Parcerias.csv', (r) => {
      const emenda = r['Emenda Parlamentar']!;
      if (!cnpjs.has(r['CNPJ Beneficiário (Ente Recebedor)']!) || !anos.includes(ano(emenda))) return;
      parcerias.push({
        emenda,
        parceria: r['Código da Parceria']!,
        situacao: r['Situação da Parceria']!,
        repassador: r['Ente Repassador']!,
        favorecido: r['CNPJ Beneficiário (Ente Recebedor)']!,
        objeto: texto(r['Objeto']) ?? '',
        inicio: dataBr(r['Início Período Execução']),
        fim: dataBr(r['Fim Período Execução']),
        valor: valorBr(r['Valor (R$)']!),
      });
    });
    await lerCsv(zip, 'EmendasParlamentares_PlanodeTrabalhoTransferenciasEspeciais.csv', (r) => {
      const emenda = r['Emenda Parlamentar']!;
      if (!cnpjs.has(r['CNPJ do Beneficiário']!) || !anos.includes(ano(emenda))) return;
      planos_te.push({
        emenda,
        plano_acao: r['Plano de Ação']!,
        situacao_plano_acao: r['Situação do Plano de Ação']!,
        situacao_plano_trabalho: r['Situação do Plano de Trabalho']!,
        favorecido: r['CNPJ do Beneficiário']!,
        objeto: texto(r['Detalhamento do Objeto']) ?? '',
        valor: valorBr(r['Valor']!),
      });
    });
    return modificado;
  });

  // Rolante tem pagamento em quase todo ano desde 2015: nenhum é sinal de filtro ou arquivo quebrado.
  if (!pagamentos.length) throw new Error('CGU: nenhum pagamento para os CNPJs de Rolante');
  const ordem = (a: { emenda: string }, b: { emenda: string }) => a.emenda.localeCompare(b.emenda);
  pagamentos.sort((a, b) => b.mes.localeCompare(a.mes) || ordem(a, b) || a.favorecido.localeCompare(b.favorecido) || a.valor - b.valor);
  parcerias.sort((a, b) => ordem(a, b) || a.parceria.localeCompare(b.parceria));
  planos_te.sort((a, b) => ordem(a, b) || a.plano_acao.localeCompare(b.plano_acao));
  return {
    pagamentos,
    parcerias,
    planos_te,
    atualizado_em,
    ate: `${ate.slice(0, 4)}-${ate.slice(4, 6)}`,
  };
}
