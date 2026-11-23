import { describe, expect, it } from 'vitest';
import { credorPodeAparecer } from '../src/abase.ts';
import { destino, lancamento, lerDestinacao, numeroEp, porAcao } from '../src/estadual.ts';
import { coletarFns } from '../src/fns.ts';
import { criarHttp } from '../src/http.ts';
import { juntar } from '../src/juntar.ts';
import { dataBr, dataClarion, dataMs, linhaCsv, mascararCpf, somaCentavos, valorBr } from '../src/normalizar.ts';
import type { DadosCgu, EmendaAbase, Fonte, PagamentoCgu } from '../src/tipos.ts';

// Dados sintéticos: nenhum nome, CPF ou CNPJ real de pessoa ou empresa.
const MUNICIPIO = '11222333000181';
const fonte = {
  municipio: 'Cidade Teste',
  rs: { codMunicipio: 7 },
  uf: 'RS',
  ibge: 1,
  favorecidos: { [MUNICIPIO]: 'Município de Teste' },
  fns: { api: 'https://fns.teste/', portal: '' },
  userAgent: 'teste',
} as unknown as Fonte;
const semEspera = { esperar: async () => {} };

describe('CSV da CGU', () => {
  it('lê campos entre aspas, com ; e aspas dobradas dentro', () => {
    expect(linhaCsv('"a";"b;c";"diz ""oi"""')).toEqual(['a', 'b;c', 'diz "oi"']);
  });
  it('campo vazio no fim', () => {
    expect(linhaCsv('"a";""')).toEqual(['a', '']);
  });
  it('aspas abertas devolvem null (o campo continua na próxima linha)', () => {
    expect(linhaCsv('"a";"começo do texto')).toBeNull();
    expect(linhaCsv('"a";"começo do texto\nfim"')).toEqual(['a', 'começo do texto\nfim']);
  });
  it('valor brasileiro', () => {
    expect(valorBr('1.480.190,36')).toBe(1480190.36);
    expect(valorBr('389864,00')).toBe(389864);
    expect(() => valorBr('Sem informação')).toThrow();
  });
});

describe('datas e valores', () => {
  it('Clarion (dias desde 28/12/1800), como a Abase grava a receita', () => {
    expect(dataClarion(82329)).toBe('2026-05-26');
    expect(dataClarion(0)).toBeNull();
  });
  it('milissegundos do FNS são meia-noite de Brasília', () => {
    expect(dataMs(1774926000000)).toBe('2026-03-31');
  });
  it('data brasileira', () => {
    expect(dataBr('23/07/2025')).toBe('2025-07-23');
    expect(dataBr('')).toBeNull();
  });
  it('soma em centavos sem erro de float', () => {
    expect(somaCentavos([0.1, 0.2])).toBe(30);
  });
  it('CPF no texto é mascarado inteiro, CNPJ formatado não', () => {
    expect(mascararCpf('EMPRESA TESTE 12345678909')).toBe('EMPRESA TESTE ***.***.***-**');
    expect(mascararCpf('12.345.678/0001-90')).toBe('12.345.678/0001-90');
  });
});

describe('credor do empenho (R8)', () => {
  const d = (rubrica: string, descricaoRubrica: string) => ({ rubrica, descricaoRubrica, descricaoElemento: null });
  it('rubrica de pessoa física nunca mostra o nome', () => {
    expect(credorPodeAparecer(d('3390 36 00 000000', 'Outros serviços de terceiros - pessoa física'), 'EMPRESA TESTE LTDA')).toBe(false);
  });
  it('rubrica de pessoa jurídica mostra', () => {
    expect(credorPodeAparecer(d('3390 39 00 000000', 'Outros serviços de terceiros - pessoa jurídica'), 'NOME QUALQUER')).toBe(true);
  });
  it('repasse a entidade mostra', () => {
    expect(credorPodeAparecer(d('3350 43 00 000000', 'Subvenções sociais'), 'NOME QUALQUER')).toBe(true);
  });
  it('material de consumo só mostra com marca de empresa no nome', () => {
    const consumo = d('3390 30 00 000000', 'Material de consumo');
    expect(credorPodeAparecer(consumo, 'COMERCIO TESTE LTDA')).toBe(true);
    expect(credorPodeAparecer(consumo, 'ASSOCIAÇÃO DE TESTE')).toBe(true);
    expect(credorPodeAparecer(consumo, 'FULANO DE TAL')).toBe(false);
    // «ME» só conta como palavra solta, não dentro de outro nome.
    expect(credorPodeAparecer(consumo, 'MEIRELES SOUZA')).toBe(false);
  });
});

