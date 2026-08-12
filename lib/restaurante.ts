"use client";

import type { User } from "@supabase/supabase-js";
import { supabase } from "./supabase";
import { seedFichasAcai } from "./seedAcai";
import { TAXA_PLATAFORMA_PADRAO, type ModeloEntrega } from "./calculo";

export interface Restaurante {
  id: string;
  nome: string;
  email: string | null;
  faturamento_estimado: number | null;
  onboarding_ok: boolean;
  modelo_entrega: ModeloEntrega;
  taxa_plataforma: number;
  meta_lucro: number;
  bloqueado: boolean;
}

/** Usuário logado (ou null). Usar no mount das telas do painel. */
export async function getUsuarioAtual(): Promise<User | null> {
  const { data } = await supabase.auth.getUser();
  return data.user ?? null;
}

/**
 * Garante o registro em `restaurantes` (FK restaurante_id depende dele) e,
 * na PRIMEIRA vez, semeia as 5 fichas de açaí. Idempotente.
 * Retorna o restaurante já normalizado.
 */
export async function ensureRestauranteDoUsuario(user: User): Promise<Restaurante> {
  const nome =
    (user.user_metadata?.nome as string | undefined)?.trim() ||
    user.email?.split("@")[0] ||
    "Minha açaiteria";

  // Cria se não existir (id = auth.uid()). ignoreDuplicates evita corrida.
  await supabase
    .from("restaurantes")
    .upsert(
      { id: user.id, nome, email: user.email ?? null },
      { onConflict: "id", ignoreDuplicates: true }
    );

  // Semeia o kit de açaí na primeira vez.
  try {
    await seedFichasAcai(supabase, user.id);
  } catch (e) {
    // Não bloqueia o acesso se o seed falhar — só loga.
    console.error("[seed açaí] falhou:", e);
  }

  return getRestaurante(user.id);
}

/** Lê o restaurante já com defaults aplicados. */
export async function getRestaurante(id: string): Promise<Restaurante> {
  const { data } = await supabase
    .from("restaurantes")
    .select(
      "id, nome, email, faturamento_estimado, onboarding_ok, modelo_entrega, taxa_plataforma, meta_lucro, bloqueado"
    )
    .eq("id", id)
    .single();

  const r = (data ?? {}) as Partial<Restaurante>;
  return {
    id,
    nome: r.nome ?? "Minha açaiteria",
    email: r.email ?? null,
    faturamento_estimado: r.faturamento_estimado ?? null,
    onboarding_ok: r.onboarding_ok ?? false,
    modelo_entrega: (r.modelo_entrega as ModeloEntrega) ?? "plataforma",
    taxa_plataforma: r.taxa_plataforma ?? TAXA_PLATAFORMA_PADRAO,
    meta_lucro: r.meta_lucro ?? 4.0,
    bloqueado: r.bloqueado ?? false,
  };
}

export async function marcarOnboardingOk(id: string): Promise<void> {
  await supabase.from("restaurantes").update({ onboarding_ok: true }).eq("id", id);
}
