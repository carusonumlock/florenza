-- ============================================================================
-- FLORENZA — 04. CLIENTES: cadastro manual e o diretório unificado
--
-- O pedido tem duas metades que precisam conviver numa lista só:
--   1. quem cria conta no site entra sozinho (trigger da migration 01);
--   2. quem fecha pela loja, Instagram ou WhatsApp é cadastrado à mão no painel.
--
-- Quem resolve isso é a view vw_clientes lá embaixo. A coluna `origem` diz de
-- qual metade cada pessoa veio, para o painel não misturar as duas coisas sem
-- avisar.
--
-- COMO RODAR: `npx supabase db push --linked`. Seguro rodar de novo.
-- ============================================================================


-- ---------------------------------------------------------------------------
-- 1) clientes_manuais — quem não tem conta
--
--    Deliberadamente separada de `profiles`: profiles é o retrato de uma conta
--    em auth.users e some junto com ela; isto aqui é a agenda comercial da
--    Florenza e não deveria depender de ninguém ter criado senha.
-- ---------------------------------------------------------------------------
create table if not exists public.clientes_manuais (
  id          uuid primary key default gen_random_uuid(),
  nome        text not null check (length(trim(nome)) > 0),
  telefone    text,
  email       text,
  cidade      text,
  uf          char(2) references public.ufs(uf),
  observacoes text,
  created_at  timestamptz not null default now(),
  updated_at  timestamptz not null default now()
);

drop trigger if exists clientes_manuais_updated_at on public.clientes_manuais;
create trigger clientes_manuais_updated_at
  before update on public.clientes_manuais
  for each row execute function public.tocar_updated_at();

-- FK indexada (o painel agrupa cliente por estado).
create index if not exists clientes_manuais_uf_idx on public.clientes_manuais (uf);
create index if not exists clientes_manuais_criado_idx on public.clientes_manuais (created_at desc);

alter table public.clientes_manuais enable row level security;

-- Agenda comercial é dado do negócio: só o time vê, e ninguém mais.
drop policy if exists "Admin gerencia clientes manuais" on public.clientes_manuais;
create policy "Admin gerencia clientes manuais" on public.clientes_manuais
  for all using (public.is_admin()) with check (public.is_admin());


-- ---------------------------------------------------------------------------
-- 2) vw_clientes — as duas origens numa lista só
--
--    É esta view que cumpre "a lista se atualiza conforme eles vão se
--    cadastrando no site": ninguém sincroniza nada, a conta nova aparece porque
--    a view lê profiles direto.
--
--    `security_invoker = true` é obrigatório e não é detalhe: sem ele a view
--    roda com os direitos de quem a criou, ignora a RLS das tabelas de baixo, e
--    qualquer visitante com a chave pública lê o e-mail e o telefone de todos
--    os clientes da loja. Com ele, a view enxerga exatamente o que quem
--    consulta poderia enxergar sozinho — ou seja, só admin.
--
--    O e-mail vem de auth.users porque é lá que ele mora; copiá-lo para
--    profiles criaria duas versões da mesma verdade.
-- ---------------------------------------------------------------------------
drop view if exists public.vw_clientes;
create view public.vw_clientes with (security_invoker = true) as
  select
    p.id,
    coalesce(nullif(trim(p.nome), ''), split_part(u.email, '@', 1)) as nome,
    u.email,
    p.telefone,
    p.cidade,
    p.uf,
    'site'::text as origem,
    p.created_at,
    null::text   as observacoes
  from public.profiles p
  join auth.users u on u.id = p.id
  where p.role = 'cliente'

  union all

  select
    c.id,
    c.nome,
    c.email,
    c.telefone,
    c.cidade,
    c.uf,
    'manual'::text as origem,
    c.created_at,
    c.observacoes
  from public.clientes_manuais c;

comment on view public.vw_clientes is
  'Diretório único de clientes: contas criadas no site (origem=site) e cadastros feitos à mão no painel (origem=manual).';


-- ---------------------------------------------------------------------------
-- CONFERÊNCIA
-- ---------------------------------------------------------------------------
select 'tabela clientes_manuais' as item, count(*)::text as valor
  from information_schema.tables where table_schema = 'public' and table_name = 'clientes_manuais'
union all
select 'view vw_clientes', count(*)::text
  from information_schema.views where table_schema = 'public' and table_name = 'vw_clientes'
union all
select 'view respeita RLS (security_invoker)', count(*)::text
  from pg_class where relname = 'vw_clientes' and reloptions::text like '%security_invoker=true%'
union all
select 'RLS em clientes_manuais', (relrowsecurity)::text from pg_class where relname = 'clientes_manuais'
union all
select 'uf tem FK para ufs', count(*)::text
  from pg_constraint where conrelid = 'public.clientes_manuais'::regclass and contype = 'f';

-- Esperado: 1 | 1 | 1 | true | 1
