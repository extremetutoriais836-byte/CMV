-- =====================================================================
--  Tabela: cs_loja — roteamento "qual dono + qual CS recebem cada loja".
--  Usada pelo endpoint /api/relatorio-diario (service role) para devolver os
--  telefones de destino ao n8n, que repassa ao Z-API.
--  Rode no SQL Editor do Supabase. Idempotente.
--
--  RLS: uso INTERNO via service role (que bypassa RLS). Habilitamos a RLS
--  SEM policy para anon/authenticated -> nenhum usuário lê/escreve direto;
--  só o backend de confiança (service role). cliente_telefone = WhatsApp do
--  DONO; cs_telefone = WhatsApp do CS responsável.
-- =====================================================================

create table if not exists public.cs_loja (
    id                uuid        primary key default gen_random_uuid(),
    restaurante_id    uuid        not null unique
                        references public.restaurantes (id) on delete cascade,
    cs_telefone       text,  -- WhatsApp do CS (customer success) responsável
    cliente_telefone  text,  -- WhatsApp do DONO da loja
    criado_em         timestamptz not null default now()
);

alter table public.cs_loja enable row level security;
-- (intencional: sem policy para anon/authenticated — acesso só via service role)
