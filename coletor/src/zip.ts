import { execFileSync, spawn } from 'node:child_process';
import { createWriteStream, mkdtempSync, rmSync, statSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { createInterface } from 'node:readline';
import { Readable } from 'node:stream';
import { pipeline } from 'node:stream/promises';
import { linhaCsv } from './normalizar.ts';

/**
 * Baixa um ZIP para uma pasta temporária, em streaming (o de despesas do RS tem ~142 MB), chama `usar` e apaga.
 * Arquivo menor que `minimo` é página de erro ou download cortado: quebra a coleta.
 */
export async function comZip<T>(
  url: string,
  op: { userAgent: string; minimo: number; rotulo: string; timeoutMs?: number },
  usar: (zip: string, modificado: string | null) => Promise<T>,
): Promise<T> {
  const pasta = mkdtempSync(join(tmpdir(), 'emendas-'));
  try {
    const zip = join(pasta, 'arquivo.zip');
    // O servidor do RS já entregou o ZIP com o tamanho certo mas sem diretório central (23/11/2026): `unzip -l` lê só o
    // diretório e pega isso em milissegundos, antes de gastar a leitura de 7,9 GB. Baixa de novo até 3 vezes.
    let resp: Response;
    let inicio: number;
    for (let tentativa = 1; ; tentativa++) {
      inicio = Date.now();
      resp = await fetch(url, { headers: { 'User-Agent': op.userAgent }, signal: AbortSignal.timeout(op.timeoutMs ?? 300_000) });
      if (!resp.ok || !resp.body) throw new Error(`${op.rotulo}: HTTP ${resp.status} no ZIP`);
      await pipeline(Readable.fromWeb(resp.body as import('node:stream/web').ReadableStream), createWriteStream(zip));
      const tamanho = statSync(zip).size;
      if (tamanho < op.minimo) throw new Error(`${op.rotulo}: ZIP com ${tamanho} bytes`);
      try {
        execFileSync('unzip', ['-l', zip], { stdio: 'ignore' });
        break;
      } catch {
        if (tentativa === 3) throw new Error(`${op.rotulo}: ZIP corrompido (${tamanho} bytes) após 3 downloads`);
        console.log(`${op.rotulo}: ZIP corrompido (${tamanho} bytes), baixando de novo (${tentativa}/3)`);
      }
    }
    const tamanho = statSync(zip).size;
    const baixado = Date.now();
    console.log(`${op.rotulo}: ${(tamanho / 1e6).toFixed(1)} MB baixados em ${((baixado - inicio) / 1000).toFixed(0)} s`);
    const modificado = resp.headers.get('last-modified');
    const r = await usar(zip, modificado ? new Date(modificado).toISOString() : null);
    console.log(`${op.rotulo}: lido em ${((Date.now() - baixado) / 1000).toFixed(0)} s`);
    return r;
  } finally {
    rmSync(pasta, { recursive: true, force: true });
  }
}

/**
 * Lê um CSV `;` de dentro do ZIP linha a linha, em latin1, e chama `cada` por registro. O cabeçalho tem de ser
 * exatamente `esperado`: coluna nova, removida ou renomeada quebra a coleta (nunca grava vazio).
 * `arquivo` nulo lê o único arquivo do ZIP. `sobraNaUltima`: CSV sem aspas cujo texto livre tem `;` (despesa do RS);
 * os campos a mais voltam para a última coluna em vez de quebrar a coleta. `filtro`: regex do `grep -E` que a linha
 * tem de casar para chegar ao Node (o cabeçalho sempre passa); a despesa do RS tem 7,9 GB descomprimida.
 */
export async function lerCsv(
  zip: string,
  arquivo: string | null,
  esperado: readonly string[],
  rotulo: string,
  cada: (r: Record<string, string>) => void,
  sobraNaUltima = false,
  filtro?: string,
): Promise<number> {
  const unzip = filtro
    ? // pipefail: unzip quebrado não pode passar como «nenhuma linha». grep sai 1 sem achado, mas o cabeçalho sempre casa.
      // O cabeçalho (`^Exercicio;`, com BOM ou não) passa pelo segundo padrão.
      spawn('bash', ['-c', 'set -o pipefail; unzip -p "$1" ${4:+"$4"} | LC_ALL=C grep -a -E -e "$2" -e "^.{0,3}$3;"', 'lerCsv', zip, filtro, esperado[0]!, arquivo ?? ''], {
        stdio: ['ignore', 'pipe', 'pipe'],
      })
    : spawn('unzip', ['-p', zip, ...(arquivo ? [arquivo] : [])], { stdio: ['ignore', 'pipe', 'pipe'] });
  let erro = '';
  unzip.stderr.on('data', (d) => (erro += d));
  const fim = new Promise<number>((ok) => unzip.on('close', ok));
  unzip.stdout.setEncoding('latin1');

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
        if (JSON.stringify(cabecalho) !== JSON.stringify(esperado)) throw new Error(`${rotulo}: cabeçalho mudou: ${JSON.stringify(cabecalho)}`);
        continue;
      }
      if (sobraNaUltima && campos.length > esperado.length) campos.push(campos.splice(esperado.length - 1).join(';'));
      if (campos.length !== esperado.length) throw new Error(`${rotulo}: linha ${linhas + 2} com ${campos.length} campos`);
      linhas++;
      cada(Object.fromEntries(esperado.map((k, i) => [k, campos[i]!])));
    }
  } catch (e) {
    unzip.kill();
    throw e;
  }
  const codigo = await fim;
  if (codigo !== 0) throw new Error(`${rotulo}: unzip saiu com ${codigo}: ${erro.trim()}`);
  if (!cabecalho || pendente) throw new Error(`${rotulo}: arquivo vazio ou cortado`);
  return linhas;
}
