# Fonte de verdade — Emendas Rolante

> Definição de onde vem cada dado do site e das regras para exibi-lo.
> Rascunho de 23/11/2026. Estas regras valem para o coletor e para o site.
> Adaptado de `licitacoes-rolante/docs/fonte-de-verdade.md`, `impostometro-rolante/docs/fonte-de-verdade.md` e
> `gastometro-rolante/docs/fonte-de-verdade.md`.

---

## 1. Definição

Emenda passa por mais de um órgão até virar despesa, e nenhum deles mostra o caminho inteiro. Por isso **não
existe uma fonte única**: cada etapa tem a sua fonte de verdade, e o site mostra cada uma com o nome dela.

> Um dado está correto quando é **igual ao que a fonte daquela etapa publica** para a mesma emenda, na data
> da coleta.

O site **não produz dados**: copia, organiza e mostra o que as fontes publicam. A nossa base é um **espelho
datado** das fontes, nunca a fonte.

---

## 2. Hierarquia

| Esfera | Etapa | Fonte de verdade | Arquivo ou rota |
|---|---|---|---|
| Federal | Pago a Rolante | CGU, Portal da Transparência federal | `EmendasParlamentares.zip` → `_PorFavorecido.csv` (CNPJs de `config/fonte.json`) |
| Federal | Objeto | CGU | `_Parcerias.csv` e `_PlanodeTrabalhoTransferenciasEspeciais.csv` |
| Federal (saúde) | Portaria, empenho, OB, partido | Fundo Nacional de Saúde | `consultafns.saude.gov.br/recursos/proposta/` (API interna) |
| Federal (Pix) | Plano de ação, metas, empenho, OB | Transferegov | `api.transferegov.gestao.gov.br/transferenciasespeciais/` |
| Estadual | Destinação (deputado, partido, valor, destino) | SEFAZ/CAGE do RS | `Emendas Parlamentares Estaduais.zip`, filtro `CodMunicipio = 103` |
| Estadual | Empenho, liquidação e pagamento pelo Estado | CAGE do RS | `Despesas do Estado-<ano>.zip`, ação `Ep <nº>` |
| Todas | Entrada na conta da prefeitura, despesas e credores | Portal da Transparência de Rolante (Abase) | módulo «Emendas por parlamentar» |
| Municipal | Tudo | Portal da Transparência de Rolante (Abase) | idem |
| Espelho | Snapshots mensais | nossa coleta, branch `data` | cópia auditável, nunca fonte |

Chaves de casamento entre fontes:

- **Federal:** código de 12 dígitos da CGU (`AAAA` ano + `AAAA` autor + `NNNN` número). O FNS dá `nuAnoExercicio` +
  `coEmendaPolitica`; o Transferegov e a Abase gravam o código inteiro.
- **Estadual:** **Ano + nº da emenda.** No CSV do RS é o campo `Emenda`; na despesa, o número em `Acao = "Ep <nº>-…"`
  com o ano tirado dos dois primeiros dígitos do `Empenho`; na Abase, `cep_num_emenda`. O nº se repete entre anos
  e, no mesmo ano, pode ser dividido entre municípios (26 casos em 2025–2026). Por isso o lançamento da despesa só
  entra quando o texto da ação também cita Rolante.

---

## 3. Regras

**R1 — Nenhum dado sem origem.** Todo valor exibido vem de uma das fontes da tabela. **Proibido:** projeção,
estimativa, resumo, reescrita, classificação por inferência e qualquer selo de suspeita ou de regularidade.

**R2 — Conferência.** Uma coleta só é publicada se, para cada fonte:

1. o download ou a chamada responder 2xx, com tamanho mínimo (ZIP da CGU ≥ 10 MB, despesa do RS ≥ 10 MB);
2. o cabeçalho do CSV for exatamente o esperado (coluna nova, removida ou renomeada quebra a coleta);
3. listas paginadas fecharem com o total anunciado (`recordsTotal` na Abase, `totalItens` e a soma ao centavo no FNS);
4. houver ao menos um pagamento federal e uma emenda estadual para Rolante no recorte, e emendas na Abase no ano
   atual;
5. o `CodMunicipio` do RS continuar sendo Rolante e cada lançamento da despesa for do exercício do arquivo.

Se qualquer item falhar, **nada é gravado** e o site continua na coleta anterior.

**R3 — Snapshot imutável.** Cada coleta guarda os dados, a data e a hora da coleta e o SHA-256 de cada arquivo
(`manifest.json`). O histórico da branch `data` é o registro do que as fontes mostravam em cada data.

**R4 — Rastreabilidade na tela.** Cada valor aparece com o nome da fonte, e cada emenda tem a data da coleta e o
link para conferir na origem.

**R5 — Três esferas, três contas.** Federal, estadual e municipal ficam sempre separadas: filtro, rótulo e totais
próprios. **Nunca** somar as três num «total trazido». O total de uma esfera usa uma fonte só por coluna.

**R6 — Texto fiel.** Objeto, subtítulo, nome de emenda e nome de entidade aparecem **como vêm da fonte**. O
«destino» da emenda estadual é o próprio subtítulo do RS sem o «Ep <nº>» e sem o nome do município.

**R7 — Escopo.** Só Rolante (Município, Fundo Municipal de Saúde e Fundo Municipal de Assistência Social, e as
entidades de destino das emendas estaduais). **Recorte: emendas de 2025 em diante** (`anoMinimo` em
`config/fonte.json`, decisão de 23/11/2026). O histórico federal é por ano do pagamento, no mesmo recorte.

**R8 — Privacidade.**

- **CPF nunca chega ao repositório.** Número de CPF em texto livre é mascarado inteiro antes de gravar.
- **Credor da prefeitura:** o nome só aparece quando a rubrica é de pessoa jurídica, é repasse a entidade ou o nome
  tem marca de empresa. Senão, «credor não identificado».
- **Favorecido do Estado:** nome e CNPJ só quando o documento é um CNPJ de 14 dígitos. Sem CNPJ, nada é gravado.
- **Nunca gravar:** dados bancários, ordenador de despesa, beneficiário de retenção, histórico em texto livre da
  despesa do RS, sócios, e-mail ou telefone. Os campos são copiados por lista de permitidos.
- **Fixtures:** sintéticas, sem nomes de pessoas.

**R9 — Selo municipal e dinheiro parado.**

- Emenda municipal sempre com o selo «Orçamento do próprio município. Não é dinheiro novo.»
- Alerta de «parada ou atrasada» é o fato que a fonte registra (empenhada sem pagamento, plano reprovado, dinheiro
  na conta sem despesa), sempre com o aviso dos 36 meses da emenda Pix. Nunca é acusação.
- Partido aparece com a fonte e a data da coleta, porque as fontes divergem e o partido muda.

---

## 4. O que esta conferência não garante

- A R2 prova que o arquivo chegou inteiro e no formato esperado, não que a fonte lançou o valor certo.
- **Federal:** a CGU só tem o que foi **pago** a Rolante; o «liquidado» federal destinado a Rolante não existe em
  nenhuma fonte (os números da tabela-mestre da CGU são totais nacionais da emenda).
- **Estadual:** o filtro por `CodMunicipio` só vale de 2024 em diante; o recorte começa em 2025. A data da receita
  na Abase (formato Clarion) cai cerca de 11 dias depois do pagamento oficial do Estado: o site mostra as duas,
  cada uma com a sua fonte.
- **Abase:** o módulo de emendas só tem 2026. Para 2025, o site mostra o que a CGU, o FNS, o Transferegov e o RS
  publicam, sem o uso pela prefeitura.
