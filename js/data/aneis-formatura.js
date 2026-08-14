// ============================================================
// FICHA DOS ANÉIS DE FORMATURA — fonte de dados do catálogo.
//
// Hoje é um array local, embutido em js/bundle.js pelo esbuild. Isso mantém
// o site funcionando por file:// (sem servidor), como o resto do protótipo.
// Quando o Supabase entrar, só esta camada muda: `listarProdutos` vira uma
// consulta e o resto do catálogo (js/catalogo.js) continua igual — ele já
// trata o retorno como Promise. Ver o rodapé deste arquivo.
//
// De onde vêm os campos:
//   sku            nome do arquivo original em aneisFormatura/ (CODIGO_R$PRECO)
//   precoCentavos  o mesmo preço, em centavos (ver "por que centavos" no rodapé)
//   imagem         gerada por tools/importar-aneis-formatura.py
//   demais campos  descrição comercial da peça, escrita a partir da foto
// ============================================================

export const categoria = {
  slug: "aneis-formatura",
  nome: "Anéis de Formatura",
};

// O filtro da vitrine é pela cor da pedra, não pelo metal: em anel de
// formatura a cor é o que identifica o curso, e todas as peças da categoria
// são do mesmo metal. A ordem aqui é a ordem dos botões na página.
export const coresDePedra = [
  { slug: "vermelha", nome: "Vermelha", amostra: "#b3102b" },
  { slug: "rosa", nome: "Rosa", amostra: "#d4276e" },
  { slug: "azul", nome: "Azul", amostra: "#1b4fb0" },
  { slug: "verde", nome: "Verde", amostra: "#0f8a4e" },
  { slug: "amarela", nome: "Amarela", amostra: "#e3a516" },
  { slug: "negra", nome: "Negra", amostra: "#24211f" },
];

const METAL = "Ouro 18K (750)";

export const produtos = [
  {
    sku: "3001",
    slug: "anel-citrino-arabesco",
    nome: "Anel Citrino Arabesco",
    metal: METAL,
    pedra: "Citrino",
    corPedra: "amarela",
    lapidacao: "Redonda",
    descricao:
      "Citrino redondo cercado por um halo de diamantes, sobre um aro largo com arabescos em alto relevo.",
    precoCentavos: 349000,
    ativo: true,
  },
  {
    sku: "3002",
    slug: "anel-rubi-bicolor",
    nome: "Anel Rubi Bicolor",
    metal: METAL,
    pedra: "Rubi",
    corPedra: "vermelha",
    lapidacao: "Oval",
    descricao:
      "Rubi oval em halo de diamantes, com ombros em ouro branco cravejado que abrem contraste sobre o aro amarelo.",
    precoCentavos: 349000,
    ativo: true,
  },
  {
    sku: "3003",
    slug: "anel-esmeralda-leque",
    nome: "Anel Esmeralda Leque",
    metal: METAL,
    pedra: "Esmeralda",
    corPedra: "verde",
    lapidacao: "Redonda",
    descricao:
      "Esmeralda redonda sustentada por garras altas, com diamantes abertos em leque sobre um aro largo e polido.",
    precoCentavos: 349000,
    ativo: true,
  },
  {
    sku: "3004",
    slug: "anel-safira-floral",
    nome: "Anel Safira Floral",
    metal: METAL,
    pedra: "Safira azul",
    corPedra: "azul",
    lapidacao: "Redonda",
    descricao:
      "Safira azul em halo margarida, com folhas gravadas à mão nas laterais do aro.",
    precoCentavos: 349000,
    ativo: true,
  },
  {
    sku: "3005",
    slug: "anel-safira-negra-arabesco",
    nome: "Anel Safira Negra",
    metal: METAL,
    pedra: "Safira negra",
    corPedra: "negra",
    lapidacao: "Oval",
    descricao:
      "Pedra negra oval em halo de diamantes, entre arabescos vazados nas laterais do aro.",
    precoCentavos: 299000,
    ativo: true,
  },
  {
    sku: "3010",
    slug: "anel-safira-navete",
    nome: "Anel Safira Navete",
    metal: METAL,
    pedra: "Safira azul",
    corPedra: "azul",
    lapidacao: "Navete",
    descricao:
      "Safira em lapidação navete, contornada por diamantes, sobre aro duplo que se abre em V.",
    precoCentavos: 210000,
    ativo: true,
  },
  {
    sku: "3184",
    slug: "anel-esmeralda-navete",
    nome: "Anel Esmeralda Navete",
    metal: METAL,
    pedra: "Esmeralda",
    corPedra: "verde",
    lapidacao: "Navete",
    descricao:
      "Esmeralda navete em halo de diamantes, sobre aro duplo em V — o desenho mais leve da linha.",
    precoCentavos: 226000,
    ativo: true,
  },
  {
    sku: "3185",
    slug: "anel-safira-oval",
    nome: "Anel Safira Oval",
    metal: METAL,
    pedra: "Safira azul",
    corPedra: "azul",
    lapidacao: "Oval",
    descricao:
      "Safira oval em halo cravejado, com galeria vazada que deixa a luz atravessar a pedra.",
    precoCentavos: 242000,
    ativo: true,
  },
  {
    sku: "3187",
    slug: "anel-rubi-classico",
    nome: "Anel Rubi Clássico",
    metal: METAL,
    pedra: "Rubi",
    corPedra: "vermelha",
    lapidacao: "Oval",
    descricao:
      "Rubi oval em halo de diamantes sobre aro fino e liso: o desenho clássico do anel de formatura.",
    precoCentavos: 242000,
    ativo: true,
  },
  {
    sku: "3514",
    slug: "anel-topazio-princesa",
    nome: "Anel Topázio Princesa",
    metal: METAL,
    pedra: "Topázio azul-londres",
    corPedra: "azul",
    lapidacao: "Princesa",
    descricao:
      "Topázio azul em lapidação princesa, com halo quadrado de diamantes sobre aro duplo.",
    precoCentavos: 226000,
    ativo: true,
  },
  {
    sku: "3517",
    slug: "anel-rubi-aro-duplo",
    nome: "Anel Rubi Aro Duplo",
    metal: METAL,
    pedra: "Rubi",
    corPedra: "vermelha",
    lapidacao: "Redonda",
    descricao:
      "Rubi redondo em halo de diamantes, elevado por uma galeria de garras sobre aro duplo.",
    precoCentavos: 242000,
    ativo: true,
  },
  {
    sku: "3537",
    slug: "anel-turmalina-navete",
    nome: "Anel Turmalina Navete",
    metal: METAL,
    pedra: "Turmalina rosa",
    corPedra: "rosa",
    lapidacao: "Navete",
    descricao:
      "Turmalina rosa navete em halo de diamantes, com ombros cravejados que seguem até a base do aro.",
    precoCentavos: 314000,
    ativo: true,
  },
  {
    sku: "3538",
    slug: "anel-topazio-oval",
    nome: "Anel Topázio Oval",
    metal: METAL,
    pedra: "Topázio azul",
    corPedra: "azul",
    lapidacao: "Oval",
    descricao:
      "Topázio azul oval em halo de diamantes, sobre aro com frisos gravados nas laterais.",
    precoCentavos: 317900,
    ativo: true,
  },
  {
    sku: "3539",
    slug: "anel-agua-marinha-halo",
    nome: "Anel Água-marinha",
    metal: METAL,
    pedra: "Água-marinha",
    corPedra: "azul",
    lapidacao: "Redonda",
    descricao:
      "Água-marinha redonda em halo de diamantes, sobre aro com frisos gravados nas laterais.",
    precoCentavos: 317900,
    ativo: true,
  },
  {
    sku: "3555",
    slug: "anel-turmalina-princesa",
    nome: "Anel Turmalina Princesa",
    metal: METAL,
    pedra: "Turmalina rosa",
    corPedra: "rosa",
    lapidacao: "Princesa",
    descricao:
      "Turmalina rosa em lapidação princesa, com halo quadrado de diamantes e aro cravejado.",
    precoCentavos: 290000,
    ativo: true,
  },
  {
    sku: "9257",
    slug: "anel-rubi-entrelacado",
    nome: "Anel Rubi Entrelaçado",
    metal: METAL,
    pedra: "Rubi",
    corPedra: "vermelha",
    lapidacao: "Oval",
    descricao:
      "Rubi oval em halo de diamantes, sobre aro entrelaçado — a peça mais imponente da categoria.",
    precoCentavos: 418000,
    ativo: true,
  },
];

