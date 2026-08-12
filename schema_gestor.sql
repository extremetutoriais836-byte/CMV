-- =====================================================================
--  Dashboard de gestores (uso INTERNO Locus): visão de carteira.
--  Um "gestor Locus" enxerga várias orgs/lojas (CS/comercial interno).
--  Rode no SQL Editor do Supabase. Idempotente.
-- =====================================================================

-- Quem é gestor interno (marcação via service role / SQL — nunca self-service).
create table if not exists public.gestores_locus (
    user_id   uuid primary key,
    criado_em timestamptz not null default now()
);
alter table public.gestores_locus enable row level security;
drop policy if exists "minha linha de gestor" on public.gestores_locus;
create policy "minha linha de gestor" on public.gestores_locus
    for select using (user_id = auth.uid());

-- Carteira: resumo por loja. SECURITY DEFINER (lê toda a base), MAS só
-- retorna dados se o chamador estiver em gestores_locus.
create or replace function public.carteira_gestor()
returns table (
    loja_id            uuid,
    loja               text,
    nicho              text,
    plano              text,
    status_assinatura  text,
    faturamento        numeric,
    lucro              numeric,
    cmv_pct            numeric,
    n_pedidos          bigint,
    ultimo_pedido      timestamptz,
    risco_churn        boolean
)
language plpgsql
stable
security definer
set search_path = public
as $$
begin
    if not exists (select 1 from public.gestores_locus g where g.user_id = auth.uid()) then
        return; -- não-gestor: carteira vazia
    end if;

    return query
    select
        r.id,
        r.nome,
        r.nicho,
        r.plano,
        r.status_assinatura,
        coalesce(sum(p.valor_venda), 0)::numeric,
        coalesce(sum(p.lucro_liquido), 0)::numeric,
        (100 * coalesce(sum(p.custo_ingredientes), 0) / nullif(sum(p.valor_venda), 0))::numeric,
        count(p.id)::bigint,
        max(p.criado_em),
        (max(p.criado_em) is null or max(p.criado_em) < now() - interval '7 days') as risco_churn
    from public.restaurantes r
    left join public.pedidos_simulados p on p.restaurante_id = r.id
    group by r.id, r.nome, r.nicho, r.plano, r.status_assinatura
    order by coalesce(sum(p.lucro_liquido), 0) desc;
end;
$$;

grant execute on function public.carteira_gestor() to authenticated;
