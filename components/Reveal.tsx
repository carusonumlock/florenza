"use client";

import { useEffect } from "react";
import { usePathname } from "next/navigation";
import gsap from "gsap";
import ScrollTrigger from "gsap/ScrollTrigger";

gsap.registerPlugin(ScrollTrigger);

/**
 * Reveals scroll-driven — portados de js/aliancas.js sem mexer em nenhum
 * parâmetro. Duração, easing, deslocamento e os pontos de gatilho ("top 85%",
 * "top 82%") são a assinatura da animação do site; mudar qualquer um deles
 * mudaria como a página entra, que é justamente o que esta migração preserva.
 *
 * O que muda é só QUANDO isso roda: antes era na carga da página, agora é
 * depois da montagem — e de novo a cada troca de rota, já que o Next não
 * recarrega o documento. O gsap.context() recolhe os ScrollTriggers na saída,
 * senão eles se acumulariam a cada navegação.
 */
export function Reveal() {
  const pathname = usePathname();

  useEffect(() => {
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;

    const ctx = gsap.context(() => {
      gsap.utils.toArray<HTMLElement>(".js-reveal").forEach((el) => {
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

      gsap.utils.toArray<HTMLElement>(".js-reveal-stagger").forEach((group) => {
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

      // A grade do catálogo tinha parâmetros próprios em js/catalogo.js
      // (`revelar()`): stagger mais curto e gatilho mais tarde que o
      // .js-reveal-stagger das outras seções. Mantidos separados por isso.
      gsap.utils.toArray<HTMLElement>(".js-reveal-catalogo").forEach((grade) => {
        const cards = grade.querySelectorAll(".ringCard");
        if (!cards.length) return;
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
      });

      gsap.utils.toArray<HTMLElement>(".js-parallax").forEach((el) => {
        gsap.to(el, {
          yPercent: 6,
          ease: "none",
          scrollTrigger: { trigger: el, start: "top bottom", end: "bottom top", scrub: true },
        });
      });
    });

    return () => ctx.revert();
  }, [pathname]);

  return null;
}
