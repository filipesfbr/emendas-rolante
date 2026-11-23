import type { Esfera } from '../../../coletor/src/tipos.ts';

// Textos explicativos (decisão de 23/11/2026). A ironia mira o sistema, nunca uma pessoa, e mora só aqui:
// os dados de cada emenda ficam neutros. “Doação” e “presente” sempre entre aspas.

export const GERAL = {
  titulo: 'Emenda parlamentar é o seu imposto voltando para você, com o nome de um político na etiqueta.',
  texto:
    'Todo ano, uma parte do orçamento público é reservada para deputados, senadores e vereadores escolherem para onde vai. O dinheiro saiu do seu bolso em impostos. A emenda decide em que lugar ele volta. Na cerimônia de entrega, costuma aparecer como “conquista” ou “recurso trazido” pelo parlamentar. Aqui você vê de onde veio, quanto chegou e o que foi feito com ele.',
};

export const SELO_MUNICIPAL = 'Orçamento do próprio município. Não é dinheiro novo.';

/** Por que a emenda municipal não tem “a prefeitura já pagou” (decisão de 23/11/2026, docs/fonte-de-verdade.md R9). */
export const DOTACAO_MUNICIPAL =
  'O portal liga a esta emenda os empenhos da dotação inteira, que incluem outras despesas e outras emendas. Não dá para separar quanto foi pago com esta emenda.';

export const TIPOS: Record<Esfera, { quem: string; deOnde: string; pratica: string; ironia: string }> = {
  federal: {
    quem: 'Deputados federais e senadores.',
    deOnde: 'Do orçamento da União, ou seja, dos impostos federais que você paga: IR, IPI, PIS/Cofins e outros.',
    pratica:
      'O parlamentar escolhe Rolante/RS como destino de uma fatia do orçamento federal. Pode vir com finalidade definida (saúde, equipamento, obra) ou como “transferência especial” (a chamada emenda Pix), que cai direto na conta da prefeitura.',
    ironia:
      'O dinheiro de Rolante/RS e do resto do Brasil foi a Brasília e voltou menor, com o destino já escolhido. Quem paga o imposto não escolhe nada, e o que volta chega como “presente”.',
  },
  estadual: {
    quem: 'Deputados estaduais do RS.',
    deOnde: 'Do orçamento do Estado do RS, ou seja, ICMS, IPVA e outros impostos estaduais que você paga.',
    pratica: 'O deputado estadual direciona parte do orçamento do RS para Rolante/RS, para a prefeitura ou para uma entidade.',
    ironia: 'O imposto estadual de Rolante/RS foi para Porto Alegre e voltou menor, com o destino já escolhido e no formato de “doação”.',
  },
  municipal: {
    quem: 'Vereadores de Rolante/RS.',
    deOnde: 'Do próprio orçamento da prefeitura de Rolante/RS (IPTU, ISS, repasses). Não é dinheiro novo.',
    pratica:
      'Ao votar o orçamento do ano (a LOA), o vereador tira valor de uma linha e põe em outra: uma escola, uma entidade, uma obra de bairro.',
    ironia: 'O dinheiro nem sai da cidade. Ele muda de gaveta, e alguém assina a mudança como se fosse uma “doação”.',
  },
};
