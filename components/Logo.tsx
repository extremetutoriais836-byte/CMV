/**
 * Marca reduzida do Casal do Açaí para header/login (o badge completo — dois
 * rostos, copos, palmeiras — não sobrevive abaixo de ~100px). Aqui: o símbolo
 * (copo de açaí) + wordmark. Cores 100% via tokens de marca (@theme).
 */

export function LogoMark({ size = 40 }: { size?: number }) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 48 48"
      fill="none"
      role="img"
      aria-label="Casal do Açaí"
    >
      {/* copo */}
      <path
        d="M12 14h24l-2.4 26.5a3 3 0 0 1-3 2.7H17.4a3 3 0 0 1-3-2.7L12 14Z"
        fill="var(--color-brand)"
      />
      {/* açaí (creme no topo) */}
      <path d="M12 14h24l-.7 7.5c-4 2.5-6.6-1.6-11.3-1.6-4.7 0-7.3 4-11.3 1.6L12 14Z" fill="var(--color-brand-vivid)" />
      {/* topping amarelo */}
      <circle cx="19" cy="12" r="3" fill="var(--color-accent)" />
      <circle cx="27" cy="10.5" r="3.6" fill="var(--color-accent)" />
      <circle cx="33" cy="12.5" r="2.4" fill="var(--color-accent)" />
      {/* colher */}
      <rect x="30" y="4" width="2.4" height="16" rx="1.2" fill="var(--color-brand-deep)" transform="rotate(20 31 12)" />
    </svg>
  );
}

export function Logo({
  size = 36,
  variant = "light",
}: {
  size?: number;
  variant?: "light" | "dark";
}) {
  const primary = variant === "dark" ? "#FFFFFF" : "var(--color-brand-deep)";
  const accent = variant === "dark" ? "var(--color-accent)" : "var(--color-brand)";
  return (
    <span className="inline-flex items-center gap-2.5 select-none">
      <LogoMark size={size} />
      <span className="leading-none">
        <span className="block text-[10px] font-bold tracking-[0.22em]" style={{ color: accent }}>
          CASAL DO
        </span>
        <span className="block text-lg font-extrabold tracking-tight" style={{ color: primary }}>
          Açaí
        </span>
      </span>
    </span>
  );
}
