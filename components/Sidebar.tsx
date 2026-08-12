"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { Check, LogOut, PlayCircle, ShieldCheck } from "lucide-react";
import { supabase } from "@/lib/supabase";
import { Logo } from "./Logo";
import { NAV_ITENS, type NavItem } from "./nav";
import { useApp } from "./AppContext";

function etapaConcluida(item: NavItem, c: { insumos: number; fichas: number; custos: number }) {
  if (item.requer === "insumos") return c.insumos > 0;
  if (item.requer === "fichas") return c.fichas > 0;
  if (item.requer === "custos") return c.custos > 0;
  return false;
}

export function Sidebar({
  onNavigate,
  mostrarAdmin = false,
}: {
  onNavigate?: () => void;
  mostrarAdmin?: boolean;
}) {
  const pathname = usePathname();
  const router = useRouter();
  const { contadores, abrirTutorial } = useApp();

  const feitas = NAV_ITENS.filter((i) => i.requer && etapaConcluida(i, contadores)).length;
  const totalComEtapa = NAV_ITENS.filter((i) => i.requer).length + 1; // +1 = "meu lucro"
  const progresso = Math.min(feitas + (feitas >= totalComEtapa - 1 ? 1 : 0), totalComEtapa);

  async function sair() {
    await supabase.auth.signOut();
    router.replace("/login");
  }

  return (
    <aside className="flex h-full w-72 flex-col border-r border-line bg-card">
      <div className="px-5 pt-6 pb-4">
        <Logo />
      </div>

      {/* progresso */}
      <div className="px-5 pb-4">
        <div className="flex items-center justify-between text-xs font-medium text-muted">
          <span>Seu progresso</span>
          <span>
            {progresso} de {totalComEtapa} etapas
          </span>
        </div>
        <div className="mt-2 h-1.5 w-full overflow-hidden rounded-full bg-line">
          <div
            className="h-full rounded-full bg-brand transition-all"
            style={{ width: `${(progresso / totalComEtapa) * 100}%` }}
          />
        </div>
      </div>

      <nav className="flex-1 space-y-1 px-3">
        {NAV_ITENS.map((item, idx) => {
          const ativo = pathname === item.href;
          const concluida = item.requer ? etapaConcluida(item, contadores) : false;
          const Icone = item.icon;
          return (
            <Link
              key={item.href}
              href={item.href}
              onClick={onNavigate}
              className={`group flex items-center gap-3 rounded-xl px-3 py-2.5 transition-colors ${
                ativo ? "bg-brand/10 text-brand-deep" : "text-ink hover:bg-line/50"
              }`}
            >
              <span
                className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-lg text-sm font-bold ${
                  ativo ? "bg-brand text-white" : "bg-line/70 text-muted group-hover:bg-line"
                }`}
              >
                {concluida ? <Check size={16} /> : idx + 1}
              </span>
              <span className="min-w-0 flex-1">
                <span className="flex items-center gap-1.5">
                  <Icone size={15} className={ativo ? "text-brand" : "text-muted"} />
                  <span className="truncate text-sm font-semibold">{item.label}</span>
                </span>
                <span className="block truncate text-xs text-muted">{item.descricao}</span>
              </span>
            </Link>
          );
        })}

        {mostrarAdmin && (
          <Link
            href="/admin"
            onClick={onNavigate}
            className={`group flex items-center gap-3 rounded-xl px-3 py-2.5 transition-colors ${
              pathname === "/admin" ? "bg-brand/10 text-brand-deep" : "text-ink hover:bg-line/50"
            }`}
          >
            <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-line/70 text-muted group-hover:bg-line">
              <ShieldCheck size={16} />
            </span>
            <span className="text-sm font-semibold">Painel administrativo</span>
          </Link>
        )}
      </nav>

      {/* rodapé: tutorial + logout + crédito Locus */}
      <div className="mt-auto space-y-2 border-t border-line px-3 py-4">
        <button
          onClick={() => {
            abrirTutorial();
            onNavigate?.();
          }}
          className="flex w-full items-center gap-2 rounded-lg px-3 py-2 text-sm font-medium text-brand hover:bg-brand/10"
        >
          <PlayCircle size={16} />
          Ver tutorial de novo
        </button>
        <button
          onClick={sair}
          className="flex w-full items-center gap-2 rounded-lg px-3 py-2 text-sm font-medium text-muted hover:bg-line/50"
        >
          <LogOut size={16} />
          Sair
        </button>
        <a
          href="https://locuscompany.com.br"
          target="_blank"
          rel="noopener noreferrer"
          className="block px-3 pt-2 text-[11px] leading-tight text-muted hover:text-brand"
        >
          Ferramenta desenvolvida pela{" "}
          <span className="font-semibold">Locus Company</span>
        </a>
      </div>
    </aside>
  );
}
