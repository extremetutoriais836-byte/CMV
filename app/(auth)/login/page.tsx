"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { supabase } from "@/lib/supabase";
import { Logo } from "@/components/Logo";

export default function LoginPage() {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [senha, setSenha] = useState("");
  const [erro, setErro] = useState<string | null>(null);
  const [enviando, setEnviando] = useState(false);

  async function entrar(e: React.FormEvent) {
    e.preventDefault();
    setErro(null);
    setEnviando(true);
    const { error } = await supabase.auth.signInWithPassword({ email, password: senha });
    if (error) {
      setErro(traduzErro(error.message));
      setEnviando(false);
      return;
    }
    router.replace("/dashboard");
    router.refresh();
  }

  return (
    <div className="w-full max-w-sm">
      <div className="mb-6 flex justify-center">
        <Logo variant="dark" size={44} />
      </div>
      <div className="rounded-2xl bg-white p-7 shadow-2xl">
        <h1 className="text-xl font-extrabold text-brand-deep">Entrar</h1>
        <p className="mt-1 text-sm text-muted">Bem-vindo de volta.</p>

        <form onSubmit={entrar} className="mt-5 space-y-4">
          <Campo label="E-mail" type="email" value={email} onChange={setEmail} autoComplete="email" required />
          <Campo label="Senha" type="password" value={senha} onChange={setSenha} autoComplete="current-password" required />

          {erro && <p className="text-sm font-medium text-loss">{erro}</p>}

          <button
            type="submit"
            disabled={enviando}
            className="w-full rounded-lg bg-brand py-2.5 text-sm font-semibold text-white hover:bg-brand-vivid disabled:opacity-60"
          >
            {enviando ? "Entrando…" : "Entrar"}
          </button>
        </form>

        <p className="mt-5 text-center text-sm text-muted">
          Ainda não tem conta?{" "}
          <Link href="/cadastro" className="font-semibold text-brand hover:text-brand-vivid">
            Criar conta
          </Link>
        </p>
      </div>
    </div>
  );
}

function Campo({
  label,
  type,
  value,
  onChange,
  autoComplete,
  required,
}: {
  label: string;
  type: string;
  value: string;
  onChange: (v: string) => void;
  autoComplete?: string;
  required?: boolean;
}) {
  return (
    <label className="block">
      <span className="mb-1 block text-sm font-medium text-ink">{label}</span>
      <input
        type={type}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        autoComplete={autoComplete}
        required={required}
        className="w-full rounded-lg border border-line bg-surface px-3 py-2 text-sm text-ink outline-none focus:border-brand focus:ring-2 focus:ring-brand/20"
      />
    </label>
  );
}

function traduzErro(msg: string): string {
  if (/invalid login credentials/i.test(msg)) return "E-mail ou senha incorretos.";
  if (/email not confirmed/i.test(msg))
    return "E-mail ainda não confirmado. Verifique sua caixa de entrada.";
  return "Não foi possível entrar. Tente novamente.";
}