describe('juntar', () => {
  const pag = (emenda: string, o: Partial<PagamentoCgu> = {}): PagamentoCgu => ({
    emenda,
    ano_emenda: Number(emenda.slice(0, 4)),
    autor: 'AUTOR TESTE',
    tipo: 'Emenda Individual - Transferências Especiais',
    mes: '2026-06',
    favorecido: MUNICIPIO,
    valor: 100,
    ...o,
  });
  const abase = (codigo: number, recurso: string, numero: string): EmendaAbase => ({
    codigo,
    numero,
    nome: `Emenda ${codigo}`,
    recurso,
    tipo: null,
    objetivo: null,
    finalidade: null,
    aplicacao: null,
    valor: 10,
    autores: [{ nome: `AUTOR ${codigo}`, partido: 'XX' }],
    beneficiarios: [],
    receitas: [],
    empenhos: [],
  });
  const cgu: DadosCgu = { pagamentos: [pag('202611110001'), pag('202511110002', { mes: '2026-01' })], parcerias: [], planos_te: [] };

  it('casa CGU e Abase pela chave de 12 dígitos e separa as esferas', () => {
    const lista = juntar(2026, cgu, new Map(), new Map(), new Map(), [
      abase(1, 'Federal', '202611110001'),
      abase(2, 'Estadual', '740'),
      abase(3, 'Municipal', '3'),
      abase(4, 'Municipal', '3'),
    ]);
    expect(lista.map((e) => [e.chave, e.esfera])).toEqual([
      ['202611110001', 'federal'],
      ['abase-2', 'estadual'],
      ['abase-3', 'municipal'],
      ['abase-4', 'municipal'],
    ]);
    expect(lista[0]!.cgu?.pagamentos).toHaveLength(1);
    expect(lista[0]!.abase).toHaveLength(1);
  });
  it('emenda de outro ano fica no ano dela, mesmo paga neste', () => {
    expect(juntar(2026, cgu, new Map(), new Map(), new Map(), []).map((e) => e.chave)).toEqual(['202611110001']);
    expect(juntar(2025, cgu, new Map(), new Map(), new Map(), []).map((e) => e.chave)).toEqual(['202511110002']);
  });
  it('estadual casa RS e Abase por Ano + nº; a do RS sem Abase (entidade) entra sozinha', () => {
    const rs = lerDestinacao([dest({ Emenda: '740' }), dest({ Emenda: '900', CodSubtitulo: '26002', Subtitulo: 'Ep 900 - Clube Teste - Cidade Teste' })], fonte, [2026]);
    const lista = juntar(2026, { pagamentos: [], parcerias: [], planos_te: [] }, new Map(), new Map(), rs, [abase(2, 'Estadual', '740'), abase(5, 'Estadual', '999')]);
    expect(lista.map((e) => [e.chave, e.abase.length, e.rs?.numero ?? null])).toEqual([
      ['abase-5', 1, null],
      ['rs-2026-740', 1, '740'],
      ['rs-2026-900', 0, '900'],
    ]);
  });
  it('federal da Abase sem código da CGU fica com chave própria', () => {
    expect(juntar(2026, { pagamentos: [], parcerias: [], planos_te: [] }, new Map(), new Map(), new Map(), [abase(9, 'Federal', '12')])[0]!.chave).toBe('abase-9');
  });
});

const dest = (o: Record<string, string> = {}): Record<string, string> => ({
  Ano: '2026',
  Municipio: 'Cidade Teste',
  CodMunicipio: '7',
  Orgao: 'Secretaria Teste',
  NomeProjeto: 'Projeto Teste - Ep',
  CodProjeto: '1028',
  CodSubtitulo: '26001',
  Subtitulo: 'Ep 740 - Atencao Basica - Cidade Teste',
  Complemento: 'beneficiado',
  Valor: '100000',
  Emenda: '740',
  Deputado: 'Deputado Teste',
  Partido: 'XX',
  ...o,
});

describe('estadual (RS)', () => {
  it('destino sai do subtítulo, sem o nº e sem o município', () => {
    expect(destino('Ep 1 - Clube Teste - Cidade Teste', 'Cidade Teste')).toBe('Clube Teste');
    expect(destino('Ep 1 - Atencao Basica - Cidade Teste', 'Cidade Teste')).toBe('Atencao Basica');
  });
  it('nº da ação', () => {
    expect(numeroEp('Ep 740-atencao Basica-cidade Teste')).toBe('740');
    expect(numeroEp('EP 12 - Algo')).toBe('12');
    expect(numeroEp('Manutencao de Escolas')).toBeNull();
  });
  it('subtítulo de outro ano que o da emenda quebra a coleta', () => {
    expect(() => lerDestinacao([dest({ CodSubtitulo: '25001' })], fonte, [2026])).toThrow('ação');
  });
  it('destinação: filtra pelo código do município, junta subtítulos e soma', () => {
    const m = lerDestinacao(
      [dest(), dest({ CodSubtitulo: '26009', Subtitulo: 'Ep 740 - Outra Coisa - Cidade Teste', Valor: '' }), dest({ CodMunicipio: '8', Municipio: 'Outra' }), dest({ Ano: '2024' })],
      fonte,
      [2025, 2026],
    );
    expect([...m.keys()]).toEqual(['2026-740']);
    expect(m.get('2026-740')).toMatchObject({ valor: 100000, deputado: 'Deputado Teste', destino: 'Atencao Basica' });
    expect(m.get('2026-740')!.itens).toHaveLength(2);
  });
  it('código do município que mudou de nome quebra a coleta', () => {
    expect(() => lerDestinacao([dest({ Municipio: 'Outra' })], fonte, [2026])).toThrow('CodMunicipio');
  });
  it('execução: casa pelo Cod_Acao, em qualquer exercício; outra ação fica fora; PF sem nome', () => {
    const acoes = porAcao(lerDestinacao([dest()], fonte, [2026]));
    const linha = (o: Record<string, string>) => ({
      Exercicio: '2027', FaseGasto: 'Pagamento', Cod_Acao: '102826001', Acao: 'Ep 740-atencao Basica-cidade Teste',
      Favorecido: 'Fundo Teste', CNPJ: '11.222.333/0001-81', Orgao: 'Secretaria Teste', Data: '02/07/2026', Valor: '100000,00', ...o,
    });
    expect(lancamento(linha({}), acoes)).toEqual([
      '2026-740',
      { exercicio: 2027, data: '2026-07-02', fase: 'Pagamento', favorecido: 'Fundo Teste', cnpj: '11222333000181', orgao: 'Secretaria Teste', valor: 100000 },
    ]);
    expect(lancamento(linha({ Cod_Acao: '102826999' }), acoes)).toBeNull();
    expect(() => lancamento(linha({ Acao: 'Ep 741-outra' }), acoes)).toThrow('não é a emenda');
    expect(() => lancamento(linha({ Data: 'Pagamento' }), acoes)).toThrow('data');
    expect(lancamento(linha({ CNPJ: '123.456.789-09', Favorecido: 'FULANO' }), acoes)![1]).toMatchObject({ favorecido: null, cnpj: null });
  });
});

