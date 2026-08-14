"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";

/**
 * Carrossel horizontal de categorias — portado de js/aliancas.js. Uma categoria
 * por vez, scroll-snap: a imagem (PNG sem fundo) flutua sem moldura, com a
 * descrição abaixo. Arrastar, rolar para o lado ou usar as setas.
 *
 * As URLs eram `aliancas-ouro.html`; agora são rotas, mas o `target="_blank"`
 * do original foi mantido — abrir a categoria em aba nova é o comportamento
 * que o site tem hoje.
 */
const CATEGORIAS = [
  {
    href: "/aliancas-ouro",
    img: "/categorias/aliançaouro.png",
    alt: "Aliança de ouro Florenza",
    rotulo: "Alianças de Ouro",
    desc: "Alianças de Ouro — peças atemporais, lapidadas à mão para selar promessas que atravessam gerações.",
  },
  {
    href: "/aliancas-prata",
    img: "/categorias/alliançaprata.png",
    alt: "Aliança de prata Florenza",
    rotulo: "Alianças de Prata",
    desc: "Alianças de Prata — elegância discreta em prata, para quem escolhe simplicidade com sofisticação.",
  },
  {
    href: "/aneis-formatura",
    img: "/categorias/anelformatura.png",
    alt: "Anel de formatura Florenza",
    rotulo: "Anéis de Formatura",
    desc: "Anéis de Formatura — celebre uma conquista com uma joia que marca o início de uma nova história.",
  },
];

const SetaEsquerda = () => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" aria-hidden="true">
    <path d="M19 12H5M11 18l-6-6 6-6" />
  </svg>
);

const SetaDireita = () => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" aria-hidden="true">
    <path d="M5 12h14M13 6l6 6-6 6" />
  </svg>
);

export function CategoryCarousel() {
  const trackRef = useRef<HTMLDivElement>(null);
  const [ativo, setAtivo] = useState(0);

  const indiceAtual = () => {
    const track = trackRef.current;
    if (!track) return 0;
    return Math.round(track.scrollLeft / track.clientWidth);
  };

  const irPara = (indice: number) => {
    const track = trackRef.current;
    if (!track) return;
    const itens = track.children;
    const limitado = Math.max(0, Math.min(itens.length - 1, indice));
    itens[limitado].scrollIntoView({ behavior: "smooth", inline: "center", block: "nearest" });
  };

  // O dot ativo só muda quando a rolagem assenta: durante o arrasto o índice
  // oscila entre dois cards e a bolinha ficaria piscando.
  useEffect(() => {
    const track = trackRef.current;
    if (!track) return;

    let settle = 0;
    const aoRolar = () => {
      window.clearTimeout(settle);
      settle = window.setTimeout(() => setAtivo(indiceAtual()), 100);
    };

    track.addEventListener("scroll", aoRolar);
    return () => {
      window.clearTimeout(settle);
      track.removeEventListener("scroll", aoRolar);
    };
  }, []);

  return (
    <section className="categoryShowcase" id="categoryShowcase">
      <div className="categoryShowcase__viewport js-reveal">
        <button
          className="categoryShowcase__arrow categoryShowcase__arrow--prev"
          type="button"
          aria-label="Categoria anterior"
          onClick={() => irPara(indiceAtual() - 1)}
        >
          <SetaEsquerda />
        </button>
        <div className="categoryShowcase__track" id="categoryTrack" ref={trackRef}>
          {CATEGORIAS.map((cat) => (
            <figure className="categoryShowcase__item" key={cat.href}>
              <Link
                className="categoryShowcase__link"
                href={cat.href}
                target="_blank"
                rel="noopener"
                aria-label={`Ver categoria ${cat.rotulo} (abre em nova aba)`}
              >
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img className="categoryShowcase__img" src={cat.img} alt={cat.alt} loading="lazy" />
              </Link>
              <figcaption className="categoryShowcase__desc">{cat.desc}</figcaption>
              <Link className="categoryShowcase__cta" href={cat.href} target="_blank" rel="noopener">
                Ver categoria <SetaDireita />
              </Link>
            </figure>
          ))}
        </div>
        <button
          className="categoryShowcase__arrow categoryShowcase__arrow--next"
          type="button"
          aria-label="Próxima categoria"
          onClick={() => irPara(indiceAtual() + 1)}
        >
          <SetaDireita />
        </button>
      </div>
      <div className="categoryShowcase__dots" id="categoryDots">
        {CATEGORIAS.map((cat, i) => (
          <button
            key={cat.href}
            className={`categoryShowcase__dot${i === ativo ? " is-active" : ""}`}
            type="button"
            aria-label={`Ir para categoria ${i + 1}`}
            onClick={() => irPara(i)}
          />
        ))}
      </div>
    </section>
  );
}
