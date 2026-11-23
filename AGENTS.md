# AGENTS.md

Emendas Rolante: site estático com as emendas federais, estaduais e municipais de Rolante. Irmão do
Licitações, Impostômetro e Gastômetro Rolante (mesma stack e pipeline). Visão geral: `README.md`.

## Regras que não podem quebrar

- Federal, estadual e municipal sempre separadas: filtro, rótulo e totais próprios. Nunca somar as três.
- Emenda municipal sempre com o selo «Orçamento do próprio município. Não é dinheiro novo.»
- Todo valor aparece com a fonte. Partido com fonte e data. Alerta de «parado» sempre com o aviso dos 36 meses.
- Ironia só nos textos de `site/src/lib/textos.ts`, mirando o sistema, nunca uma pessoa. Dados neutros.
- Coleta falha visivelmente quando uma fonte quebra; nunca grava vazio. Abase: ≥ 1,2 s entre chamadas.
- R8: CPF nunca chega ao repositório; credor sem sinal de pessoa jurídica vai sem nome. Dados bancários nunca.
- Recorte: emendas de 2025 em diante, em todas as fontes e esferas. O ano mínimo mora só em `anoMinimo`
  (`config/fonte.json`).
- Estadual: destinação e despesa da SEFAZ/CAGE do RS, casadas com a Abase por Ano + nº da emenda.
- A branch `data` é o registro público dos snapshots. Fixtures sintéticas.

## Identidade visual

Marca em `docs/brand/emendas-rolante/` (o handoff original fica em `design_handoff_emendas_rolante/`, fora do
git). Cor só em `site/src/styles/tokens.css`; marca só via `BrandMark`/`BrandLockup`.

## Pipeline

Padrão `workflow-test` (`ci.yml`, `bump.yml`, `release.yml`). `coleta.yml`: dia 25 + manual, commit na `data`,
chama o deploy.
