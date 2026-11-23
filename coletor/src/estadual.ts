/**
 * Fonte própria das emendas estaduais (Assembleia Legislativa / Governo do RS): AINDA NÃO EXISTE.
 *
 * TODO(estadual): a fonte oficial do RS está em investigação. Até lá, as emendas estaduais do site vêm só do
 * Portal da Transparência da Prefeitura (Abase, `cep_recurso = "Estadual"`), que em 2026 traz 5. O que falta:
 * - achar a base do RS com emenda, deputado, valor indicado e pago, filtrável pelo CNPJ do favorecido;
 * - casar a chave dela com o número que a Abase grava em `cep_num_emenda` (ex.: «2173»);
 * - quando existir, devolver aqui por número de emenda e juntar em `juntar.ts`, como o FNS faz nas federais.
 */
export async function coletarEstadual(): Promise<null> {
  return null;
}
