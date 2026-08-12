-- =====================================================================
--  Migração: planos, trial e assinatura por restaurante + idempotência
--  de webhooks de cobrança.
--  Rode no SQL Editor do Supabase (depois das migrações anteriores).
--  Idempotente.
-- =====================================================================

-- ---------------------------------------------------------------------
-- 1) Colunas de assinatura em restaurantes (trial de 7 dias por padrão).
-- ---------------------------------------------------------------------
alter table public.restaurantes
    add column if not exists plano             text        not null default 'trial',
    add column if not exists status_assinatura text        not null default 'trial',
    add column if not exists trial_inicio      timestamptz not null default now(),
    add column if not exists trial_fim         timestamptz not null default (now() + interval '7 days');

-- ---------------------------------------------------------------------
-- 2) Proteção de colunas de billing.
--    DECISÃO: o RLS do Postgres é por-LINHA, não por-COLUNA. Para impedir
--    que o usuário (anon/authenticated) promova o próprio plano, usamos um
--    trigger BEFORE UPDATE que bloqueia mudanças nas colunas de assinatura
--    quando há um usuário autenticado (auth.uid() não-nulo).
--    O webhook usa a SERVICE ROLE, cujo auth.uid() é NULO -> passa direto.
--    A policy de UPDATE por-linha (id = auth.uid()) continua valendo p/ as
--    demais colunas (nome, faturamento_estimado, ifood_conectado, etc.).
-- ---------------------------------------------------------------------
create or replace function public.protege_colunas_assinatura()
returns trigger
language plpgsql
as $$
begin
    if auth.uid() is not null then
        if new.plano             is distinct from old.plano
        or new.status_assinatura is distinct from old.status_assinatura
        or new.trial_inicio      is distinct from old.trial_inicio
        or new.trial_fim         is distinct from old.trial_fim then
            raise exception
                'Colunas de assinatura só podem ser alteradas pelo sistema de cobrança (service role).';
        end if;
    end if;
    return new;
end;
$$;

drop trigger if exists trg_protege_assinatura on public.restaurantes;
create trigger trg_protege_assinatura
    before update on public.restaurantes
    for each row execute function public.protege_colunas_assinatura();

-- ---------------------------------------------------------------------
-- 3) Idempotência de webhooks: registra cada event_id já processado.
--    RLS ligada SEM policy -> nenhum usuário acessa; só a service role
--    (que bypassa RLS) consegue inserir/ler. Tabela de uso interno.
-- ---------------------------------------------------------------------
create table if not exists public.eventos_webhook (
    event_id  text        primary key,
    criado_em timestamptz not null default now()
);

alter table public.eventos_webhook enable row level security;
-- (intencional: sem policy de acesso para anon/authenticated)
