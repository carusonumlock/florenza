/* As listas das abas Pedidos, Clientes e Catálogo.
 *
 * Mesmo contrato de dashboard-data.ts: com Supabase plugado consulta o banco,
 * sem ele devolve os dados de exemplo. Quem chama não sabe a diferença.
 */
import { createClient } from "@/lib/supabase/server";
import { supabaseConfigurado } from "@/lib/supabase/config";
import { produtos as produtosLocais, categorias as categoriasLocais } from "@/lib/data/catalogo-local";
import { CLIENTES_DEMO, PEDIDOS_DEMO } from "@/lib/admin/dados-demo";

export type PedidoAdmin = {
  id: string;
  numero: number;
  nome: string;
  email: string | null;
  telefone: string | null;
  cidade: string | null;
  uf: string | null;
  origem: string;
  status: string;
  total_centavos: number;
  created_at: string;
  itens: { sku: string; nome: string; preco_centavos: number; quantidade: number }[];
};

export type ClienteAdmin = {
  id: string;
  nome: string;
  email: string | null;
  telefone: string | null;
  cidade: string | null;
  uf: string | null;
  origem: string;
  created_at: string;
  observacoes: string | null;
};

export type ProdutoAdmin = {
  id: string;
  sku: string;
  slug: string;
  categoria_slug: string;
  nome: string;
  preco_centavos: number;
  imagem_url: string | null;
  estoque: number;
  ativo: boolean;
};

export async function listarPedidosAdmin(): Promise<PedidoAdmin[]> {
  if (!supabaseConfigurado()) {
    return [...PEDIDOS_DEMO].sort(
      (a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
    );
  }

  const supabase = await createClient();
  const { data } = await supabase
    .from("pedidos")
    .select(
      "id, numero, nome, email, telefone, cidade, uf, origem, status, total_centavos, created_at, " +
        "pedido_itens(sku, nome, preco_centavos, quantidade)"
    )
    .order("created_at", { ascending: false })
    .limit(200);

  // O cast existe porque o projeto ainda não tem os tipos gerados do banco
  // (`npx supabase gen types typescript --linked` só roda com um projeto
  // linkado). Com eles, o supabase-js infere a relação aninhada sozinho e este
  // tipo intermediário pode sair.
  type LinhaPedido = Omit<PedidoAdmin, "itens"> & { pedido_itens: PedidoAdmin["itens"] | null };
  const linhas = (data ?? []) as unknown as LinhaPedido[];

  return linhas.map(({ pedido_itens, ...resto }) => ({ ...resto, itens: pedido_itens ?? [] }));
}

export async function listarClientesAdmin(): Promise<ClienteAdmin[]> {
  if (!supabaseConfigurado()) {
    return [...CLIENTES_DEMO].sort(
      (a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
    );
  }

  const supabase = await createClient();
  const { data } = await supabase
    .from("vw_clientes")
    .select("id, nome, email, telefone, cidade, uf, origem, created_at, observacoes")
    .order("created_at", { ascending: false })
    .limit(500);

  return (data ?? []) as ClienteAdmin[];
}

export async function listarProdutosAdmin(): Promise<ProdutoAdmin[]> {
  if (!supabaseConfigurado()) {
    return produtosLocais.map((p) => ({
      id: p.sku,
      sku: p.sku,
      slug: p.slug,
      categoria_slug: p.categoriaSlug,
      nome: p.nome,
      preco_centavos: p.precoCentavos,
      imagem_url: p.imagemUrl,
      estoque: p.estoque,
      ativo: p.ativo,
    }));
  }

  const supabase = await createClient();
  const { data } = await supabase
    .from("produtos")
    .select("id, sku, slug, categoria_slug, nome, preco_centavos, imagem_url, estoque, ativo")
    .order("categoria_slug")
    .order("sku");

  return (data ?? []) as ProdutoAdmin[];
}

export async function listarCategoriasAdmin() {
  if (!supabaseConfigurado()) {
    return categoriasLocais.map((c) => ({ slug: c.slug, nome: c.nome }));
  }
  const supabase = await createClient();
  const { data } = await supabase.from("categorias").select("slug, nome").order("ordem");
  return (data ?? []) as { slug: string; nome: string }[];
}
