# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

Site da Florenza Joalheria: HTML/CSS/JS estáticos, sem framework e sem backend.
Código, comentários e interface são em português do Brasil — mantenha o idioma ao
escrever qualquer coisa nova.

## Comandos

```bash
npm install                              # primeira vez (só esbuild + gsap)
npm run build                            # js/main.js -> js/bundle.js (IIFE minificado)
npm run watch                            # o mesmo, em modo watch, sem minify

python tools/importar-aneis-formatura.py # fotos originais -> WebP em produtos/
```

Não há testes, linter nem formatter configurados.

**`js/bundle.js` é versionado e é o que as páginas carregam.** Toda alteração em
`js/main.js`, `js/aliancas.js`, `js/catalogo.js` ou `js/data/` só aparece no site
depois de `npm run build`. Esquecer isso é a forma mais fácil de "consertar" algo
e não ver diferença nenhuma no navegador.

Para ver o site rodando: abrir o HTML direto no navegador funciona (ver restrição
abaixo), ou `python -m http.server 8765` se precisar de um servidor.

## Restrição que molda a arquitetura: o site tem que abrir por `file://`

O protótipo é entregue como pasta, sem servidor. Por isso:

- o bundle é **IIFE**, não `type="module"` — `file://` bloqueia módulos ESM;
- **nada de `fetch()` em arquivo local**. Dados de produto vivem em módulos JS
  embutidos no bundle, não em `.json` carregado em runtime;
- caminhos de imagem/vídeo são sempre relativos.

A exceção é `js/rings-3d.js`, que é ESM e depende de CDN — a seção 3D não funciona
por `file://`, e isso é conhecido/aceito.

## Dois mundos de JavaScript, independentes

**1. Bundle (todas as páginas).** `js/main.js` é o único ponto de entrada do
esbuild. Ele importa `aliancas.js` (filtro do catálogo, carrossel de categorias,
reveals GSAP, `IntersectionObserver` que dá play/pause nos vídeos) e `catalogo.js`.
Todos os scripts do bundle checam se o elemento existe antes de agir, porque o
mesmo `bundle.js` é carregado pelas quatro páginas.

**2. Cena 3D (só `index.html`).** `js/rings-3d.js` é `<script type="module">`
carregado direto, com **importmap apontando o Three.js para a CDN** — `three` não
é dependência do `package.json` e não passa pelo esbuild. `js/rings-3d-selector.js`
é um terceiro script, plain e `defer`, que de propósito não conhece a cena: ele só
liga/desliga classes de estado na `<section>`, e o efeito visual é resolvido em
`css/rings-3d.css` via `:has`. Mantenha essa separação.

## Catálogo dirigido a dados

Fluxo: `js/data/<categoria>.js` → `listarProdutos()` → `js/catalogo.js` → grade.

O HTML da página de categoria declara só pontos de encaixe, e `catalogo.js` monta
os `<article class="ringCard">`:

```html
<p data-catalogo-contagem></p>
<div data-catalogo-filtros></div>
<div class="catalog__grid" data-catalogo="aneis-formatura"></div>
```

`listarProdutos()` **devolve uma Promise mesmo lendo um array local**. Essa é a
fronteira desenhada para a migração ao Supabase (planejada): trocar a implementação
dessa função não deve exigir mudança em `catalogo.js`. A consulta equivalente está
escrita em comentário no fim de `js/data/aneis-formatura.js`.

Regras do dado: preço sempre em **centavos inteiros** (`precoCentavos: 317900`),
formatado só na exibição; o **SKU vem do nome do arquivo da foto** e é usado para
logística interna do cliente, então é chave de negócio, não detalhe visual.

As páginas de alianças ainda têm os cards escritos à mão no HTML — só a de formatura
foi migrada para dados. Ao mexer nelas, considere migrar em vez de duplicar markup.

## Pipeline de imagens de produto

Os originais ficam em `aneisFormatura/`, com o nome carregando os dois campos de
controle: `CODIGO_R$PRECO.png` (ex.: `3187_R$2420.png`). São PNGs de ~2,4 MB com
recorte alpha (fundo transparente).

`tools/importar-aneis-formatura.py` apara a moldura transparente e gera
`produtos/formatura/{sku}.webp` (960px) e `{sku}-sm.webp` (480px) — usados juntos
num `srcset`. O script é idempotente e, ao final, **confere o preço do nome do
arquivo contra `precoCentavos` da ficha**, avisando divergências e fotos sem ficha.
Ao chegar foto nova: jogar na pasta, rodar o script, criar a ficha.

`aneisFormatura/` tem 33 MB e ainda não está no git; o repo já carrega ~94 MB por
causa dos `.mp4` na raiz. Pense duas vezes antes de commitar mídia pesada.

## CSS: camadas aditivas

`style.css` → `aliancas.css` → `categoria.css`, nessa ordem em todas as páginas de
categoria. A convenção do projeto é que **cada camada só soma; nenhuma redefine
regra da anterior**. Os tokens estão espalhados em dois `:root`: cores e `--nav-h`
em `style.css`, fontes e linhas (`--font-serif`, `--hairline`, `--gold-line`) em
`aliancas.css`.

Detalhe fácil de errar: `.ringCard__media` padrão é `4/5` com `object-fit: cover`
(fotos de aliança, em pé). As fotos de produto recortadas são deitadas e usam os
modificadores `--produto` (`5/4` + `contain` + `drop-shadow`); sem eles o `cover`
corta justamente o aro do anel.

## Animações

Os reveals de `aliancas.js` (`.js-reveal`, `.js-reveal-stagger`) são montados **na
carga da página**. Conteúdo renderizado depois — como a grade do catálogo — não é
capturado por eles: quem renderiza precisa animar os próprios elementos, como
`catalogo.js` faz em `revelar()`. Todas as animações respeitam
`prefers-reduced-motion`.

Os vídeos (`hero`, alianças, símbolos) são `autoplay`/`loop`/`muted` no HTML;
`main.js` só dá `pause()` no que sai da viewport, porque três decoders simultâneos
travam a rolagem no celular.

## Pendências conhecidas

- "Comprar" e "Ver detalhes" são `href="#"`: não há carrinho, checkout nem página
  de produto.
- No celular (~390px) o logo e os links do nav se sobrepõem, em todas as páginas.
