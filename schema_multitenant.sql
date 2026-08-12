-- =====================================================================
--  MULTI-TENANT — organizacao (1) -> lojas (N) -> membros (papel).
--  Fundação ADITIVA e BACKWARD-COMPATIBLE: a RLS nova libera se
--  restaurante_id = auth.uid() (LEGADO, mantém toda conta atual funcionando)
--  OU via membros (destrava multi-loja). Nenhuma conta existente quebra.
--  Rode no SQL Editor do Supabase. IDEMPOTENTE.
--
--  ⚠️ Decisão irreversível de modelo de dados — revisada com cuidado.
--  restaurantes CONTINUA sendo a "loja" (não renomeamos ids); ganha organizacao_id.
-- =====================================================================

-- 1) Enum de papéis -------------------------------------------------
do $$ begin
    create type public.papel_loja as enum ('dono', 'gerente', 'operador');
exception when duplicate_object then null; end $$;

-- 2) Organização ----------------------------------------------------
create table if not exists public.organizacao (
    id        uuid primary key default gen_random_uuid(),
    nome      text not null,
    criado_em timestamptz not null default now()
);

-- 3) Membros (usuário pertence a uma org com um papel) --------------
create table if not exists public.membros (
    id             uuid primary key default gen_random_uuid(),
    organizacao_id uuid not null references public.organizacao (id) on delete cascade,
    user_id        uuid not null, -- auth.users.id
    papel          public.papel_loja not null default 'dono',
    criado_em      timestamptz not null default now(),
    unique (organizacao_id, user_id)
);
create index if not exists idx_membros_user on public.membros (user_id);
create index if not exists idx_membros_org  on public.membros (organizacao_id);

-- 4) Loja pertence a uma organização --------------------------------
alter table public.restaurantes
    add column if not exists organizacao_id uuid references public.organizacao (id) on delete cascade;

-- 5) BACKFILL idempotente: cada loja sem org -> 1 org + 1 membro dono.
--    No modelo legado restaurantes.id = auth.uid(), então o dono é r.id.
do $$
declare r record; v_org uuid;
begin
    for r in select id, nome from public.restaurantes where organizacao_id is null loop
        insert into public.organizacao (nome) values (coalesce(r.nome, 'Minha Organização'))
            returning id into v_org;
        update public.restaurantes set organizacao_id = v_org where id = r.id;
        insert into public.membros (organizacao_id, user_id, papel)
            values (v_org, r.id, 'dono')
            on conflict (organizacao_id, user_id) do nothing;
    end loop;
end $$;

-- 6) Helper de acesso (SECURITY DEFINER -> bypassa RLS, evita recursão).
--    Papéis: dono > gerente > operador. p_papel_min = nível mínimo exigido.
create or replace function public.tem_acesso_loja(
    p_loja_id   uuid,
    p_papel_min public.papel_loja default 'operador'
)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
    select exists (
        select 1
        from public.restaurantes r
        join public.membros m on m.organizacao_id = r.organizacao_id
        where r.id = p_loja_id
          and m.user_id = auth.uid()
          and case p_papel_min
                when 'operador' then true
                when 'gerente'  then m.papel in ('dono', 'gerente')
                when 'dono'     then m.papel = 'dono'
              end
    );
$$;

-- 7) RLS das tabelas novas -----------------------------------------
alter table public.organizacao enable row level security;
drop policy if exists "org dos meus membros" on public.organizacao;
create policy "org dos meus membros" on public.organizacao
    for select using (
        exists (select 1 from public.membros m where m.organizacao_id = organizacao.id and m.user_id = auth.uid())
    );

alter table public.membros enable row level security;
drop policy if exists "minhas associacoes" on public.membros;
create policy "minhas associacoes" on public.membros
    for select using (user_id = auth.uid());
-- (insert/update de membros = convites, via service role na próxima fatia)

-- 8) RLS BACKWARD-COMPATIBLE nas tabelas de dados ------------------
--    Em cada uma: legado (próprio dono) OU acesso via membros.
drop policy if exists "restaurante proprio" on public.restaurantes;
create policy "restaurante proprio" on public.restaurantes
    for all
    using (id = auth.uid() or public.tem_acesso_loja(id, 'operador'))
    with check (id = auth.uid() or public.tem_acesso_loja(id, 'gerente'));

