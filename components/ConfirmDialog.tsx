"use client";

import { useEffect } from "react";

/** Diálogo de confirmação para exclusões (padrão de UX do projeto). */
export function ConfirmDialog({
  aberto,
  titulo,
  mensagem,
  confirmarLabel = "Excluir",
  onConfirmar,
  onCancelar,
  perigo = true,
}: {
  aberto: boolean;
  titulo: string;
  mensagem: string;
  confirmarLabel?: string;
  onConfirmar: () => void;
  onCancelar: () => void;
  perigo?: boolean;
}) {
  useEffect(() => {
    if (!aberto) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onCancelar();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [aberto, onCancelar]);

  if (!aberto) return null;

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4"
      onClick={onCancelar}
    >
      <div
        className="w-full max-w-sm rounded-2xl bg-card p-6 shadow-xl"
        onClick={(e) => e.stopPropagation()}
      >
        <h3 className="text-lg font-bold text-ink">{titulo}</h3>
        <p className="mt-2 text-sm text-muted">{mensagem}</p>
        <div className="mt-6 flex justify-end gap-2">
          <button
            onClick={onCancelar}
            className="rounded-lg px-4 py-2 text-sm font-medium text-muted hover:bg-line/60"
          >
            Cancelar
          </button>
          <button
            onClick={onConfirmar}
            className={
              perigo
                ? "rounded-lg bg-loss px-4 py-2 text-sm font-semibold text-white hover:opacity-90"
                : "rounded-lg bg-brand px-4 py-2 text-sm font-semibold text-white hover:bg-brand-vivid"
            }
          >
            {confirmarLabel}
          </button>
        </div>
      </div>
    </div>
  );
}
