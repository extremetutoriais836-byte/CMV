-- =====================================================================
--  Migração: flag de "onboarding dispensado" por restaurante.
--  O progresso em si é DERIVADO das tabelas (counts) — esta coluna só
--  guarda a escolha do usuário de dispensar o checklist manualmente.
--  Rode no SQL Editor do Supabase. Idempotente.
--
--  É uma coluna comum (não-billing): a RLS de restaurantes (id = auth.uid())
--  já permite o usuário atualizá-la; o trigger de assinatura não a bloqueia.
-- =====================================================================

alter table public.restaurantes
    add column if not exists onboarding_ok boolean not null default false;
