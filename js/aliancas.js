// Catálogo de Alianças — filtro de materiais + reveals cinematográficos.
// Importado por main.js para entrar no mesmo js/bundle.js (ver package.json).
import gsap from "gsap";
import ScrollTrigger from "gsap/ScrollTrigger";

gsap.registerPlugin(ScrollTrigger);

const prefersReducedMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;

// ---------- Filtro: Todas / Prata / Ouro / Ouro + Diamantes ----------
const filterButtons = document.querySelectorAll(".catalog__filter");
const ringCards = document.querySelectorAll(".ringCard");

function applyFilter(material) {
  ringCards.forEach((card) => {
    const matches = material === "all" || card.dataset.material === material;
    if (matches) {
      card.style.display = "";
      // Força reflow antes de tirar a classe, senão a transição de
      // entrada não dispara para cards que estavam com display:none.
      void card.offsetWidth;
      card.classList.remove("is-hidden");
    } else {
      card.classList.add("is-hidden");
      window.setTimeout(() => {
        if (card.classList.contains("is-hidden")) card.style.display = "none";
      }, 380);
    }
  });
}

filterButtons.forEach((btn) => {
  btn.addEventListener("click", () => {
    filterButtons.forEach((b) => b.classList.remove("is-active"));
    btn.classList.add("is-active");
    applyFilter(btn.dataset.filter);
  });
});

// ---------- Categorias: carrossel horizontal (uma por vez, scroll-snap) ----------
const categoryTrack = document.getElementById("categoryTrack");

if (categoryTrack) {
  const categoryItems = categoryTrack.children;
  const prevArrow = document.querySelector(".categoryShowcase__arrow--prev");
  const nextArrow = document.querySelector(".categoryShowcase__arrow--next");
  const categoryDots = document.querySelectorAll(".categoryShowcase__dot");

  const currentIndex = () => Math.round(categoryTrack.scrollLeft / categoryTrack.clientWidth);

  const goToIndex = (index) => {
    const clamped = Math.max(0, Math.min(categoryItems.length - 1, index));
    categoryItems[clamped].scrollIntoView({ behavior: "smooth", inline: "center", block: "nearest" });
  };

  if (prevArrow) prevArrow.addEventListener("click", () => goToIndex(currentIndex() - 1));
  if (nextArrow) nextArrow.addEventListener("click", () => goToIndex(currentIndex() + 1));
  categoryDots.forEach((dot, i) => dot.addEventListener("click", () => goToIndex(i)));

  let scrollSettle;
  categoryTrack.addEventListener("scroll", () => {
    window.clearTimeout(scrollSettle);
    scrollSettle = window.setTimeout(() => {
      const active = currentIndex();
      categoryDots.forEach((dot, i) => dot.classList.toggle("is-active", i === active));
    }, 100);
  });
}

// ---------- Reveals scroll-driven (cinematográficos, sem bounce/elastic) ----------
if (!prefersReducedMotion) {
  gsap.utils.toArray(".js-reveal").forEach((el) => {
    gsap.fromTo(
      el,
      { opacity: 0, y: 26 },
      {
        opacity: 1,
        y: 0,
        duration: 1.1,
        ease: "power2.out",
        scrollTrigger: { trigger: el, start: "top 85%" },
        onComplete: () => gsap.set(el, { clearProps: "opacity,transform" }),
      }
    );
  });

  gsap.utils.toArray(".js-reveal-stagger").forEach((group) => {
    const items = group.children;
    gsap.fromTo(
      items,
      { opacity: 0, y: 32 },
      {
        opacity: 1,
        y: 0,
        duration: 1,
        ease: "power2.out",
        stagger: 0.12,
        scrollTrigger: { trigger: group, start: "top 82%" },
        onComplete: () => gsap.set(items, { clearProps: "opacity,transform" }),
      }
    );
  });

  gsap.utils.toArray(".js-parallax").forEach((el) => {
    gsap.to(el, {
      yPercent: 6,
      ease: "none",
      scrollTrigger: { trigger: el, start: "top bottom", end: "bottom top", scrub: true },
    });
  });
}
