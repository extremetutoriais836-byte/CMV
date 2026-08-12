-- =====================================================================
--  Tabela: pedidos_ifood — pedidos REAIS importados do iFood (não simulados).
--  Convive com pedidos_simulados (que permanece como modo demo/trial).
--  Rode no SQL Editor do Supabase. Idempotente.
--
--  Snapshot financeiro: além do bruto do iFood (valor_itens, taxas, incentivos),
--  guardamos custo_ingredientes/custo_fixo_pago/lucro_liquido CONGELADOS no momento
--  da ingestão (a ficha e os custos mudam com o tempo; o pedido reflete o passado).
-- =====================================================================

create table if not exists public.pedidos_ifood (
    id                 uuid           primary key default gen_random_uuid(),
    restaurante_id     uuid           not null
                         references public.restaurantes (id) on delete cascade,
    -- id do pedido no iFood — único por restaurante (habilita upsert).
    ifood_pedido_id    text           not null,

    -- Bruto vindo do iFood (livro-razão pedido a pedido).
    valor_itens        numeric(12, 2) not null default 0,
    taxa_entrega       numeric(12, 2) not null default 0,
    taxas_adicionais   numeric(12, 2) not null default 0,
    incentivo_loja     numeric(12, 2) not null default 0, -- bancado pela LOJA (custa à loja)
    incentivo_ifood    numeric(12, 2) not null default 0, -- bancado pelo iFood (não custa à loja)
    status             text           not null default 'entregue', -- 'entregue' | 'cancelado'
    data_pedido        timestamptz,

    -- Vínculo opcional com a ficha (quando o item do pedido for mapeável).
    ficha_tecnica_id   uuid
                         references public.fichas_tecnicas (id) on delete set null,

    -- Snapshot financeiro calculado (lib/calculo.ts).
    custo_ingredientes numeric(14, 4) not null default 0,
    custo_fixo_pago    numeric(14, 4) not null default 0,
    lucro_liquido      numeric(14, 4) not null default 0,

    criado_em          timestamptz    not null default now(),

    unique (restaurante_id, ifood_pedido_id)
);

create index if not exists idx_pedidos_ifood_restaurante_data
    on public.pedidos_ifood (restaurante_id, criado_em desc);

-- ---------------------------------------------------------------------
-- RLS: cada usuário só lê/escreve os próprios pedidos reais.
-- ---------------------------------------------------------------------
alter table public.pedidos_ifood enable row level security;

drop policy if exists "pedidos_ifood do meu restaurante" on public.pedidos_ifood;
create policy "pedidos_ifood do meu restaurante" on public.pedidos_ifood
    for all
    using (restaurante_id = auth.uid())
    with check (restaurante_id = auth.uid());
