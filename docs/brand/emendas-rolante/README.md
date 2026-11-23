# Handoff: Emendas Rolante

## Overview
Emendas Rolante é um site que acompanha as emendas parlamentares enviadas a Rolante: quem mandou, quanto chegou e o que foi feito com o dinheiro. Faz parte do **Sistema de Marcas Rolante**, junto com TransparêncIA, Impostômetro Rolante (receita), Gastômetro Rolante (despesa), Licitações Rolante, auditoria-rolante e cameras-rolante.

Este pacote traz a **identidade de marca e os tokens visuais**. Ainda não há telas desenhadas; o site deve ser construído com as regras abaixo.

## About the Design Files
Os arquivos deste pacote são **referências de design**: SVGs de marca, tokens CSS e uma ficha visual em HTML. Não são código de produção para copiar direto. A tarefa é implementar o site no framework do projeto. Se ainda não houver código, escolha a stack mais adequada (sugestão: Next.js ou Astro para um site público, estático ou com SSR, rápido e acessível). Os SVGs de `assets/` podem ser usados como estão.

## Fidelity
- **Marca: alta fidelidade.** Símbolo, assinaturas, cores, tipografia e forma são finais.
- **Telas: não desenhadas.** Monte o layout seguindo os fundamentos visuais abaixo, com o mínimo de elementos.

## Marca
- **Nome:** Emendas Rolante. «Emendas» em tinta `#26221d` e «Rolante» em terracota `#b4622f`. Em fundo escuro, creme `#fbf4e9` e âmbar `#d98a52`.
- **Assinatura:** Inter 700, letter-spacing −0.02em.
- **Público:** cidadão, por isso o contorno da gota é terracota.
- **Símbolo:** a gota (viewBox 26×34, retângulo x2 y2 22×30 rx11, traço 1.8). Dentro dela, a **folha em ciclo**:
  - **Folha em ciclo**, em terracota com opacidade total e traço 1.5. O contorno da folha (x7.2–18.8, y7.6–24.4, cantos raio 2) fica aberto no canto superior direito e termina numa seta que aponta de volta para a abertura.
    - Path: `M18.8 11 V22.4 A2 2 0 0 1 16.8 24.4 H9.2 A2 2 0 0 1 7.2 22.4 V9.6 A2 2 0 0 1 9.2 7.6 H15.4 M13.8 6.2 L15.4 7.6 L13.8 9`
  - **Três linhas de texto** com opacidade .45 e traço 1.4.
    - Path: `M9.8 12.8 H16.2 M9.8 16 H16.2 M9.8 19.2 H13.6`
  - Significado: a emenda sai, circula e volta como prestação de contas.
  - Todas as pontas são arredondadas (`stroke-linecap/linejoin: round`). As coordenadas exatas estão em `assets/emendas-rolante/mark.svg`.
- **Respiro:** margem livre igual à largura do símbolo.
- **Tamanhos mínimos:** símbolo 16px; assinatura horizontal 132px.
- **Não fazer:** girar, distorcer, aplicar sombra ou gradiente, trocar a fonte, alterar o traço.

## Fundamentos visuais (aplicar ao site)
- **Cor:** uma só cor de acento, terracota `#b4622f` (âmbar `#d98a52` em fundo escuro). Nenhuma outra cor entra. Se for preciso variar, use oklch com a mesma croma e luminância.
  - Texto forte `#26221d`, corpo `#5a534a`, apagado `#9a9082`.
  - Fundo da página `#faf8f4`, cartão `#ffffff`, peças de marca `#fbf4e9`, fundo escuro `#26221d`.
  - Linha/borda `#ece7df`.
- **Tipo:** só Inter, pesos 400–800 (alternativas: Helvetica Neue, Arial). Títulos em caixa normal. Rótulos pequenos em CAIXA ALTA: 12px, peso 600, tracking 0.08em, cor apagada (ex.: VALOR EMPENHADO, PARLAMENTAR).
- **Forma:** sem sombras e sem gradientes. A profundidade vem de borda 1px `#ece7df` sobre branco. Cartões com raio 14px; pílulas com raio 20–30px (ex.: situação da emenda: indicada, empenhada, paga, executada).
- **Ícones de interface:** não há biblioteca própria. Use ícones de traço único arredondado, coerentes com a gota (ex.: Lucide, traço 1.5–1.8). Sem emoji.
- **Gráficos de dados:** a série em destaque vai em terracota; as demais, em terracota com opacidade .3–.55 ou em tons neutros. Sem paleta multicolorida.
- **Texto:** português do Brasil, frases curtas e factuais, tom institucional e direto. Aspas «angulares» para citar palavras. Valores em reais no formato `R$ 1.234.567,89`.

## Interactions & Behavior
Animação e estados de hover não estão definidos no sistema. Sugestão neutra: transições de 150ms ease-out; hover em cartões trocando a borda para `#d8d0c4`; foco visível com contorno 2px terracota. Confirme com o design antes de ir além disso.

## State Management / Dados
Não definido no design. O site provavelmente vai consumir dados abertos de emendas parlamentares destinadas ao município (Portal da Transparência da CGU, Transferegov, emendas estaduais da Assembleia/RS e o portal de transparência de Rolante). A estrutura de dados fica a cargo do desenvolvimento. O conteúdo deve responder a três perguntas: quem mandou, quanto chegou e o que foi feito com o dinheiro.

## Design Tokens
Estão em `tokens/` e são importados por `styles.css`:
- `colors.css`: `--terracota`, `--ambar`, `--tinta`, `--creme`, `--branco`, `--fundo-pagina`, `--corpo`, `--apagado`, `--linha` e os aliases semânticos (`--accent`, `--text-strong`, `--surface-card`, `--border`…).
- `typography.css`: `--font-sans`, pesos 400–800, `--tracking-brand` −0.02em, `--tracking-label` 0.08em, `--label-size` 12px.
- `shape.css`: `--radius-card` 14px, `--radius-pill-sm` 20px, `--radius-pill-lg` 30px, `--border-width` 1px, `--shadow` none.
- `fonts.css`: Inter via Google Fonts.

## Assets (`assets/emendas-rolante/`)
- `mark.svg`: símbolo para fundo claro (gota preenchida de creme).
- `mark-dark.svg`: símbolo para fundo escuro (âmbar).
- `mark-mono-ink.svg`, `mark-mono-white.svg`: versões monocromáticas.
- `lockup-horizontal.svg`, `lockup-horizontal-dark.svg`: assinatura horizontal, 205×34. Use no cabeçalho do site.
- `lockup-stacked.svg`: assinatura empilhada, 240×96.
- `favicon.svg`: 32×32, fundo terracota, raio 7.
- `app-icon-512.svg`: ícone de app, 512×512, raio 112.
- `social-square-1200.svg`: imagem 1200×1200 para compartilhamento (og:image).

O texto das assinaturas é `<text>` com Inter. Para produção, converta em curvas ou garanta que a Inter esteja carregada. A largura de 205px da assinatura horizontal é estimada; confira com a fonte renderizada.

## Files
- `styles.css` + `tokens/`: tokens CSS.
- `brands.json`: dados da família de marcas, em formato legível por máquina (inclui a entrada `emendas-rolante`).
- `guidelines/brand-emendas-rolante.html`: ficha visual da marca. Abra no navegador para ver todas as versões.
- `assets/emendas-rolante/`: os 10 SVGs.
