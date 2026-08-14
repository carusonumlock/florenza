import { createServerClient } from "@supabase/ssr";
import { cookies } from "next/headers";
import { SUPABASE_KEY, SUPABASE_URL } from "@/lib/supabase/config";

/**
 * Cliente para Server Components, Route Handlers e Server Actions.
 *
 * Precisa ser criado a cada requisição porque carrega os cookies daquela
 * requisição — um cliente reaproveitado entre requisições serviria a sessão de
 * uma pessoa para outra.
 */
export async function createClient() {
  const cookieStore = await cookies();

  return createServerClient(SUPABASE_URL, SUPABASE_KEY, {
    cookies: {
      getAll() {
        return cookieStore.getAll();
      },
      setAll(cookiesToSet) {
        try {
          for (const { name, value, options } of cookiesToSet) {
            cookieStore.set(name, value, options);
          }
        } catch {
          // Chamado de um Server Component, que não pode escrever cookie. Não é
          // erro: o proxy já renovou a sessão antes de chegar aqui.
        }
      },
    },
  });
}
