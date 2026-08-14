import { NextResponse, type NextRequest } from "next/server";
import { createClient } from "@/lib/supabase/server";

/**
 * Retorno dos links que o Supabase manda por e-mail (confirmação de cadastro e
 * recuperação de senha). Troca o código de uso único por uma sessão de verdade
 * e devolve a pessoa para dentro do site.
 */
export async function GET(request: NextRequest) {
  const { searchParams, origin } = new URL(request.url);
  const code = searchParams.get("code");
  const proximo = searchParams.get("next");

  // Mesmo cuidado da página de conta: só destino interno.
  const destino = proximo && proximo.startsWith("/") && !proximo.startsWith("//") ? proximo : "/conta";

  if (code) {
    const supabase = await createClient();
    const { error } = await supabase.auth.exchangeCodeForSession(code);
    if (!error) return NextResponse.redirect(`${origin}${destino}`);
  }

  return NextResponse.redirect(`${origin}/conta?erro=link_invalido`);
}
