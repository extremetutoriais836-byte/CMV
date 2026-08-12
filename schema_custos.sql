-- =====================================================================
--  Migração: faturamento estimado mensal do restaurante.
--  Necessário para a tela de Custos Fixos calcular o % do faturamento
--  que vai para gastos fixos (e alimentar o default da Ficha Técnica).
--
--  Rode no SQL Editor do Supabase. Idempotente.
--  A tabela custos_fixos já existe (schema.sql) e já tem RLS (schema_rls.sql).
-- =====================================================================

alter table public.restaurantes
    add column if not exists faturamento_estimado numeric(14, 2);
