import { createServerClient } from "@supabase/ssr";
import { NextResponse, type NextRequest } from "next/server";
import { SUPABASE_KEY, SUPABASE_URL, supabaseConfigurado } from "@/lib/supabase/config";

/**
 * Renova a sessão a cada requisição e barra quem não é do time em /admin.
 *
 * Esta é a PRIMEIRA de três camadas de proteção do painel, e sozinha não vale
 * nada: um proxy pode ser contornado se a rota for chamada de um jeito que ele
 * não cobre. A segunda camada é a reconferência dentro de app/admin/page.tsx; a
 * terceira, a RLS no banco. Só a terceira é inviolável — as outras duas existem
 * para dar uma resposta decente (um redirect) em vez de uma tela vazia.
 */
export async function updateSession(request: NextRequest) {
  let response = NextResponse.next({ request });

  // Sem chaves não há sessão a renovar nem painel a proteger — o site roda em
  // modo de demonstração e o /admin se explica sozinho na própria página.
  if (!supabaseConfigurado()) return response;

  const supabase = createServerClient(SUPABASE_URL, SUPABASE_KEY, {
    cookies: {
      getAll() {
        return request.cookies.getAll();
      },
      setAll(cookiesToSet) {
        cookiesToSet.forEach(({ name, value }) => request.cookies.set(name, value));
        response = NextResponse.next({ request });
        cookiesToSet.forEach(({ name, value, options }) => response.cookies.set(name, value, options));
      },
    },
  });

  // getUser() e não getSession(): getSession lê o cookie e acredita nele.
  // getUser vai ao servidor validar o token. Para decidir quem entra numa rota
  // protegida, acreditar no cookie é acreditar em quem o mandou.
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (request.nextUrl.pathname.startsWith("/admin")) {
    if (!user) {
      const url = request.nextUrl.clone();
      url.pathname = "/conta";
      url.searchParams.set("redirect", "/admin");
      return NextResponse.redirect(url);
    }

    const { data: perfil } = await supabase.from("profiles").select("role").eq("id", user.id).single();
    if (perfil?.role !== "admin") {
      const url = request.nextUrl.clone();
      url.pathname = "/";
      url.search = "";
      return NextResponse.redirect(url);
    }
  }

  return response;
}
