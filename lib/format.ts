/** Formatação e conversões — puro, sem dependências. */

const brlFmt = new Intl.NumberFormat("pt-BR", {
  style: "currency",
  currency: "BRL",
});

/** R$ 1.234,56 */
export function brl(n: number | null | undefined): string {
  if (n === null || n === undefined || Number.isNaN(n)) return "—";
  return brlFmt.format(n);
}

/** Número pt-BR com casas fixas. */
export function num(n: number | null | undefined, casas = 2): string {
  if (n === null || n === undefined || Number.isNaN(n)) return "—";
  return n.toLocaleString("pt-BR", {
    minimumFractionDigits: casas,
    maximumFractionDigits: casas,
  });
}

/** 12,5 % */
export function pct(n: number | null | undefined, casas = 1): string {
  if (n === null || n === undefined || Number.isNaN(n)) return "—";
  return `${num(n, casas)}%`;
}

/**
 * Aceita decimal no formato brasileiro ("1.234,56", "12,5") e também "12.5".
 * Retorna NaN se não parsear.
 */
export function parseDecimalBR(input: string | number | null | undefined): number {
  if (typeof input === "number") return input;
  if (!input) return NaN;
  const s = String(input).trim();
  if (s === "") return NaN;
  // Se tem vírgula, assume vírgula = decimal e ponto = milhar.
  if (s.includes(",")) {
    return parseFloat(s.replace(/\./g, "").replace(",", "."));
  }
  return parseFloat(s);
}

/** Unidades cujo insumo é comprado "grande" mas usado "pequeno" (÷1000). */
export function unidadeEscalavel(unidade: string): boolean {
  const u = unidade.trim().toLowerCase();
  return u === "kg" || u === "l";
}

/** Como o usuário DIGITA a quantidade na ficha, dado a unidade do insumo. */
export function unidadeDigitacao(unidade: string): string {
  const u = unidade.trim().toLowerCase();
  if (u === "kg") return "g";
  if (u === "l") return "ml";
  return unidade;
}

/**
 * Converte a quantidade DIGITADA pelo usuário para a quantidade a ARMAZENAR
 * na unidade original do insumo (p/ a view vw_cmv_ficha continuar correta).
 *   insumo em kg  -> usuário digita g   -> armazena / 1000 (150 g -> 0,15 kg)
 *   insumo em L   -> usuário digita ml  -> armazena / 1000
 *   insumo em un/g/ml -> armazena igual
 */
export function conversao(quantidadeDigitada: number, unidadeInsumo: string): number {
  return unidadeEscalavel(unidadeInsumo)
    ? quantidadeDigitada / 1000
    : quantidadeDigitada;
}

/** Inverso de conversao(): valor armazenado -> valor para exibir no input. */
export function paraDigitacao(quantidadeArmazenada: number, unidadeInsumo: string): number {
  return unidadeEscalavel(unidadeInsumo)
    ? quantidadeArmazenada * 1000
    : quantidadeArmazenada;
}
