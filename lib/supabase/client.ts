import { createBrowserClient } from "@supabase/ssr";
import { SUPABASE_KEY, SUPABASE_URL } from "@/lib/supabase/config";

/**
 * Cliente para componentes "use client".
 *
 * É uma função, chamada dentro de cada handler, e não um singleton exportado:
 * o `createBrowserClient` já devolve a mesma instância por baixo, e guardar a
 * referência num módulo faria o cliente nascer junto com o bundle — antes de a
 * sessão existir.
 */
export function createClient() {
  return createBrowserClient(SUPABASE_URL, SUPABASE_KEY);
}
