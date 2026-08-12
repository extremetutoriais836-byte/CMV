"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { Bike, Smartphone, TriangleAlert } from "lucide-react";
import { supabase } from "@/lib/supabase";
import { useApp } from "@/components/AppContext";
import { brl, parseDecimalBR, pct } from "@/lib/format";
import { calcularLucro, faixaDoCopo, faixaStatus, type ModeloEntrega } from "@/lib/calculo";
import type { Restaurante } from "@/lib/restaurante";
import type { ConfigApp } from "@/lib/config";
import { PageTitulo, Card, Vazio, Input, Rotulo } from "@/components/ui";
import { CmvBadge } from "@/components/CmvBadge";

interface FichaCmv {
  ficha_tecnica_id: string;
  nome_prato: string;
  preco_venda: number;
  cmv: number;
}

const corStatus: Record<string, string> = {
  ideal: "text-profit",
  atencao: "text-warn",
  acima: "text-loss",
};

export default function DashboardPage() {
  const { restaurante, setRestaurante, config } = useApp();
  const [fichas, setFichas] = useState<FichaCmv[]>([]);
  const [carregando, setCarregando] = useState(true);

  const carregar = useCallback(async () => {
    if (!restaurante) return;
    const { data } = await supabase
      .from("vw_cmv_ficha")
      .select("ficha_tecnica_id, nome_prato, preco_venda, cmv")
      .eq("restaurante_id", restaurante.id)
      .order("cmv");
    setFichas((data as FichaCmv[]) ?? []);
    setCarregando(false);
  }, [restaurante]);

  useEffect(() => {
    void (async () => {
      await carregar();
    })();
  }, [carregar]);

  async function persistir(patch: Partial<Restaurante>) {
    if (!restaurante) return;
    setRestaurante({ ...restaurante, ...patch });
    await supabase.from("restaurantes").update(patch).eq("id", restaurante.id);
  }

  if (!restaurante) return null;

  const modelo = restaurante.modelo_entrega;
  const taxaAtual =
    modelo === "propria" ? config.taxasEntrega.propria : restaurante.taxa_plataforma;

  return (
    <>
      <PageTitulo
        etapa="Etapa 4 de 4"
        titulo="Meu lucro"
        subtitulo="Quanto custa, quanto sobra e o preço mínimo de cada copo — já com a taxa de entrega."
      />

      <SeletorEntrega
        key={restaurante.id}
        restaurante={restaurante}
        config={config}
        onModelo={(m) => persistir({ modelo_entrega: m })}
        onTaxa={(t) => persistir({ taxa_plataforma: t })}
        onMeta={(m) => persistir({ meta_lucro: m })}
      />

      {carregando ? (
        <div className="flex h-32 items-center justify-center text-muted">Calculando…</div>
      ) : fichas.length === 0 ? (
        <Vazio>
          Nenhum copo para calcular ainda.{" "}
          <Link href="/fichas" className="font-semibold text-brand hover:text-brand-vivid">
            Monte seus copos
          </Link>
          .
        </Vazio>
      ) : (
        <div className="space-y-3">
          <p className="text-xs text-muted">
            Taxa aplicada agora: <span className="font-semibold text-ink">{pct(taxaAtual)}</span>.
            Os preços dos ingredientes vieram de exemplo —{" "}
            <Link href="/insumos" className="font-medium text-brand hover:text-brand-vivid">
              troque pelos da sua última compra
            </Link>
            .
          </p>

          {fichas.map((f) => {
            const r = calcularLucro({
              cmv: f.cmv,
              precoVenda: f.preco_venda,
              modelo,
              taxaPlataforma: restaurante.taxa_plataforma,
              metaLucro: restaurante.meta_lucro,
              taxaPropria: config.taxasEntrega.propria,
            });
            const faixa = faixaDoCopo(f.nome_prato, config.faixasCmv);
            const status = faixaStatus(f.cmv, faixa);
            const abaixoDoPiso = f.preco_venda < r.precoMinimo;

            return (
              <Card key={f.ficha_tecnica_id}>
                <div className="flex items-center justify-between gap-2">
                  <h3 className="font-bold text-brand-deep">{f.nome_prato}</h3>
                  <CmvBadge status={status} />
                </div>

                <div className="mt-3 grid grid-cols-2 gap-x-4 gap-y-3 sm:grid-cols-4">
                  <Metrica
                    rotulo="Custo do copo (CMV)"
                    valor={brl(f.cmv)}
                    cor={status ? corStatus[status] : "text-ink"}
                  />
                  <Metrica rotulo="Preço de venda" valor={brl(f.preco_venda)} />
                  <Metrica rotulo="Preço mínimo" valor={brl(r.precoMinimo)} cor="text-brand-deep" />
                  <Metrica
                    rotulo="Quanto sobra"
                    valor={brl(r.lucroReal)}
                    cor={r.lucroReal >= 0 ? "text-profit" : "text-loss"}
                    sub={r.margemPct != null ? `margem ${pct(r.margemPct)}` : undefined}
                  />
                </div>

                {abaixoDoPiso && (
                  <p className="mt-3 flex items-center gap-1.5 rounded-lg bg-loss-soft px-3 py-2 text-xs font-medium text-loss">
                    <TriangleAlert size={14} />
                    Está abaixo do preço mínimo. Nesse valor, você trabalha quase de graça —
                    considere subir para {brl(r.precoMinimo)}.
                  </p>
                )}
              </Card>
            );
          })}
        </div>
      )}
    </>
  );
}

