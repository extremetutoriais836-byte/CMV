-- =====================================================================
--  Migração: status de conexão do iFood por restaurante.
--  Persiste o "Conectado/Desconectado" para sobreviver à navegação e ao F5.
--  Rode no SQL Editor do Supabase. Idempotente.
--
--  Mora em restaurantes (o "perfil" do dono) — a RLS dessa tabela
--  (id = auth.uid()) já protege a leitura/escrita.
-- =====================================================================

alter table public.restaurantes
    add column if not exists ifood_conectado boolean not null default false;
