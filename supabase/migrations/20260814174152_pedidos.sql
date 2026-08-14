-- ============================================================================
-- FLORENZA — 05. PEDIDOS: a venda, e de onde ela veio
--
-- É esta tabela que responde à pergunta do painel sobre regiões. A coluna que
-- importa para isso é `uf`, preenchida a partir do CEP no checkout ou escolhida
-- à mão quando o pedido é lançado pelo painel — sem ela, o mapa nasce cinza.
--
-- Duas origens de venda convivem por desenho:
--   - checkout do site  -> user_id preenchido
--   - lançamento manual -> cliente_manual_id preenchido (ou nenhum dos dois,
--     quando é uma venda avulsa de quem nunca virou cadastro)
--
-- Pagamento fica de fora nesta etapa. O status já nasce com
-- 'aguardando_pagamento' e o Mercado Pago, quando entrar, só precisa promover
-- para 'pago' — sem remodelar nada.
--
-- COMO RODAR: `npx supabase db push --linked`. Seguro rodar de novo.
-- ============================================================================


-- ---------------------------------------------------------------------------
-- 1) pedidos
-- ---------------------------------------------------------------------------
create table if not exists public.pedidos (
  id                uuid primary key default gen_random_uuid(),
  -- Número curto e crescente para falar com o cliente ("pedido 1043").
  -- O uuid é a chave técnica; ninguém dita uuid por telefone.
  numero            bigint generated always as identity,

  user_id           uuid references auth.users on delete set null,
  cliente_manual_id uuid references public.clientes_manuais(id) on delete set null,

  -- Cópia do contato no momento da compra. Não é redundância preguiçosa: o
  -- cliente pode trocar de telefone depois, e o pedido antigo tem que continuar
  -- mostrando para onde a peça foi enviada de fato.
  nome              text not null check (length(trim(nome)) > 0),
  email             text,
  telefone          text,

  cep               text,
  cidade            text,
  uf                char(2) references public.ufs(uf),

  origem            text not null default 'site'
                    check (origem in ('site', 'whatsapp', 'instagram', 'loja', 'indicacao', 'outro')),

  status            text not null default 'aguardando_pagamento'
                    check (status in ('aguardando_pagamento', 'pago', 'em_producao',
                                      'enviado', 'entregue', 'cancelado')),

  total_centavos    integer not null default 0 check (total_centavos >= 0),
  observacoes       text,
  created_at        timestamptz not null default now(),
  updated_at        timestamptz not null default now()
);

drop trigger if exists pedidos_updated_at on public.pedidos;
create trigger pedidos_updated_at
  before update on public.pedidos
  for each row execute function public.tocar_updated_at();

-- FKs indexadas + os cortes que o painel realmente faz.
create index if not exists pedidos_user_idx           on public.pedidos (user_id);
create index if not exists pedidos_cliente_manual_idx on public.pedidos (cliente_manual_id);
create index if not exists pedidos_uf_idx             on public.pedidos (uf);
create index if not exists pedidos_status_idx         on public.pedidos (status);
create index if not exists pedidos_criado_idx         on public.pedidos (created_at desc);


-- ---------------------------------------------------------------------------
-- 2) pedido_itens
--
--    sku, nome e preço são CÓPIA do produto no instante da compra, não uma
--    consulta a `produtos`. Preço de joia acompanha o ouro: se o item apontasse
--    só para o produto, um pedido de março passaria a valer o preço de agosto
--    sozinho, e o faturamento do mês passado mudaria retroativamente.
--    Por isso `produto_id` é ON DELETE SET NULL — apagar a peça do catálogo não
--    pode apagar a história da venda.
-- ---------------------------------------------------------------------------
create table if not exists public.pedido_itens (
  id             uuid primary key default gen_random_uuid(),
  pedido_id      uuid not null references public.pedidos(id) on delete cascade,
  produto_id     uuid references public.produtos(id) on delete set null,

  sku            text not null,
  nome           text not null,
  preco_centavos integer not null check (preco_centavos >= 0),
  quantidade     integer not null default 1 check (quantidade > 0)
);

create index if not exists pedido_itens_pedido_idx  on public.pedido_itens (pedido_id);
create index if not exists pedido_itens_produto_idx on public.pedido_itens (produto_id);


