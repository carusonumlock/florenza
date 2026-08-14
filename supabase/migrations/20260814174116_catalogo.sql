-- ============================================================================
-- FLORENZA — 03. CATÁLOGO: categorias, filtros e produtos
--
-- Tira as fichas do repositório e põe no banco. Hoje elas moram em
-- lib/data/catalogo-local.ts (antes js/data/aneis-formatura.js) e nas quatro
-- alianças que estavam escritas à mão no HTML — por isso cadastrar peça nova
-- exige editar código e publicar de novo. Depois desta migration, é um
-- formulário no painel.
--
-- Duas formas de produto convivem: anel de formatura tem pedra, cor e
-- lapidação; aliança tem largura em milímetros. Estão resolvidas com colunas
-- nulas tipadas, e não com um `jsonb` de atributos, porque são poucas e
-- precisam ser filtráveis e conferíveis pelo banco — dentro de jsonb não há
-- CHECK, não há FK e o índice é sempre mais caro.
--
-- COMO RODAR: `npx supabase db push --linked`. Seguro rodar de novo.
-- ============================================================================


-- ---------------------------------------------------------------------------
-- 1) categorias — as três páginas da vitrine
--
--    `slug` é a chave e também o endereço: /aneis-formatura, /aliancas-ouro,
--    /aliancas-prata. Um identificador só, do banco até a URL.
-- ---------------------------------------------------------------------------
create table if not exists public.categorias (
  slug         text primary key,
  nome         text not null,
  descricao    text,
  imagem_url   text,
  -- Qual coluna de `produtos` a barra de filtros usa. NULL = categoria sem
  -- filtro, que é o caso das alianças hoje.
  filtro_campo text check (filtro_campo in ('cor_pedra', 'material')),
  -- Como a foto se comporta no card: 'produto' são as fotos recortadas com
  -- fundo transparente (deitadas, 5/4 + contain); 'foto' são as de aliança, em
  -- pé (4/5 + cover). Trocar isso corta o aro do anel — não é cosmético.
  variante     text not null default 'produto' check (variante in ('produto', 'foto')),
  rotulo_filtro text,
  nota         text[] not null default '{}',
  ordem        smallint not null default 0,
  ativo        boolean not null default true,
  created_at   timestamptz not null default now(),
  updated_at   timestamptz not null default now()
);

drop trigger if exists categorias_updated_at on public.categorias;
create trigger categorias_updated_at
  before update on public.categorias
  for each row execute function public.tocar_updated_at();


-- ---------------------------------------------------------------------------
-- 2) filtro_opcoes — os botões da barra de filtro
--
--    Para os anéis de formatura, são as seis cores de pedra. O filtro é pela
--    COR e não pelo metal de propósito: em anel de formatura a cor identifica o
--    curso, e todas as peças da categoria são do mesmo metal.
--
--    `amostra` é o hex da bolinha ao lado do rótulo; alimenta a variável
--    --swatch que categoria.css já usa.
-- ---------------------------------------------------------------------------
create table if not exists public.filtro_opcoes (
  categoria_slug text not null references public.categorias(slug) on update cascade on delete cascade,
  slug           text not null,
  nome           text not null,
  amostra        text,
  ordem          smallint not null default 0,
  primary key (categoria_slug, slug)
);

-- A PK já começa por categoria_slug, então a FK está indexada pelo prefixo da
-- chave primária — não precisa de índice extra.


-- ---------------------------------------------------------------------------
-- 3) produtos
--
--    `sku` é chave de negócio, não detalhe de exibição: vem do nome do arquivo
--    da foto original (`3187_R$2420.png` -> 3187) e é por ele que a Florenza
--    encontra a peça na gaveta. UNIQUE porque dois anéis com o mesmo código
--    seriam um erro de cadastro, não um caso válido.
--
--    `preco_centavos` é integer e nunca float: 0.1 + 0.2 não dá 0.3 em ponto
--    flutuante, e isso vira centavo perdido em soma de pedido.
-- ---------------------------------------------------------------------------
create table if not exists public.produtos (
  id             uuid primary key default gen_random_uuid(),
  sku            text not null unique,
  slug           text not null unique,
  categoria_slug text not null references public.categorias(slug) on update cascade,
  nome           text not null,

  metal          text,
  pedra          text,
  cor_pedra      text,
  lapidacao      text,
  largura_mm     numeric(4,1) check (largura_mm is null or largura_mm > 0),
  material       text,

  descricao      text,
  preco_centavos integer not null check (preco_centavos >= 0),
  imagem_url     text,
  imagem_sm_url  text,
  -- Alt escrito à mão (as alianças tinham um por card). Nulo = a vitrine compõe
  -- a partir de metal, pedra e lapidação.
  alt            text,

  estoque        integer not null default 0 check (estoque >= 0),
  ativo          boolean not null default true,
  created_at     timestamptz not null default now(),
  updated_at     timestamptz not null default now()
);

