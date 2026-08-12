"use client";

import { useCallback, useEffect, useState } from "react";
import { Pencil, Plus, Trash2 } from "lucide-react";
import { supabase } from "@/lib/supabase";
import { useApp } from "@/components/AppContext";
import { brl, parseDecimalBR } from "@/lib/format";
import { PageTitulo, Card, Rotulo, Input, Botao, Vazio } from "@/components/ui";
import { ConfirmDialog } from "@/components/ConfirmDialog";

interface Custo {
  id: string;
  descricao: string;
  valor_mensal: number;
}

export default function CustosFixosPage() {
  const { restaurante, setRestaurante, recarregarContadores } = useApp();
  const [custos, setCustos] = useState<Custo[]>([]);
  const [descricao, setDescricao] = useState("");
  const [valor, setValor] = useState("");
  const [editandoId, setEditandoId] = useState<string | null>(null);
  const [salvando, setSalvando] = useState(false);
  const [erro, setErro] = useState<string | null>(null);
  const [excluir, setExcluir] = useState<Custo | null>(null);

  const [faturamento, setFaturamento] = useState("");
  const [salvandoFat, setSalvandoFat] = useState(false);

  const carregar = useCallback(async () => {
    if (!restaurante) return;
    const { data } = await supabase
      .from("custos_fixos")
      .select("id, descricao, valor_mensal")
      .eq("restaurante_id", restaurante.id)
      .order("descricao");
    setCustos((data as Custo[]) ?? []);
    setFaturamento(
      restaurante.faturamento_estimado != null
        ? String(restaurante.faturamento_estimado).replace(".", ",")
        : ""
    );
  }, [restaurante]);

  useEffect(() => {
    void (async () => {
      await carregar();
    })();
  }, [carregar]);

  function resetar() {
    setEditandoId(null);
    setDescricao("");
    setValor("");
    setErro(null);
  }

  function editar(c: Custo) {
    setEditandoId(c.id);
    setDescricao(c.descricao);
    setValor(String(c.valor_mensal).replace(".", ","));
    setErro(null);
    window.scrollTo({ top: 0, behavior: "smooth" });
  }

  async function salvar(e: React.FormEvent) {
    e.preventDefault();
    if (!restaurante) return;
    setErro(null);
    const v = parseDecimalBR(valor);
    if (!descricao.trim()) return setErro("Descreva o gasto (ex: aluguel).");
    if (Number.isNaN(v) || v < 0) return setErro("Valor mensal inválido.");

    setSalvando(true);
    const payload = {
      restaurante_id: restaurante.id,
      descricao: descricao.trim(),
      valor_mensal: v,
    };
    const resp = editandoId
      ? await supabase.from("custos_fixos").update(payload).eq("id", editandoId)
      : await supabase.from("custos_fixos").insert(payload);
    setSalvando(false);
    if (resp.error) return setErro("Não foi possível salvar. Tente novamente.");
    resetar();
    await carregar();
    await recarregarContadores();
  }

  async function confirmarExcluir() {
    if (!excluir) return;
    const alvo = excluir;
    setExcluir(null);
    setCustos((prev) => prev.filter((c) => c.id !== alvo.id));
    await supabase.from("custos_fixos").delete().eq("id", alvo.id);
    await recarregarContadores();
  }

  async function salvarFaturamento(e: React.FormEvent) {
    e.preventDefault();
    if (!restaurante) return;
    const f = parseDecimalBR(faturamento);
    const valorFinal = Number.isNaN(f) ? null : f;
    setSalvandoFat(true);
    await supabase
      .from("restaurantes")
      .update({ faturamento_estimado: valorFinal })
      .eq("id", restaurante.id);
    setRestaurante({ ...restaurante, faturamento_estimado: valorFinal });
    setSalvandoFat(false);
  }

  const total = custos.reduce((a, c) => a + c.valor_mensal, 0);
  const editando = Boolean(editandoId);

  return (
    <>
      <PageTitulo
        etapa="Etapa 3 de 4"
        titulo="Custos fixos"
        subtitulo="Aluguel, energia, equipe, internet. Os gastos do mês que não dependem de quanto você vende."
      />

      <Card className="mb-6">
        <form onSubmit={salvarFaturamento} className="flex flex-wrap items-end gap-3">
          <label className="flex-1">
            <Rotulo ajuda="Uma estimativa já ajuda">Quanto você vende por mês</Rotulo>
            <Input
              inputMode="decimal"
              value={faturamento}
              onChange={(e) => setFaturamento(e.target.value)}
              placeholder="Ex: 25.000,00"
            />
          </label>
          <Botao type="submit" variante="secundario" disabled={salvandoFat}>
            {salvandoFat ? "Salvando…" : "Salvar"}
          </Botao>
        </form>
      </Card>

      <Card className={editando ? "border-profit ring-1 ring-profit/30" : ""}>
        <h2 className="mb-4 text-sm font-bold text-ink">
          {editando ? "Editando gasto" : "Adicionar gasto fixo"}
        </h2>
        <form onSubmit={salvar} className="grid gap-4 sm:grid-cols-2">
          <label>
            <Rotulo>Gasto</Rotulo>
            <Input value={descricao} onChange={(e) => setDescricao(e.target.value)} placeholder="Ex: Aluguel" />
          </label>
          <label>
            <Rotulo ajuda="Por mês">Valor</Rotulo>
            <Input inputMode="decimal" value={valor} onChange={(e) => setValor(e.target.value)} placeholder="Ex: 2.000,00" />
          </label>
          {erro && <p className="text-sm font-medium text-loss sm:col-span-2">{erro}</p>}
          <div className="flex items-center gap-2 sm:col-span-2">
            <Botao type="submit" disabled={salvando}>
              {salvando ? "Salvando…" : editando ? "Salvar alterações" : (
                <span className="flex items-center gap-1">
                  <Plus size={15} /> Adicionar
                </span>
              )}
            </Botao>
            {editando && (
              <Botao type="button" variante="secundario" onClick={resetar}>
                Cancelar
              </Botao>
            )}
          </div>
        </form>
      </Card>

      <div className="mt-6 space-y-2">
        {custos.length === 0 ? (
          <Vazio>Nenhum gasto fixo ainda. Adicione o primeiro acima.</Vazio>
        ) : (
          <>
            {custos.map((c) => (
              <div
                key={c.id}
                className="flex items-center justify-between gap-3 rounded-xl border border-line bg-card px-4 py-3"
              >
                <p className="truncate font-semibold text-ink">{c.descricao}</p>
                <div className="flex items-center gap-3">
                  <p className="font-bold text-brand-deep">{brl(c.valor_mensal)}</p>
                  <button
                    onClick={() => editar(c)}
                    aria-label="Editar"
                    className="rounded-lg p-2 text-muted hover:bg-line/60 hover:text-brand"
                  >
                    <Pencil size={16} />
                  </button>
                  <button
                    onClick={() => setExcluir(c)}
                    aria-label="Excluir"
                    className="rounded-lg p-2 text-muted hover:bg-loss-soft hover:text-loss"
                  >
                    <Trash2 size={16} />
                  </button>
                </div>
              </div>
            ))}
            <div className="flex items-center justify-between rounded-xl bg-brand/8 px-4 py-3">
              <span className="text-sm font-semibold text-brand-deep">Total por mês</span>
              <span className="font-extrabold text-brand-deep">{brl(total)}</span>
            </div>
          </>
        )}
      </div>

      <ConfirmDialog
        aberto={excluir !== null}
        titulo="Excluir gasto?"
        mensagem={`Tem certeza que deseja excluir "${excluir?.descricao}"?`}
        onConfirmar={confirmarExcluir}
        onCancelar={() => setExcluir(null)}
      />
    </>
  );
}
