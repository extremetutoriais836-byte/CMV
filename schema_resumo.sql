-- =====================================================================
--  RPCs de agregação do dashboard Pro — agregam NO BANCO (não no cliente),
--  corrigindo o gargalo apontado na auditoria. SECURITY INVOKER: a RLS de
--  pedidos_simulados (restaurante_id = auth.uid()) continua valendo.
--  Rode no SQL Editor do Supabase. Idempotente.
--
--  FONTE: pedidos_simulados (funciona hoje). Quando os pedidos REAIS
--  (pedidos_ifood) estiverem fluindo, trocar a tabela nas duas funções —
--  pedidos_ifood tem incentivo_loja/cancelado para preencher o que aqui é 0.
-- =====================================================================

-- Resumo de vendas por período: 'hoje' | 'ontem' | 'mes' | 'mes_anterior'.
create or replace function public.resumo_vendas(
    p_restaurante_id uuid,
    p_periodo text
)
returns table (
    faturamento    numeric,
    lucro          numeric,
    cmv            numeric,
    taxa_ifood     numeric,
    custo_fixo     numeric,
    incentivo_loja numeric,
    cancelamento   numeric,
    n_pedidos      bigint,
    n_cancelados   bigint,
    ticket_medio   numeric,
    cmv_pct        numeric,
    margem_pct     numeric
)
language sql
stable
as $$
    with rng as (
        select
            case p_periodo
                when 'hoje'          then date_trunc('day', now())
                when 'ontem'         then date_trunc('day', now()) - interval '1 day'
                when 'mes'           then date_trunc('month', now())
                when 'mes_anterior'  then date_trunc('month', now()) - interval '1 month'
                else date_trunc('day', now())
            end as ini,
            case p_periodo
                when 'hoje'          then now()
                when 'ontem'         then date_trunc('day', now())
                when 'mes'           then now()
                when 'mes_anterior'  then date_trunc('month', now())
                else now()
            end as fim
    )
    select
        coalesce(sum(p.valor_venda), 0)::numeric,
        coalesce(sum(p.lucro_liquido), 0)::numeric,
        coalesce(sum(p.custo_ingredientes), 0)::numeric,
        coalesce(sum(p.taxa_ifood_paga), 0)::numeric,
        coalesce(sum(p.custo_fixo_pago), 0)::numeric,
        0::numeric,  -- incentivo_loja: pedidos_simulados não tem (vem do pedidos_ifood)
        0::numeric,  -- cancelamento
        count(*)::bigint,
        0::bigint,   -- n_cancelados
        (coalesce(sum(p.valor_venda), 0) / nullif(count(*), 0))::numeric,
        (100 * coalesce(sum(p.custo_ingredientes), 0) / nullif(sum(p.valor_venda), 0))::numeric,
        (100 * coalesce(sum(p.lucro_liquido), 0) / nullif(sum(p.valor_venda), 0))::numeric
    from public.pedidos_simulados p, rng
    where p.restaurante_id = p_restaurante_id
      and p.criado_em >= rng.ini
      and p.criado_em <  rng.fim;
$$;

-- Vendas + margem por prato (para o quadrante de engenharia de cardápio).
create or replace function public.vendas_por_prato(p_restaurante_id uuid)
returns table (
    nome       text,
    qtd        bigint,
    lucro      numeric,
    margem_pct numeric
)
language sql
stable
as $$
    select
        p.nome_produto,
        count(*)::bigint,
        coalesce(sum(p.lucro_liquido), 0)::numeric,
        (100 * coalesce(sum(p.lucro_liquido), 0) / nullif(sum(p.valor_venda), 0))::numeric
    from public.pedidos_simulados p
    where p.restaurante_id = p_restaurante_id
    group by p.nome_produto;
$$;
