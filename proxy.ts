import { createServerClient } from "@supabase/ssr";
import { NextResponse, type NextRequest } from "next/server";

/**
 * Proxy (antigo `middleware` — renomeado no Next 16). Protege as rotas do
 * painel e renova a sessão do Supabase a cada request.
 *  - Sem sessão fora das telas de auth -> /login
 *  - Com sessão nas telas de auth       -> /dashboard
 * As rotas /api tratam a própria autenticação (não redirecionam aqui).
 * /admin fica protegido por ser rota comum (exige sessão); o e-mail é
 * conferido no route handler /api/admin (ADMIN_EMAILS).
 */
export async function proxy(request: NextRequest) {
  let response = NextResponse.next({ request });

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL ?? "",
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ?? "",
    {
      cookies: {
        getAll() {
          return request.cookies.getAll();
        },
        setAll(cookiesToSet) {
          cookiesToSet.forEach(({ name, value }) => request.cookies.set(name, value));
          response = NextResponse.next({ request });
          cookiesToSet.forEach(({ name, value, options }) =>
            response.cookies.set(name, value, options)
          );
        },
      },
    }
  );

  const {
    data: { user },
  } = await supabase.auth.getUser();

  const path = request.nextUrl.pathname;
  const isAuthPage = path.startsWith("/login") || path.startsWith("/cadastro");

  if (!user && !isAuthPage) {
    const url = request.nextUrl.clone();
    url.pathname = "/login";
    return NextResponse.redirect(url);
  }

  if (user && isAuthPage) {
    const url = request.nextUrl.clone();
    url.pathname = "/dashboard";
    return NextResponse.redirect(url);
  }

  return response;
}

export const config = {
  // Roda em tudo, exceto assets estáticos, ícones e as rotas /api
  // (que autenticam sozinhas).
  matcher: [
    "/((?!_next/static|_next/image|favicon.ico|icon.svg|apple-icon|manifest.json|api|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)",
  ],
};
