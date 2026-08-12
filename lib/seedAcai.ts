import type { SupabaseClient } from "@supabase/supabase-js";
import { conversao } from "./format";

/**
 * Kit de açaiteria — pré-monta os 5 copos do método do ebook na conta do
 * usuário (insumos + fichas + ingredientes). É o item mais importante do
 * briefing: o app abre com as fichas prontas, o dono só troca os preços.
 *
 * Gramaturas do método validado (NÃO alterar sem confirmar). Creme sempre
 * 40 g + 40 g = 80 g em TODOS os tamanhos (não escala com o copo).
 * Preços dos insumos são de EXEMPLO — trocar pelos da última compra.
 */

interface InsumoSeed {
  nome: string;
  como_compra: string;
  preco_pago: number;
  quantidade_embalagem: number;
  unidade_medida: string;
}

interface ItemSeed {
  insumo: string;
  /** Quantidade como o usuário DIGITA (g / ml / un). Convertida ao gravar. */
  digitado: number;
}

interface FichaSeed {
  nome_prato: string;
  preco_venda: number;
  itens: ItemSeed[];
}

export const INSUMOS_ACAI: InsumoSeed[] = [
  { nome: "Polpa de açaí", como_compra: "pacote 1 kg", preco_pago: 20.0, quantidade_embalagem: 1, unidade_medida: "kg" },
  { nome: "Creme de avelã", como_compra: "pote 1 kg", preco_pago: 20.0, quantidade_embalagem: 1, unidade_medida: "kg" },
  { nome: "Leite condensado", como_compra: "caixa 1 kg", preco_pago: 12.5, quantidade_embalagem: 1, unidade_medida: "kg" },
  { nome: "Paçoca", como_compra: "pacote 1 kg", preco_pago: 18.0, quantidade_embalagem: 1, unidade_medida: "kg" },
  { nome: "Copo + tampa + colher", como_compra: "pacote 100 un", preco_pago: 40.0, quantidade_embalagem: 100, unidade_medida: "un" },
];

export const FICHAS_ACAI: FichaSeed[] = [
  {
    nome_prato: "Copo 300 ml",
    preco_venda: 12.0,
    itens: [
      { insumo: "Polpa de açaí", digitado: 160 },
      { insumo: "Creme de avelã", digitado: 80 },
      { insumo: "Leite condensado", digitado: 24 },
      { insumo: "Paçoca", digitado: 10 },
      { insumo: "Copo + tampa + colher", digitado: 1 },
    ],
  },
  {
    nome_prato: "Copo 400 ml",
    preco_venda: 15.0,
    itens: [
      { insumo: "Polpa de açaí", digitado: 300 },
      { insumo: "Creme de avelã", digitado: 80 },
      { insumo: "Leite condensado", digitado: 30 },
      { insumo: "Paçoca", digitado: 15 },
      { insumo: "Copo + tampa + colher", digitado: 1 },
    ],
  },
  {
    nome_prato: "Copo 500 ml",
    preco_venda: 18.0,
    itens: [
      { insumo: "Polpa de açaí", digitado: 400 },
      { insumo: "Creme de avelã", digitado: 80 },
      { insumo: "Leite condensado", digitado: 36 },
      { insumo: "Paçoca", digitado: 20 },
      { insumo: "Copo + tampa + colher", digitado: 1 },
    ],
  },
  {
    nome_prato: "Copo 700 ml",
    preco_venda: 22.0,
    itens: [
      { insumo: "Polpa de açaí", digitado: 500 },
      { insumo: "Creme de avelã", digitado: 80 },
      { insumo: "Leite condensado", digitado: 40 },
      { insumo: "Paçoca", digitado: 20 },
      { insumo: "Copo + tampa + colher", digitado: 1 },
    ],
  },
  {
    nome_prato: "Pote 1 litro",
    preco_venda: 30.0,
    itens: [
      { insumo: "Polpa de açaí", digitado: 800 },
      { insumo: "Creme de avelã", digitado: 80 },
      { insumo: "Leite condensado", digitado: 56 },
      { insumo: "Paçoca", digitado: 30 },
      { insumo: "Copo + tampa + colher", digitado: 1 },
    ],
  },
];

/**
 * Semeia o kit na conta do usuário. Idempotente: se já existir QUALQUER
 * ficha, não faz nada (evita duplicar em re-login). Roda sob a sessão do
 * usuário (RLS: restaurante_id = auth.uid()).
 */
export async function seedFichasAcai(
  supabase: SupabaseClient,
  restauranteId: string
): Promise<{ seeded: boolean }> {
  // Já tem ficha? Não semear de novo.
  const { count } = await supabase
    .from("fichas_tecnicas")
    .select("id", { count: "exact", head: true })
    .eq("restaurante_id", restauranteId);
  if ((count ?? 0) > 0) return { seeded: false };

  // 1) Garante os insumos base (reaproveita os que já existirem por nome).
  const nomeParaId = new Map<string, string>();
  const { data: existentes } = await supabase
    .from("insumos")
    .select("id, nome")
    .eq("restaurante_id", restauranteId);
  for (const row of (existentes ?? []) as { id: string; nome: string }[]) {
    nomeParaId.set(row.nome, row.id);
  }

  const faltantes = INSUMOS_ACAI.filter((i) => !nomeParaId.has(i.nome));
  if (faltantes.length > 0) {
    const { data: inseridos, error } = await supabase
      .from("insumos")
      .insert(
        faltantes.map((i) => ({
          restaurante_id: restauranteId,
          nome: i.nome,
          como_compra: i.como_compra,
          preco_pago: i.preco_pago,
          quantidade_embalagem: i.quantidade_embalagem,
          unidade_medida: i.unidade_medida,
        }))
      )
      .select("id, nome");
    if (error) throw error;
    for (const row of (inseridos ?? []) as { id: string; nome: string }[]) {
      nomeParaId.set(row.nome, row.id);
    }
  }

  const unidadePorNome = new Map(INSUMOS_ACAI.map((i) => [i.nome, i.unidade_medida]));

  // 2) Cria as fichas e seus ingredientes.
  for (const ficha of FICHAS_ACAI) {
    const { data: fInseridas, error: fErr } = await supabase
      .from("fichas_tecnicas")
      .insert({
        restaurante_id: restauranteId,
        nome_prato: ficha.nome_prato,
        preco_venda: ficha.preco_venda,
      })
      .select("id")
      .single();
    if (fErr) throw fErr;
    const fichaId = (fInseridas as { id: string }).id;

    const linhas = ficha.itens.map((item) => {
      const unidade = unidadePorNome.get(item.insumo) ?? "un";
      return {
        ficha_tecnica_id: fichaId,
        insumo_id: nomeParaId.get(item.insumo)!,
        quantidade_utilizada: conversao(item.digitado, unidade),
      };
    });
    const { error: iErr } = await supabase.from("ingredientes_ficha").insert(linhas);
    if (iErr) throw iErr;
  }

  return { seeded: true };
}