-- ---------------------------------------------------------------------------
-- 3) O total nunca diverge dos itens
--
--    Somar no cliente e mandar o número pronto é como o total sai errado: dois
--    caminhos gravam o mesmo valor (checkout e painel) e um dia um deles
--    esquece o frete, a quantidade ou um arredondamento.
--
--    Quando o pedido tem itens, o total é recalculado aqui. Quando não tem — é
--    o caso da venda avulsa lançada à mão, sem detalhar as peças — o valor
--    digitado no painel é respeitado.
-- ---------------------------------------------------------------------------
create or replace function public.recalcular_total_do_pedido()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_pedido uuid := coalesce(new.pedido_id, old.pedido_id);
  v_total  integer;
  v_itens  integer;
begin
  select coalesce(sum(i.preco_centavos * i.quantidade), 0), count(*)
    into v_total, v_itens
    from public.pedido_itens i
   where i.pedido_id = v_pedido;

  if v_itens > 0 then
    update public.pedidos set total_centavos = v_total where id = v_pedido;
  end if;

  return null;
end;
$$;

drop trigger if exists pedido_itens_recalcula_total on public.pedido_itens;
create trigger pedido_itens_recalcula_total
  after insert or update or delete on public.pedido_itens
  for each row execute function public.recalcular_total_do_pedido();


-- ---------------------------------------------------------------------------
-- 4) RLS
--
--    O cliente vê os pedidos dele e mais nada — é o requisito mais sensível do
--    projeto inteiro, porque um erro aqui expõe endereço e telefone de todos.
--    Criar pedido: qualquer sessão autenticada pode, desde que o pedido saia no
--    nome dela (o WITH CHECK impede lançar pedido no nome de outra pessoa).
--
--    Mudar status é só do admin: o cliente não pode marcar o próprio pedido
--    como "pago". Por isso não existe policy de UPDATE para cliente.
-- ---------------------------------------------------------------------------
alter table public.pedidos      enable row level security;
alter table public.pedido_itens enable row level security;

drop policy if exists "Cliente lê os próprios pedidos" on public.pedidos;
create policy "Cliente lê os próprios pedidos" on public.pedidos
  for select using ((select auth.uid()) = user_id or public.is_admin());

drop policy if exists "Cliente cria o próprio pedido" on public.pedidos;
create policy "Cliente cria o próprio pedido" on public.pedidos
  for insert to authenticated with check ((select auth.uid()) = user_id);

drop policy if exists "Admin gerencia pedidos" on public.pedidos;
create policy "Admin gerencia pedidos" on public.pedidos
  for all using (public.is_admin()) with check (public.is_admin());

-- O item herda a permissão do pedido: quem pode ver o pedido pode ver o item.
drop policy if exists "Itens seguem o pedido" on public.pedido_itens;
create policy "Itens seguem o pedido" on public.pedido_itens
  for select using (
    exists (
      select 1 from public.pedidos p
       where p.id = pedido_itens.pedido_id
         and (p.user_id = (select auth.uid()) or public.is_admin())
    )
  );

drop policy if exists "Cliente cria itens do próprio pedido" on public.pedido_itens;
create policy "Cliente cria itens do próprio pedido" on public.pedido_itens
  for insert to authenticated with check (
    exists (
      select 1 from public.pedidos p
       where p.id = pedido_itens.pedido_id
         and p.user_id = (select auth.uid())
    )
  );

drop policy if exists "Admin gerencia itens" on public.pedido_itens;
create policy "Admin gerencia itens" on public.pedido_itens
  for all using (public.is_admin()) with check (public.is_admin());


-- ---------------------------------------------------------------------------
-- CONFERÊNCIA
-- ---------------------------------------------------------------------------
select 'tabelas de pedido' as item, count(*)::text as valor
  from information_schema.tables
 where table_schema = 'public' and table_name in ('pedidos', 'pedido_itens')
union all
select 'total_centavos e integer', (data_type = 'integer')::text
  from information_schema.columns
 where table_schema = 'public' and table_name = 'pedidos' and column_name = 'total_centavos'
union all
select 'uf tem FK para ufs', count(*)::text
  from pg_constraint c join pg_attribute a
    on a.attrelid = c.conrelid and a.attnum = any(c.conkey)
 where c.conrelid = 'public.pedidos'::regclass and c.contype = 'f' and a.attname = 'uf'
union all
select 'trigger de total', count(*)::text
  from pg_trigger where tgname = 'pedido_itens_recalcula_total'
union all
select 'indice em pedidos.uf', count(*)::text
  from pg_indexes where tablename = 'pedidos' and indexname = 'pedidos_uf_idx'
union all
select 'RLS em pedidos', (relrowsecurity)::text from pg_class where relname = 'pedidos'
union all
select 'policies em pedidos', count(*)::text from pg_policies where tablename = 'pedidos';

-- Esperado: 2 | true | 1 | 1 | 1 | true | 3
