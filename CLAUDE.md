# CLAUDE.md

Guia para o Claude Code (claude.ai/code) trabalhar neste repositório.

Site da **Florenza Joalheria**: vitrine, conta do cliente e painel administrativo.
Next.js 16 (App Router) + Supabase + Vercel. Código, comentários e interface em
português do Brasil — mantenha o idioma ao escrever qualquer coisa nova.

## Comandos

```bash
npm install
npm run dev              # localhost:3000
npm run build            # build de produção — roda a checagem de tipos
npm run lint

npm run seed             # gera supabase/seed-catalogo.sql das fichas locais
npm run mapa             # regera lib/geo/brasil-uf.ts da malha do IBGE (roda uma vez)

python tools/importar-aneis-formatura.py   # fotos originais -> WebP em public/produtos/
```

Não há testes nem formatter configurados. **A verificação de verdade antes de
qualquer commit é `npm run build`** — é ela que roda o TypeScript.

## Regra que molda tudo: a estética pronta não se mexe

O visual do site é trabalho concluído e não está em discussão. Toda mudança é
**aditiva**.

- **`app/estilos/` é intocável.** `style.css`, `aliancas.css`, `categoria.css` e
  `rings-3d.css` vieram do protótipo sem uma linha alterada e continuam sendo a
  fonte da identidade visual. Os dois `:root` com os tokens (cores e `--nav-h` em
  `style.css`; fontes e linhas em `aliancas.css`) ficam onde estão.
- **A cascata é aditiva:** `style` → `aliancas` → `categoria`. Cada camada só
  soma; nenhuma redefine regra da anterior. `layout.tsx` importa as duas
  primeiras; a página de categoria importa a terceira; a home importa
  `rings-3d.css`.
- **O Tailwind entra sem preflight**, de propósito (ver `app/globals.css`). O
  reset dele desmontaria o site. E, por estar em `@layer utilities`, ele **perde
  de qualquer regra** dos CSS acima, que são CSS comum sem camada. Isso é a
  garantia, não um efeito colateral: as utilities existem para as telas novas e
  não alcançam a vitrine nem por acidente.
- Telas novas (`/admin`, `/conta`) têm CSS próprio — `app/admin/admin.css`,
  `app/conta/conta.css` — usando **as variáveis que já existem**. Nenhuma cor
  nova entra no projeto.
- No CSS dessas telas, o reset escopado usa `:where()` para ter especificidade
  zero. Sem isso `.adm button` venceria `.adm-botao` e o botão perde o fundo —
  já aconteceu uma vez.

Bugs visuais conhecidos (o nav sobreposto em ~390px) só se corrigem com
aprovação explícita: consertar é mudar estética.

## Catálogo dirigido a dados

Fluxo: `lib/data/catalogo-local.ts` → `lib/catalogo.ts` → páginas.

**`lib/catalogo.ts` é a fronteira.** As páginas não sabem de onde os produtos
vêm. Hoje vêm de um módulo local; quando o Supabase estiver plugado, só o corpo
dessas funções muda — a consulta equivalente já está escrita em comentário no
topo do arquivo.

Regras do dado, todas duras:
- **Preço sempre em centavos inteiros** (`precoCentavos: 317900`), nunca float.
  Formatação só na exibição. Vale igual na coluna do banco (`integer`).
- **O SKU é chave de negócio**, não detalhe visual: vem do nome do arquivo da
  foto original (`3187_R$2420.png` → `3187`) e é por ele que a peça é encontrada
  na gaveta.
- Duas formas de produto convivem: anel de formatura tem pedra/cor/lapidação;
  aliança tem largura em mm. São colunas nulas tipadas, não `jsonb` — precisam
  ser filtráveis e conferíveis pelo banco.

Detalhe fácil de errar: `categorias[].variante` decide o corte da foto.
`produto` são as fotos recortadas, deitadas (`5/4` + `contain` + `drop-shadow`,
modificadores `--produto`); `foto` são as de aliança, em pé (`4/5` + `cover`).
Sem o modificador certo, o `cover` corta justamente o aro do anel.

