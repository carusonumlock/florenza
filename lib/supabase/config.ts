/**
 * Uma pergunta só: o Supabase já está plugado?
 *
 * Enquanto o projeto não existe (ou enquanto alguém clona o repositório sem as
 * chaves), o site precisa continuar abrindo. A vitrine cai para o catálogo
 * local e o painel entra em modo de demonstração, com dados de exemplo e um
 * aviso na tela — em vez de estourar uma tela branca de erro.
 *
 * As duas variáveis são `NEXT_PUBLIC_` porque o Supabase foi desenhado para a
 * chave publicável circular no navegador: quem protege os dados é a RLS no
 * banco, não o segredo da chave. A service-role key, essa sim secreta, não
 * entra neste projeto em lugar nenhum.
 */
export const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL ?? "";
export const SUPABASE_KEY = process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY ?? "";

export function supabaseConfigurado(): boolean {
  return SUPABASE_URL.length > 0 && SUPABASE_KEY.length > 0;
}
