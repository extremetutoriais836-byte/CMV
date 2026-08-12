"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { supabase } from "@/lib/supabase";
import { Logo } from "@/components/Logo";

export default function CadastroPage() {
  const router = useRouter();
  const [nome, setNome] = useState("");
  const [email, setEmail] = useState("");
  const [senha, setSenha] = useState("");
  const [confirmar, setConfirmar] = useState("");
  const [erro, setErro] = useState<string | null>(null);
  const [aviso, setAviso] = useState<string | null>(null);
  const [enviando, setEnviando] = useState(false);

  async function criar(e: React.FormEvent) {
    e.preventDefault();
    setErro(null);
    setAviso(null);

    if (senha.length < 6) {
      setErro("A senha precisa ter pelo menos 6 caracteres.");
      return;
    }
    if (senha !== confirmar) {
      setErro("A senha e a confirmação não são iguais.");
      return;
    }

    setEnviando(true);
    const { data, error } = await supabase.auth.signUp({
      email,
      password: senha,
      options: { data: { nome } },
    });

    if (error) {
      setErro(traduzErro(error.message));
      setEnviando(false);
      return;
    }

    // Com "Confirm email" desativado, já vem sessão -> entra direto.
    if (data.session) {
      router.replace("/dashboard");
      router.refresh();
      return;
    }

    // Fallback (confirmação de e-mail ativada no projeto Supabase).
    setAviso(
      "Conta criada! Confirme seu e-mail para entrar. Se preferir acesso imediato, desative 'Confirm email' no Supabase."
    );
    setEnviando(false);
  }

  return (
    <div className="w-full max-w-sm">
      <div className="mb-6 flex justify-center">
        <Logo variant="dark" size={44} />
      </div>
      <div className="rounded-2xl bg-white p-7 shadow-2xl">
        <h1 className="text-xl font-extrabold text-brand-deep">Criar sua conta</h1>
        <p className="mt-1 text-sm text-muted">Acesso vitalício, incluído na sua compra.</p>

        <form onSubmit={criar} className="mt-5 space-y-4">
          <Campo label="Nome" type="text" value={nome} onChange={setNome} autoComplete="name" required />
          <Campo label="E-mail" type="email" value={email} onChange={setEmail} autoComplete="email" required />
          <Campo label="Senha" type="password" value={senha} onChange={setSenha} autoComplete="new-password" required />
          <Campo label="Confirmar senha" type="password" value={confirmar} onChange={setConfirmar} autoComplete="new-password" required />

          {erro && <p className="text-sm font-medium text-loss">{erro}</p>}
          {aviso && <p className="text-sm font-medium text-profit">{aviso}</p>}

          <button
            type="submit"
            disabled={enviando}
            className="w-full rounded-lg bg-brand py-2.5 text-sm font-semibold text-white hover:bg-brand-vivid disabled:opacity-60"
          >
            {enviando ? "Criando…" : "Criar conta e entrar"}
          </button>
        </form>

        <p className="mt-5 text-center text-sm text-muted">
          Já tem conta?{" "}
          <Link href="/login" className="font-semibold text-brand hover:text-brand-vivid">
            Entrar
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
  if (/already registered|already exists|user already/i.test(msg))
    return "Este e-mail já tem conta. Tente entrar.";
  if (/password/i.test(msg)) return "Senha inválida (mínimo 6 caracteres).";
  if (/valid email|invalid email/i.test(msg)) return "E-mail inválido.";
  return "Não foi possível criar a conta. Tente novamente.";
}
