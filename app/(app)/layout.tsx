"use client";

import { useEffect, useState } from "react";
import { Menu, X } from "lucide-react";
import { AppProvider, useApp } from "@/components/AppContext";
import { Sidebar } from "@/components/Sidebar";
import { OnboardingModal } from "@/components/OnboardingModal";
import { Logo } from "@/components/Logo";

function Shell({ children }: { children: React.ReactNode }) {
  const { carregando, restaurante } = useApp();
  const [drawer, setDrawer] = useState(false);
  const [admin, setAdmin] = useState(false);

  useEffect(() => {
    fetch("/api/admin?probe=1")
      .then((r) => (r.ok ? r.json() : { admin: false }))
      .then((d) => setAdmin(Boolean(d?.admin)))
      .catch(() => setAdmin(false));
  }, []);

  return (
    <div className="flex min-h-screen bg-surface">
      {/* Sidebar desktop */}
      <div className="hidden md:block">
        <div className="sticky top-0 h-screen">
          <Sidebar mostrarAdmin={admin} />
        </div>
      </div>

      {/* Drawer mobile */}
      {drawer && (
        <div className="fixed inset-0 z-40 md:hidden">
          <div className="absolute inset-0 bg-black/40" onClick={() => setDrawer(false)} />
          <div className="absolute left-0 top-0 h-full">
            <Sidebar mostrarAdmin={admin} onNavigate={() => setDrawer(false)} />
          </div>
        </div>
      )}

      <div className="flex min-w-0 flex-1 flex-col">
        {/* Topbar mobile */}
        <header className="flex items-center justify-between border-b border-line bg-card px-4 py-3 md:hidden">
          <Logo size={30} />
          <button
            onClick={() => setDrawer((d) => !d)}
            aria-label="Menu"
            className="rounded-lg p-2 text-ink hover:bg-line/60"
          >
            {drawer ? <X size={20} /> : <Menu size={20} />}
          </button>
        </header>

        <main className="mx-auto w-full max-w-5xl flex-1 px-4 py-6 md:px-8 md:py-10">
          {carregando ? (
            <div className="flex h-64 items-center justify-center text-muted">
              Carregando…
            </div>
          ) : restaurante?.bloqueado ? (
            <div className="mx-auto mt-10 max-w-md rounded-2xl border border-line bg-card p-8 text-center">
              <h2 className="text-lg font-bold text-brand-deep">Acesso suspenso</h2>
              <p className="mt-2 text-sm text-muted">
                Seu acesso a esta ferramenta foi suspenso. Se acha que é engano, fale com quem
                te entregou o material.
              </p>
            </div>
          ) : (
            children
          )}
        </main>
      </div>

      <OnboardingModal />
    </div>
  );
}

export default function AppLayout({ children }: { children: React.ReactNode }) {
  return (
    <AppProvider>
      <Shell>{children}</Shell>
    </AppProvider>
  );
}
