"use client";

import { useCallback, useEffect, useState } from "react";
import { Pencil, Plus, Trash2 } from "lucide-react";
import { supabase } from "@/lib/supabase";
import { useApp } from "@/components/AppContext";
import { brl, parseDecimalBR, unidadeEscalavel } from "@/lib/format";
import { PageTitulo, Card, Rotulo, Input, Select, Botao, Vazio } from "@/components/ui";
import { ConfirmDialog } from "@/components/ConfirmDialog";

interface Insumo {
  id: string;
  nome: string;
  como_compra: string | null;
  preco_pago: number;
  quantidade_embalagem: number;
  unidade_medida: string;
  custo_por_unidade: number;
}

const UNIDADES = ["kg", "g", "L", "ml", "un"];

/** Custo por grama/ml/un, para exibir de forma amigável. */
function custoAmigavel(i: Insumo): { valor: number; sufixo: string } {
  if (unidadeEscalavel(i.unidade_medida)) {
    return {
      valor: i.custo_por_unidade / 1000,
      sufixo: i.unidade_medida.toLowerCase() === "kg" ? "por grama" : "por ml",
    };
  }
  const sufixo =
    i.unidade_medida === "un" ? "por unidade" : `por ${i.unidade_medida}`;
  return { valor: i.custo_por_unidade, sufixo };
}

const FORM_VAZIO = {
  nome: "",
  como_compra: "",
  preco_pago: "",
  quantidade_embalagem: "",
  unidade_medida: "kg",
};

