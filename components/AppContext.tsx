"use client";

import { createContext, useCallback, useContext, useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import type { User } from "@supabase/supabase-js";
import { supabase } from "@/lib/supabase";
import {
  ensureRestauranteDoUsuario,
  getRestaurante,
  type Restaurante,
} from "@/lib/restaurante";
import { getConfigApp, CONFIG_PADRAO, type ConfigApp } from "@/lib/config";

export interface Contadores {
  insumos: number;
  fichas: number;
  custos: number;
}

interface AppState {
  user: User | null;
  restaurante: Restaurante | null;
  config: ConfigApp;
  contadores: Contadores;
  carregando: boolean;
  tutorialAberto: boolean;
  setRestaurante: (r: Restaurante) => void;
  recarregarRestaurante: () => Promise<void>;
  recarregarContadores: () => Promise<void>;
  abrirTutorial: () => void;
  fecharTutorial: () => void;
}

const Ctx = createContext<AppState | null>(null);

export function useApp(): AppState {
  const ctx = useContext(Ctx);
  if (!ctx) throw new Error("useApp deve ser usado dentro de <AppProvider>");
  return ctx;
}

async function carregarContadores(restauranteId: string): Promise<Contadores> {
  const conta = async (tabela: string) => {
    const { count } = await supabase
      .from(tabela)
      .select("id", { count: "exact", head: true })
      .eq("restaurante_id", restauranteId);
    return count ?? 0;
  };
  const [insumos, fichas, custos] = await Promise.all([
    conta("insumos"),
    conta("fichas_tecnicas"),
    conta("custos_fixos"),
  ]);
  return { insumos, fichas, custos };
}

export function AppProvider({ children }: { children: React.ReactNode }) {
  const router = useRouter();
  const [user, setUser] = useState<User | null>(null);
  const [restaurante, setRestaurante] = useState<Restaurante | null>(null);
  const [config, setConfig] = useState<ConfigApp>(CONFIG_PADRAO);
  const [contadores, setContadores] = useState<Contadores>({ insumos: 0, fichas: 0, custos: 0 });
  const [carregando, setCarregando] = useState(true);
  const [tutorialAberto, setTutorialAberto] = useState(false);

  const recarregarContadores = useCallback(async () => {
    if (!restaurante) return;
    setContadores(await carregarContadores(restaurante.id));
  }, [restaurante]);

  const recarregarRestaurante = useCallback(async () => {
    if (!user) return;
    setRestaurante(await getRestaurante(user.id));
  }, [user]);

  useEffect(() => {
    let ativo = true;
    (async () => {
      const { data } = await supabase.auth.getUser();
      const u = data.user ?? null;
      if (!ativo) return;
      if (!u) {
        router.replace("/login");
        return;
      }
      setUser(u);
      const [r, cfg] = await Promise.all([
        ensureRestauranteDoUsuario(u),
        getConfigApp(supabase),
      ]);
      if (!ativo) return;
      setRestaurante(r);
      setConfig(cfg);
      setContadores(await carregarContadores(u.id));
      if (!r.onboarding_ok) setTutorialAberto(true);
      setCarregando(false);
    })();
    return () => {
      ativo = false;
    };
  }, [router]);

  const value: AppState = {
    user,
    restaurante,
    config,
    contadores,
    carregando,
    tutorialAberto,
    setRestaurante,
    recarregarRestaurante,
    recarregarContadores,
    abrirTutorial: () => setTutorialAberto(true),
    fecharTutorial: () => setTutorialAberto(false),
  };

  return <Ctx.Provider value={value}>{children}</Ctx.Provider>;
}
