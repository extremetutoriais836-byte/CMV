import { NextResponse } from "next/server";
import { getSupabaseServer } from "@/lib/supabaseServer";
import { getSupabaseAdmin } from "@/lib/supabaseAdmin";
import { isAdminEmail } from "@/lib/admin";

/** Confere a sessão e devolve o e-mail se for admin (senão null). */
async function emailAdmin(): Promise<string | null> {
  const supabase = await getSupabaseServer();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  const email = user?.email ?? null;
  return isAdminEmail(email) ? email : null;
}

export async function GET(request: Request) {
  const email = await emailAdmin();
  const probe = new URL(request.url).searchParams.get("probe");

  if (!email) {
    // probe é usado pela sidebar só p/ decidir se mostra o link — não é erro.
    if (probe) return NextResponse.json({ admin: false });
    return NextResponse.json({ admin: false, erro: "Acesso restrito." }, { status: 403 });
  }
  if (probe) return NextResponse.json({ admin: true });

  try {
    const admin = getSupabaseAdmin();
    const [{ data: restaurantes }, { data: fichas }] = await Promise.all([
      admin
        .from("restaurantes")
        .select("id, nome, email, onboarding_ok, bloqueado, created_at")
        .order("created_at", { ascending: false }),
      admin.from("fichas_tecnicas").select("restaurante_id"),
    ]);

    const fichasPorRest = new Map<string, number>();
    for (const f of (fichas as { restaurante_id: string }[]) ?? []) {
      fichasPorRest.set(f.restaurante_id, (fichasPorRest.get(f.restaurante_id) ?? 0) + 1);
    }

    const lista = ((restaurantes as AdminRow[]) ?? []).map((r) => ({
      ...r,
      fichas: fichasPorRest.get(r.id) ?? 0,
    }));

    const seteDias = corteSeteDias();
    const contadores = {
      total: lista.length,
      ultimos7: lista.filter((r) => r.created_at >= seteDias).length,
      comFicha: lista.filter((r) => r.fichas > 0).length,
      concluiramTutorial: lista.filter((r) => r.onboarding_ok).length,
    };

    return NextResponse.json({ admin: true, restaurantes: lista, contadores });
  } catch (e) {
    return NextResponse.json(
      { admin: true, erro: (e as Error).message || "Falha ao ler dados." },
      { status: 500 }
    );
  }
}

/** Revogar / restaurar acesso (flag bloqueado). */
export async function POST(request: Request) {
  const email = await emailAdmin();
  if (!email) return NextResponse.json({ erro: "Acesso restrito." }, { status: 403 });

  const body = (await request.json().catch(() => ({}))) as {
    restauranteId?: string;
    bloqueado?: boolean;
  };
  if (!body.restauranteId || typeof body.bloqueado !== "boolean") {
    return NextResponse.json({ erro: "Parâmetros inválidos." }, { status: 400 });
  }

  try {
    const admin = getSupabaseAdmin();
    const { error } = await admin
      .from("restaurantes")
      .update({ bloqueado: body.bloqueado })
      .eq("id", body.restauranteId);
    if (error) throw error;
    return NextResponse.json({ ok: true });
  } catch (e) {
    return NextResponse.json({ erro: (e as Error).message }, { status: 500 });
  }
}

interface AdminRow {
  id: string;
  nome: string;
  email: string | null;
  onboarding_ok: boolean;
  bloqueado: boolean;
  created_at: string;
}

/** Corte ISO de 7 dias atrás. Sem Date.now() proibido — new Date() é permitido aqui (runtime Node). */
function corteSeteDias(): string {
  const agora = new Date();
  agora.setDate(agora.getDate() - 7);
  return agora.toISOString();
}
