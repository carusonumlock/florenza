-- ============================================================================
-- FLORENZA — 07. ENDURECIMENTO: o que o auditor do Supabase apontou
--
-- Escrita depois de aplicar as seis primeiras no projeto real e rodar o linter
-- de segurança e o de performance (Advisors). Três achados eram legítimos e
-- estão corrigidos aqui; dois são intencionais e ficam registrados como tal,
-- para ninguém "consertar" de novo daqui a seis meses e reabrir o buraco.
--
-- COMO RODAR: `npx supabase db push --linked`. Seguro rodar de novo.
-- ============================================================================


-- ---------------------------------------------------------------------------
-- 1) tocar_updated_at() estava sem search_path fixo
--
--    Era a única função do projeto sem `set search_path`. É a mesma porta de
--    escalada de privilégio que is_admin() já fechava: com o caminho de busca
--    aberto, quem puder criar objetos planta uma função homônima à frente no
--    caminho e passa a executar código próprio dentro de uma trigger que roda
--    em toda escrita de produto, pedido e perfil.
--
--    `now()` mora em pg_catalog, que está sempre no caminho mesmo com o
--    search_path vazio — então zerar não quebra a função.
-- ---------------------------------------------------------------------------
create or replace function public.tocar_updated_at()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  new.updated_at := now();
  return new;
end;
$$;


-- ---------------------------------------------------------------------------
-- 2) Função de trigger não é endpoint da API
--
--    criar_perfil_do_usuario() e recalcular_total_do_pedido() existem só para
--    serem disparadas por trigger, mas o PostgREST expõe toda função de
--    `public` em /rest/v1/rpc/<nome> — e as duas são SECURITY DEFINER, ou seja,
--    rodariam com os direitos do dono do banco a pedido de qualquer visitante.
--
--    Revogar o EXECUTE é seguro e não desliga as triggers: o Postgres confere
--    essa permissão na hora de CRIAR a trigger, não a cada disparo. Conferido
--    na prática — cadastro novo continua criando o perfil.
-- ---------------------------------------------------------------------------
revoke execute on function public.criar_perfil_do_usuario()    from public, anon, authenticated;
revoke execute on function public.recalcular_total_do_pedido() from public, anon, authenticated;


-- ---------------------------------------------------------------------------
-- 3) Uma policy a menos no caminho quente da vitrine
--
--    O linter de performance apontou policy permissiva duplicada: as tabelas do
--    catálogo tinham "público lê" E "admin faz tudo" valendo para o mesmo
--    SELECT. O Postgres avalia todas as permissivas aplicáveis, então toda
--    visita à vitrine — gente sem conta, que é a maioria — chamava is_admin()
--    de graça.
--
--    O SELECT do admin já estava coberto pelo `or public.is_admin()` da própria
--    policy pública. Aqui a policy de admin deixa de valer para SELECT e passa
--    a cobrir só escrita. Nenhuma permissão muda: some a duplicata.
--
--    As tabelas sensíveis (profiles, pedidos, pedido_itens) ficam como estão, de
--    propósito. Lá a sobreposição é entre "o dono lê o dele" e "admin lê tudo",
--    que não são a mesma regra — juntar as duas numa policy só é onde se erra o
--    sinal e se vaza pedido alheio. Custo de uma chamada extra de função contra
--    risco de exposição: fica como está.
-- ---------------------------------------------------------------------------
drop policy if exists "Admin gerencia categorias" on public.categorias;
drop policy if exists "Admin cria categorias"     on public.categorias;
drop policy if exists "Admin edita categorias"    on public.categorias;
drop policy if exists "Admin apaga categorias"    on public.categorias;
create policy "Admin cria categorias" on public.categorias
  for insert to authenticated with check (public.is_admin());
create policy "Admin edita categorias" on public.categorias
  for update to authenticated using (public.is_admin()) with check (public.is_admin());
