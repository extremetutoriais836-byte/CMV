/**
 * Cálculo financeiro do copo — PURO (fonte única de verdade).
 * Fórmulas exatas do briefing (Apêndice B):
 *
 *   taxa          = modelo === 'propria' ? 15.5 : taxa_plataforma
 *   valor_liquido = preco_venda * (1 - taxa/100)
 *   lucro_real    = valor_liquido - CMV
 *   preco_minimo  = (CMV + meta_lucro) / (1 - taxa/100)
 *   margem_pct    = (lucro_real / preco_venda) * 100
 *
 * Conferência (CMV 4,50 / meta 4,00):
 *   própria 15,5% -> preço mínimo R$ 10,06
 *   app     30%   -> preço mínimo R$ 12,14
 */

export const TAXA_PROPRIA = 15.5;
export const TAXA_PLATAFORMA_PADRAO = 30.0;

export type ModeloEntrega = "propria" | "plataforma";

export function taxaEntrega(
  modelo: ModeloEntrega,
  taxaPlataforma: number = TAXA_PLATAFORMA_PADRAO,
  taxaPropria: number = TAXA_PROPRIA
): number {
  return modelo === "propria" ? taxaPropria : taxaPlataforma;
}

export interface ParamsLucro {
  cmv: number;
  precoVenda: number;
  modelo: ModeloEntrega;
  taxaPlataforma?: number;
  metaLucro?: number;
  taxaPropria?: number;
}

export interface ResultadoLucro {
  taxa: number;
  comissao: number;
  valorLiquido: number;
  lucroReal: number;
  precoMinimo: number;
  margemPct: number | null;
}

export function calcularLucro({
  cmv,
  precoVenda,
  modelo,
  taxaPlataforma = TAXA_PLATAFORMA_PADRAO,
  metaLucro = 4.0,
  taxaPropria = TAXA_PROPRIA,
}: ParamsLucro): ResultadoLucro {
  const taxa = taxaEntrega(modelo, taxaPlataforma, taxaPropria);
  const fator = 1 - taxa / 100;
  const valorLiquido = precoVenda * fator;
  const comissao = precoVenda - valorLiquido;
  const lucroReal = valorLiquido - cmv;
  const precoMinimo = fator > 0 ? (cmv + metaLucro) / fator : NaN;
  const margemPct = precoVenda > 0 ? (lucroReal / precoVenda) * 100 : null;
  return { taxa, comissao, valorLiquido, lucroReal, precoMinimo, margemPct };
}

export type FaixaStatus = "ideal" | "atencao" | "acima" | null;

export interface FaixaCmv {
  tamanho: string;
  ideal: number;
  teto: number;
}

/**
 * Classifica o CMV de um copo na faixa do seu tamanho.
 *   cmv <= ideal          -> "ideal"   (verde / lucro)
 *   ideal < cmv <= teto    -> "atencao" (âmbar)
 *   cmv > teto             -> "acima"   (vermelho / prejuízo)
 * Sem faixa correspondente -> null (neutro).
 */
export function faixaStatus(cmv: number, faixa: FaixaCmv | undefined | null): FaixaStatus {
  if (!faixa) return null;
  if (cmv <= faixa.ideal) return "ideal";
  if (cmv <= faixa.teto) return "atencao";
  return "acima";
}

/** Acha a faixa cujo "tamanho" aparece no nome do copo (ex.: "Copo 300 ml"). */
export function faixaDoCopo(nomeCopo: string, faixas: FaixaCmv[]): FaixaCmv | undefined {
  const nome = nomeCopo.toLowerCase();
  return faixas.find((f) => nome.includes(f.tamanho.toLowerCase()));
}
