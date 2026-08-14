/* DADOS DE DEMONSTRAÇÃO — só aparecem enquanto o Supabase não está plugado.
 *
 * Por que existir: sem chaves configuradas o painel abriria com todos os
 * números zerados, o mapa cinza e os gráficos vazios — impossível saber se ele
 * está certo ou quebrado. Com estes dados dá para conferir o layout, a escala
 * do mapa, os eixos e os estados vazios antes de existir um banco.
 *
 * Assim que NEXT_PUBLIC_SUPABASE_URL existir, nada daqui é usado. O painel
 * mostra um aviso em cima enquanto está neste modo, para ninguém confundir
 * exemplo com faturamento de verdade.
 *
 * Tudo é determinístico: mesma entrada, mesma saída. Nenhum Math.random(), para
 * a tela não mudar a cada recarga e uma captura poder ser comparada com outra.
 */
import { produtos } from "@/lib/data/catalogo-local";

export type PedidoDemo = {
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

/* Distribuição desenhada à mão em vez de sorteada: reproduz a concentração real
 * do varejo brasileiro (Sudeste pesado, Norte ralo). Um sorteio uniforme pintaria
 * o mapa quase todo igual e esconderia justamente o que ele existe para mostrar. */
const DISTRIBUICAO: Array<[uf: string, cidade: string, pedidos: number]> = [
  ["SP", "São Paulo", 14],
  ["MG", "Belo Horizonte", 9],
  ["RJ", "Rio de Janeiro", 7],
  ["PR", "Curitiba", 5],
  ["RS", "Porto Alegre", 4],
  ["BA", "Salvador", 4],
  ["SC", "Florianópolis", 3],
  ["GO", "Goiânia", 3],
  ["PE", "Recife", 3],
  ["CE", "Fortaleza", 2],
  ["ES", "Vitória", 2],
  ["DF", "Brasília", 2],
  ["MT", "Cuiabá", 1],
  ["MS", "Campo Grande", 1],
  ["PA", "Belém", 1],
  ["AM", "Manaus", 1],
  ["MA", "São Luís", 1],
  ["RN", "Natal", 1],
];

const NOMES = [
  "Ana Beatriz Moraes", "Carlos Eduardo Lima", "Mariana Prado", "Rafael Antunes",
  "Juliana Castro", "Fernando Rocha", "Patrícia Nogueira", "Bruno Sales",
  "Camila Ferraz", "Diego Marinho", "Letícia Vasques", "Thiago Bandeira",
  "Renata Siqueira", "Gustavo Peixoto", "Isabela Duarte", "Marcelo Tavares",
];

const ORIGENS = ["site", "whatsapp", "instagram", "loja", "indicacao"];
const STATUS = ["entregue", "pago", "enviado", "em_producao", "pago", "entregue", "aguardando_pagamento", "cancelado"];

/** Data determinística: espalha os pedidos pelos últimos 11 meses. */
function dataDoPedido(indice: number, total: number): string {
  const agora = new Date();
  // Mais recentes concentram mais pedidos — uma loja que está crescendo.
  const mesesAtras = Math.floor(((total - indice) / total) ** 1.6 * 11);
  const diaSorteado = ((indice * 7) % 27) + 1;
  // No mês corrente o dia não pode passar de hoje: pedido com data no futuro
  // faria o painel parecer quebrado, e sairia da conta de "faturamento do mês".
  const dia = mesesAtras === 0 ? Math.min(diaSorteado, agora.getDate()) : diaSorteado;
  const d = new Date(agora.getFullYear(), agora.getMonth() - mesesAtras, dia, 14, 30);
  return d.toISOString();
}

function construirPedidos(): PedidoDemo[] {
  const lista: PedidoDemo[] = [];
  const total = DISTRIBUICAO.reduce((s, [, , n]) => s + n, 0);
  let i = 0;

  for (const [uf, cidade, quantos] of DISTRIBUICAO) {
    for (let k = 0; k < quantos; k++) {
      const produto = produtos[i % produtos.length];
      const quantidade = i % 11 === 0 ? 2 : 1;
      const item = {
        sku: produto.sku,
        nome: produto.nome,
        preco_centavos: produto.precoCentavos,
        quantidade,
      };
      const nome = NOMES[i % NOMES.length];

      lista.push({
        id: `demo-${i}`,
        numero: 1000 + i,
        nome,
        email: `${nome.split(" ")[0].toLowerCase()}@exemplo.com`,
        telefone: null,
        cidade,
        uf,
        origem: ORIGENS[i % ORIGENS.length],
        status: STATUS[i % STATUS.length],
        total_centavos: produto.precoCentavos * quantidade,
        created_at: dataDoPedido(i, total),
        itens: [item],
      });
      i++;
    }
  }
  return lista;
}

export const PEDIDOS_DEMO: PedidoDemo[] = construirPedidos();

export type ClienteDemo = {
  id: string;
  nome: string;
  email: string | null;
  telefone: string | null;
  cidade: string | null;
  uf: string | null;
  origem: "site" | "manual";
  created_at: string;
  observacoes: string | null;
};

/* Um cliente por pedido seria irreal: nem todo comprador cria conta, e o painel
 * precisa mostrar as duas origens convivendo. */
export const CLIENTES_DEMO: ClienteDemo[] = PEDIDOS_DEMO.slice(0, 22).map((pedido, i) => ({
  id: `cliente-demo-${i}`,
  nome: pedido.nome,
  email: pedido.email,
  telefone: i % 3 === 0 ? "(31) 9 8888-0000" : null,
  cidade: pedido.cidade,
  uf: pedido.uf,
  origem: i % 3 === 0 ? "manual" : "site",
  created_at: pedido.created_at,
  observacoes: i % 3 === 0 ? "Cadastrada no balcão da loja." : null,
}));
