-- =====================================================================
--  Migração: modelo de entrega, taxa da plataforma, meta de lucro,
--  flag de revogação (admin) e e-mail do dono (para o painel admin).
--  Por restaurante. Rode no SQL Editor do Supabase. Idempotente.
--
--  Substitui o TAXA_IFOOD_PADRAO fixo: agora a taxa mora no restaurante.
--   - modelo_entrega = 'propria'    -> 15,5%
--   - modelo_entrega = 'plataforma' -> taxa_plataforma (padrão 30%)
-- =====================================================================

alter table public.restaurantes
  add column if not exists modelo_entrega  text    not null default 'plataforma',
  add column if not exists taxa_plataforma numeric not null default 30.0,
  add column if not exists meta_lucro      numeric not null default 4.00,
  add column if not exists bloqueado       boolean not null default false,
  add column if not exists email           text;

do $$
begin
  if not exists (
    select 1 from pg_constraint where conname = 'restaurantes_modelo_entrega_check'
  ) then
    alter table public.restaurantes
      add constraint restaurantes_modelo_entrega_check
      check (modelo_entrega in ('propria','plataforma'));
  end if;
end $$;

comment on column public.restaurantes.modelo_entrega  is 'propria = 15,5% | plataforma = taxa_plataforma';
comment on column public.restaurantes.taxa_plataforma is 'percentual editavel; padrao 30';
comment on column public.restaurantes.meta_lucro      is 'lucro liquido alvo por copo, em reais';
comment on column public.restaurantes.bloqueado       is 'revogacao manual pelo painel admin';
comment on column public.restaurantes.email           is 'e-mail do dono (copia de auth.users) p/ o painel admin';
