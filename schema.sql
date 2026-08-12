-- =====================================================================
--  Restaurante SaaS — Schema relacional (Supabase / PostgreSQL)
--  Domínio: gestão inteligente de restaurantes + cálculo de CMV
--  (Custo da Mercadoria Vendida) e precificação.
--
--  Convenções:
--   - PKs em UUID (gen_random_uuid) — não enumeráveis, prontas p/ multi-tenant.
--   - FKs com CASCADE em dependência forte e RESTRICT onde há uso ativo.
--   - custo_por_unidade é GERADO pelo banco (fonte única de verdade do CMV).
--   - Timestamps com timezone (timestamptz) em UTC.
--
--  Execute no SQL Editor do Supabase ou via `psql < schema.sql`.
-- =====================================================================

-- Extensão para gen_random_uuid() (já habilitada no Supabase, idempotente).
create extension if not exists "pgcrypto";

-- ---------------------------------------------------------------------
-- 1) restaurantes — o tenant raiz. Tudo pendura aqui.
-- ---------------------------------------------------------------------
create table if not exists public.restaurantes (
    id           uuid primary key default gen_random_uuid(),
    nome         text        not null,
    nicho        text,                                   -- ex.: hamburgueria, japonês, padaria
    plano_ifood  text,                                   -- ex.: básico, entrega, super (preparo p/ integração futura)
    cep          text,                                   -- base p/ cruzamento de precificação regional
    created_at   timestamptz not null default now(),
    updated_at   timestamptz not null default now()
);

-- ---------------------------------------------------------------------
-- 2) custos_fixos — despesas mensais recorrentes do restaurante.
--    Entram no rateio do preço de venda (markup sobre o CMV).
-- ---------------------------------------------------------------------
create table if not exists public.custos_fixos (
    id             uuid primary key default gen_random_uuid(),
    restaurante_id uuid           not null
                     references public.restaurantes (id) on delete cascade,
    descricao      text           not null,             -- ex.: aluguel, energia, folha
    valor_mensal   numeric(12, 2) not null check (valor_mensal >= 0),
    created_at     timestamptz    not null default now(),
    updated_at     timestamptz    not null default now()
);

-- ---------------------------------------------------------------------
-- 3) insumos — matéria-prima comprada. Base de todo o cálculo de CMV.
--    custo_por_unidade é DERIVADO: preco_pago / quantidade_embalagem.
--    Ex.: caixa de 12 ovos por R$ 9,60 -> R$ 0,80 por ovo.
-- ---------------------------------------------------------------------
create table if not exists public.insumos (
    id                    uuid           primary key default gen_random_uuid(),
    restaurante_id        uuid           not null
                            references public.restaurantes (id) on delete cascade,
    nome                  text           not null,       -- ex.: Mussarela
    como_compra           text,                          -- ex.: "pacote 5kg", "caixa 12un"
    preco_pago            numeric(12, 2) not null check (preco_pago >= 0),
    quantidade_embalagem  numeric(12, 4) not null check (quantidade_embalagem > 0),
    unidade_medida        text           not null,       -- ex.: kg, g, L, ml, un
    -- Fonte única de verdade do custo unitário. NULLIF evita divisão por zero.
    custo_por_unidade     numeric(14, 6)
                            generated always as
                            (preco_pago / nullif(quantidade_embalagem, 0)) stored,
    created_at            timestamptz    not null default now(),
    updated_at            timestamptz    not null default now()
);

-- ---------------------------------------------------------------------
-- 4) fichas_tecnicas — a "receita" de um prato vendido + preço de venda.
--    O CMV do prato = soma(quantidade_utilizada * custo_por_unidade) dos
--    seus ingredientes (ver tabela 5 e a view de apoio abaixo).
-- ---------------------------------------------------------------------
create table if not exists public.fichas_tecnicas (
    id             uuid           primary key default gen_random_uuid(),
    restaurante_id uuid           not null
                     references public.restaurantes (id) on delete cascade,
    nome_prato     text           not null,             -- ex.: X-Bacon
    preco_venda    numeric(12, 2) not null check (preco_venda >= 0),
    created_at     timestamptz    not null default now(),
    updated_at     timestamptz    not null default now()
);

-- ---------------------------------------------------------------------
-- 5) ingredientes_ficha — tabela de junção (N:N) entre fichas e insumos.
--    RESTRICT no insumo: não deixa apagar insumo que está em uso numa ficha.
-- ---------------------------------------------------------------------
create table if not exists public.ingredientes_ficha (
    id                   uuid           primary key default gen_random_uuid(),
    ficha_tecnica_id     uuid           not null
                           references public.fichas_tecnicas (id) on delete cascade,
    insumo_id            uuid           not null
                           references public.insumos (id) on delete restrict,
    quantidade_utilizada numeric(14, 4) not null check (quantidade_utilizada > 0),
    created_at           timestamptz    not null default now(),
    -- Um insumo não deve aparecer duas vezes na mesma ficha (somar na quantidade).
    unique (ficha_tecnica_id, insumo_id)
);

-- ---------------------------------------------------------------------
-- Índices nas FKs (Postgres não cria automaticamente).
-- ---------------------------------------------------------------------
create index if not exists idx_custos_fixos_restaurante      on public.custos_fixos (restaurante_id);
create index if not exists idx_insumos_restaurante           on public.insumos (restaurante_id);
create index if not exists idx_fichas_restaurante            on public.fichas_tecnicas (restaurante_id);
create index if not exists idx_ingredientes_ficha            on public.ingredientes_ficha (ficha_tecnica_id);
create index if not exists idx_ingredientes_insumo           on public.ingredientes_ficha (insumo_id);

-- ---------------------------------------------------------------------
-- View de apoio: CMV consolidado por ficha técnica.
--   cmv          = custo total dos ingredientes do prato
--   margem_bruta = preco_venda - cmv
--   cmv_pct      = participação do CMV no preço de venda (%)  <- KPI central
-- ---------------------------------------------------------------------
create or replace view public.vw_cmv_ficha as
select
    f.id                                                     as ficha_tecnica_id,
    f.restaurante_id,
    f.nome_prato,
    f.preco_venda,
    coalesce(sum(ig.quantidade_utilizada * i.custo_por_unidade), 0)::numeric(14, 4) as cmv,
    (f.preco_venda
        - coalesce(sum(ig.quantidade_utilizada * i.custo_por_unidade), 0))::numeric(14, 4) as margem_bruta,
    case
        when f.preco_venda > 0 then
            round(
                100 * coalesce(sum(ig.quantidade_utilizada * i.custo_por_unidade), 0)
                    / f.preco_venda, 2)
        else null
    end                                                      as cmv_pct
from public.fichas_tecnicas f
left join public.ingredientes_ficha ig on ig.ficha_tecnica_id = f.id
left join public.insumos          i  on i.id = ig.insumo_id
group by f.id, f.restaurante_id, f.nome_prato, f.preco_venda;

-- =====================================================================
--  PRÓXIMOS PASSOS (não incluídos neste schema base, propositalmente):
--   - Row Level Security (RLS) por restaurante_id quando entrar o Auth.
--   - Trigger de updated_at (moddatetime) ou app-side.
--   - Tabela de precificação regional (cruzar cep x preço de mercado).
--   - Tabela de integração iFood (mapear plano_ifood -> taxas/comissões).
-- =====================================================================
