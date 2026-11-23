import { describe, expect, it } from 'vitest';
import type { Emenda, EmendaAbase, EmendaRs } from '../../../coletor/src/tipos.ts';
import { alertas, chegou, indicado, partidos, prefeituraPagou, totais } from './emenda.ts';

// Dados sintéticos.
const abase = (o: Partial<EmendaAbase> = {}): EmendaAbase => ({
  codigo: 1,
  numero: '1',
  nome: 'Emenda de teste',
  recurso: 'Municipal',
  tipo: null,
  objetivo: null,
  finalidade: null,
  aplicacao: null,
  valor: 1000,
  autores: [{ nome: 'AUTOR TESTE', partido: 'XX' }],
  beneficiarios: [],
  receitas: [],
  empenhos: [],
  ...o,
});
const emenda = (o: Partial<Emenda> = {}): Emenda => ({
  chave: 'abase-1',
  esfera: 'municipal',
  ano: 2026,
  autor: 'AUTOR TESTE',
  cgu: null,
  fns: [],
  transferegov: [],
  rs: null,
  abase: [],
  ...o,
});
const rs = (execucao: EmendaRs['execucao'] = []): EmendaRs => ({
  ano: 2026,
  numero: '740',
  deputado: 'DEPUTADO TESTE',
  partido: 'YY',
  valor: 100000,
  itens: [{ acao: '102826001', orgao: null, projeto: null, subtitulo: 'Ep 740 - Clube Teste - Cidade', complemento: null, valor: 100000 }],
  destino: 'Clube Teste',
  execucao,
});
const lanc = (fase: string, valor: number) => ({ exercicio: 2026, data: '2026-07-02', fase, favorecido: null, cnpj: null, orgao: 'O', valor });
const empenho = (pago: number) => ({ empenho: 1, data: '2026-03-01', credor: null, empenhado: pago, liquidado: pago, pago, licitacao: null });

describe('valores', () => {
  it('municipal não tem «chegou»: o dinheiro já é da prefeitura', () => {
    expect(chegou(emenda({ abase: [abase()] }))).toBeNull();
  });
  it('indicado vem da prefeitura quando ela tem a emenda, com a fonte junto', () => {
    expect(indicado(emenda({ abase: [abase({ valor: 150000 })] }))).toEqual({ valor: 150000, fonte: 'Prefeitura' });
  });
  it('federal: chegou é o pago pela União na CGU', () => {
    const e = emenda({
      esfera: 'federal',
      chave: '202611110001',
      cgu: {
        tipo: null,
        autor: null,
        pagamentos: [
          { emenda: '202611110001', ano_emenda: 2026, autor: 'A', tipo: 't', mes: '2026-05', favorecido: '1', valor: 0.1 },
          { emenda: '202611110001', ano_emenda: 2026, autor: 'A', tipo: 't', mes: '2026-06', favorecido: '1', valor: 0.2 },
        ],
        parcerias: [],
        planos_te: [],
      },
    });
    expect(chegou(e)).toEqual({ valor: 0.3, fonte: 'CGU' });
  });
  it('sem a emenda no portal da prefeitura, não há como saber o que ela pagou', () => {
    expect(prefeituraPagou(emenda({ esfera: 'federal' }))).toBeNull();
    expect(prefeituraPagou(emenda({ abase: [abase({ empenhos: [empenho(10), empenho(5.5)] })] }))).toEqual({ valor: 15.5, fonte: 'Prefeitura' });
  });
});

describe('estadual', () => {
  it('chegou é o pago na despesa do Estado, com anulação descontada; sem RS não há valor', () => {
    const e = emenda({ esfera: 'estadual', rs: rs([lanc('Empenho', 100000), lanc('Pagamento', 100000), lanc('Pagamento', -40000)]) });
    expect(chegou(e)).toEqual({ valor: 60000, fonte: 'CAGE/RS' });
    expect(indicado(e)).toEqual({ valor: 100000, fonte: 'SEFAZ/RS' });
    expect(chegou(emenda({ esfera: 'estadual', abase: [abase({ recurso: 'Estadual' })] }))).toBeNull();
  });
  it('partido do RS entra com a fonte', () => {
    expect(partidos(emenda({ esfera: 'estadual', rs: rs() }))).toEqual([{ partido: 'YY', fonte: 'SEFAZ/RS' }]);
  });
  it('alerta: destinada sem empenho, e empenhada sem pagamento', () => {
    expect(alertas(emenda({ esfera: 'estadual', rs: rs() }))[0]).toMatch(/sem nenhum empenho/);
    expect(alertas(emenda({ esfera: 'estadual', rs: rs([lanc('Empenho', 100000)]) }))[0]).toMatch(/sem pagamento/);
    expect(alertas(emenda({ esfera: 'estadual', rs: rs([lanc('Pagamento', 100000)]) }))).toEqual([]);
  });
});

describe('totais', () => {
  it('somam só a lista recebida (o site passa uma esfera por vez)', () => {
    const t = totais([emenda({ abase: [abase({ valor: 10 })] }), emenda({ abase: [abase({ valor: 20 })] })]);
    expect(t).toEqual({ quantidade: 2, indicado: 30, chegou: null, pagou: 0 });
  });
});

describe('partido', () => {
  it('um por fonte, sem repetir e sem vazio', () => {
    const e = emenda({ abase: [abase({ autores: [{ nome: 'A', partido: 'XX' }, { nome: 'B', partido: null }] })] });
    expect(partidos(e)).toEqual([{ partido: 'XX', fonte: 'Prefeitura' }]);
  });
});

describe('alertas', () => {
  it('dinheiro na conta e nenhuma despesa', () => {
    const e = emenda({ esfera: 'estadual', abase: [abase({ receitas: [{ data: '2026-07-02', descricao: 'r', valor: 1 }] })] });
    expect(alertas(e)).toEqual(['Dinheiro na conta da prefeitura desde 02/07/2026 e nenhuma despesa empenhada até a coleta.']);
  });
  it('com despesa, não há alerta', () => {
    const e = emenda({ abase: [abase({ receitas: [{ data: '2026-07-02', descricao: 'r', valor: 1 }], empenhos: [empenho(1)] })] });
    expect(alertas(e)).toEqual([]);
  });
});
