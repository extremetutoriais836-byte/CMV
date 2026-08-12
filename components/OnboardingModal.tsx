"use client";

import { useState } from "react";
import Link from "next/link";
import { ChevronLeft, ChevronRight, X } from "lucide-react";
import { useApp } from "./AppContext";
import { marcarOnboardingOk } from "@/lib/restaurante";
import type { TutorialVideos } from "@/lib/config";

/* ---------- Animações SVG (uma por tela) ---------- */

function AnimCopo() {
  return (
    <svg viewBox="0 0 120 120" className="h-32 w-32">
      <path d="M34 34h52l-5 62a6 6 0 0 1-6 5.4H45a6 6 0 0 1-6-5.4L34 34Z" fill="none" stroke="var(--color-brand)" strokeWidth="3" />
      <clipPath id="cupclip">
        <path d="M36 36h48l-4.8 60a4 4 0 0 1-4 3.6H44.8a4 4 0 0 1-4-3.6L36 36Z" />
      </clipPath>
      <g clipPath="url(#cupclip)">
        <rect className="ob-fill" x="34" y="34" width="52" height="70" fill="var(--color-brand-vivid)" />
      </g>
      <circle cx="52" cy="30" r="4" fill="var(--color-accent)" />
      <circle cx="62" cy="27" r="5" fill="var(--color-accent)" />
      <circle cx="72" cy="31" r="3.5" fill="var(--color-accent)" />
    </svg>
  );
}

function AnimCusto() {
  return (
    <svg viewBox="0 0 160 120" className="h-32 w-40">
      <g className="ob-pop-1">
        <rect x="10" y="46" width="34" height="30" rx="3" fill="var(--color-brand)" />
        <rect x="10" y="46" width="34" height="9" rx="3" fill="var(--color-brand-deep)" />
      </g>
      <g className="ob-pop-2">
        <rect x="63" y="40" width="14" height="40" rx="7" fill="var(--color-brand-light)" />
        <ellipse cx="70" cy="40" rx="7" ry="4" fill="var(--color-brand)" />
      </g>
      <g className="ob-pop-3">
        <circle cx="120" cy="60" r="20" fill="var(--color-accent)" />
        <text x="120" y="66" textAnchor="middle" fontSize="18" fontWeight="700" fill="var(--color-accent-ink)">R$</text>
      </g>
    </svg>
  );
}

function AnimCopos() {
  const larguras = [16, 20, 24, 28, 34];
  const alturas = [34, 44, 54, 66, 80];
  return (
    <svg viewBox="0 0 180 100" className="h-32 w-44">
      {larguras.map((w, i) => {
        const x = 10 + i * 34;
        const h = alturas[i];
        return (
          <rect
            key={i}
            className="ob-grow"
            x={x}
            y={90 - h}
            width={w}
            height={h}
            rx="3"
            fill="var(--color-brand)"
            style={{ animationDelay: `${i * 0.25}s` }}
          />
        );
      })}
    </svg>
  );
}

function AnimEntrega() {
  return (
    <svg viewBox="0 0 160 110" className="h-32 w-44">
      <rect x="40" y="20" width="60" height="26" rx="13" fill="var(--color-line)" />
      <circle className="ob-toggle" cx="53" cy="33" r="10" fill="var(--color-brand)" />
      <text x="80" y="72" textAnchor="middle" fontSize="13" fontWeight="600" fill="var(--color-brand-deep)" className="ob-fade">
        própria 15,5%
      </text>
      <text x="80" y="72" textAnchor="middle" fontSize="13" fontWeight="600" fill="var(--color-brand-deep)" className="ob-fade-in">
        app 30%
      </text>
      <text x="80" y="95" textAnchor="middle" fontSize="18" fontWeight="800" fill="var(--color-profit)" className="ob-fade">
        R$ 5,64
      </text>
      <text x="80" y="95" textAnchor="middle" fontSize="18" fontWeight="800" fill="var(--color-warn)" className="ob-fade-in">
        R$ 3,90
      </text>
    </svg>
  );
}

function AnimLucro() {
  return (
    <svg viewBox="0 0 180 90" className="h-32 w-44">
      <rect x="10" y="38" width="160" height="18" rx="9" fill="var(--color-line)" />
      <rect className="ob-bar" x="10" y="38" height="18" rx="9" fill="var(--color-profit)" />
      <text x="90" y="80" textAnchor="middle" fontSize="14" fontWeight="700" fill="var(--color-profit)">
        lucro
      </text>
    </svg>
  );
}

/* ---------- Conteúdo das 5 telas ---------- */

interface Slide {
  videoKey: keyof TutorialVideos;
  Anim: () => React.JSX.Element;
  titulo: string;
  paragrafo: string;
  destaque?: string;
}

