import { createHash } from 'node:crypto';
import { existsSync, mkdirSync, readdirSync, readFileSync, unlinkSync, writeFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { criarAbase } from './abase.ts';
import { coletarCgu } from './cgu.ts';
import { coletarEstadual } from './estadual.ts';
import { coletarFns } from './fns.ts';
import { juntar } from './juntar.ts';
import type { EmendaAbase, Esfera, Fonte } from './tipos.ts';
import { coletarTransferegov } from './transferegov.ts';

const DATA = process.env.DATA_DIR ?? 'data';

const escritos: Record<string, string> = {};
function gravar(relativo: string, conteudo: string) {
  const caminho = join(DATA, relativo);
  mkdirSync(dirname(caminho), { recursive: true });
  writeFileSync(caminho, conteudo);
  escritos[relativo] = `sha256:${createHash('sha256').update(conteudo).digest('hex')}`;
}
const json = (x: unknown) => `${JSON.stringify(x, null, 2)}\n`;
// Uma linha por registro: o diff do git mostra exatamente o que mudou entre coletas.
const jsonLinhas = (a: unknown[]) => (a.length ? `[\n${a.map((x) => JSON.stringify(x)).join(',\n')}\n]\n` : '[]\n');

/** Data e hora em Brasília (UTC−3, sem horário de verão desde 2019). */
function agoraBRT(d = new Date()) {
  const iso = new Date(d.getTime() - 3 * 3600_000).toISOString().slice(0, 19);
  return { hoje: iso.slice(0, 10), em: `${iso}-03:00` };
}

async function main() {
  const fonte = JSON.parse(readFileSync('config/fonte.json', 'utf8')) as Fonte;
  const { hoje, em: iniciadoEm } = agoraBRT();
  const anoAtual = Number(hoje.slice(0, 4));
  // Detalhe: ano atual e anterior. O histórico da CGU vai de `historicoDesde` até hoje, sempre inteiro.
  const anos = process.env.ANOS ? process.env.ANOS.split(',').map(Number) : [anoAtual - 1, anoAtual];

  // Qualquer fonte quebrada lança erro aqui, antes de gravar: o site fica na coleta anterior.
  console.log('CGU: baixando o ZIP de emendas…');
  const cgu = await coletarCgu(fonte, anos);
  console.log(`CGU: ${cgu.pagamentos.length} pagamentos desde ${fonte.historicoDesde} · dados até ${cgu.ate}`);
  console.log('FNS…');
  const fns = await coletarFns(fonte, anos);
  console.log(`FNS: ${fns.size} emendas de saúde`);
  console.log('Transferegov…');
  const transferegov = await coletarTransferegov(fonte, anos);
  console.log(`Transferegov: ${transferegov.size} emendas Pix`);

  // TODO(estadual): fonte própria do RS em investigação; as estaduais vêm só da Abase por enquanto.
  await coletarEstadual();

  const abase = criarAbase(fonte);
  const porAno: Record<number, EmendaAbase[]> = {};
  for (const ano of anos) {
    // A Abase só tem o módulo de emendas preenchido a partir de 2026 (2021–2025 devolvem 0).
    porAno[ano] = ano >= fonte.abase.desde ? await abase.emendas(ano) : [];
    if (ano === anoAtual && ano >= fonte.abase.desde && !porAno[ano]!.length) {
      throw new Error(`Abase ${ano}: nenhuma emenda no ano atual. Nada gravado.`);
    }
  }

  const contagem: Record<number, Record<Esfera, number>> = {};
  const emendas = anos.map((ano) => {
    const lista = juntar(ano, cgu, fns, transferegov, porAno[ano]!);
    contagem[ano] = { federal: 0, estadual: 0, municipal: 0 };
    for (const e of lista) contagem[ano][e.esfera]++;
    return [ano, lista] as const;
  });

  gravar('historico.json', jsonLinhas(cgu.pagamentos));
  for (const [ano, lista] of emendas) gravar(`emendas/${ano}.json`, jsonLinhas(lista));

  // A branch `data` é sempre o snapshot de hoje: ano que saiu da janela sai daqui e fica no histórico do git.
  for (const f of existsSync(join(DATA, 'emendas')) ? readdirSync(join(DATA, 'emendas')) : []) {
    if (!escritos[`emendas/${f}`]) unlinkSync(join(DATA, 'emendas', f));
  }

  gravar(
    'manifest.json',
    json({
      coletado_em: agoraBRT().em,
      iniciado_em: iniciadoEm,
      anos,
      historico_desde: fonte.historicoDesde,
      favorecidos: fonte.favorecidos,
      fontes: {
        cgu: { pagina: fonte.cgu.pagina, zip: fonte.cgu.zip, atualizado_em: cgu.atualizado_em, dados_ate: cgu.ate },
        fns: { portal: fonte.fns.portal },
        transferegov: { portal: fonte.transferegov.portal },
        abase: { portal: fonte.abase.portal, desde: fonte.abase.desde },
      },
      repositorio: fonte.repositorio,
      contagem,
      arquivos: escritos,
    }),
  );
  console.log(`\nColeta ok: ${JSON.stringify(contagem)}`);
}

await main();
