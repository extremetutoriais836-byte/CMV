-- =====================================================================
--  Migração: fecha a brecha de auto-desbloqueio.
--
--  O trigger `trg_protege_assinatura` (schema_assinaturas.sql) protegia
--  apenas plano/status_assinatura/trial_*. As colunas criadas em
--  schema_entrega.sql ficaram graváveis pelo próprio usuário via anon key:
--
--    - `bloqueado` -> o usuário revogado podia se desbloquear sozinho,
--      tornando a revogação do painel admin inútil.
--    - `email`     -> o usuário podia alterar o e-mail exibido no painel
--      admin (dado de identificação), divergindo de auth.users.
--
--  Aqui as duas entram na mesma proteção: só a SERVICE ROLE (auth.uid()
--  nulo) altera. O trigger é BEFORE UPDATE, então o INSERT do cadastro
--  continua gravando o e-mail normalmente.
--
--  Rode no SQL Editor do Supabase. Idempotente (CREATE OR REPLACE).
-- =====================================================================

create or replace function public.protege_colunas_assinatura()
returns trigger
language plpgsql
as $function$
begin
    if auth.uid() is not null then
        if new.plano             is distinct from old.plano
        or new.status_assinatura is distinct from old.status_assinatura
        or new.trial_inicio      is distinct from old.trial_inicio
        or new.trial_fim         is distinct from old.trial_fim then
            raise exception
                'Colunas de assinatura só podem ser alteradas pelo sistema de cobrança (service role).';
        end if;

        -- Revogação de acesso e identificação: só o painel admin (service role).
        if new.bloqueado is distinct from old.bloqueado then
            raise exception
                'A coluna bloqueado só pode ser alterada pelo painel administrativo (service role).';
        end if;

        if new.email is distinct from old.email then
            raise exception
                'A coluna email só pode ser alterada pelo painel administrativo (service role).';
        end if;
    end if;
    return new;
end;
$function$;
