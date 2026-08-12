-- =====================================================================
--  Tabela: pedidos_simulados — registro de cada venda simulada, com a
--  decomposição financeira congelada no momento da simulação.
--  Rode no SQL Editor do Supabase (depois das migrações anteriores).
--
--  Por que congelar os valores na linha (e não recalcular pela ficha)?
--  Porque preço/custo da ficha mudam com o tempo; o pedido precisa refletir
--  a realidade do momento em que foi feito. Snapshot, não referência viva.
-- =====================================================================

create table if not exists public.pedidos_simulados (
    id                 uuid        primary key default gen_random_uuid(),
    restaurante_id     uuid        not null
                         references public.restaurantes (id) on delete cascade,
    ifood_produto_id   text,
    nome_produto       text,
    valor_venda        numeric(12, 2) not null,
    custo_ingredientes numeric(14, 4) not null default 0,
    taxa_ifood_paga    numeric(12, 4) not null default 0,
    custo_fixo_pago    numeric(12, 4) not null default 0,
    lucro_liquido      numeric(14, 4) not null,
    criado_em          timestamptz    not null default now()
);

create index if not exists idx_pedidos_restaurante
    on public.pedidos_simulados (restaurante_id);
create index if not exists idx_pedidos_criado_em
    on public.pedidos_simulados (restaurante_id, criado_em desc);

-- ---------------------------------------------------------------------
-- RLS: cada usuário só lê/escreve os próprios pedidos simulados.
-- ---------------------------------------------------------------------
alter table public.pedidos_simulados enable row level security;

drop policy if exists "pedidos do meu restaurante" on public.pedidos_simulados;
create policy "pedidos do meu restaurante" on public.pedidos_simulados
    for all
    using (restaurante_id = auth.uid())
    with check (restaurante_id = auth.uid());
