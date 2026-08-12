"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { ShieldCheck, Search, Ban, RotateCcw } from "lucide-react";
import { Logo } from "@/components/Logo";
import { Card, Rotulo, Input, Botao, Vazio } from "@/components/ui";
import type { TutorialVideos, TaxasEntrega } from "@/lib/config";

interface RestauranteAdmin {
  id: string;
  nome: string;
  email: string | null;
  onboarding_ok: boolean;
  bloqueado: boolean;
  created_at: string;
  fichas: number;
}
interface Contadores {
  total: number;
  ultimos7: number;
  comFicha: number;
  concluiramTutorial: number;
}

export default function AdminPage() {
  const [carregando, setCarregando] = useState(true);
  const [negado, setNegado] = useState(false);
  const [restaurantes, setRestaurantes] = useState<RestauranteAdmin[]>([]);
  const [contadores, setContadores] = useState<Contadores | null>(null);
  const [busca, setBusca] = useState("");

  const [videos, setVideos] = useState<TutorialVideos>({
    boas_vindas: "",
    passo_1: "",
    passo_2: "",
    passo_3: "",
    passo_4: "",
  });
  const [meta, setMeta] = useState("4.00");
  const [taxas, setTaxas] = useState<TaxasEntrega>({ propria: 15.5, plataforma: 30 });
  const [msg, setMsg] = useState<string | null>(null);

  async function carregar() {
    const res = await fetch("/api/admin");
    if (res.status === 403) {
      setNegado(true);
      setCarregando(false);
      return;
    }
    const data = await res.json();
    setRestaurantes(data.restaurantes ?? []);
    setContadores(data.contadores ?? null);

    const cfgRes = await fetch("/api/admin/config");
    if (cfgRes.ok) {
      const { config } = await cfgRes.json();
      const map = new Map<string, unknown>(
        (config as { chave: string; valor: unknown }[]).map((c) => [c.chave, c.valor])
      );
      const tv = map.get("tutorial_videos") as TutorialVideos | undefined;
      if (tv) setVideos({ ...tv });
      const tx = map.get("taxas_entrega") as TaxasEntrega | undefined;
      if (tx) setTaxas(tx);
      const ml = map.get("meta_lucro_padrao");
      if (ml != null) setMeta(String(ml));
    }
    setCarregando(false);
  }

  useEffect(() => {
    void (async () => {
      await carregar();
    })();
  }, []);

  const filtrados = useMemo(() => {
    const q = busca.trim().toLowerCase();
    if (!q) return restaurantes;
    return restaurantes.filter(
      (r) => r.nome.toLowerCase().includes(q) || (r.email ?? "").toLowerCase().includes(q)
    );
  }, [restaurantes, busca]);

  async function salvarConfig(chave: string, valor: unknown) {
    setMsg(null);
    const res = await fetch("/api/admin/config", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ chave, valor }),
    });
    setMsg(res.ok ? "Configuração salva." : "Falha ao salvar.");
  }

  async function toggleBloqueio(r: RestauranteAdmin) {
    setRestaurantes((prev) =>
      prev.map((x) => (x.id === r.id ? { ...x, bloqueado: !x.bloqueado } : x))
    );
    await fetch("/api/admin", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ restauranteId: r.id, bloqueado: !r.bloqueado }),
    });
  }

  if (carregando) {
    return <div className="flex min-h-screen items-center justify-center text-muted">Carregando…</div>;
  }

  if (negado) {
    return (
      <div className="flex min-h-screen flex-col items-center justify-center gap-4 px-4 text-center">
        <ShieldCheck size={40} className="text-muted" />
        <h1 className="text-xl font-bold text-brand-deep">Acesso restrito</h1>
        <p className="max-w-sm text-sm text-muted">
          Esta área é só para administradores. Se você deveria ter acesso, confira se seu e-mail
          está em <code>ADMIN_EMAILS</code>.
        </p>
        <Link href="/dashboard" className="text-sm font-semibold text-brand hover:text-brand-vivid">
          Voltar ao app
        </Link>
      </div>
    );
  }

  const videoKeys: (keyof TutorialVideos)[] = ["boas_vindas", "passo_1", "passo_2", "passo_3", "passo_4"];
  const videoLabels: Record<keyof TutorialVideos, string> = {
    boas_vindas: "Boas-vindas",
    passo_1: "Passo 1 — ingredientes",
    passo_2: "Passo 2 — copos",
    passo_3: "Passo 3 — custos e entrega",
    passo_4: "Passo 4 — lucro",
  };

  return (
    <div className="mx-auto min-h-screen w-full max-w-5xl px-4 py-8 md:px-8">
      <header className="mb-8 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <Logo size={32} />
          <span className="hidden items-center gap-1.5 rounded-full bg-brand/10 px-3 py-1 text-xs font-semibold text-brand-deep sm:flex">
            <ShieldCheck size={13} /> Painel administrativo
          </span>
        </div>
        <Link href="/dashboard" className="text-sm font-semibold text-brand hover:text-brand-vivid">
          Voltar ao app
        </Link>
      </header>

      {/* Contadores */}
      {contadores && (
        <div className="mb-8 grid grid-cols-2 gap-3 sm:grid-cols-4">
          <Kpi rotulo="Cadastros" valor={contadores.total} />
          <Kpi rotulo="Últimos 7 dias" valor={contadores.ultimos7} />
          <Kpi rotulo="Montaram 1ª ficha" valor={contadores.comFicha} destaque />
          <Kpi rotulo="Concluíram tutorial" valor={contadores.concluiramTutorial} />
        </div>
      )}

      {/* Config */}
      <Card className="mb-8">
        <h2 className="text-sm font-bold text-ink">Configuração</h2>
        <p className="mt-1 text-xs text-muted">
          Trocas aqui valem para todos, sem novo deploy.
        </p>

        <div className="mt-4">
          <p className="mb-2 text-sm font-semibold text-brand-deep">Vídeos do tutorial</p>
          <p className="mb-3 text-xs text-muted">
            Cole o ID do vídeo do YouTube (ex.: em <code>youtu.be/AbCdEf123</code>, o ID é{" "}
            <code>AbCdEf123</code>). Vazio = mostra a animação.
          </p>
          <div className="grid gap-3 sm:grid-cols-2">
            {videoKeys.map((k) => (
              <label key={k}>
                <Rotulo>{videoLabels[k]}</Rotulo>
                <Input
                  value={videos[k] ?? ""}
                  onChange={(e) => setVideos({ ...videos, [k]: e.target.value })}
                  placeholder="ID do vídeo"
                />
              </label>
            ))}
          </div>
          <Botao
            className="mt-3"
            onClick={() =>
              salvarConfig(
                "tutorial_videos",
                Object.fromEntries(
                  videoKeys.map((k) => [k, videos[k]?.trim() ? videos[k] : null])
                )
              )
            }
          >
            Salvar vídeos
          </Botao>
        </div>

        <div className="mt-6 grid gap-4 sm:grid-cols-3">
          <label>
            <Rotulo>Meta de lucro padrão (R$)</Rotulo>
            <Input value={meta} onChange={(e) => setMeta(e.target.value)} inputMode="decimal" />
          </label>
          <label>
            <Rotulo>Taxa entrega própria (%)</Rotulo>
            <Input
              value={String(taxas.propria)}
              onChange={(e) => setTaxas({ ...taxas, propria: Number(e.target.value) })}
              inputMode="decimal"
            />
          </label>
          <label>
            <Rotulo>Taxa plataforma (%)</Rotulo>
            <Input
              value={String(taxas.plataforma)}
              onChange={(e) => setTaxas({ ...taxas, plataforma: Number(e.target.value) })}
              inputMode="decimal"
            />
          </label>
        </div>
        <div className="mt-3 flex items-center gap-2">
          <Botao
            variante="secundario"
            onClick={() => {
              salvarConfig("meta_lucro_padrao", Number(String(meta).replace(",", ".")));
              salvarConfig("taxas_entrega", {
                propria: Number(taxas.propria),
                plataforma: Number(taxas.plataforma),
              });
            }}
          >
            Salvar taxas e meta
          </Botao>
          {msg && <span className="text-sm font-medium text-profit">{msg}</span>}
        </div>
      </Card>

      {/* Lista */}
      <div className="mb-3 flex items-center gap-2">
        <div className="relative flex-1">
          <Search size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-muted" />
          <Input
            className="pl-9"
            value={busca}
            onChange={(e) => setBusca(e.target.value)}
            placeholder="Buscar por nome ou e-mail…"
          />
        </div>
      </div>

      {filtrados.length === 0 ? (
        <Vazio>Nenhum cadastro encontrado.</Vazio>
      ) : (
        <div className="overflow-x-auto rounded-2xl border border-line">
          <table className="w-full min-w-[640px] text-sm">
            <thead className="bg-brand/8 text-left text-xs uppercase tracking-wide text-brand-deep">
              <tr>
                <th className="px-4 py-3">Nome</th>
                <th className="px-4 py-3">E-mail</th>
                <th className="px-4 py-3">Cadastro</th>
                <th className="px-4 py-3 text-center">Tutorial</th>
                <th className="px-4 py-3 text-center">Fichas</th>
                <th className="px-4 py-3 text-right">Ação</th>
              </tr>
            </thead>
            <tbody>
              {filtrados.map((r) => (
                <tr key={r.id} className="border-t border-line">
                  <td className="px-4 py-3 font-medium text-ink">
                    {r.nome}
                    {r.bloqueado && (
                      <span className="ml-2 rounded bg-loss-soft px-1.5 py-0.5 text-[10px] font-semibold text-loss">
                        bloqueado
                      </span>
                    )}
                  </td>
                  <td className="px-4 py-3 text-muted">{r.email ?? "—"}</td>
                  <td className="px-4 py-3 text-muted">{formatarData(r.created_at)}</td>
                  <td className="px-4 py-3 text-center">{r.onboarding_ok ? "✓" : "—"}</td>
                  <td className="px-4 py-3 text-center font-semibold text-brand-deep">{r.fichas}</td>
                  <td className="px-4 py-3 text-right">
                    <button
                      onClick={() => toggleBloqueio(r)}
                      className={`inline-flex items-center gap-1 rounded-lg px-2.5 py-1.5 text-xs font-semibold ${
                        r.bloqueado
                          ? "bg-profit-soft text-profit hover:opacity-80"
                          : "bg-loss-soft text-loss hover:opacity-80"
                      }`}
                    >
                      {r.bloqueado ? (
                        <>
                          <RotateCcw size={13} /> Restaurar
                        </>
                      ) : (
                        <>
                          <Ban size={13} /> Revogar
                        </>
                      )}
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}

function Kpi({ rotulo, valor, destaque }: { rotulo: string; valor: number; destaque?: boolean }) {
  return (
    <div
      className={`rounded-2xl border p-4 ${
        destaque ? "border-profit/40 bg-profit-soft" : "border-line bg-card"
      }`}
    >
      <p className="text-xs text-muted">{rotulo}</p>
      <p className={`mt-1 text-2xl font-extrabold ${destaque ? "text-profit" : "text-brand-deep"}`}>
        {valor}
      </p>
    </div>
  );
}

function formatarData(iso: string): string {
  try {
    return new Date(iso).toLocaleDateString("pt-BR");
  } catch {
    return iso.slice(0, 10);
  }
}
