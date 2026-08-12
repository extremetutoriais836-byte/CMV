"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { Pencil, Plus, Trash2, X } from "lucide-react";
import { supabase } from "@/lib/supabase";
import { useApp } from "@/components/AppContext";
import { brl, parseDecimalBR, conversao, paraDigitacao, unidadeDigitacao } from "@/lib/format";
import { faixaDoCopo, faixaStatus } from "@/lib/calculo";
import { PageTitulo, Card, Rotulo, Input, Select, Botao, Vazio } from "@/components/ui";
import { CmvBadge } from "@/components/CmvBadge";
import { ConfirmDialog } from "@/components/ConfirmDialog";

interface InsumoRef {
  id: string;
  nome: string;
  unidade_medida: string;
  custo_por_unidade: number;
}
interface ItemFicha {
  insumo_id: string;
  quantidade_utilizada: number;
}
interface Ficha {
  id: string;
  nome_prato: string;
  preco_venda: number;
  itens: ItemFicha[];
}
interface LinhaForm {
  insumo_id: string;
  digitado: string;
}

export default function FichasPage() {
  const { restaurante, config, recarregarContadores } = useApp();
  const [insumos, setInsumos] = useState<InsumoRef[]>([]);
  const [fichas, setFichas] = useState<Ficha[]>([]);
  const [nome, setNome] = useState("");
  const [preco, setPreco] = useState("");
  const [linhas, setLinhas] = useState<LinhaForm[]>([{ insumo_id: "", digitado: "" }]);
  const [editandoId, setEditandoId] = useState<string | null>(null);
  const [salvando, setSalvando] = useState(false);
  const [erro, setErro] = useState<string | null>(null);
  const [excluir, setExcluir] = useState<Ficha | null>(null);

  const insumoPorId = useMemo(
    () => new Map(insumos.map((i) => [i.id, i])),
    [insumos]
  );

  const carregar = useCallback(async () => {
    if (!restaurante) return;
    const [{ data: ins }, { data: fic }] = await Promise.all([
      supabase
        .from("insumos")
        .select("id, nome, unidade_medida, custo_por_unidade")
        .eq("restaurante_id", restaurante.id)
        .order("nome"),
      supabase
        .from("fichas_tecnicas")
        .select("id, nome_prato, preco_venda")
        .eq("restaurante_id", restaurante.id)
        .order("nome_prato"),
    ]);
    const insumosArr = (ins as InsumoRef[]) ?? [];
    setInsumos(insumosArr);

    const fichasBase = (fic as Omit<Ficha, "itens">[]) ?? [];
    const ids = fichasBase.map((f) => f.id);
    let itensPorFicha = new Map<string, ItemFicha[]>();
    if (ids.length > 0) {
      const { data: itens } = await supabase
        .from("ingredientes_ficha")
        .select("ficha_tecnica_id, insumo_id, quantidade_utilizada")
        .in("ficha_tecnica_id", ids);
      itensPorFicha = groupBy(
        (itens as (ItemFicha & { ficha_tecnica_id: string })[]) ?? [],
        (r) => r.ficha_tecnica_id
      );
    }
    setFichas(
      fichasBase.map((f) => ({
        ...f,
        itens: itensPorFicha.get(f.id) ?? [],
      }))
    );
  }, [restaurante]);

  useEffect(() => {
    void (async () => {
      await carregar();
    })();
  }, [carregar]);

  function cmvDaFicha(f: Ficha): number {
    return f.itens.reduce((acc, it) => {
      const ins = insumoPorId.get(it.insumo_id);
      return acc + (ins ? it.quantidade_utilizada * ins.custo_por_unidade : 0);
    }, 0);
  }

  function resetar() {
    setEditandoId(null);
    setNome("");
    setPreco("");
    setLinhas([{ insumo_id: "", digitado: "" }]);
    setErro(null);
  }

  function editar(f: Ficha) {
    setEditandoId(f.id);
    setNome(f.nome_prato);
    setPreco(String(f.preco_venda).replace(".", ","));
    setLinhas(
      f.itens.length > 0
        ? f.itens.map((it) => {
            const ins = insumoPorId.get(it.insumo_id);
            const dig = ins
              ? paraDigitacao(it.quantidade_utilizada, ins.unidade_medida)
              : it.quantidade_utilizada;
            return { insumo_id: it.insumo_id, digitado: String(dig).replace(".", ",") };
          })
        : [{ insumo_id: "", digitado: "" }]
    );
    setErro(null);
    window.scrollTo({ top: 0, behavior: "smooth" });
  }

  async function salvar(e: React.FormEvent) {
    e.preventDefault();
    if (!restaurante) return;
    setErro(null);

    const precoNum = parseDecimalBR(preco);
    if (!nome.trim()) return setErro("Dê um nome ao copo.");
    if (Number.isNaN(precoNum) || precoNum < 0) return setErro("Preço de venda inválido.");

    // Monta e mescla ingredientes (soma quantidade p/ o mesmo insumo).
    const mescla = new Map<string, number>();
    for (const l of linhas) {
      if (!l.insumo_id) continue;
      const dig = parseDecimalBR(l.digitado);
      if (Number.isNaN(dig) || dig <= 0) continue;
      const ins = insumoPorId.get(l.insumo_id);
      if (!ins) continue;
      const armazenar = conversao(dig, ins.unidade_medida);
      mescla.set(l.insumo_id, (mescla.get(l.insumo_id) ?? 0) + armazenar);
    }

    setSalvando(true);
    try {
      let fichaId = editandoId;
      if (fichaId) {
        const { error } = await supabase
          .from("fichas_tecnicas")
          .update({ nome_prato: nome.trim(), preco_venda: precoNum })
          .eq("id", fichaId);
        if (error) throw error;
      } else {
        const { data, error } = await supabase
          .from("fichas_tecnicas")
          .insert({ restaurante_id: restaurante.id, nome_prato: nome.trim(), preco_venda: precoNum })
          .select("id")
          .single();
        if (error) throw error;
        fichaId = (data as { id: string }).id;
      }

      // "apaga e reinsere" ingredientes (dívida técnica conhecida).
      await supabase.from("ingredientes_ficha").delete().eq("ficha_tecnica_id", fichaId);
      const linhasDb = [...mescla.entries()].map(([insumo_id, quantidade_utilizada]) => ({
        ficha_tecnica_id: fichaId,
        insumo_id,
        quantidade_utilizada,
      }));
      if (linhasDb.length > 0) {
        const { error } = await supabase.from("ingredientes_ficha").insert(linhasDb);
        if (error) throw error;
      }

      resetar();
      await carregar();
      await recarregarContadores();
    } catch {
      setErro("Não foi possível salvar o copo. Tente novamente.");
    } finally {
      setSalvando(false);
    }
  }

  async function confirmarExcluir() {
    if (!excluir) return;
    const alvo = excluir;
    setExcluir(null);
    setFichas((prev) => prev.filter((f) => f.id !== alvo.id));
    await supabase.from("fichas_tecnicas").delete().eq("id", alvo.id);
    await recarregarContadores();
  }

  const editando = Boolean(editandoId);

  return (
    <>
      <PageTitulo
        etapa="Etapa 2 de 4"
        titulo="Meus copos"
        subtitulo="A ficha de cada tamanho. O custo do copo (CMV) aparece sozinho quando os ingredientes têm preço."
      />

      <Card className={editando ? "border-profit ring-1 ring-profit/30" : ""}>
        <h2 className="mb-4 text-sm font-bold text-ink">
          {editando ? "Editando copo" : "Novo copo"}
        </h2>
        <form onSubmit={salvar} className="space-y-4">
          <div className="grid gap-4 sm:grid-cols-2">
            <label>
              <Rotulo>Nome do copo</Rotulo>
              <Input value={nome} onChange={(e) => setNome(e.target.value)} placeholder="Ex: Copo 500 ml" />
            </label>
            <label>
              <Rotulo ajuda="Por quanto você vende">Preço de venda</Rotulo>
              <Input inputMode="decimal" value={preco} onChange={(e) => setPreco(e.target.value)} placeholder="Ex: 18,00" />
            </label>
          </div>

          <div>
            <Rotulo>Ingredientes deste copo</Rotulo>
            {insumos.length === 0 && (
              <p className="mb-2 text-xs text-warn">
                Cadastre ingredientes na etapa 1 para montar o copo.
              </p>
            )}
            <div className="space-y-2">
              {linhas.map((l, idx) => {
                const ins = insumoPorId.get(l.insumo_id);
                const sufixo = ins ? unidadeDigitacao(ins.unidade_medida) : "";
                return (
                  <div key={idx} className="flex items-center gap-2">
                    <Select
                      value={l.insumo_id}
                      onChange={(e) => {
                        const v = e.target.value;
                        setLinhas((p) => p.map((x, i) => (i === idx ? { ...x, insumo_id: v } : x)));
                      }}
                      className="flex-1"
                    >
                      <option value="">Escolha um ingrediente…</option>
                      {insumos.map((i) => (
                        <option key={i.id} value={i.id}>
                          {i.nome}
                        </option>
                      ))}
                    </Select>
                    <div className="relative w-32">
                      <Input
                        inputMode="decimal"
                        value={l.digitado}
                        onChange={(e) => {
                          const v = e.target.value;
                          setLinhas((p) => p.map((x, i) => (i === idx ? { ...x, digitado: v } : x)));
                        }}
                        placeholder="qtd"
                      />
                      {sufixo && (
                        <span className="pointer-events-none absolute right-2 top-1/2 -translate-y-1/2 text-xs text-muted">
                          {sufixo}
                        </span>
                      )}
                    </div>
                    <button
                      type="button"
                      onClick={() => setLinhas((p) => (p.length > 1 ? p.filter((_, i) => i !== idx) : p))}
                      aria-label="Remover ingrediente"
                      className="rounded-lg p-2 text-muted hover:bg-loss-soft hover:text-loss"
                    >
                      <X size={16} />
                    </button>
                  </div>
                );
              })}
            </div>
            <button
              type="button"
              onClick={() => setLinhas((p) => [...p, { insumo_id: "", digitado: "" }])}
              className="mt-2 flex items-center gap-1 text-sm font-medium text-brand hover:text-brand-vivid"
            >
              <Plus size={14} /> Adicionar ingrediente
            </button>
          </div>

          {erro && <p className="text-sm font-medium text-loss">{erro}</p>}

          <div className="flex items-center gap-2">
            <Botao type="submit" disabled={salvando}>
              {salvando ? "Salvando…" : editando ? "Salvar alterações" : "Criar copo"}
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
        {fichas.length === 0 ? (
          <Vazio>Nenhum copo ainda. Crie o primeiro acima.</Vazio>
        ) : (
          fichas.map((f) => {
            const cmv = cmvDaFicha(f);
            const faixa = faixaDoCopo(f.nome_prato, config.faixasCmv);
            const status = faixaStatus(cmv, faixa);
            return (
              <div
                key={f.id}
                className="flex items-center justify-between gap-3 rounded-xl border border-line bg-card px-4 py-3"
              >
                <div className="min-w-0">
                  <div className="flex items-center gap-2">
                    <p className="truncate font-semibold text-ink">{f.nome_prato}</p>
                    <CmvBadge status={status} />
                  </div>
                  <p className="text-xs text-muted">
                    Vende por {brl(f.preco_venda)} · {f.itens.length} ingrediente
                    {f.itens.length === 1 ? "" : "s"}
                  </p>
                </div>
                <div className="flex items-center gap-3">
                  <div className="text-right">
                    <p className="font-bold text-brand-deep">{brl(cmv)}</p>
                    <p className="text-[11px] text-muted">custo do copo</p>
                  </div>
                  <button
                    onClick={() => editar(f)}
                    aria-label="Editar"
                    className="rounded-lg p-2 text-muted hover:bg-line/60 hover:text-brand"
                  >
                    <Pencil size={16} />
                  </button>
                  <button
                    onClick={() => setExcluir(f)}
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
        titulo="Excluir copo?"
        mensagem={`Tem certeza que deseja excluir "${excluir?.nome_prato}"?`}
        onConfirmar={confirmarExcluir}
        onCancelar={() => setExcluir(null)}
      />
    </>
  );
}

function groupBy<T>(arr: T[], key: (t: T) => string): Map<string, T[]> {
  const m = new Map<string, T[]>();
  for (const item of arr) {
    const k = key(item);
    const list = m.get(k);
    if (list) list.push(item);
    else m.set(k, [item]);
  }
  return m;
}
