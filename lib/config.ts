import type { SupabaseClient } from "@supabase/supabase-js";
import type { FaixaCmv } from "./calculo";

/** Espelho tipado da tabela config_app (chave-valor). */

export interface TutorialVideos {
  boas_vindas: string | null;
  passo_1: string | null;
  passo_2: string | null;
  passo_3: string | null;
  passo_4: string | null;
}

export interface TaxasEntrega {
  propria: number;
  plataforma: number;
}

export interface ConfigApp {
  tutorialVideos: TutorialVideos;
  faixasCmv: FaixaCmv[];
  taxasEntrega: TaxasEntrega;
  metaLucroPadrao: number;
}

export const CONFIG_PADRAO: ConfigApp = {
  tutorialVideos: {
    boas_vindas: null,
    passo_1: null,
    passo_2: null,
    passo_3: null,
    passo_4: null,
  },
  faixasCmv: [
    { tamanho: "300 ml", ideal: 4.5, teto: 6.0 },
    { tamanho: "400 ml", ideal: 6.3, teto: 7.6 },
    { tamanho: "500 ml", ideal: 7.95, teto: 9.0 },
    { tamanho: "700 ml", ideal: 11.3, teto: 13.0 },
    { tamanho: "1 litro", ideal: 16.5, teto: 17.5 },
  ],
  taxasEntrega: { propria: 15.5, plataforma: 30.0 },
  metaLucroPadrao: 4.0,
};

/**
 * Lê todas as chaves de config_app e cai no padrão quando ausentes
 * (ex.: migração schema_config.sql ainda não rodada). Nunca quebra a tela.
 */
export async function getConfigApp(client: SupabaseClient): Promise<ConfigApp> {
  try {
    const { data, error } = await client.from("config_app").select("chave, valor");
    if (error || !data) return CONFIG_PADRAO;

    const map = new Map<string, unknown>();
    for (const row of data as { chave: string; valor: unknown }[]) {
      map.set(row.chave, row.valor);
    }

    return {
      tutorialVideos:
        (map.get("tutorial_videos") as TutorialVideos) ?? CONFIG_PADRAO.tutorialVideos,
      faixasCmv: (map.get("faixas_cmv") as FaixaCmv[]) ?? CONFIG_PADRAO.faixasCmv,
      taxasEntrega:
        (map.get("taxas_entrega") as TaxasEntrega) ?? CONFIG_PADRAO.taxasEntrega,
      metaLucroPadrao:
        parseNumeroJsonb(map.get("meta_lucro_padrao")) ?? CONFIG_PADRAO.metaLucroPadrao,
    };
  } catch {
    return CONFIG_PADRAO;
  }
}

function parseNumeroJsonb(v: unknown): number | null {
  if (typeof v === "number") return v;
  if (typeof v === "string") {
    const n = parseFloat(v);
    return Number.isNaN(n) ? null : n;
  }
  return null;
}
