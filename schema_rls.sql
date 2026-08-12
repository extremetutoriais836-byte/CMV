-- =====================================================================
--  RLS (Row Level Security) — isolamento multi-tenant por usuário.
--  Rode ESTE arquivo DEPOIS do schema.sql, com o Supabase Auth já ativo.
--
--  Modelo: restaurantes.id = auth.uid() (1 usuário = 1 restaurante).
--  Cada usuário só enxerga/edita as linhas vinculadas ao seu próprio id.
--
--  Sem isto, a chave anônima consegue ler dados de QUALQUER restaurante.
--  Middleware protege ROTA; RLS protege DADO. As duas camadas são necessárias.
-- =====================================================================

-- ---------------------------------------------------------------------
-- 1) Liga RLS em todas as tabelas (padrão: nega tudo até haver policy).
-- ---------------------------------------------------------------------
alter table public.restaurantes        enable row level security;
alter table public.custos_fixos        enable row level security;
alter table public.insumos             enable row level security;
alter table public.fichas_tecnicas     enable row level security;
alter table public.ingredientes_ficha  enable row level security;

-- ---------------------------------------------------------------------
-- 2) restaurantes — o usuário só acessa o restaurante cujo id = auth.uid().
-- ---------------------------------------------------------------------
drop policy if exists "restaurante proprio" on public.restaurantes;
create policy "restaurante proprio" on public.restaurantes
    for all
    using (id = auth.uid())
    with check (id = auth.uid());

-- ---------------------------------------------------------------------
-- 3) Tabelas filhas diretas — filtram por restaurante_id = auth.uid().
-- ---------------------------------------------------------------------
drop policy if exists "custos do meu restaurante" on public.custos_fixos;
create policy "custos do meu restaurante" on public.custos_fixos
    for all
    using (restaurante_id = auth.uid())
    with check (restaurante_id = auth.uid());

drop policy if exists "insumos do meu restaurante" on public.insumos;
create policy "insumos do meu restaurante" on public.insumos
    for all
    using (restaurante_id = auth.uid())
    with check (restaurante_id = auth.uid());

drop policy if exists "fichas do meu restaurante" on public.fichas_tecnicas;
create policy "fichas do meu restaurante" on public.fichas_tecnicas
    for all
    using (restaurante_id = auth.uid())
    with check (restaurante_id = auth.uid());

-- ---------------------------------------------------------------------
-- 4) ingredientes_ficha NÃO tem restaurante_id direto — herda via a ficha.
--    Só acessa itens de fichas que pertencem ao usuário.
-- ---------------------------------------------------------------------
drop policy if exists "ingredientes via ficha do usuario" on public.ingredientes_ficha;
create policy "ingredientes via ficha do usuario" on public.ingredientes_ficha
    for all
    using (
        exists (
            select 1 from public.fichas_tecnicas f
            where f.id = ingredientes_ficha.ficha_tecnica_id
              and f.restaurante_id = auth.uid()
        )
    )
    with check (
        exists (
            select 1 from public.fichas_tecnicas f
            where f.id = ingredientes_ficha.ficha_tecnica_id
              and f.restaurante_id = auth.uid()
        )
    );

-- ---------------------------------------------------------------------
-- 5) CRÍTICO: a view vw_cmv_ficha precisa rodar com as permissões de
--    QUEM CONSULTA (security_invoker), senão ela ignora a RLS das tabelas
--    base e vaza dados de todos os restaurantes.
--    Requer PostgreSQL 15+ (Supabase já é 15+).
-- ---------------------------------------------------------------------
alter view public.vw_cmv_ficha set (security_invoker = on);

-- =====================================================================
--  Pronto. A partir daqui, toda query do app é automaticamente
--  filtrada pelo usuário logado — isolamento garantido no banco.
-- =====================================================================
