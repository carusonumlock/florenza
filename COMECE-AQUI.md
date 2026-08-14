# Comece aqui

O site virou uma aplicação Next.js com painel administrativo. Está tudo escrito
e conferido na tela, mas **o banco ainda não existe** — falta criar o projeto no
Supabase, e isso depende do seu login.

Enquanto as chaves não entram, o site roda em **modo demonstração**: a vitrine lê
o catálogo local e o painel mostra dados de exemplo, com um aviso na tela. Dá
para abrir e navegar por tudo agora mesmo:

```bash
npm install
npm run dev      # http://localhost:3000
```

Vale a pena olhar antes de mexer em qualquer coisa:

| Endereço | O que é |
|---|---|
| `/` | a home, igual a antes — e a seção 3D agora funciona |
| `/aneis-formatura` | a vitrine, com os filtros de cor |
| `/produto/anel-rubi-classico` | página de produto (não existia) |
| `/carrinho` | carrinho e checkout (não existia) |
| `/admin` | **o painel**, com o mapa do Brasil |

---

## O que falta, e é você quem faz

### 1. Criar o projeto no Supabase

Com a conta nova (`gabrielsouzasilveiramkt@gmail.com` → GitHub → Supabase):

1. Novo projeto. Região **South America (São Paulo)** — o banco perto de quem
   compra é o que evita meio segundo de espera em cada consulta.
2. Guarde a senha do banco que ele pede.
3. Em **Project Settings → API**, copie:
   - **Project URL**
   - a chave **publicável** (o nome novo da "anon key")

### 2. Ligar as chaves

```bash
cp .env.local.example .env.local
```

Preencha as duas variáveis. **Não** pegue a `service_role`: ela ignora toda a
proteção do banco, e o projeto foi escrito para nunca precisar dela.

Reinicie o `npm run dev`. O aviso de demonstração some sozinho.

### 3. Aplicar as migrations

No **SQL Editor** do Supabase, cole e execute **nesta ordem**, um arquivo por
vez:

```
supabase/migrations/20260814000000_base.sql
supabase/migrations/20260814000100_geografia.sql
supabase/migrations/20260814000200_catalogo.sql
supabase/migrations/20260814000300_clientes.sql
supabase/migrations/20260814000400_pedidos.sql
supabase/migrations/20260814000500_vendas_views.sql
```

Cada um termina com um bloco **CONFERÊNCIA** que devolve uma tabelinha, e a
última linha do arquivo diz o resultado esperado. Se bater, seguiu certo.

Depois, a carga do catálogo:

```
supabase/seed-catalogo.sql        (3 categorias, 6 cores, 20 produtos)
```

### 4. Virar admin

Crie sua conta pelo site em `/conta` → **Criar conta**. Depois, no SQL Editor:

```sql
update public.profiles set role = 'admin'
 where id = (select id from auth.users where email = 'SEU-EMAIL-AQUI');
```

Agora `/admin` abre para você e continua fechado para todo mundo.

### 5. Conferir que a proteção funciona

Este é o teste que mais importa — um erro aqui expõe telefone e endereço de
todos os clientes. No SQL Editor:

```sql
-- Como visitante anônimo, sem sessão:
set role anon;
select count(*) from public.vw_clientes;   -- precisa dar 0
select count(*) from public.pedidos;       -- precisa dar 0
select count(*) from public.produtos;      -- os produtos ativos: 20
reset role;
```

Se `vw_clientes` ou `pedidos` devolverem qualquer linha, **pare** e me avise.

---

## Como testar de ponta a ponta

1. `/aneis-formatura` → clique em **Comprar** em duas peças
2. `/carrinho` → preencha com um **CEP de São Paulo**, envie o pedido
3. Repita com um **CEP do Ceará**
4. `/admin` → aba **Pedidos**: os dois aparecem em "aguardando pagamento"
5. Mude os dois para **Pago**
6. Aba **Vendas**: São Paulo e Ceará acesos no mapa, faturamento somando

E o requisito que você pediu literalmente: crie uma conta de teste no site e
veja ela aparecer sozinha na aba **Clientes**, marcada como "Conta no site" —
sem nenhum botão de sincronizar.

---

## O que ficou de fora

- **Mercado Pago.** Combinado ficar para depois. O pedido já nasce em
  `aguardando_pagamento`, então é plugar o webhook e promover o status — sem
  remodelar nada.
- **Upload de foto pelo painel.** O formulário de cadastro de peça está lá, mas
  a foto ainda entra pelo script Python. O bucket do Storage já existe e as
  permissões estão escritas.
- **Nav no celular.** O logo e os links se sobrepõem em ~390px. É bug de
  estética e você pediu para eu não mexer nisso sem falar antes.
- **Tipos gerados do banco.** Depois que o projeto existir:
  `npx supabase gen types typescript --linked > lib/supabase/types.ts`. Isso
  remove um cast que ficou em `lib/admin/listas.ts`.

## Sobre o site antigo

Os arquivos do protótipo (`index.html`, `css/`, `js/`) foram removidos no commit
`2ec9bb6`, depois de eu conferir a paridade visual. Nada se perdeu — para ver
qualquer um deles:

```bash
git show e37a416:index.html
git show e37a416:css/style.css
```

Ficaram no disco, fora do git, `aneisFormatura/` (as fotos originais, 33 MB) e
`produtos/` (os WebP, que agora também estão em `public/produtos/`). Não apaguei
porque o git não conseguiria trazer de volta.

O que **não** mudou foi a estética: os quatro arquivos de `css/` foram para
`app/estilos/` sem uma linha alterada. A conferência foi lado a lado, e as
páginas saem com a mesma altura ao pixel — 5246 na home, 3788 na formatura,
2119 nas alianças.