// Os caminhos das imagens seguem do sku, então não precisam ser repetidos em
// cada ficha: quem gera os arquivos é tools/importar-aneis-formatura.py, com
// esta mesma convenção de nome.
export function imagensDoProduto(produto) {
  return {
    src: `produtos/formatura/${produto.sku}.webp`,
    srcPequena: `produtos/formatura/${produto.sku}-sm.webp`,
  };
}

// ---------- Camada de acesso ----------
// Único ponto que o catálogo enxerga. Devolve uma Promise de propósito: assim
// a troca por Supabase não mexe em js/catalogo.js.
//
//   import { createClient } from "@supabase/supabase-js";
//   const supabase = createClient(URL, ANON_KEY);
//
//   export async function listarProdutos({ categoria: slug } = {}) {
//     const { data, error } = await supabase
//       .from("produtos")
//       .select("sku, slug, nome, metal, pedra, cor_pedra, lapidacao, descricao, preco_centavos, imagem_url")
//       .eq("categoria_slug", slug ?? categoria.slug)
//       .eq("ativo", true)
//       .order("sku");
//     if (error) throw error;
//     return data.map(paraFicha); // snake_case do banco -> camelCase daqui
//   }
export function listarProdutos({ categoria: slug } = {}) {
  if (slug && slug !== categoria.slug) return Promise.resolve([]);
  return Promise.resolve(produtos.filter((produto) => produto.ativo));
}

// ---------- Por que preço em centavos ----------
// R$ 3.179,00 vira 317900, um inteiro. Ponto flutuante erra em somas de
// dinheiro (0.1 + 0.2 !== 0.3), e o mesmo vale do lado do banco: a coluna
// correspondente no Supabase deve ser `integer` (ou `numeric(12,2)`), nunca
// `float`/`real`. A formatação para "R$ 3.179,00" acontece só na exibição,
// em js/catalogo.js.