/** Controles de entrega — estado local inicializado do restaurante (via key). */
function SeletorEntrega({
  restaurante,
  config,
  onModelo,
  onTaxa,
  onMeta,
}: {
  restaurante: Restaurante;
  config: ConfigApp;
  onModelo: (m: ModeloEntrega) => void;
  onTaxa: (t: number) => void;
  onMeta: (m: number) => void;
}) {
  const modelo = restaurante.modelo_entrega;
  const [taxaPlat, setTaxaPlat] = useState(() =>
    String(restaurante.taxa_plataforma).replace(".", ",")
  );
  const [meta, setMeta] = useState(() => String(restaurante.meta_lucro).replace(".", ","));

  function salvarTaxa() {
    const v = parseDecimalBR(taxaPlat);
    if (Number.isNaN(v) || v < 0 || v >= 100) {
      setTaxaPlat(String(restaurante.taxa_plataforma).replace(".", ","));
      return;
    }
    onTaxa(v);
  }
  function salvarMeta() {
    const v = parseDecimalBR(meta);
    if (Number.isNaN(v) || v < 0) {
      setMeta(String(restaurante.meta_lucro).replace(".", ","));
      return;
    }
    onMeta(v);
  }

  return (
    <Card className="mb-6">
      <p className="mb-3 text-sm font-bold text-ink">Como você entrega?</p>
      <div className="grid gap-3 sm:grid-cols-2">
        <button
          onClick={() => onModelo("propria")}
          className={`flex items-center gap-3 rounded-xl border-2 p-4 text-left transition-colors ${
            modelo === "propria" ? "border-brand bg-brand/8" : "border-line hover:border-brand/40"
          }`}
        >
          <Bike size={22} className={modelo === "propria" ? "text-brand" : "text-muted"} />
          <span>
            <span className="block font-semibold text-ink">Entrega própria</span>
            <span className="block text-xs text-muted">
              taxa de {pct(config.taxasEntrega.propria)}
            </span>
          </span>
        </button>

        <button
          onClick={() => onModelo("plataforma")}
          className={`flex items-center gap-3 rounded-xl border-2 p-4 text-left transition-colors ${
            modelo === "plataforma" ? "border-brand bg-brand/8" : "border-line hover:border-brand/40"
          }`}
        >
          <Smartphone size={22} className={modelo === "plataforma" ? "text-brand" : "text-muted"} />
          <span>
            <span className="block font-semibold text-ink">Entrega pelo aplicativo</span>
            <span className="block text-xs text-muted">
              taxa de {pct(restaurante.taxa_plataforma)}
            </span>
          </span>
        </button>
      </div>

      <div className="mt-4 grid gap-4 sm:grid-cols-2">
        <label>
          <Rotulo ajuda="A comissão que o app cobra (varia por contrato)">
            Taxa do aplicativo (%)
          </Rotulo>
          <Input
            inputMode="decimal"
            value={taxaPlat}
            onChange={(e) => setTaxaPlat(e.target.value)}
            onBlur={salvarTaxa}
          />
        </label>
        <label>
          <Rotulo ajuda="Quanto você quer que sobre em cada copo">Meta de lucro por copo</Rotulo>
          <Input
            inputMode="decimal"
            value={meta}
            onChange={(e) => setMeta(e.target.value)}
            onBlur={salvarMeta}
          />
        </label>
      </div>
    </Card>
  );
}

function Metrica({
  rotulo,
  valor,
  cor = "text-ink",
  sub,
}: {
  rotulo: string;
  valor: string;
  cor?: string;
  sub?: string;
}) {
  return (
    <div>
      <p className="text-[11px] uppercase tracking-wide text-muted">{rotulo}</p>
      <p className={`text-lg font-extrabold ${cor}`}>{valor}</p>
      {sub && <p className="text-[11px] text-muted">{sub}</p>}
    </div>
  );
}
