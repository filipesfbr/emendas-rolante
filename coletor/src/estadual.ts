import { dataBr, texto, valorBr } from './normalizar.ts';
import type { EmendaRs, Fonte, LancamentoRs } from './tipos.ts';
import { comZip, lerCsv } from './zip.ts';

// Fontes oficiais do RS (SEFAZ/CAGE), sem chave. Cabeçalhos conferidos em 23/11/2026.
// Destinação: «Emendas Parlamentares Estaduais.zip» (~200 KB). Execução: «Despesas do Estado-<ano>.zip» (~142 MB).
export const DESTINACAO = [
  'Ano', 'CodCorede', 'Corede', 'CodOrgAo', 'Orgao', 'SiglaOrgao', 'CodUo', 'CodProjeto', 'NomeProjeto', 'CodSubtitulo', 'Subtitulo',
  'SubtituloResumido', 'Municipio', 'CodMunicipio', 'Valor', 'Complemento', 'Emenda', 'Deputado', 'Partido',
] as const;

export const DESPESA = [
  'Exercicio', 'Mes', 'FaseGasto', 'TipoGasto', 'Empenho', 'Liquidacao', 'Pagamento', 'Retencao', 'Processo', 'Cod_Credor', 'Favorecido',
  'CNPJ', 'Poder', 'Cod_Setor_Gov', 'Setor', 'Cod_orgao', 'Orgao', 'Cod_UO', 'UO', 'Cod_Categoria', 'Categoria', 'Cod_grupo', 'Grupo',
  'Cod_Modalidade', 'Modalidade', 'Cod_Elemento', 'Elemento', 'Cod_Rubrica', 'Rubrica', 'Cod_Contrapartida', 'Contrapartida', 'Cod_Funcao',
  'Funcao', 'Cod_Subfuncao', 'Subfuncao', 'Cod_Acao', 'Acao', 'Cod_Projeto', 'Projeto', 'Cod_Programa', 'Programa', 'Cod_Recurso', 'Recurso',
  'Data', 'Valor', 'Ordenador', 'Historico', 'Cod_Tesouraria', 'Tesouraria', 'MotivoRetencao', 'Beneficiario', 'Banco', 'Agencia',
  'ProcedimentoLicitatorio', 'TipoProcedimento', 'Cod_Municipio', 'Municipio', 'Competencia', 'Exercicio_Convenio', 'Cod_Convenio',
  'Exercicio_Contrato', 'Cod_Contrato', 'Cod_Classificacao_Fonte_Recurso', 'Classificacao Fonte Recurso', 'Cod_Natureza_Despesa',
  'Nome Natureza Despesa', 'Informacoes Complementares',
] as const;

/** «Fundação Hospitalar» → «fundacaohospitalar»: o texto da ação na despesa vem com caixa e hífens diferentes. */
export const normal = (s: string) => s.normalize('NFD').replace(/[^\p{L}\p{N}]/gu, '').toLowerCase();

/** «Ep 1068 - Fundacao Hospitalar de Rolante - Rolante» → «Fundacao Hospitalar de Rolante». */
export function destino(subtitulo: string, municipio: string): string | null {
  const partes = subtitulo.split(' - ').map((p) => p.trim());
  if (/^ep\s*\d+$/i.test(partes[0] ?? '')) partes.shift();
  if (partes.length > 1 && normal(partes.at(-1)!) === normal(municipio)) partes.pop();
  return partes.join(' - ') || null;
}

/** «Ep 740-atencao Basica-rolante» → 740. Ação que não é de emenda devolve `null`. */
export const numeroEp = (acao: string) => /^ep\s*(\d+)\b/i.exec(acao.trim())?.[1] ?? null;

const valorOuZero = (s: string) => (s.trim() ? valorBr(s) : 0);

/**
 * Lê as linhas de destinação do RS para o município (filtro por `CodMunicipio`, válido de 2024 em diante) e
 * junta por Ano + nº da emenda (uma emenda pode ter mais de um subtítulo).
 */
export function lerDestinacao(linhas: Record<string, string>[], fonte: Fonte, anos: number[]): Map<string, EmendaRs> {
  const emendas = new Map<string, EmendaRs>();
  for (const r of linhas) {
    const ano = Number(r.Ano);
    if (!anos.includes(ano) || Number(r.CodMunicipio) !== fonte.rs.codMunicipio) continue;
    if (normal(r.Municipio!) !== normal(fonte.municipio)) {
      throw new Error(`RS destinação: CodMunicipio ${fonte.rs.codMunicipio} agora é «${r.Municipio}»`);
    }
    const numero = r.Emenda!.trim();
    if (!/^\d+$/.test(numero)) throw new Error(`RS destinação ${ano}: nº de emenda «${numero}»`);
    const chave = `${ano}-${numero}`;
    const subtitulo = texto(r.Subtitulo) ?? `Ep ${numero}`;
    // CodSubtitulo começa com o ano da emenda («25038») e é de um município só: com o projeto, é o `Cod_Acao`
    // da despesa. O nº da emenda sozinho não serve (repete entre anos e pode ser dividido entre municípios).
    const acao = `${r.CodProjeto!.trim()}${r.CodSubtitulo!.trim()}`;
    if (!/^\d{9}$/.test(acao) || !acao.slice(4).startsWith(String(ano).slice(2))) throw new Error(`RS destinação ${chave}: ação «${acao}»`);
    // Subtítulo sem valor existe (Ep 906/2024): entra como 0, a soma da emenda continua certa.
    const item = { acao, orgao: texto(r.Orgao), projeto: texto(r.NomeProjeto), subtitulo, complemento: texto(r.Complemento), valor: valorOuZero(r.Valor!) };
    const e = emendas.get(chave);
    if (e) {
      if (e.deputado !== (texto(r.Deputado) ?? '')) throw new Error(`RS destinação ${chave}: dois deputados na mesma emenda`);
      e.itens.push(item);
      e.valor = Math.round((e.valor + item.valor) * 100) / 100;
      continue;
    }
    emendas.set(chave, {
      ano,
      numero,
      deputado: texto(r.Deputado) ?? '',
      partido: texto(r.Partido),
      valor: item.valor,
      itens: [item],
      destino: destino(subtitulo, fonte.municipio),
      exercicios_lidos: [],
      execucao: [],
    });
  }
  return emendas;
}

