import type { Esfera } from '../../../coletor/src/tipos.ts';

// Textos explicativos (decisão de 23/11/2026). A ironia mira o sistema, nunca uma pessoa, e mora só aqui:
// os dados de cada emenda ficam neutros. «Doação» e «presente» sempre entre aspas.

export const GERAL = {
  titulo: 'Emenda parlamentar é o seu imposto voltando para você, com o nome de um político na etiqueta.',
  texto:
    'Todo ano, uma parte do orçamento público é reservada para deputados, senadores e vereadores escolherem para onde vai. O dinheiro saiu do seu bolso em impostos. A emenda decide em que lugar ele volta. Na cerimônia de entrega, costuma aparecer como «conquista» ou «recurso trazido» pelo parlamentar. Aqui você vê de onde veio, quanto chegou e o que foi feito com ele.',
};

export const SELO_MUNICIPAL = 'Orçamento do próprio município. Não é dinheiro novo.';

export const TIPOS: Record<Esfera, { quem: string; deOnde: string; pratica: string; ironia: string }> = {
  federal: {
    quem: 'Deputados federais e senadores.',
    deOnde: 'Do orçamento da União, ou seja, dos impostos federais que você paga: IR, IPI, PIS/Cofins e outros.',
    pratica:
      'O parlamentar escolhe Rolante como destino de uma fatia do orçamento federal. Pode vir com finalidade definida (saúde, equipamento, obra) ou como «transferência especial» (a chamada emenda Pix), que cai direto na conta da prefeitura.',
    ironia:
      'É dinheiro de Rolante e do resto do Brasil que foi a Brasília e voltou, menor e com dono. O «presente» do deputado é a parte que ele escolheu devolver.',
  },
  estadual: {
    quem: 'Deputados estaduais do RS.',
    deOnde: 'Do orçamento do Estado do RS, ou seja, ICMS, IPVA e outros impostos estaduais que você paga.',
    pratica: 'O deputado estadual direciona parte do orçamento do RS para Rolante, para a prefeitura ou para uma entidade.',
    ironia: 'O mesmo caminho, mas mais curto. Foi para Porto Alegre e voltou com um nome na placa.',
  },
  municipal: {
    quem: 'Vereadores de Rolante.',
    deOnde: 'Do próprio orçamento da prefeitura de Rolante (IPTU, ISS, repasses). Não é dinheiro novo.',
    pratica:
      'Ao votar o orçamento do ano (a LOA), o vereador tira valor de uma linha e põe em outra: uma escola, uma entidade, uma obra de bairro.',
    ironia: 'O dinheiro nem sai da cidade. Ele muda de gaveta, e alguém assina a mudança como se fosse uma «doação».',
  },
};
