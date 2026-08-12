-- =====================================================================
--  Seed: kit de açaiteria em templates_ficha (5 copos do método do ebook).
--  ADAPTADO AO SCHEMA REAL de templates_ficha:
--     (nicho, nome_prato_modelo, insumos jsonb = [{nome, unidade, quantidade}])
--  — e NÃO à coluna "payload" citada no briefing (que não existe nesta tabela).
--
--  As gramaturas vêm do método validado (não alterar sem confirmar):
--    Copo    | Açaí (total) | Creme (40+40) | Leite cond. | Paçoca
--    300 ml  |    160 g     |     80 g       |    24 g      |  10 g
--    400 ml  |    300 g     |     80 g       |    30 g      |  15 g
--    500 ml  |    400 g     |     80 g       |    36 g      |  20 g
--    700 ml  |    500 g     |     80 g       |    40 g      |  20 g
--    1 litro |    800 g     |     80 g       |    56 g      |  30 g
--  O creme é sempre 40 g no meio + 40 g em cima, em TODOS os tamanhos —
--  não escala com o copo (é contraintuitivo; não "corrigir" por engano).
--
--  Rode no SQL Editor do Supabase. Idempotente.
-- =====================================================================

insert into public.templates_ficha (nicho, nome_prato_modelo, insumos) values
  ('acaiteria', 'Copo 300 ml', '[
     {"nome":"Polpa de açaí","unidade":"g","quantidade":160},
     {"nome":"Creme de avelã","unidade":"g","quantidade":80},
     {"nome":"Leite condensado","unidade":"g","quantidade":24},
     {"nome":"Paçoca","unidade":"g","quantidade":10},
     {"nome":"Copo + tampa + colher","unidade":"un","quantidade":1}
   ]'::jsonb),
  ('acaiteria', 'Copo 400 ml', '[
     {"nome":"Polpa de açaí","unidade":"g","quantidade":300},
     {"nome":"Creme de avelã","unidade":"g","quantidade":80},
     {"nome":"Leite condensado","unidade":"g","quantidade":30},
     {"nome":"Paçoca","unidade":"g","quantidade":15},
     {"nome":"Copo + tampa + colher","unidade":"un","quantidade":1}
   ]'::jsonb),
  ('acaiteria', 'Copo 500 ml', '[
     {"nome":"Polpa de açaí","unidade":"g","quantidade":400},
     {"nome":"Creme de avelã","unidade":"g","quantidade":80},
     {"nome":"Leite condensado","unidade":"g","quantidade":36},
     {"nome":"Paçoca","unidade":"g","quantidade":20},
     {"nome":"Copo + tampa + colher","unidade":"un","quantidade":1}
   ]'::jsonb),
  ('acaiteria', 'Copo 700 ml', '[
     {"nome":"Polpa de açaí","unidade":"g","quantidade":500},
     {"nome":"Creme de avelã","unidade":"g","quantidade":80},
     {"nome":"Leite condensado","unidade":"g","quantidade":40},
     {"nome":"Paçoca","unidade":"g","quantidade":20},
     {"nome":"Copo + tampa + colher","unidade":"un","quantidade":1}
   ]'::jsonb),
  ('acaiteria', 'Pote 1 litro', '[
     {"nome":"Polpa de açaí","unidade":"g","quantidade":800},
     {"nome":"Creme de avelã","unidade":"g","quantidade":80},
     {"nome":"Leite condensado","unidade":"g","quantidade":56},
     {"nome":"Paçoca","unidade":"g","quantidade":30},
     {"nome":"Copo + tampa + colher","unidade":"un","quantidade":1}
   ]'::jsonb)
on conflict (nicho, nome_prato_modelo) do nothing;
