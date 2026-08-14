-- ============================================================================
-- FLORENZA — 01. BASE: perfis, papéis e utilidades
--
-- Primeira migration do projeto. Cria a identidade das pessoas que usam o site
-- (clientes) e do time (admin), mais duas funções que todas as migrations
-- seguintes reaproveitam.
--
-- COMO RODAR: `npx supabase db push --linked`, ou colar este arquivo inteiro no
-- SQL Editor do projeto e executar. É seguro rodar de novo — tudo usa
-- IF NOT EXISTS / CREATE OR REPLACE / ON CONFLICT.
-- ============================================================================


-- ---------------------------------------------------------------------------
-- 1) updated_at automático
--
--    Sem isto, `updated_at` só muda se quem escreve lembrar de mandar o campo —
--    e uma hora alguém esquece, deixando o painel mostrar "atualizado em" errado.
-- ---------------------------------------------------------------------------
create or replace function public.tocar_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at := now();
  return new;
end;
$$;


-- ---------------------------------------------------------------------------
-- 2) profiles — uma linha por conta criada no site
--
--    O e-mail NÃO é copiado para cá: ele já mora em auth.users e duplicá-lo
--    criaria duas versões da mesma verdade, que divergem no primeiro cadastro
--    com e-mail trocado. A view vw_clientes (migration 04) junta os dois.
--
--    `role` decide quem entra em /admin. Nasce sempre 'cliente': promover
--    alguém a admin é um UPDATE manual e consciente no SQL Editor, nunca algo
--    que o cadastro do site possa fazer sozinho.
-- ---------------------------------------------------------------------------
create table if not exists public.profiles (
  id         uuid primary key references auth.users on delete cascade,
  nome       text,
  telefone   text,
  cep        text,
  cidade     text,
  uf         char(2),
  role       text not null default 'cliente' check (role in ('cliente', 'admin')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

drop trigger if exists profiles_updated_at on public.profiles;
create trigger profiles_updated_at
  before update on public.profiles
  for each row execute function public.tocar_updated_at();

-- O painel lista clientes ordenando por data de cadastro.
create index if not exists profiles_created_at_idx on public.profiles (created_at desc);
-- E filtra por papel para separar cliente de equipe.
create index if not exists profiles_role_idx on public.profiles (role);


-- ---------------------------------------------------------------------------
-- 3) is_admin() — a pergunta que toda policy do painel faz
--
--    SECURITY DEFINER porque a função precisa ler `profiles` sem passar pela
--    RLS de `profiles` — se passasse, a política que usa is_admin() chamaria
--    is_admin() de novo, em recursão infinita.
--
--    `set search_path = ''` (com os nomes qualificados abaixo) fecha a porta
--    clássica de escalada de privilégio: sem isso, alguém com permissão de
--    criar objetos poderia plantar um `profiles` falso num schema à frente no
--    caminho de busca e a função passaria a ler a tabela errada.
--
--    A checagem de identidade está dentro do corpo — a função responde apenas
--    sobre quem está chamando, nunca sobre terceiros.
-- ---------------------------------------------------------------------------
create or replace function public.is_admin()
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select exists (
    select 1
      from public.profiles p
     where p.id = (select auth.uid())
       and p.role = 'admin'
  );
$$;

--    Sobre quem pode CHAMAR: `anon` também recebe, e isso é necessário, não
--    descuido. Várias policies abaixo têm a forma `<condição> or is_admin()`.
--    Para um visitante sem sessão a primeira parte dá NULL (auth.uid() é nulo),
--    então o Postgres precisa avaliar is_admin() para decidir — e se `anon` não
--    tivesse EXECUTE, a consulta morreria com "permission denied for function"
--    em vez de devolver zero linhas. Erro no lugar de lista vazia, o que é pior
--    de diagnosticar e assusta sem motivo.
--
--    Conceder não abre nada: a função só responde sobre QUEM ESTÁ CHAMANDO, e
--    para uma sessão anônima a resposta é sempre false.
revoke execute on function public.is_admin() from public;
grant execute on function public.is_admin() to anon, authenticated;


-- ---------------------------------------------------------------------------
-- 4) Cadastro no site cria o perfil sozinho
--
--    É esta trigger que faz a aba "Clientes" do painel se atualizar sem
--    ninguém digitar nada: quem cria conta vira uma linha em profiles no mesmo
--    instante, e a view vw_clientes já enxerga.
--
--    nome e telefone chegam em raw_user_meta_data porque o cadastro os envia em
--    `options.data` do signUp.
-- ---------------------------------------------------------------------------
create or replace function public.criar_perfil_do_usuario()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  insert into public.profiles (id, nome, telefone)
  values (
    new.id,
    nullif(trim(coalesce(new.raw_user_meta_data ->> 'nome', '')), ''),
    nullif(trim(coalesce(new.raw_user_meta_data ->> 'telefone', '')), '')
  )
  on conflict (id) do nothing;
  return new;
end;
$$;

drop trigger if exists ao_criar_usuario on auth.users;
create trigger ao_criar_usuario
  after insert on auth.users
  for each row execute function public.criar_perfil_do_usuario();


-- ---------------------------------------------------------------------------
-- 5) RLS
--
--    `(select auth.uid())` e não `auth.uid()` puro: dentro do parêntese o
--    Postgres avalia uma vez e reaproveita; solto, ele chama a função uma vez
--    POR LINHA varrida. Em tabela grande a diferença é de ordem de grandeza.
-- ---------------------------------------------------------------------------
alter table public.profiles enable row level security;

drop policy if exists "Cada um lê o próprio perfil" on public.profiles;
create policy "Cada um lê o próprio perfil" on public.profiles
  for select using ((select auth.uid()) = id or public.is_admin());

drop policy if exists "Cada um edita o próprio perfil" on public.profiles;
create policy "Cada um edita o próprio perfil" on public.profiles
  for update using ((select auth.uid()) = id) with check ((select auth.uid()) = id);

-- Admin precisa poder promover/rebaixar e corrigir cadastro.
drop policy if exists "Admin gerencia perfis" on public.profiles;
create policy "Admin gerencia perfis" on public.profiles
  for all using (public.is_admin()) with check (public.is_admin());


-- ---------------------------------------------------------------------------
-- CONFERÊNCIA
-- ---------------------------------------------------------------------------
select 'tabela profiles' as item, count(*)::text as valor
  from information_schema.tables where table_schema = 'public' and table_name = 'profiles'
union all
select 'funcao is_admin', count(*)::text from pg_proc where proname = 'is_admin'
union all
select 'is_admin e security definer', (prosecdef)::text from pg_proc where proname = 'is_admin'
union all
select 'anon executa is_admin (responde false)',
       has_function_privilege('anon', 'public.is_admin()', 'execute')::text
union all
select 'trigger de novo usuario', count(*)::text from pg_trigger where tgname = 'ao_criar_usuario'
union all
select 'RLS ligada em profiles', (relrowsecurity)::text from pg_class where relname = 'profiles'
union all
select 'policies em profiles', count(*)::text from pg_policies where tablename = 'profiles';

-- Esperado: 1 | 1 | true | true | 1 | true | 3
