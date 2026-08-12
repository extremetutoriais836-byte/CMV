-- =====================================================================
--  Tabela: mapeamentos_ifood — vínculo "De-Para" entre um produto do
--  iFood e uma ficha técnica do nosso sistema.
--  Rode no SQL Editor do Supabase (depois de schema.sql + schema_rls.sql).
--
--  Modelo: restaurante_id = auth.uid() (1 usuário = 1 restaurante).
-- =====================================================================

create table if not exists public.mapeamentos_ifood (
    id                  uuid        primary key default gen_random_uuid(),
    restaurante_id      uuid        not null
                          references public.restaurantes (id) on delete cascade,
    ifood_produto_id    text        not null,
    ifood_produto_nome  text,
    -- Permite NULL: o usuário pode desvincular. Se a ficha for apagada,
    -- o vínculo zera (SET NULL) em vez de quebrar.
    ficha_tecnica_id    uuid
                          references public.fichas_tecnicas (id) on delete set null,
    updated_at          timestamptz not null default now(),

    -- Um produto do iFood mapeia para no máximo uma ficha por restaurante.
    -- (Habilita o upsert por onConflict.)
    unique (restaurante_id, ifood_produto_id)
);

create index if not exists idx_mapeamentos_restaurante
    on public.mapeamentos_ifood (restaurante_id);

-- ---------------------------------------------------------------------
-- RLS: cada usuário só lê/escreve os mapeamentos do próprio restaurante.
-- ---------------------------------------------------------------------
alter table public.mapeamentos_ifood enable row level security;

drop policy if exists "mapeamentos do meu restaurante" on public.mapeamentos_ifood;
create policy "mapeamentos do meu restaurante" on public.mapeamentos_ifood
    for all
    using (restaurante_id = auth.uid())
    with check (restaurante_id = auth.uid());