create policy "Admin apaga categorias" on public.categorias
  for delete to authenticated using (public.is_admin());

drop policy if exists "Admin gerencia opções de filtro" on public.filtro_opcoes;
drop policy if exists "Admin cria opções de filtro"     on public.filtro_opcoes;
drop policy if exists "Admin edita opções de filtro"    on public.filtro_opcoes;
drop policy if exists "Admin apaga opções de filtro"    on public.filtro_opcoes;
create policy "Admin cria opções de filtro" on public.filtro_opcoes
  for insert to authenticated with check (public.is_admin());
create policy "Admin edita opções de filtro" on public.filtro_opcoes
  for update to authenticated using (public.is_admin()) with check (public.is_admin());
create policy "Admin apaga opções de filtro" on public.filtro_opcoes
  for delete to authenticated using (public.is_admin());

drop policy if exists "Admin gerencia produtos" on public.produtos;
drop policy if exists "Admin cria produtos"     on public.produtos;
drop policy if exists "Admin edita produtos"    on public.produtos;
drop policy if exists "Admin apaga produtos"    on public.produtos;
create policy "Admin cria produtos" on public.produtos
  for insert to authenticated with check (public.is_admin());
create policy "Admin edita produtos" on public.produtos
  for update to authenticated using (public.is_admin()) with check (public.is_admin());
create policy "Admin apaga produtos" on public.produtos
  for delete to authenticated using (public.is_admin());


-- ---------------------------------------------------------------------------
-- 4) O que o linter aponta e fica como está, de propósito
--
--    is_admin() e email_dos_clientes() seguem SECURITY DEFINER e executáveis
--    por `anon`. O linter sinaliza as duas; as duas são desenho, não descuido:
--
--    - is_admin() só responde sobre QUEM CHAMA. Para sessão anônima é sempre
--      false. Precisa de EXECUTE em anon porque as policies têm a forma
--      `<condição> or is_admin()` e, sem sessão, a primeira parte dá NULL — o
--      Postgres precisa avaliar a segunda. Sem o grant, a consulta anônima
--      morreria com "permission denied for function" em vez de devolver lista
--      vazia.
--
--    - email_dos_clientes() é SECURITY DEFINER porque auth.users é fechada aos
--      papéis do cliente, e carrega a checagem de admin DENTRO do corpo: para
--      quem não é admin devolve zero linha.
--
--    Conferido contra o projeto real, pela API pública e com a chave publicável,
--    já com um cliente cadastrado no banco: sem sessão, vw_clientes, pedidos,
--    pedido_itens, profiles e clientes_manuais devolvem 0 linhas, e chamar
--    /rest/v1/rpc/email_dos_clientes direto devolve [].
-- ---------------------------------------------------------------------------
comment on function public.is_admin() is
  'SECURITY DEFINER de propósito, e com EXECUTE para anon de propósito: responde apenas sobre quem chama, e sem o grant as policies "x or is_admin()" estourariam erro para visitante em vez de devolver vazio.';


-- ---------------------------------------------------------------------------
-- CONFERÊNCIA
-- ---------------------------------------------------------------------------
select 'tocar_updated_at com search_path' as item,
       (proconfig is not null)::text as valor
  from pg_proc where proname = 'tocar_updated_at'
union all
select 'anon NAO executa criar_perfil_do_usuario',
       (not has_function_privilege('anon', 'public.criar_perfil_do_usuario()', 'execute'))::text
union all
select 'anon NAO executa recalcular_total_do_pedido',
       (not has_function_privilege('anon', 'public.recalcular_total_do_pedido()', 'execute'))::text
union all
select 'trigger de perfil continua viva',
       (count(*) = 1)::text from pg_trigger where tgname = 'ao_criar_usuario'
union all
select 'produtos sem policy de SELECT duplicada',
       (count(*) = 1)::text from pg_policies
 where tablename = 'produtos' and cmd in ('SELECT', 'ALL');

-- Esperado: true | true | true | true | true