drop policy if exists "custos do meu restaurante" on public.custos_fixos;
create policy "custos do meu restaurante" on public.custos_fixos
    for all
    using (restaurante_id = auth.uid() or public.tem_acesso_loja(restaurante_id, 'operador'))
    with check (restaurante_id = auth.uid() or public.tem_acesso_loja(restaurante_id, 'gerente'));

drop policy if exists "insumos do meu restaurante" on public.insumos;
create policy "insumos do meu restaurante" on public.insumos
    for all
    using (restaurante_id = auth.uid() or public.tem_acesso_loja(restaurante_id, 'operador'))
    with check (restaurante_id = auth.uid() or public.tem_acesso_loja(restaurante_id, 'gerente'));

drop policy if exists "fichas do meu restaurante" on public.fichas_tecnicas;
create policy "fichas do meu restaurante" on public.fichas_tecnicas
    for all
    using (restaurante_id = auth.uid() or public.tem_acesso_loja(restaurante_id, 'operador'))
    with check (restaurante_id = auth.uid() or public.tem_acesso_loja(restaurante_id, 'gerente'));

drop policy if exists "ingredientes via ficha do usuario" on public.ingredientes_ficha;
create policy "ingredientes via ficha do usuario" on public.ingredientes_ficha
    for all
    using (
        exists (select 1 from public.fichas_tecnicas f
                where f.id = ingredientes_ficha.ficha_tecnica_id
                  and (f.restaurante_id = auth.uid() or public.tem_acesso_loja(f.restaurante_id, 'operador')))
    )
    with check (
        exists (select 1 from public.fichas_tecnicas f
                where f.id = ingredientes_ficha.ficha_tecnica_id
                  and (f.restaurante_id = auth.uid() or public.tem_acesso_loja(f.restaurante_id, 'gerente')))
    );

-- Tabelas de migrações posteriores: aplicadas só se já existirem (defensivo).
-- (Se você rodar a migração que cria a tabela DEPOIS, re-rode este arquivo para
--  ela ganhar o caminho de membros — a tabela nasce só com a policy legada.)
do $$ begin
    if to_regclass('public.mapeamentos_ifood') is not null then
        execute 'drop policy if exists "mapeamentos do meu restaurante" on public.mapeamentos_ifood';
        execute $p$
            create policy "mapeamentos do meu restaurante" on public.mapeamentos_ifood
                for all
                using (restaurante_id = auth.uid() or public.tem_acesso_loja(restaurante_id, 'operador'))
                with check (restaurante_id = auth.uid() or public.tem_acesso_loja(restaurante_id, 'gerente'))
        $p$;
    end if;

    if to_regclass('public.pedidos_simulados') is not null then
        execute 'drop policy if exists "pedidos do meu restaurante" on public.pedidos_simulados';
        execute $p$
            create policy "pedidos do meu restaurante" on public.pedidos_simulados
                for all
                using (restaurante_id = auth.uid() or public.tem_acesso_loja(restaurante_id, 'operador'))
                with check (restaurante_id = auth.uid() or public.tem_acesso_loja(restaurante_id, 'gerente'))
        $p$;
    end if;

    if to_regclass('public.pedidos_ifood') is not null then
        execute 'drop policy if exists "pedidos_ifood do meu restaurante" on public.pedidos_ifood';
        execute $p$
            create policy "pedidos_ifood do meu restaurante" on public.pedidos_ifood
                for all
                using (restaurante_id = auth.uid() or public.tem_acesso_loja(restaurante_id, 'operador'))
                with check (restaurante_id = auth.uid() or public.tem_acesso_loja(restaurante_id, 'gerente'))
        $p$;
    end if;
end $$;

-- =====================================================================
--  PRÓXIMA FATIA (refactor de app, testável): seletor de loja propagado,
--  gating por papel em cada ação, convites por magic link, criação de 2ª loja
--  via RPC. A RLS acima já suporta tudo isso quando o app passar a usar a
--  loja selecionada (em vez de auth.uid()) como restaurante_id.
-- =====================================================================