export default function InsumosPage() {
  const { restaurante, recarregarContadores } = useApp();
  const [insumos, setInsumos] = useState<Insumo[]>([]);
  const [form, setForm] = useState({ ...FORM_VAZIO });
  const [editandoId, setEditandoId] = useState<string | null>(null);
  const [salvando, setSalvando] = useState(false);
  const [erro, setErro] = useState<string | null>(null);
  const [excluir, setExcluir] = useState<Insumo | null>(null);

  const carregar = useCallback(async () => {
    if (!restaurante) return;
    const { data } = await supabase
      .from("insumos")
      .select("id, nome, como_compra, preco_pago, quantidade_embalagem, unidade_medida, custo_por_unidade")
      .eq("restaurante_id", restaurante.id)
      .order("nome");
    setInsumos((data as Insumo[]) ?? []);
  }, [restaurante]);

  useEffect(() => {
    void (async () => {
      await carregar();
    })();
  }, [carregar]);

  function resetar() {
    setForm({ ...FORM_VAZIO });
    setEditandoId(null);
    setErro(null);
  }

  function editar(i: Insumo) {
    setEditandoId(i.id);
    setErro(null);
    setForm({
      nome: i.nome,
      como_compra: i.como_compra ?? "",
      preco_pago: String(i.preco_pago).replace(".", ","),
      quantidade_embalagem: String(i.quantidade_embalagem).replace(".", ","),
      unidade_medida: i.unidade_medida,
    });
    window.scrollTo({ top: 0, behavior: "smooth" });
  }

  async function salvar(e: React.FormEvent) {
    e.preventDefault();
    if (!restaurante) return;
    setErro(null);

    const preco = parseDecimalBR(form.preco_pago);
    const qtd = parseDecimalBR(form.quantidade_embalagem);
    if (!form.nome.trim()) return setErro("Dê um nome ao ingrediente.");
    if (Number.isNaN(preco) || preco < 0) return setErro("Preço do pacote inválido.");
    if (Number.isNaN(qtd) || qtd <= 0) return setErro("Quantidade do pacote inválida.");

    setSalvando(true);
    const payload = {
      restaurante_id: restaurante.id,
      nome: form.nome.trim(),
      como_compra: form.como_compra.trim() || null,
      preco_pago: preco,
      quantidade_embalagem: qtd,
      unidade_medida: form.unidade_medida,
    };

    const resp = editandoId
      ? await supabase.from("insumos").update(payload).eq("id", editandoId)
      : await supabase.from("insumos").insert(payload);

    setSalvando(false);
    if (resp.error) {
      setErro("Não foi possível salvar. Tente novamente.");
      return;
    }
    resetar();
    await carregar();
    await recarregarContadores();
  }

  async function confirmarExcluir() {
    if (!excluir) return;
    const alvo = excluir;
    setExcluir(null);
    setInsumos((prev) => prev.filter((i) => i.id !== alvo.id)); // otimista
    const { error } = await supabase.from("insumos").delete().eq("id", alvo.id);
    if (error) {
      // Provável: insumo em uso numa ficha (FK restrict).
      setErro(
        `"${alvo.nome}" está em uso em algum copo. Remova-o das fichas antes de excluir.`
      );
      await carregar();
      return;
    }
    await recarregarContadores();
  }

  const editando = Boolean(editandoId);

  return (
    <>
      <PageTitulo
        etapa="Etapa 1 de 4"
        titulo="Meus ingredientes"
        subtitulo="Cadastre o que você compra. A gente calcula quanto custa cada grama automaticamente."
      />

      <Card className={editando ? "border-profit ring-1 ring-profit/30" : ""}>
        <h2 className="mb-4 text-sm font-bold text-ink">
          {editando ? "Editando ingrediente" : "Adicionar ingrediente"}
        </h2>
        <form onSubmit={salvar} className="grid gap-4 sm:grid-cols-2">
          <label className="sm:col-span-2">
            <Rotulo>Ingrediente</Rotulo>
            <Input
              value={form.nome}
              onChange={(e) => setForm({ ...form, nome: e.target.value })}
              placeholder="Ex: Polpa de açaí"
            />
          </label>

          <label>
            <Rotulo ajuda="Quanto você pagou na última compra">Preço do pacote</Rotulo>
            <Input
              inputMode="decimal"
              value={form.preco_pago}
              onChange={(e) => setForm({ ...form, preco_pago: e.target.value })}
              placeholder="Ex: 20,00"
            />
          </label>

          <div className="grid grid-cols-2 gap-3">
            <label>
              <Rotulo ajuda="O que vem no pacote">Quantidade</Rotulo>
              <Input
                inputMode="decimal"
                value={form.quantidade_embalagem}
                onChange={(e) => setForm({ ...form, quantidade_embalagem: e.target.value })}
                placeholder="Ex: 1"
              />
            </label>
            <label>
              <Rotulo>Unidade</Rotulo>
              <Select
                value={form.unidade_medida}
                onChange={(e) => setForm({ ...form, unidade_medida: e.target.value })}
              >
                {UNIDADES.map((u) => (
                  <option key={u} value={u}>
                    {u}
                  </option>
                ))}
              </Select>
            </label>
          </div>

          <label className="sm:col-span-2">
            <Rotulo ajuda="Opcional — ajuda você a lembrar">Como você compra</Rotulo>
            <Input
              value={form.como_compra}
              onChange={(e) => setForm({ ...form, como_compra: e.target.value })}
              placeholder="Ex: pacote 1 kg"
            />
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
        <p className="mt-3 text-xs text-muted">
          A gente calcula quanto custa cada grama automaticamente.
        </p>
      </Card>

      <div className="mt-6 space-y-2">
        {insumos.length === 0 ? (
          <Vazio>Nenhum ingrediente ainda. Adicione o primeiro acima.</Vazio>
        ) : (
          insumos.map((i) => {
            const c = custoAmigavel(i);
            return (
              <div
                key={i.id}
                className="flex items-center justify-between gap-3 rounded-xl border border-line bg-card px-4 py-3"
              >
                <div className="min-w-0">
                  <p className="truncate font-semibold text-ink">{i.nome}</p>
                  <p className="text-xs text-muted">
                    {brl(i.preco_pago)} · {i.quantidade_embalagem} {i.unidade_medida}
                    {i.como_compra ? ` · ${i.como_compra}` : ""}
                  </p>
                </div>
                <div className="flex items-center gap-3">
                  <div className="text-right">
                    <p className="font-bold text-brand-deep">{brl(c.valor)}</p>
                    <p className="text-[11px] text-muted">{c.sufixo}</p>
                  </div>
                  <button
                    onClick={() => editar(i)}
                    aria-label="Editar"
                    className="rounded-lg p-2 text-muted hover:bg-line/60 hover:text-brand"
                  >
                    <Pencil size={16} />
                  </button>
                  <button
                    onClick={() => setExcluir(i)}
                    aria-label="Excluir"
                    className="rounded-lg p-2 text-muted hover:bg-loss-soft hover:text-loss"
                  >
                    <Trash2 size={16} />
                  </button>
                </div>
              </div>
            );
          })
        )}
      </div>

      <ConfirmDialog
        aberto={excluir !== null}
        titulo="Excluir ingrediente?"
        mensagem={`Tem certeza que deseja excluir "${excluir?.nome}"?`}
        onConfirmar={confirmarExcluir}
        onCancelar={() => setExcluir(null)}
      />
    </>
  );
}
