import {
  formatarPreco,
  linhaDoMaterial,
  type Categoria,
  type Produto,
} from "@/lib/catalogo";

/**
 * O card da vitrine. Reproduz elemento por elemento os dois formatos que
 * existiam no site: o que js/catalogo.js montava para os anéis de formatura e o
 * que estava escrito à mão nas páginas de aliança.
 *
 * A diferença entre eles é a `variante` da categoria e não é cosmética:
 * `produto` são as fotos recortadas com fundo transparente, deitadas, que
 * precisam de 5/4 + object-fit:contain (os modificadores `--produto`); `foto`
 * são as fotos de aliança, em pé, que usam o 4/5 + cover do padrão. Sem os
 * modificadores, o `cover` corta justamente o aro do anel.
 *
 * O escape manual de js/catalogo.js (`esc()`) não existe mais: JSX escapa
 * sozinho, inclusive quando o texto passar a vir do banco.
 */
const CoracaoFav = () => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.4" aria-hidden="true">
    <path d="M12 20s-7-4.35-9.5-8.5C.8 8.1 2.4 4.8 5.8 4.2c2-.35 3.7.6 4.9 2.2 1.2-1.6 2.9-2.55 4.9-2.2 3.4.6 5 3.9 3.3 7.3C19 15.65 12 20 12 20z" />
  </svg>
);

const Sacola = () => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" aria-hidden="true">
    <path d="M6 2 3 6v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2V6l-3-4H6zM3 6h18M16 10a4 4 0 0 1-8 0" />
  </svg>
);

function textoAlternativo(produto: Produto): string {
  if (produto.alt) return produto.alt;
  // Montado como em js/catalogo.js. O `?? ""` existe porque lapidação é nula
  // para aliança — no original, `produto.lapidacao.toLowerCase()` teria
  // quebrado a página assim que um produto sem lapidação entrasse na grade.
  const pedra = produto.pedra ? ` com pedra ${produto.pedra}` : "";
  const lapidacao = produto.lapidacao ? ` em lapidação ${produto.lapidacao.toLowerCase()}` : "";
  return `${produto.nome} — ${produto.metal ?? ""}${pedra}${lapidacao}`;
}

export function RingCard({
  produto,
  categoria,
  escondido = false,
  colapsado = false,
}: {
  produto: Produto;
  categoria: Categoria;
  /** Aplica .is-hidden — o card some com transição, ainda ocupando espaço. */
  escondido?: boolean;
  /** display:none, aplicado só depois da transição, para a grade refluir. */
  colapsado?: boolean;
}) {
  const ehProduto = categoria.variante === "produto";
  const tag = categoria.filtroCampo === "corPedra" ? produto.corPedra : produto.material;

  return (
    <article
      className={`ringCard${escondido ? " is-hidden" : ""}`}
      style={colapsado ? { display: "none" } : undefined}
      data-tags={tag ?? undefined}
      data-material={produto.material ?? undefined}
      data-sku={produto.sku}
    >
      <button className="ringCard__fav" type="button" aria-label={`Favoritar ${produto.nome}`}>
        <CoracaoFav />
      </button>

      <a
        className={`ringCard__media${ehProduto ? " ringCard__media--produto" : ""}`}
        href="#"
        aria-label={`Ver ${produto.nome}`}
      >
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          className={`ringCard__img${ehProduto ? " ringCard__img--produto" : ""}`}
          src={produto.imagemUrl}
          srcSet={produto.imagemSmUrl ? `${produto.imagemSmUrl} 480w, ${produto.imagemUrl} 960w` : undefined}
          sizes={produto.imagemSmUrl ? "(max-width: 640px) 88vw, 280px" : undefined}
          alt={textoAlternativo(produto)}
          loading="lazy"
          decoding="async"
        />
      </a>

      <div className="ringCard__body">
        <h3 className="ringCard__name">{produto.nome}</h3>
        <p className="ringCard__material">{linhaDoMaterial(produto)}</p>
        <p className="ringCard__desc">{produto.descricao}</p>
        {/* A linha do código só existia nos anéis de formatura, onde o SKU vem
            do nome do arquivo da foto e é usado na logística do cliente. */}
        {produto.lapidacao && (
          <p className="ringCard__sku">
            Cód. {produto.sku} · Lapidação {produto.lapidacao}
          </p>
        )}
        <div className="ringCard__foot">
          <span className="ringCard__price">{formatarPreco(produto.precoCentavos)}</span>
          <a className="ringCard__view" href="#" aria-label={`Ver detalhes de ${produto.nome}`}>
            &rarr;
          </a>
        </div>
        <a className="ringCard__buy" href="#" aria-label={`Comprar ${produto.nome}`}>
          <Sacola />
          Comprar
        </a>
      </div>
    </article>
  );
}
