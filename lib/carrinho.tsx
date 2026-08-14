"use client";

import { createContext, useCallback, useContext, useMemo, useSyncExternalStore } from "react";

/**
 * Carrinho — vive no localStorage.
 *
 * Não vai para o banco de propósito: carrinho é rascunho, e gravar cada clique
 * de "adicionar" criaria linha de pedido para quem só estava olhando. O que
 * chega ao banco é o pedido fechado, no checkout.
 *
 * Guarda o preço em centavos junto com o item. Assim o total é sempre soma de
 * inteiros, e o valor que a pessoa viu na vitrine é o que ela vê no carrinho,
 * mesmo que a etiqueta mude enquanto a aba fica aberta.
 *
 * A leitura usa `useSyncExternalStore`, e não `useState` + `useEffect`. O
 * localStorage é literalmente uma fonte externa de estado, que é o caso de uso
 * desse hook: ele resolve a hidratação (o servidor não tem localStorage) sem
 * chamar setState dentro de efeito, o que dispararia renderização em cascata. E
 * vem de brinde o que o outro desenho não dava: abrir o site em duas abas
 * mantém o mesmo carrinho nas duas, porque o evento `storage` avisa.
 */
export type ItemCarrinho = {
  sku: string;
  slug: string;
  nome: string;
  precoCentavos: number;
  imagemUrl: string;
  quantidade: number;
};

type Carrinho = {
  itens: ItemCarrinho[];
  quantidadeTotal: number;
  totalCentavos: number;
  adicionar: (item: Omit<ItemCarrinho, "quantidade">, quantidade?: number) => void;
  mudarQuantidade: (sku: string, quantidade: number) => void;
  remover: (sku: string) => void;
  esvaziar: () => void;
  /** Falso no servidor e durante a hidratação; evita a lista piscar "vazio". */
  pronto: boolean;
};

const CHAVE = "florenza:carrinho";
const EVENTO_LOCAL = "florenza:carrinho-mudou";

const VAZIO: ItemCarrinho[] = [];

/* `getSnapshot` PRECISA devolver a mesma referência enquanto o dado não muda —
 * se devolvesse um array novo a cada chamada, o React entenderia como mudança e
 * entraria em laço infinito. Por isso o cache do texto cru ao lado do valor. */
let cacheTexto: string | null = null;
let cacheValor: ItemCarrinho[] = VAZIO;

function lerSnapshot(): ItemCarrinho[] {
  const texto = window.localStorage.getItem(CHAVE);
  if (texto === cacheTexto) return cacheValor;
  cacheTexto = texto;

  if (!texto) {
    cacheValor = VAZIO;
    return cacheValor;
  }
  try {
    const dados = JSON.parse(texto);
    // localStorage é editável por quem usa e sobrevive a mudanças de formato
    // entre versões do site: só passa o que tem a forma esperada.
    cacheValor = Array.isArray(dados)
      ? dados.filter(
          (i) =>
            i &&
            typeof i.sku === "string" &&
            typeof i.precoCentavos === "number" &&
            typeof i.quantidade === "number"
        )
      : VAZIO;
  } catch {
    cacheValor = VAZIO;
  }
  return cacheValor;
}

function assinar(aoMudar: () => void) {
  // `storage` só dispara em OUTRAS abas; o evento próprio cobre esta aqui.
  window.addEventListener("storage", aoMudar);
  window.addEventListener(EVENTO_LOCAL, aoMudar);
  return () => {
    window.removeEventListener("storage", aoMudar);
    window.removeEventListener(EVENTO_LOCAL, aoMudar);
  };
}

function gravar(itens: ItemCarrinho[]) {
  window.localStorage.setItem(CHAVE, JSON.stringify(itens));
  window.dispatchEvent(new Event(EVENTO_LOCAL));
}

const ContextoCarrinho = createContext<Carrinho | null>(null);

export function ProvedorCarrinho({ children }: { children: React.ReactNode }) {
  const itens = useSyncExternalStore(assinar, lerSnapshot, () => VAZIO);
  const pronto = useSyncExternalStore(assinar, () => true, () => false);

  const alterar = useCallback(
    (transformar: (atuais: ItemCarrinho[]) => ItemCarrinho[]) => {
      gravar(transformar(lerSnapshot()));
    },
    []
  );

  const adicionar = useCallback(
    (item: Omit<ItemCarrinho, "quantidade">, quantidade = 1) => {
      alterar((atuais) => {
        const existente = atuais.find((i) => i.sku === item.sku);
        if (existente) {
          return atuais.map((i) =>
            i.sku === item.sku ? { ...i, quantidade: i.quantidade + quantidade } : i
          );
        }
        return [...atuais, { ...item, quantidade }];
      });
    },
    [alterar]
  );

  const mudarQuantidade = useCallback(
    (sku: string, quantidade: number) => {
      alterar((atuais) =>
        quantidade <= 0
          ? atuais.filter((i) => i.sku !== sku)
          : atuais.map((i) => (i.sku === sku ? { ...i, quantidade } : i))
      );
    },
    [alterar]
  );

  const remover = useCallback(
    (sku: string) => alterar((atuais) => atuais.filter((i) => i.sku !== sku)),
    [alterar]
  );

  const esvaziar = useCallback(() => alterar(() => []), [alterar]);

  const valor = useMemo<Carrinho>(
    () => ({
      itens,
      quantidadeTotal: itens.reduce((s, i) => s + i.quantidade, 0),
      totalCentavos: itens.reduce((s, i) => s + i.precoCentavos * i.quantidade, 0),
      adicionar,
      mudarQuantidade,
      remover,
      esvaziar,
      pronto,
    }),
    [itens, pronto, adicionar, mudarQuantidade, remover, esvaziar]
  );

  return <ContextoCarrinho.Provider value={valor}>{children}</ContextoCarrinho.Provider>;
}

export function useCarrinho(): Carrinho {
  const contexto = useContext(ContextoCarrinho);
  if (!contexto) throw new Error("useCarrinho precisa estar dentro de <ProvedorCarrinho>");
  return contexto;
}
