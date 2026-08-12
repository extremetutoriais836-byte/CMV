import { NextResponse } from "next/server";
import { getSupabaseServer } from "@/lib/supabaseServer";
import { getSupabaseAdmin } from "@/lib/supabaseAdmin";
import { isAdminEmail } from "@/lib/admin";

async function ehAdmin(): Promise<boolean> {
  const supabase = await getSupabaseServer();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  return isAdminEmail(user?.email);
}

/** Lê todas as chaves de config_app (config é leitura pública, mas centralizamos aqui). */
export async function GET() {
  if (!(await ehAdmin())) return NextResponse.json({ erro: "Acesso restrito." }, { status: 403 });
  try {
    const admin = getSupabaseAdmin();
    const { data, error } = await admin.from("config_app").select("chave, valor, atualizado");
    if (error) throw error;
    return NextResponse.json({ config: data ?? [] });
  } catch (e) {
    return NextResponse.json({ erro: (e as Error).message }, { status: 500 });
  }
}

/** Grava uma chave (valor é JSON). Escrita só via service role. */
export async function POST(request: Request) {
  if (!(await ehAdmin())) return NextResponse.json({ erro: "Acesso restrito." }, { status: 403 });

  const body = (await request.json().catch(() => ({}))) as { chave?: string; valor?: unknown };
  if (!body.chave || body.valor === undefined) {
    return NextResponse.json({ erro: "Informe chave e valor." }, { status: 400 });
  }

  try {
    const admin = getSupabaseAdmin();
    const { error } = await admin
      .from("config_app")
      .upsert(
        { chave: body.chave, valor: body.valor, atualizado: new Date().toISOString() },
        { onConflict: "chave" }
      );
    if (error) throw error;
    return NextResponse.json({ ok: true });
  } catch (e) {
    return NextResponse.json({ erro: (e as Error).message }, { status: 500 });
  }
}
