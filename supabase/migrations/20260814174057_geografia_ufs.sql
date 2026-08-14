-- ============================================================================
-- FLORENZA — 02. GEOGRAFIA: as 27 unidades federativas e suas regiões
--
-- Existe por causa da pergunta central do painel: "quais regiões do Brasil mais
-- compram?". Podia ser um CASE gigante dentro de cada consulta, mas aí o mapa,
-- o gráfico de regiões e o formulário de pedido teriam três cópias da mesma
-- verdade — e a primeira divergência (Tocantins no Norte ou no Centro-Oeste?)
-- só apareceria num número errado meses depois.
--
-- Sendo tabela, `pedidos.uf` ganha chave estrangeira e o banco passa a recusar
-- "SP " com espaço, "sp" minúsculo ou "XX" inexistente na hora do INSERT.
--
-- COMO RODAR: `npx supabase db push --linked`. Seguro rodar de novo.
-- ============================================================================

create table if not exists public.ufs (
  uf     char(2) primary key,
  nome   text not null,
  regiao text not null check (regiao in ('Norte', 'Nordeste', 'Centro-Oeste', 'Sudeste', 'Sul')),
  ordem  smallint not null default 0
);

comment on table public.ufs is
  'Unidades federativas e suas regiões. Fonte única para o mapa do painel, para a agregação de vendas e para a validação de pedidos.';

insert into public.ufs (uf, nome, regiao, ordem) values
  ('AC', 'Acre',                'Norte',        1),
  ('AP', 'Amapá',               'Norte',        2),
  ('AM', 'Amazonas',            'Norte',        3),
  ('PA', 'Pará',                'Norte',        4),
  ('RO', 'Rondônia',            'Norte',        5),
  ('RR', 'Roraima',             'Norte',        6),
  ('TO', 'Tocantins',           'Norte',        7),
  ('AL', 'Alagoas',             'Nordeste',     8),
  ('BA', 'Bahia',               'Nordeste',     9),
  ('CE', 'Ceará',               'Nordeste',    10),
  ('MA', 'Maranhão',            'Nordeste',    11),
  ('PB', 'Paraíba',             'Nordeste',    12),
  ('PE', 'Pernambuco',          'Nordeste',    13),
  ('PI', 'Piauí',               'Nordeste',    14),
  ('RN', 'Rio Grande do Norte', 'Nordeste',    15),
  ('SE', 'Sergipe',             'Nordeste',    16),
  ('DF', 'Distrito Federal',    'Centro-Oeste', 17),
  ('GO', 'Goiás',               'Centro-Oeste', 18),
  ('MT', 'Mato Grosso',         'Centro-Oeste', 19),
  ('MS', 'Mato Grosso do Sul',  'Centro-Oeste', 20),
  ('ES', 'Espírito Santo',      'Sudeste',     21),
  ('MG', 'Minas Gerais',        'Sudeste',     22),
  ('RJ', 'Rio de Janeiro',      'Sudeste',     23),
  ('SP', 'São Paulo',           'Sudeste',     24),
  ('PR', 'Paraná',              'Sul',         25),
  ('RS', 'Rio Grande do Sul',   'Sul',         26),
  ('SC', 'Santa Catarina',      'Sul',         27)
on conflict (uf) do update
  set nome = excluded.nome, regiao = excluded.regiao, ordem = excluded.ordem;

create index if not exists ufs_regiao_idx on public.ufs (regiao);


-- ---------------------------------------------------------------------------
-- RLS
--
-- Leitura liberada para todo mundo, inclusive visitante não logado: o seletor
-- de estado do checkout precisa da lista antes de existir sessão. Não há nada
-- sensível aqui — é a divisão política do país.
--
-- Escrita: ninguém. Nem admin. A lista só muda se o IBGE mudar, e aí é uma
-- migration nova, revisada, e não um clique no painel.
-- ---------------------------------------------------------------------------
alter table public.ufs enable row level security;

drop policy if exists "UFs são públicas para leitura" on public.ufs;
create policy "UFs são públicas para leitura" on public.ufs
  for select using (true);


-- ---------------------------------------------------------------------------
-- CONFERÊNCIA
-- ---------------------------------------------------------------------------
select 'total de UFs' as item, count(*)::text as valor from public.ufs
union all
select 'regioes distintas', count(distinct regiao)::text from public.ufs
union all
select 'Sudeste tem 4', (count(*) = 4)::text from public.ufs where regiao = 'Sudeste'
union all
select 'Nordeste tem 9', (count(*) = 9)::text from public.ufs where regiao = 'Nordeste'
union all
select 'Norte tem 7', (count(*) = 7)::text from public.ufs where regiao = 'Norte'
union all
select 'Centro-Oeste tem 4', (count(*) = 4)::text from public.ufs where regiao = 'Centro-Oeste'
union all
select 'Sul tem 3', (count(*) = 3)::text from public.ufs where regiao = 'Sul'
union all
select 'RLS ligada', (relrowsecurity)::text from pg_class where relname = 'ufs';

-- Esperado: 27 | 5 | true | true | true | true | true | true
