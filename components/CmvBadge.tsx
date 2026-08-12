import type { FaixaStatus } from "@/lib/calculo";

/** Selo colorido do status de CMV de um copo (verde / âmbar / vermelho). */
export function CmvBadge({ status }: { status: FaixaStatus }) {
  if (status === null) {
    return (
      <span className="inline-flex items-center rounded-full bg-line/60 px-2.5 py-0.5 text-xs font-medium text-muted">
        sem faixa
      </span>
    );
  }
  const mapa: Record<Exclude<FaixaStatus, null>, { txt: string; cls: string }> = {
    ideal: { txt: "dentro do ideal", cls: "bg-profit-soft text-profit" },
    atencao: { txt: "atenção", cls: "bg-warn-soft text-warn" },
    acima: { txt: "acima do teto", cls: "bg-loss-soft text-loss" },
  };
  const { txt, cls } = mapa[status];
  return (
    <span className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-semibold ${cls}`}>
      {txt}
    </span>
  );
}