const SLIDES: Slide[] = [
  {
    videoKey: "boas_vindas",
    Anim: AnimCopo,
    titulo: "Vamos descobrir quanto custa o seu copo",
    paragrafo:
      "A maioria das lojas de açaí não sabe o custo real do que vende — e por isso precifica no chute. Em quatro passos simples você vai saber exatamente quanto gasta em cada copo e por quanto precisa vender para lucrar de verdade.",
    destaque: "Leva cerca de 15 minutos. Você pode parar e voltar quando quiser.",
  },
  {
    videoKey: "passo_1",
    Anim: AnimCusto,
    titulo: "Comece cadastrando o que você compra",
    paragrafo:
      "Açaí, paçoca, leite em pó, leite condensado, copos. Para cada item você informa quanto pagou e quanto vem no pacote. A gente calcula sozinho quanto custa cada grama.",
    destaque:
      "Exemplo: pacote de paçoca de 1 kg por R$ 18,00 → cada grama custa R$ 0,018. Uma dosadora de 10 g sai por R$ 0,18.",
  },
  {
    videoKey: "passo_2",
    Anim: AnimCopos,
    titulo: "Monte a ficha de cada tamanho",
    paragrafo:
      "Já deixamos os cinco tamanhos prontos com as gramaturas do método: 300 ml, 400 ml, 500 ml, 700 ml e 1 litro. Você só confere se bate com o que faz na sua loja e ajusta se precisar.",
    destaque:
      "Assim que os ingredientes estiverem cadastrados, o custo de cada copo aparece automaticamente.",
  },
  {
    videoKey: "passo_3",
    Anim: AnimEntrega,
    titulo: "Aluguel, energia, equipe e a taxa do aplicativo",
    paragrafo:
      "O custo do copo não é tudo. Para saber o lucro de verdade, informe seus gastos fixos do mês e escolha como você entrega: entrega própria → taxa de 15,5%; entrega pelo aplicativo → taxa de 30%.",
    destaque: "Você pode trocar quando quiser e comparar o que sobra em cada modelo.",
  },
  {
    videoKey: "passo_4",
    Anim: AnimLucro,
    titulo: "Agora sim: quanto sobra em cada copo",
    paragrafo:
      "Com tudo preenchido, você vê o custo, a margem e o preço mínimo de cada tamanho — o valor abaixo do qual você está trabalhando de graça. Quando o preço de um ingrediente mudar, é só atualizar num lugar só. Todos os copos se recalculam sozinhos.",
    destaque: "Pronto para começar?",
  },
];

export function OnboardingModal() {
  const { tutorialAberto, fecharTutorial, config, user, restaurante, setRestaurante } = useApp();
  const [passo, setPasso] = useState(0);

  if (!tutorialAberto) return null;

  const slide = SLIDES[passo];
  const videoId = config.tutorialVideos[slide.videoKey];
  const ultimo = passo === SLIDES.length - 1;

  async function concluir() {
    if (user) await marcarOnboardingOk(user.id);
    if (restaurante) setRestaurante({ ...restaurante, onboarding_ok: true });
    setPasso(0);
    fecharTutorial();
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
      <div className="relative w-full max-w-lg overflow-hidden rounded-3xl bg-card shadow-2xl">
        <button
          onClick={concluir}
          aria-label="Pular tutorial"
          className="absolute right-4 top-4 z-10 flex items-center gap-1 rounded-full px-2 py-1 text-xs font-medium text-muted hover:bg-line/60"
        >
          Pular tutorial <X size={14} />
        </button>

        <div className="flex min-h-[180px] items-center justify-center bg-surface px-6 pt-10 pb-6">
          {videoId ? (
            <div className="aspect-video w-full overflow-hidden rounded-xl">
              <iframe
                className="h-full w-full"
                src={`https://www.youtube-nocookie.com/embed/${videoId}?rel=0&modestbranding=1&playsinline=1`}
                title={slide.titulo}
                allow="accelerometer; encrypted-media; picture-in-picture"
                allowFullScreen
              />
            </div>
          ) : (
            <slide.Anim />
          )}
        </div>

        <div className="px-7 pb-7 pt-5">
          <p className="text-xs font-semibold uppercase tracking-wide text-brand">
            Passo {passo + 1} de {SLIDES.length}
          </p>
          <h2 className="mt-1 text-xl font-extrabold text-brand-deep">{slide.titulo}</h2>
          <p className="mt-2 text-sm leading-relaxed text-ink">{slide.paragrafo}</p>
          {slide.destaque && (
            <p className="mt-3 rounded-xl bg-brand/8 px-3 py-2 text-sm font-medium text-brand-deep">
              {slide.destaque}
            </p>
          )}

          {/* bolinhas */}
          <div className="mt-5 flex justify-center gap-1.5">
            {SLIDES.map((_, i) => (
              <span
                key={i}
                className={`h-2 rounded-full transition-all ${
                  i === passo ? "w-5 bg-brand" : "w-2 bg-line"
                }`}
              />
            ))}
          </div>

          <div className="mt-5 flex items-center justify-between gap-3">
            <button
              onClick={() => setPasso((p) => Math.max(0, p - 1))}
              disabled={passo === 0}
              className="flex items-center gap-1 rounded-lg px-3 py-2 text-sm font-medium text-muted enabled:hover:bg-line/60 disabled:opacity-40"
            >
              <ChevronLeft size={16} /> Voltar
            </button>

            {ultimo ? (
              <Link
                href="/insumos"
                onClick={concluir}
                className="flex items-center gap-1 rounded-lg bg-brand px-4 py-2.5 text-sm font-semibold text-white hover:bg-brand-vivid"
              >
                Cadastrar meu primeiro ingrediente
              </Link>
            ) : (
              <button
                onClick={() => setPasso((p) => Math.min(SLIDES.length - 1, p + 1))}
                className="flex items-center gap-1 rounded-lg bg-brand px-4 py-2.5 text-sm font-semibold text-white hover:bg-brand-vivid"
              >
                Próximo <ChevronRight size={16} />
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
