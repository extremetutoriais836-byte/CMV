-- =====================================================================
--  RPCs de evolução + benchmark anônimo da base (blueprint §8).
--  Rode no SQL Editor do Supabase. Idempotente.
-- =====================================================================

-- Série diária do PRÓPRIO restaurante desde uma data (SECURITY INVOKER → RLS).
create or replace function public.evolucao_desde(
    p_restaurante_id uuid,
    p_desde timestamptz
)
returns table (dia date, lucro numeric, faturamento numeric)
language sql
stable
as $$
    select
        date_trunc('day', p.criado_em)::date,
        coalesce(sum(p.lucro_liquido), 0)::numeric,
        coalesce(sum(p.valor_venda), 0)::numeric
    from public.pedidos_simulados p
    where p.restaurante_id = p_restaurante_id
      and p.criado_em >= coalesce(p_desde, now() - interval '90 days')
    group by 1
    order by 1;
$$;

-- Benchmark ANÔNIMO e AGREGADO por nicho.
--  LGPD: SECURITY DEFINER (lê toda a base, ignorando RLS) MAS devolve SÓ o agregado —
--  nunca uma loja individual — e exige no mínimo 3 lojas, senão retorna NULL.
create or replace function public.benchmark_nicho(p_nicho text)
returns table (margem_media_pct numeric, n_lojas bigint)
language plpgsql
stable
security definer
set search_path = public
as $$
declare
    v_n bigint;
    v_m numeric;
begin
    with por_loja as (
        select r.id,
               100 * sum(ps.lucro_liquido) / nullif(sum(ps.valor_venda), 0) as margem
        from public.restaurantes r
        join public.pedidos_simulados ps on ps.restaurante_id = r.id
        where r.nicho = p_nicho
        group by r.id
        having sum(ps.valor_venda) > 0
    )
    select count(*), avg(margem) into v_n, v_m from por_loja;

    if v_n is null or v_n < 3 then
        -- Base pequena demais -> não expõe (evita identificar loja individual).
        return query select null::numeric, coalesce(v_n, 0);
    else
        return query select round(v_m, 1), v_n;
    end if;
end;
$$;

grant execute on function public.benchmark_nicho(text) to authenticated;
