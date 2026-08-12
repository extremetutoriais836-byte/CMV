-- =====================================================================
--  Tabela: config_app — configuração chave-valor do app (editável pelo
--  painel admin sem redeploy). Leitura pública (o app precisa ler o link
--  do vídeo e as faixas de CMV); escrita apenas via service role (admin).
--  Rode no SQL Editor do Supabase. Idempotente.
-- =====================================================================

create table if not exists public.config_app (
  chave      text primary key,
  valor      jsonb not null,
  atualizado timestamptz not null default now()
);

alter table public.config_app enable row level security;

drop policy if exists config_leitura_publica on public.config_app;
create policy config_leitura_publica on public.config_app
  for select using (true);
-- escrita: apenas service role (painel admin). Sem policy de insert/update/delete.

insert into public.config_app (chave, valor) values
  ('tutorial_videos', '{"boas_vindas":null,"passo_1":null,"passo_2":null,"passo_3":null,"passo_4":null}'::jsonb),
  ('faixas_cmv', '[
      {"tamanho":"300 ml","ideal":4.50,"teto":6.00},
      {"tamanho":"400 ml","ideal":6.30,"teto":7.60},
      {"tamanho":"500 ml","ideal":7.95,"teto":9.00},
      {"tamanho":"700 ml","ideal":11.30,"teto":13.00},
      {"tamanho":"1 litro","ideal":16.50,"teto":17.50}
    ]'::jsonb),
  ('taxas_entrega', '{"propria":15.5,"plataforma":30.0}'::jsonb),
  ('meta_lucro_padrao', '4.00'::jsonb)
on conflict (chave) do nothing;
