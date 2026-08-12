"use client";

import { createBrowserClient } from "@supabase/ssr";

/**
 * Cliente Supabase do NAVEGADOR (sessão em cookies via @supabase/ssr).
 * Falha ALTO e CLARO se as chaves estiverem ausentes ou em placeholder —
 * não mascara com fallback silencioso.
 */
const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
const anon = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

function invalido(v: string | undefined): boolean {
  return !v || v.trim() === "" || v.includes("<") || v.includes("SEU_") || v === "...";
}

if (typeof window !== "undefined" && (invalido(url) || invalido(anon))) {
  console.error(
    "[Supabase] NEXT_PUBLIC_SUPABASE_URL / NEXT_PUBLIC_SUPABASE_ANON_KEY ausentes ou inválidas. " +
      "Configure o .env.local (ou as Environment Variables na Vercel)."
  );
  throw new Error("Configuração do Supabase ausente (chaves públicas).");
}

export const supabase = createBrowserClient(url ?? "", anon ?? "");
