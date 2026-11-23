import { spawn } from 'node:child_process';
import { mkdtempSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { createInterface } from 'node:readline';
import { dataBr, linhaCsv, texto, valorBr } from './normalizar.ts';
import type { DadosCgu, Fonte, PagamentoCgu, ParceriaCgu, PlanoTeCgu } from './tipos.ts';

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

/** Lê um CSV de dentro do ZIP linha a linha (o PorFavorecido tem ~185 MB), em latin1, e chama `cada` por registro. */
async function lerCsv(zip: string, arquivo: Arquivo, cada: (r: Record<string, string>) => void): Promise<number> {
  const unzip = spawn('unzip', ['-p', zip, arquivo], { stdio: ['ignore', 'pipe', 'pipe'] });
  let erro = '';
  unzip.stderr.on('data', (d) => (erro += d));
  const fim = new Promise<number>((ok) => unzip.on('close', ok));
  unzip.stdout.setEncoding('latin1');

  const esperado = CABECALHOS[arquivo];
  let cabecalho: string[] | null = null;
  let pendente = '';
  let linhas = 0;
  try {
    for await (const linha of createInterface({ input: unzip.stdout, crlfDelay: Infinity })) {
      const bruta = pendente ? `${pendente}\n${linha}` : linha;
      const campos = linhaCsv(bruta.replace(/^\uFEFF/, ''));
      if (!campos) {
        pendente = bruta;
        continue;
      }
      pendente = '';
      if (!cabecalho) {
        cabecalho = campos.map((c) => c.trim());
        if (JSON.stringify(cabecalho) !== JSON.stringify(esperado)) {
          throw new Error(`CGU ${arquivo}: cabeçalho mudou: ${JSON.stringify(cabecalho)}`);
        }
        continue;
      }
      if (campos.length !== esperado.length) throw new Error(`CGU ${arquivo}: linha ${linhas + 2} com ${campos.length} campos`);
      linhas++;
      cada(Object.fromEntries(esperado.map((k, i) => [k, campos[i]!])));
    }
  } catch (e) {
    unzip.kill();
    throw e;
  }
  const codigo = await fim;
  if (codigo !== 0) throw new Error(`CGU ${arquivo}: unzip saiu com ${codigo}: ${erro.trim()}`);
  if (!cabecalho || pendente) throw new Error(`CGU ${arquivo}: arquivo vazio ou cortado`);
  return linhas;
}

const ano = (codigo: string) => Number(codigo.slice(0, 4));

/**
 * Baixa o ZIP de emendas do Portal da Transparência (CGU, ~47 MB, sem chave) e separa o que é de Rolante pelo
 * CNPJ do favorecido. Histórico de pagamentos desde `historicoDesde`; parcerias e planos só dos `anos` de detalhe.
 */
export async function coletarCgu(fonte: Fonte, anos: number[]): Promise<DadosCgu & { atualizado_em: string | null; ate: string }> {
  const resp = await fetch(fonte.cgu.zip, { headers: { 'User-Agent': fonte.userAgent }, signal: AbortSignal.timeout(300_000) });
  if (!resp.ok) throw new Error(`CGU: HTTP ${resp.status} no ZIP`);
  const bytes = Buffer.from(await resp.arrayBuffer());
  // O ZIP de 23/11/2026 tinha 47 MB. Bem menor que isso é página de erro ou arquivo cortado.
  if (bytes.length < 10_000_000) throw new Error(`CGU: ZIP com ${bytes.length} bytes`);
  const pasta = mkdtempSync(join(tmpdir(), 'cgu-'));
  const zip = join(pasta, 'emendas.zip');
  writeFileSync(zip, bytes);

  const cnpjs = new Set(Object.keys(fonte.favorecidos));
  const pagamentos: PagamentoCgu[] = [];
  const parcerias: ParceriaCgu[] = [];
  const planos_te: PlanoTeCgu[] = [];
  let ate = '';
  try {
    await lerCsv(zip, 'EmendasParlamentares_PorFavorecido.csv', (r) => {
      const mes = r['Ano/Mês']!;
      if (mes > ate) ate = mes;
      if (!cnpjs.has(r['Código do Favorecido']!) || Number(mes.slice(0, 4)) < fonte.historicoDesde) return;
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
  } finally {
    rmSync(pasta, { recursive: true, force: true });
  }

  // Rolante tem pagamento em quase todo ano desde 2015: nenhum é sinal de filtro ou arquivo quebrado.
  if (!pagamentos.length) throw new Error('CGU: nenhum pagamento para os CNPJs de Rolante');
  const ordem = (a: { emenda: string }, b: { emenda: string }) => a.emenda.localeCompare(b.emenda);
  pagamentos.sort((a, b) => b.mes.localeCompare(a.mes) || ordem(a, b) || a.favorecido.localeCompare(b.favorecido) || a.valor - b.valor);
  parcerias.sort((a, b) => ordem(a, b) || a.parceria.localeCompare(b.parceria));
  planos_te.sort((a, b) => ordem(a, b) || a.plano_acao.localeCompare(b.plano_acao));
  const modificado = resp.headers.get('last-modified');
  return {
    pagamentos,
    parcerias,
    planos_te,
    atualizado_em: modificado ? new Date(modificado).toISOString() : null,
    ate: `${ate.slice(0, 4)}-${ate.slice(4, 6)}`,
  };
}
