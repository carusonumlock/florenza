/* CAMADA DE ACESSO AO CATÁLOGO — único ponto que a vitrine enxerga.
 *
 * Herda o papel que `listarProdutos()` tinha em js/data/aneis-formatura.js: as
 * páginas de categoria não sabem de onde os produtos vêm. Hoje vêm de
 * lib/data/catalogo-local.ts; na Etapa 3 passam a vir do Supabase e só o corpo
 * destas funções muda.
 *
 * A consulta equivalente já está escrita, para quando a troca acontecer:
 *
 *   const supabase = await createClient();
 *   const { data, error } = await supabase
 *     .from("produtos")
 *     .select("sku, slug, categoria_slug, nome, metal, pedra, cor_pedra, lapidacao, " +
 *             "largura_mm, material, descricao, preco_centavos, imagem_url, imagem_sm_url, estoque, ativo")
 *     .eq("categoria_slug", categoriaSlug)
 *     .eq("ativo", true)
 *     .order("sku");
 *   if (error) throw error;
 *   return data.map(paraFicha);   // snake_case do banco -> camelCase daqui
 */
import { categorias, produtos, type Categoria, type Produto } from "@/lib/data/catalogo-local";

export type { Categoria, Produto, OpcaoFiltro } from "@/lib/data/catalogo-local";

/** Todas as categorias, na ordem em que aparecem no site. */
export async function listarCategorias(): Promise<Categoria[]> {
  return categorias;
}

/** Uma categoria pelo slug — `undefined` quando não existe (vira 404). */
export async function buscarCategoria(slug: string): Promise<Categoria | undefined> {
  return categorias.find((categoria) => categoria.slug === slug);
}

/** Produtos ativos de uma categoria, na ordem do SKU. */
export async function listarProdutos(categoriaSlug: string): Promise<Produto[]> {
  return produtos
    .filter((produto) => produto.categoriaSlug === categoriaSlug && produto.ativo)
    .sort((a, b) => a.sku.localeCompare(b.sku));
}

/** Um produto pelo slug — usado pela página de produto. */
export async function buscarProduto(slug: string): Promise<Produto | undefined> {
  return produtos.find((produto) => produto.slug === slug && produto.ativo);
}

const moeda = new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" });

/** 317900 -> "R$ 3.179,00". Formatar só na exibição; o dado é sempre inteiro. */
export function formatarPreco(precoCentavos: number): string {
  return moeda.format(precoCentavos / 100);
}

/**
 * A linha logo abaixo do nome no card. A ficha guarda metal, pedra e largura
 * separados porque o banco os guarda assim; quem junta é a exibição — e junta
 * diferente por categoria: anel de formatura mostra a pedra, aliança mostra a
 * largura. Era exatamente o texto que estava fixo no HTML de cada card.
 */
export function linhaDoMaterial(produto: Produto): string {
  const partes = [produto.metal];
  if (produto.pedra) partes.push(produto.pedra);
  else if (produto.larguraMm != null) partes.push(`${produto.larguraMm}mm`);
  return partes.filter(Boolean).join(" · ");
}

/** "16 peças nesta categoria" / "8 de 16 peças" — filtrado, a primeira mentiria. */
export function textoDaContagem(visiveis: number, total: number): string {
  const peca = total === 1 ? "peça" : "peças";
  if (visiveis < total) return `${visiveis} de ${total} ${peca}`;
  return `${total} ${peca} nesta categoria`;
}

/** O valor pelo qual o card é filtrado, conforme o campo que a categoria usa. */
export function tagDoProduto(produto: Produto, filtroCampo: Categoria["filtroCampo"]): string | null {
  if (filtroCampo === "corPedra") return produto.corPedra;
  if (filtroCampo === "material") return produto.material;
  return null;
}
