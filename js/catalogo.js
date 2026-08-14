// ============================================================
// CATÁLOGO DE CATEGORIA — monta a grade de produtos a partir dos dados.
//
// Antes as peças eram <article class="ringCard"> escritos à mão no HTML.
// Com 16 anéis de formatura (e mais chegando), a página vira um paredão de
// markup repetido em que preço e código são fáceis de errar. Aqui o HTML da
// categoria só declara os pontos de encaixe:
//
//   <div data-catalogo="aneis-formatura"></div>   grade
//   <div data-catalogo-filtros></div>             botões de cor da pedra
//   <p data-catalogo-contagem></p>                "16 peças nesta categoria"
//
// A fonte dos dados fica em js/data/<categoria>.js e é a única coisa que
// muda quando o Supabase entrar — este arquivo já espera uma Promise.
// ============================================================

import gsap from "gsap";
import ScrollTrigger from "gsap/ScrollTrigger";

import {
  categoria,
  coresDePedra,
  imagensDoProduto,
  listarProdutos,
} from "./data/aneis-formatura.js";

const grade = document.querySelector("[data-catalogo]");

const moeda = new Intl.NumberFormat("pt-BR", {
  style: "currency",
  currency: "BRL",
});

// Os textos passam a vir de fora do repositório assim que o Supabase entrar.
// Escapar aqui evita que um nome de produto com "<" quebre a página.
function esc(valor) {
  return String(valor ?? "").replace(
    /[&<>"']/g,
    (c) =>
      ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[c]
  );
}

function cardDoProduto(produto) {
  const { src, srcPequena } = imagensDoProduto(produto);
  const nome = esc(produto.nome);
  const preco = moeda.format(produto.precoCentavos / 100);
  // A ficha traz "Ouro 18K (750)" e "Rubi" separados porque o banco vai
  // guardá-los assim; a linha do card junta os dois.
  const linhaMaterial = `${esc(produto.metal)} · ${esc(produto.pedra)}`;

  return `
    <article class="ringCard" data-tags="${esc(produto.corPedra)}" data-sku="${esc(produto.sku)}">
      <button class="ringCard__fav" type="button" aria-label="Favoritar ${nome}">
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.4" aria-hidden="true">
          <path d="M12 20s-7-4.35-9.5-8.5C.8 8.1 2.4 4.8 5.8 4.2c2-.35 3.7.6 4.9 2.2 1.2-1.6 2.9-2.55 4.9-2.2 3.4.6 5 3.9 3.3 7.3C19 15.65 12 20 12 20z"/>
        </svg>
      </button>
      <a class="ringCard__media ringCard__media--produto" href="#" aria-label="Ver ${nome}">
        <img class="ringCard__img ringCard__img--produto"
             src="${esc(src)}"
             srcset="${esc(srcPequena)} 480w, ${esc(src)} 960w"
             sizes="(max-width: 640px) 88vw, 280px"
             alt="${nome} — ${esc(produto.metal)} com pedra ${esc(produto.pedra)} em lapidação ${esc(produto.lapidacao.toLowerCase())}"
             loading="lazy" decoding="async">
      </a>
      <div class="ringCard__body">
        <h3 class="ringCard__name">${nome}</h3>
        <p class="ringCard__material">${linhaMaterial}</p>
        <p class="ringCard__desc">${esc(produto.descricao)}</p>
        <p class="ringCard__sku">Cód. ${esc(produto.sku)} · Lapidação ${esc(produto.lapidacao)}</p>
        <div class="ringCard__foot">
          <span class="ringCard__price">${esc(preco)}</span>
          <a class="ringCard__view" href="#" aria-label="Ver detalhes de ${nome}">&rarr;</a>
        </div>
        <a class="ringCard__buy" href="#" aria-label="Comprar ${nome}">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" aria-hidden="true"><path d="M6 2 3 6v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2V6l-3-4H6zM3 6h18M16 10a4 4 0 0 1-8 0"/></svg>
          Comprar
        </a>
      </div>
    </article>`;
}

// Só entram as cores que existem no acervo — um botão "Verde" sem nenhuma
// esmeralda no estoque leva a uma grade vazia.
function botoesDeFiltro(produtos) {
  const presentes = new Set(produtos.map((produto) => produto.corPedra));
  const cores = coresDePedra.filter((cor) => presentes.has(cor.slug));

  if (cores.length < 2) return "";

  const chips = cores.map(
    (cor) => `
      <button class="catalog__filter catalog__filter--cor" type="button" data-filter="${esc(cor.slug)}">
        <span class="catalog__swatch" style="--swatch: ${esc(cor.amostra)}" aria-hidden="true"></span>
        ${esc(cor.nome)}
      </button>`
  );

  return `
    <button class="catalog__filter is-active" type="button" data-filter="all">Todas</button>
    ${chips.join("")}`;
}

function textoDaContagem(visiveis, total) {
  const peca = total === 1 ? "peça" : "peças";
  // Filtrado, "16 peças nesta categoria" mentiria sobre o que está na tela.
  if (visiveis < total) return `${visiveis} de ${total} ${peca}`;
  return `${total} ${peca} nesta categoria`;
}

function aplicarFiltro(cards, valor, contagem) {
  let visiveis = 0;

  cards.forEach((card) => {
    const tags = (card.dataset.tags || "").split(/\s+/);
    if (valor === "all" || tags.includes(valor)) {
      visiveis += 1;
      card.style.display = "";
      // Reflow antes de tirar a classe: sem isso a transição de entrada não
      // dispara para o card que estava em display:none. (Mesmo truque de
      // aliancas.js, no filtro de material das alianças.)
      void card.offsetWidth;
      card.classList.remove("is-hidden");
    } else {
      card.classList.add("is-hidden");
      window.setTimeout(() => {
        if (card.classList.contains("is-hidden")) card.style.display = "none";
      }, 380);
    }
  });

  if (contagem) contagem.textContent = textoDaContagem(visiveis, cards.length);
}

function revelar(cards) {
  if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;

  // Os reveals de aliancas.js são montados na carga da página, quando esta
  // grade ainda está vazia — por isso o catálogo anima os próprios cards,
  // com a mesma duração e easing das outras seções.
  gsap.registerPlugin(ScrollTrigger);
  gsap.fromTo(
    cards,
    { opacity: 0, y: 32 },
    {
      opacity: 1,
      y: 0,
      duration: 1,
      ease: "power2.out",
      stagger: 0.08,
      scrollTrigger: { trigger: grade, start: "top 88%" },
      onComplete: () => gsap.set(cards, { clearProps: "opacity,transform" }),
    }
  );
}

async function montarCatalogo(container) {
  const contagem = document.querySelector("[data-catalogo-contagem]");
  const filtros = document.querySelector("[data-catalogo-filtros]");

  let produtos = [];
  try {
    produtos = await listarProdutos({ categoria: container.dataset.catalogo });
  } catch (erro) {
    // Com o Supabase no lugar do array local, isto vira uma falha de rede
    // real: melhor uma frase honesta do que uma grade vazia sem explicação.
    console.error("Falha ao carregar o catálogo:", erro);
    container.innerHTML = "";
    if (contagem) {
      contagem.textContent = "Não foi possível carregar as peças agora.";
    }
    return;
  }

  container.innerHTML = produtos.map(cardDoProduto).join("");

  if (contagem) {
    contagem.textContent = textoDaContagem(produtos.length, produtos.length);
  }

  const cards = Array.from(container.querySelectorAll(".ringCard"));

  if (filtros) {
    filtros.innerHTML = botoesDeFiltro(produtos);
    const botoes = Array.from(filtros.querySelectorAll(".catalog__filter"));
    botoes.forEach((botao) => {
      botao.addEventListener("click", () => {
        botoes.forEach((outro) => outro.classList.remove("is-active"));
        botao.classList.add("is-active");
        aplicarFiltro(cards, botao.dataset.filter, contagem);
      });
    });
  }

  revelar(cards);
}

// Este módulo entra no mesmo js/bundle.js que main.js e aliancas.js, e o
// bundle é carregado por todas as páginas. Sem grade na página, não há nada
// a montar.
if (grade) {
  montarCatalogo(grade);
}

// Referência de categoria para quem importar este módulo (título da página,
// migalhas de pão, etc.).
export { categoria };
