-- ============================================================================
-- FLORENZA — 06. VISÕES DE VENDA: o que o dashboard lê
--
-- Agregar aqui, e não em JavaScript, por dois motivos: o Postgres soma milhares
-- de linhas sem trafegar nenhuma delas pela rede, e a definição de "venda" fica
-- escrita num lugar só.
--
-- Esse "um lugar só" é `vw_pedidos_confirmados`. Todas as outras visões partem
-- dela. Sem essa base, a regra de quais status contam estaria copiada em cinco
-- consultas e um dia uma delas passaria a incluir cancelado.
--
-- Todas as visões usam `security_invoker = true`: elas enxergam exatamente o
-- que quem consulta enxergaria sozinho. Como `pedidos` só se abre para o dono
-- do pedido ou para o admin, o faturamento da loja não vaza por aqui.
--
-- COMO RODAR: `npx supabase db push --linked`. Seguro rodar de novo.
-- ============================================================================


-- ---------------------------------------------------------------------------
-- 1) A base: o que conta como venda
--
--    Fora ficam 'cancelado' (não aconteceu) e 'aguardando_pagamento' (ainda não
--    aconteceu). Contar carrinho não pago como faturamento é a forma mais fácil
--    de um painel mentir para o dono.
-- ---------------------------------------------------------------------------
drop view if exists public.vw_vendas_por_uf      cascade;
drop view if exists public.vw_vendas_por_regiao  cascade;
drop view if exists public.vw_vendas_por_mes     cascade;
drop view if exists public.vw_vendas_por_cidade  cascade;
drop view if exists public.vw_produtos_vendidos  cascade;
drop view if exists public.vw_pedidos_confirmados cascade;

create view public.vw_pedidos_confirmados with (security_invoker = true) as
  select *
    from public.pedidos
   where status in ('pago', 'em_producao', 'enviado', 'entregue');

comment on view public.vw_pedidos_confirmados is
  'Pedidos que contam como venda. Base de todas as visões do dashboard — mudar a regra aqui muda o painel inteiro de uma vez.';


-- ---------------------------------------------------------------------------
-- 2) Vendas por UF — a fonte do mapa
--
--    LEFT JOIN a partir de `ufs`: as 27 linhas sempre voltam, mesmo as sem
--    nenhuma venda. O mapa precisa disso — um estado sem pedido tem que ser
--    desenhado em cinza, não sumir do Brasil.
-- ---------------------------------------------------------------------------
create view public.vw_vendas_por_uf with (security_invoker = true) as
  select
    u.uf,
    u.nome   as uf_nome,
    u.regiao,
    count(p.id)::bigint                          as pedidos,
    coalesce(sum(p.total_centavos), 0)::bigint   as total_centavos,
    count(distinct coalesce(
      p.user_id::text,
      p.cliente_manual_id::text,
      p.email,
      p.id::text
    ))::bigint                                   as clientes
  from public.ufs u
  left join public.vw_pedidos_confirmados p on p.uf = u.uf
  group by u.uf, u.nome, u.regiao;


-- ---------------------------------------------------------------------------
-- 3) Vendas por região — a resposta direta da pergunta do painel
-- ---------------------------------------------------------------------------
create view public.vw_vendas_por_regiao with (security_invoker = true) as
  select
    regiao,
    sum(pedidos)::bigint        as pedidos,
    sum(total_centavos)::bigint as total_centavos,
    sum(clientes)::bigint       as clientes
  from public.vw_vendas_por_uf
  group by regiao;


-- ---------------------------------------------------------------------------
-- 4) Faturamento por mês — 12 meses, inclusive os vazios
--
--    O generate_series existe para o gráfico não "pular" um mês sem venda. Uma
--    linha que salta de março para maio faz o leitor achar que abril sumiu do
--    sistema, quando abril só foi um mês ruim.
-- ---------------------------------------------------------------------------
create view public.vw_vendas_por_mes with (security_invoker = true) as
  with meses as (
    select generate_series(
      date_trunc('month', now()) - interval '11 months',
      date_trunc('month', now()),
      interval '1 month'
    ) as mes
  )
  select
    m.mes::date                                  as mes,
    to_char(m.mes, 'MM/YY')                      as rotulo,
    count(p.id)::bigint                          as pedidos,
    coalesce(sum(p.total_centavos), 0)::bigint   as total_centavos
  from meses m
  left join public.vw_pedidos_confirmados p
    on date_trunc('month', p.created_at) = m.mes
  group by m.mes
  order by m.mes;


-- ---------------------------------------------------------------------------
-- 5) Cidades que mais compram
-- ---------------------------------------------------------------------------
create view public.vw_vendas_por_cidade with (security_invoker = true) as
  select
    coalesce(nullif(trim(cidade), ''), 'Não informada') as cidade,
    uf,
    count(id)::bigint                        as pedidos,
    coalesce(sum(total_centavos), 0)::bigint as total_centavos
  from public.vw_pedidos_confirmados
  group by coalesce(nullif(trim(cidade), ''), 'Não informada'), uf;


-- ---------------------------------------------------------------------------
-- 6) Peças mais vendidas
--
--    Agrupa por SKU e não por produto_id porque produto_id vira NULL quando a
--    peça sai do catálogo — e a venda dela continua tendo acontecido.
-- ---------------------------------------------------------------------------
create view public.vw_produtos_vendidos with (security_invoker = true) as
  select
    i.sku,
    max(i.nome)                                            as nome,
    sum(i.quantidade)::bigint                              as unidades,
    sum(i.preco_centavos * i.quantidade)::bigint           as total_centavos,
    count(distinct i.pedido_id)::bigint                    as pedidos
  from public.pedido_itens i
  join public.vw_pedidos_confirmados p on p.id = i.pedido_id
  group by i.sku;


-- ---------------------------------------------------------------------------
-- CONFERÊNCIA
-- ---------------------------------------------------------------------------
select 'visoes criadas' as item, count(*)::text as valor
  from information_schema.views
 where table_schema = 'public'
   and table_name in ('vw_pedidos_confirmados', 'vw_vendas_por_uf', 'vw_vendas_por_regiao',
                      'vw_vendas_por_mes', 'vw_vendas_por_cidade', 'vw_produtos_vendidos')
union all
select 'todas com security_invoker', count(*)::text
  from pg_class
 where relname in ('vw_pedidos_confirmados', 'vw_vendas_por_uf', 'vw_vendas_por_regiao',
                   'vw_vendas_por_mes', 'vw_vendas_por_cidade', 'vw_produtos_vendidos')
   and reloptions::text like '%security_invoker=true%'
union all
select 'mapa devolve 27 UFs', count(*)::text from public.vw_vendas_por_uf
union all
select 'regioes devolve 5', count(*)::text from public.vw_vendas_por_regiao
union all
select 'meses devolve 12', count(*)::text from public.vw_vendas_por_mes;

-- Esperado: 6 | 6 | 27 | 5 | 12
