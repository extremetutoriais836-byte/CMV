import type { LucideIcon } from "lucide-react";
import { ShoppingBasket, CupSoda, Receipt, TrendingUp } from "lucide-react";

/**
 * As QUATRO etapas do app, NESTA ORDEM. É uma sequência, não um menu.
 * Rótulos na linguagem do dono de açaiteria (briefing §7).
 * `etapa` liga o item ao contador de progresso.
 */
export interface NavItem {
  href: string;
  label: string;
  descricao: string;
  icon: LucideIcon;
  etapa: 1 | 2 | 3 | 4;
  /** chave do contador que precisa ser > 0 p/ a etapa contar como feita */
  requer: "insumos" | "fichas" | "custos" | null;
}

export const NAV_ITENS: NavItem[] = [
  {
    href: "/insumos",
    label: "Meus ingredientes",
    descricao: "O que você compra",
    icon: ShoppingBasket,
    etapa: 1,
    requer: "insumos",
  },
  {
    href: "/fichas",
    label: "Meus copos",
    descricao: "A ficha de cada tamanho",
    icon: CupSoda,
    etapa: 2,
    requer: "fichas",
  },
  {
    href: "/custos-fixos",
    label: "Custos fixos",
    descricao: "Aluguel, energia, entrega",
    icon: Receipt,
    etapa: 3,
    requer: "custos",
  },
  {
    href: "/dashboard",
    label: "Meu lucro",
    descricao: "Quanto sobra em cada copo",
    icon: TrendingUp,
    etapa: 4,
    requer: null,
  },
];