drop trigger if exists produtos_updated_at on public.produtos;
create trigger produtos_updated_at
  before update on public.produtos
  for each row execute function public.tocar_updated_at();

-- A consulta da vitrine é sempre "categoria X, ativo, ordenado por sku".
-- Índice parcial: só as linhas ativas entram, que é o que a loja consulta —
-- fica menor e mais rápido que o índice completo.
create index if not exists produtos_vitrine_idx
  on public.produtos (categoria_slug, sku)
  where ativo;

-- O painel lista tudo, inclusive inativo, por categoria (FK indexada).
create index if not exists produtos_categoria_idx on public.produtos (categoria_slug);


-- ---------------------------------------------------------------------------
-- 4) RLS
--
--    Leitura pública, mas SÓ do que está ativo: desativar um produto no painel
--    precisa sumir da vitrine de verdade, não só da consulta que a aplicação
--    faz. Se a regra vivesse apenas no `.eq("ativo", true)` do front, qualquer
--    um com a chave pública leria os rascunhos.
--
--    O painel enxerga tudo porque é admin, e a política de admin vem depois.
-- ---------------------------------------------------------------------------
alter table public.categorias   enable row level security;
alter table public.filtro_opcoes enable row level security;
alter table public.produtos     enable row level security;

drop policy if exists "Categorias ativas são públicas" on public.categorias;
create policy "Categorias ativas são públicas" on public.categorias
  for select using (ativo or public.is_admin());

drop policy if exists "Admin gerencia categorias" on public.categorias;
create policy "Admin gerencia categorias" on public.categorias
  for all using (public.is_admin()) with check (public.is_admin());

drop policy if exists "Opções de filtro são públicas" on public.filtro_opcoes;
create policy "Opções de filtro são públicas" on public.filtro_opcoes
  for select using (true);

drop policy if exists "Admin gerencia opções de filtro" on public.filtro_opcoes;
create policy "Admin gerencia opções de filtro" on public.filtro_opcoes
  for all using (public.is_admin()) with check (public.is_admin());

drop policy if exists "Produtos ativos são públicos" on public.produtos;
create policy "Produtos ativos são públicos" on public.produtos
  for select using (ativo or public.is_admin());

drop policy if exists "Admin gerencia produtos" on public.produtos;
create policy "Admin gerencia produtos" on public.produtos
  for all using (public.is_admin()) with check (public.is_admin());


-- ---------------------------------------------------------------------------
-- 5) Storage: bucket das fotos de produto
--
--    Público para leitura (é a vitrine), escrita só para admin. O upload passa
--    a acontecer no painel; tools/importar-aneis-formatura.py continua servindo
--    para importação em massa do acervo que já existe.
-- ---------------------------------------------------------------------------
insert into storage.buckets (id, name, public)
values ('produtos', 'produtos', true)
on conflict (id) do update set public = true;

drop policy if exists "Fotos de produto são públicas" on storage.objects;
create policy "Fotos de produto são públicas" on storage.objects
  for select using (bucket_id = 'produtos');

drop policy if exists "Admin envia fotos de produto" on storage.objects;
create policy "Admin envia fotos de produto" on storage.objects
  for insert to authenticated with check (bucket_id = 'produtos' and public.is_admin());

drop policy if exists "Admin atualiza fotos de produto" on storage.objects;
create policy "Admin atualiza fotos de produto" on storage.objects
  for update to authenticated using (bucket_id = 'produtos' and public.is_admin());

drop policy if exists "Admin apaga fotos de produto" on storage.objects;
create policy "Admin apaga fotos de produto" on storage.objects
  for delete to authenticated using (bucket_id = 'produtos' and public.is_admin());


-- ---------------------------------------------------------------------------
-- CONFERÊNCIA
-- ---------------------------------------------------------------------------
select 'tabelas do catalogo' as item, count(*)::text as valor
  from information_schema.tables
 where table_schema = 'public' and table_name in ('categorias', 'filtro_opcoes', 'produtos')
union all
select 'preco_centavos e integer', (data_type = 'integer')::text
  from information_schema.columns
 where table_schema = 'public' and table_name = 'produtos' and column_name = 'preco_centavos'
union all
select 'sku e unico', count(*)::text
  from pg_constraint where conname like 'produtos_sku%' and contype = 'u'
union all
select 'indice parcial da vitrine', count(*)::text
  from pg_indexes where tablename = 'produtos' and indexname = 'produtos_vitrine_idx'
union all
select 'RLS em produtos', (relrowsecurity)::text from pg_class where relname = 'produtos'
union all
select 'bucket produtos publico', (public)::text from storage.buckets where id = 'produtos';

-- Esperado: 3 | true | 1 | 1 | true | true
