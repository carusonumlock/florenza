"use client";

import { useEffect, useRef, useState } from "react";
import { RingCard } from "@/components/RingCard";
import { tagDoProduto, textoDaContagem, type Categoria, type Produto } from "@/lib/catalogo";

/**
 * A vitrine de uma categoria: contagem, filtros e grade — o que js/catalogo.js
 * montava em runtime e o que estava fixo no HTML das páginas de aliança.
 *
 * A coreografia do filtro é a mesma de antes e é a razão de este componente ser
 * de cliente: o card sai com transição (classe `is-hidden`) e só depois recebe
 * `display:none`, senão ele sumiria seco e a grade daria um salto. Na volta a
 * ordem se inverte — primeiro volta a ocupar espaço, e só no quadro seguinte a
 * classe sai, senão a transição de entrada não dispara. Era o `void
 * card.offsetWidth` do código antigo; aqui é um requestAnimationFrame.
 */
const DURACAO_SAIDA = 380;

export function CatalogoGrade({ categoria, produtos }: { categoria: Categoria; produtos: Produto[] }) {
  const [filtro, setFiltro] = useState("all");
  const [escondidos, setEscondidos] = useState<Set<string>>(new Set());
  const [colapsados, setColapsados] = useState<Set<string>>(new Set());

  const casa = (produto: Produto, valor = filtro) =>
    valor === "all" || tagDoProduto(produto, categoria.filtroCampo) === valor;

  // A coreografia roda no clique, e não num efeito. Filtro só muda por clique,
  // e sequenciar dentro do próprio manipulador evita a renderização em cascata
  // que setState dentro de efeito provoca.
  const quadro = useRef(0);
  const relogio = useRef(0);

  function aplicarFiltro(valor: string) {
    cancelAnimationFrame(quadro.current);
    window.clearTimeout(relogio.current);

    setFiltro(valor);

    const alvo = new Set(
      produtos.filter((produto) => !casa(produto, valor)).map((produto) => produto.sku)
    );

    // Quem volta a aparecer sai do colapso já neste commit; só no quadro
    // seguinte a classe sai, senão a transição de entrada não dispara.
    setColapsados((anterior) => new Set([...anterior].filter((sku) => alvo.has(sku))));
    quadro.current = requestAnimationFrame(() => setEscondidos(alvo));
    relogio.current = window.setTimeout(() => setColapsados(alvo), DURACAO_SAIDA);
  }

  useEffect(
    () => () => {
      cancelAnimationFrame(quadro.current);
      window.clearTimeout(relogio.current);
    },
    []
  );

  const visiveis = produtos.filter((produto) => casa(produto)).length;

  // Só entram as opções que existem no acervo — um botão "Verde" sem nenhuma
  // esmeralda no estoque leva a uma grade vazia. Abaixo de duas, a barra some.
  const presentes = new Set(produtos.map((produto) => tagDoProduto(produto, categoria.filtroCampo)));
  const opcoes = categoria.filtroCampo
    ? categoria.opcoes.filter((opcao) => presentes.has(opcao.slug))
    : [];
  const mostrarFiltros = opcoes.length >= 2;

  return (
    <>
      <p className="categoryPage__count">{textoDaContagem(visiveis, produtos.length)}</p>

      {mostrarFiltros && (
        <div
          className="catalog__filters categoryPage__filters"
          role="group"
          aria-label={categoria.rotuloFiltro}
        >
          <button
            className={`catalog__filter${filtro === "all" ? " is-active" : ""}`}
            type="button"
            onClick={() => aplicarFiltro("all")}
          >
            Todas
          </button>
          {opcoes.map((opcao) => (
            <button
              key={opcao.slug}
              className={`catalog__filter catalog__filter--cor${filtro === opcao.slug ? " is-active" : ""}`}
              type="button"
              onClick={() => aplicarFiltro(opcao.slug)}
            >
              <span
                className="catalog__swatch"
                style={{ ["--swatch" as string]: opcao.amostra ?? undefined }}
                aria-hidden="true"
              />
              {opcao.nome}
            </button>
          ))}
        </div>
      )}

      <div
        className={`catalog__grid ${
          categoria.variante === "produto" ? "js-reveal-catalogo" : "js-reveal-stagger"
        }`}
      >
        {produtos.map((produto) => (
          <RingCard
            key={produto.sku}
            produto={produto}
            categoria={categoria}
            escondido={escondidos.has(produto.sku)}
            colapsado={colapsados.has(produto.sku)}
          />
        ))}
      </div>
    </>
  );
}