describe('http', () => {
  const resposta = (status: number, corpo: string) => new Response(corpo, { status });
  it('tenta de novo em 500 e em corpo que não é JSON', async () => {
    const fila = [resposta(500, ''), resposta(200, '<html>'), resposta(200, '{"ok":1}')];
    const json = criarHttp({ userAgent: 't', intervaloMs: 0, ...semEspera, fetch: async () => fila.shift()! });
    expect(await json('https://x.teste/')).toEqual({ ok: 1 });
  });
  it('404 quebra na hora', async () => {
    const json = criarHttp({ userAgent: 't', intervaloMs: 0, ...semEspera, fetch: async () => resposta(404, '') });
    await expect(json('https://x.teste/')).rejects.toThrow('HTTP 404');
  });
});

describe('FNS', () => {
  const pagina = (itens: unknown[]) => ({ resultado: { itensPagina: itens, totalItens: itens.length, totalPaginas: 1 } });
  const grupo = { coTipoProposta: 'INCREMENTO PAP', dsTipoRecurso: 'EMENDA INDIVIDUAL', vlProposta: 300 };
  const detalhe = (cnpj: string) => ({
    resultado: {
      nuProposta: '1',
      cnpj,
      coTipoProposta: 'INCREMENTO PAP',
      vlProposta: 300,
      nuPortaria: '1',
      dtPortaria: 1774926000000,
      situacao: { descricaoSituacaoproposta: 'Proposta Paga', dataSituacaoProjeto: null },
      vlEmpenhado: 300,
      vlPago: 300,
      parlamentares: [{ sgPartido: 'XX', noApelidoPolitico: 'AUTOR TESTE', vlIndObjeto: 300, coEmendaPolitica: '11110001', nuAnoExercicio: '2026' }],
      pagamentos: [{ dtCriacaoSiafi: 1774926000000, nuOb: '2026OB000001', vlLiquido: 300 }],
    },
  });
  const servidor = (itens: { nuProposta: string; vlProposta: number }[], cnpj = MUNICIPIO) =>
    (async (url: string | URL) => {
      const u = new URL(url);
      if (u.pathname.endsWith('obter-proposta')) return Response.json(detalhe(cnpj));
      return Response.json(u.searchParams.has('tpProposta') ? pagina(itens) : pagina([grupo, { ...grupo, dsTipoRecurso: 'PROGRAMA' }]));
    }) as typeof fetch;

  it('monta a chave da CGU (ano + coEmendaPolitica) e ignora programa', async () => {
    const r = await coletarFns(fonte, [2026], { ...semEspera, intervaloMs: 0, fetch: servidor([{ nuProposta: '1', vlProposta: 300 }]) });
    expect([...r.keys()]).toEqual(['202611110001']);
    expect(r.get('202611110001')![0]).toMatchObject({ partido: 'XX', data_portaria: '2026-03-31', pago: 300 });
  });
  it('lista que não fecha com o total do grupo quebra a coleta', async () => {
    await expect(
      coletarFns(fonte, [2026], { ...semEspera, intervaloMs: 0, fetch: servidor([{ nuProposta: '1', vlProposta: 299.99 }]) }),
    ).rejects.toThrow('não bate');
  });
  it('proposta de entidade fora da lista de favorecidos fica de fora', async () => {
    const r = await coletarFns(fonte, [2026], { ...semEspera, intervaloMs: 0, fetch: servidor([{ nuProposta: '1', vlProposta: 300 }], '99888777000166') });
    expect(r.size).toBe(0);
  });
});
