import { createClient } from "@supabase/supabase-js";

/**
 * Cliente Supabase com SERVICE ROLE — bypassa RLS.
 * SERVER-ONLY. NUNCA importar em componente "use client".
 * Usado só em route handlers do painel admin (leitura de todos os
 * restaurantes e escrita em config_app).
 */
const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

export function getSupabaseAdmin() {
  if (!url || !serviceKey || serviceKey.includes("<") || serviceKey.length < 100) {
    throw new Error(
      "SUPABASE_SERVICE_ROLE_KEY ausente ou inválida (deve ser um JWT longo, começa com 'eyJ')."
    );
  }
  return createClient(url, serviceKey, {
    auth: { autoRefreshToken: false, persistSession: false },
  });
}