/** `Cod_Acao` → chave da emenda (Ano-nº), para casar a despesa. */
export const porAcao = (emendas: Map<string, EmendaRs>) =>
  new Map([...emendas].flatMap(([chave, e]) => e.itens.map((i) => [i.acao, chave] as const)));

/**
 * Um lançamento da despesa do Estado é desta emenda quando o `Cod_Acao` é o de um subtítulo dela. O empenho
 * não serve para o ano: emenda de 2024 é empenhada em 2025 (Ep 889) e paga anos depois (Ep 353/2022 em 2025).
 */
export function lancamento(r: Record<string, string>, acoes: Map<string, string>): [string, LancamentoRs] | null {
  const chave = acoes.get(r.Cod_Acao!.trim());
  if (!chave) return null;
  // Conferência: a ação casada tem de citar o mesmo nº de emenda.
  if (numeroEp(r.Acao!) !== chave.split('-')[1]) throw new Error(`RS despesa: ação ${r.Cod_Acao} «${r.Acao}» não é a emenda ${chave}`);
  const data = dataBr(r.Data);
  if (!data) throw new Error(`RS despesa Ep ${chave}: data «${r.Data}» (colunas deslocadas?)`);
  const cnpj = r.CNPJ!.replace(/\D/g, '');
  const pj = cnpj.length === 14;
  return [
    chave,
    {
      exercicio: Number(r.Exercicio),
      data,
      fase: r.FaseGasto!.trim(),
      // R8: favorecido sem CNPJ pode ser pessoa física; nome e documento não são gravados.
      favorecido: pj ? texto(r.Favorecido) : null,
      cnpj: pj ? cnpj : null,
      orgao: texto(r.Orgao) ?? '',
      valor: valorBr(r.Valor!),
    },
  ];
}

export type DadosRs = {
  emendas: Map<string, EmendaRs>;
  destinacao_atualizada_em: string | null;
  despesas_atualizadas_em: Record<number, string | null>;
};

/** Emendas estaduais destinadas ao município nos `anos`, com a execução nos arquivos anuais de despesa. */
export async function coletarEstadual(fonte: Fonte, anos: number[]): Promise<DadosRs> {
  const op = { userAgent: fonte.userAgent, rotulo: 'RS destinação', minimo: 50_000 };
  const linhas: Record<string, string>[] = [];
  const destinacao_atualizada_em = await comZip(fonte.rs.destinacao, op, async (zip, modificado) => {
    await lerCsv(zip, null, DESTINACAO, op.rotulo, (r) => linhas.push(r));
    return modificado;
  });
  const emendas = lerDestinacao(linhas, fonte, anos);
  // Rolante teve emenda estadual em todos os anos desde 2021: nenhuma é filtro ou arquivo quebrado.
  if (!emendas.size) throw new Error(`RS destinação: nenhuma emenda para ${fonte.municipio} em ${anos.join(', ')}`);
  const acoes = porAcao(emendas);
  // Só as linhas com uma das ações chegam ao Node: o CSV anual tem 7,9 GB descomprimido.
  const filtro = `;(${[...acoes.keys()].join('|')});`;

  const despesas_atualizadas_em: Record<number, string | null> = {};
  for (const exercicio of anos) {
    const rotulo = `RS despesas ${exercicio}`;
    const url = fonte.rs.despesas.replace('{ano}', String(exercicio));
    // ~142 MB por ano num servidor lento (~200 KB/s em 23/11/2026): até 30 min por arquivo.
    despesas_atualizadas_em[exercicio] = await comZip(url, { userAgent: fonte.userAgent, rotulo, minimo: 10_000_000, timeoutMs: 1_800_000 }, async (zip, modificado) => {
      let achados = 0;
      const total = await lerCsv(zip, null, DESPESA, rotulo, (r) => {
        if (Number(r.Exercicio) !== exercicio) throw new Error(`${rotulo}: linha do exercício ${r.Exercicio}`);
        const l = lancamento(r, acoes);
        if (!l) return;
        emendas.get(l[0])!.execucao.push(l[1]);
        achados++;
        // `;` solto em texto livre (histórico, informações complementares) desloca só as colunas depois dele:
        // as usadas aqui vêm antes. Data e valor fora do formato quebram a coleta em `lancamento`.
      }, true, filtro);
      console.log(`${rotulo}: ${total} linhas das ações de ${fonte.municipio}, ${achados} lançamentos`);
      for (const e of emendas.values()) e.exercicios_lidos.push(exercicio);
      return modificado;
    });
  }
  for (const e of emendas.values()) {
    e.execucao.sort((a, b) => (a.data ?? '').localeCompare(b.data ?? '') || a.fase.localeCompare(b.fase) || a.valor - b.valor);
  }
  return { emendas, destinacao_atualizada_em, despesas_atualizadas_em };
}
