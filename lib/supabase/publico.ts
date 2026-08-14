import { createClient as createSupabaseClient } from "@supabase/supabase-js";
import { SUPABASE_KEY, SUPABASE_URL } from "@/lib/supabase/config";

/**
 * Cliente para leitura do que é público: catálogo, categorias, filtros.
 *
 * Existe separado de lib/supabase/server.ts por um motivo de renderização, não
 * de segurança. Aquele cliente lê os cookies da requisição para saber quem está
 * logado — e ler cookie faz o Next marcar a página como dinâmica, obrigando a
 * consultar o banco a cada visita. A vitrine não depende de quem está olhando:
 * o mesmo HTML serve para todo mundo, então ela continua sendo gerada na build
 * e servida pronta.
 *
 * Sem sessão, o Postgres atende como `anon`, e a RLS já garante que por esse
 * caminho só saem produtos com `ativo = true`. É a mesma proteção que vale para
 * qualquer visitante — não há privilégio nenhum aqui.
 */
export function createClientePublico() {
  return createSupabaseClient(SUPABASE_URL, SUPABASE_KEY, {
    auth: { persistSession: false, autoRefreshToken: false },
  });
}
