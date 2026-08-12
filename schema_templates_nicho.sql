-- =====================================================================
--  Tabela: templates_ficha — biblioteca CURADA de fichas por nicho.
--  Usada para pré-montar rascunhos de ficha ao conectar o cardápio do iFood
--  (mata o tempo de ativação "conta vazia -> primeiro CMV").
--  Dados curados à mão (v1). insumos = [{nome, unidade, quantidade}].
--  Rode no SQL Editor do Supabase. Idempotente.
--
--  RLS: templates são GLOBAIS (não pertencem a um restaurante) e somente-leitura
--  para usuários logados. Curadoria é feita por nós (service role / SQL).
-- =====================================================================

create table if not exists public.templates_ficha (
    id                uuid primary key default gen_random_uuid(),
    nicho             text not null,
    nome_prato_modelo text not null,
    insumos           jsonb not null default '[]'::jsonb,
    unique (nicho, nome_prato_modelo)
);

alter table public.templates_ficha enable row level security;

drop policy if exists "templates leitura publica" on public.templates_ficha;
create policy "templates leitura publica" on public.templates_ficha
    for select
    using (true);

-- ---------------------------------------------------------------------
-- Seed v1 — kits por nicho (quantidades curadas; preço é do cliente).
-- ---------------------------------------------------------------------
insert into public.templates_ficha (nicho, nome_prato_modelo, insumos) values
  ('hamburgueria', 'X-Burger', '[
     {"nome":"Pão de hambúrguer","unidade":"un","quantidade":1},
     {"nome":"Hambúrguer 150g","unidade":"g","quantidade":150},
     {"nome":"Queijo mussarela","unidade":"g","quantidade":20},
     {"nome":"Molho da casa","unidade":"ml","quantidade":20}
   ]'::jsonb),
  ('hamburgueria', 'X-Salada', '[
     {"nome":"Pão de hambúrguer","unidade":"un","quantidade":1},
     {"nome":"Hambúrguer 150g","unidade":"g","quantidade":150},
     {"nome":"Queijo mussarela","unidade":"g","quantidade":20},
     {"nome":"Alface","unidade":"g","quantidade":15},
     {"nome":"Tomate","unidade":"g","quantidade":25},
     {"nome":"Molho da casa","unidade":"ml","quantidade":20}
   ]'::jsonb),
  ('hamburgueria', 'X-Bacon', '[
     {"nome":"Pão de hambúrguer","unidade":"un","quantidade":1},
     {"nome":"Hambúrguer 150g","unidade":"g","quantidade":150},
     {"nome":"Queijo mussarela","unidade":"g","quantidade":20},
     {"nome":"Bacon","unidade":"g","quantidade":30},
     {"nome":"Molho da casa","unidade":"ml","quantidade":20}
   ]'::jsonb),
  ('acai', 'Açaí 300ml', '[
     {"nome":"Polpa de açaí","unidade":"g","quantidade":250},
     {"nome":"Copo 300ml","unidade":"un","quantidade":1},
     {"nome":"Granola","unidade":"g","quantidade":30},
     {"nome":"Banana","unidade":"g","quantidade":40}
   ]'::jsonb),
  ('acai', 'Açaí 500ml', '[
     {"nome":"Polpa de açaí","unidade":"g","quantidade":420},
     {"nome":"Copo 500ml","unidade":"un","quantidade":1},
     {"nome":"Granola","unidade":"g","quantidade":40},
     {"nome":"Banana","unidade":"g","quantidade":60},
     {"nome":"Leite condensado","unidade":"ml","quantidade":20}
   ]'::jsonb),
  ('pizzaria', 'Pizza Mussarela', '[
     {"nome":"Massa de pizza","unidade":"g","quantidade":250},
     {"nome":"Molho de tomate","unidade":"g","quantidade":80},
     {"nome":"Queijo mussarela","unidade":"g","quantidade":200},
     {"nome":"Orégano","unidade":"g","quantidade":2}
   ]'::jsonb),
  ('pizzaria', 'Pizza Calabresa', '[
     {"nome":"Massa de pizza","unidade":"g","quantidade":250},
     {"nome":"Molho de tomate","unidade":"g","quantidade":80},
     {"nome":"Queijo mussarela","unidade":"g","quantidade":150},
     {"nome":"Calabresa","unidade":"g","quantidade":100},
     {"nome":"Cebola","unidade":"g","quantidade":30}
   ]'::jsonb)
on conflict (nicho, nome_prato_modelo) do nothing;