## Banco

Migrations versionadas em `supabase/migrations/`, aplicadas por
`npx supabase db push --linked` ou coladas no SQL Editor. Convenções que valem
para toda migration nova:

- cabeçalho em português explicando **o porquê**, não o quê;
- idempotente (`if not exists` / `create or replace` / `on conflict`);
- `enable row level security` em **toda** tabela;
- toda view com `with (security_invoker = true)` — sem isso a view roda com os
  direitos do dono, ignora a RLS de baixo e vaza dado de cliente;
- `revoke`/`grant` explícito em função `security definer`;
- bloco `CONFERÊNCIA` no fim, com a linha do resultado esperado.

Em policy, use `(select auth.uid())` e não `auth.uid()` solto: dentro do
parêntese o Postgres avalia uma vez; solto, chama a função uma vez por linha.

`public.is_admin()` sustenta a RLS do painel inteiro. É `security definer` com
`set search_path = ''` — sem isso, a policy de `profiles` chamaria `is_admin()`
em recursão infinita, e o search_path aberto é porta de escalada de privilégio.

**Índice em toda coluna de chave estrangeira.** O Postgres não cria sozinho.

## Modo demonstração

Sem `NEXT_PUBLIC_SUPABASE_URL` e `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY` em
`.env.local`, o site continua abrindo: a vitrine lê o catálogo local e o painel
usa `lib/admin/dados-demo.ts`, com um aviso na tela. Serve para conferir layout
sem banco. `lib/supabase/config.ts` é quem decide.

**Nenhuma service-role key entra neste projeto.** Quem protege os dados é a RLS.
A carga inicial do catálogo é SQL colado no SQL Editor (`npm run seed`),
justamente para não precisar dessa chave.

## Gráficos e mapa

- O mapa do Brasil é **SVG inline** de `lib/geo/brasil-uf.ts`, gerado uma vez da
  malha do IBGE e versionado. Sem biblioteca de mapa, sem rede em runtime.
- A escala do coroplético é por **raiz quadrada** do faturamento. Linear, o
  estado líder apaga o resto do país.
- A paleta categórica de `lib/admin/format.ts` foi **conferida por script**
  (skill `dataviz`), não escolhida no olho. Ao mexer nela, rode o validador de
  novo — o comentário no arquivo traz o comando. Vermelho e verde nunca ficam
  adjacentes, e os pares críticos se separam por luminosidade.
- Todo gráfico precisa de **estado vazio textual**: com banco novo eles nascem
  sem dado, e um gráfico vazio parece defeito.

## Animações

Os reveals GSAP vivem em `components/Reveal.tsx`, portados do protótipo **sem
alteração de parâmetro** — duração, easing e pontos de gatilho são a assinatura
do site. `.js-reveal-catalogo` existe separado de `.js-reveal-stagger` porque a
grade do catálogo tinha stagger e gatilho próprios.

`components/VideoAutoplay.tsx` dá `pause()` nos vídeos fora da viewport. Não é
sobra: três decoders simultâneos travam a rolagem no celular.

Tudo respeita `prefers-reduced-motion`.

## Pendências conhecidas

- **Supabase ainda não criado** — migrations prontas, chaves pendentes.
- Carrinho, checkout e página de produto não existem: "Comprar" e "Ver
  detalhes" ainda são `href="#"`. Sem o CEP do checkout, o mapa só se alimenta
  de pedido lançado à mão.
- Mercado Pago (gateway escolhido) fica para o Módulo 2.
- Sem os tipos gerados do banco (`supabase gen types`), há um cast em
  `lib/admin/listas.ts` que sai quando o projeto existir.
- No celular (~390px) o logo e os links do nav se sobrepõem.
- `aneisFormatura/` (33 MB de fotos originais) e `public/produtos/` seguem fora
  e dentro do git respectivamente; pense duas vezes antes de commitar mídia.
