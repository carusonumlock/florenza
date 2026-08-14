"use client";

import { useEffect } from "react";
import { usePathname } from "next/navigation";

/**
 * Portado de js/main.js. Os vídeos são autoplay/loop/muted pelos próprios
 * atributos; o que este componente faz é dar pause no que sai da viewport.
 *
 * Não é sobra de otimização: aliancas-pedestal.mp4 e simbolos-marcas.mp4
 * ficavam decodificando longe da tela, e três decoders simultâneos travam a
 * rolagem no celular. O rootMargin de 600px começa o download um pouco antes
 * de a seção entrar em cena, para o vídeo não aparecer parado.
 */
export function VideoAutoplay() {
  const pathname = usePathname();

  useEffect(() => {
    const videos = document.querySelectorAll<HTMLVideoElement>("video[autoplay]");
    if (!videos.length) return;

    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          const video = entry.target as HTMLVideoElement;
          if (entry.isIntersecting) video.play().catch(() => {});
          else video.pause();
        });
      },
      { rootMargin: "600px 0px", threshold: 0.01 }
    );

    videos.forEach((video) => observer.observe(video));
    return () => observer.disconnect();
  }, [pathname]);

  return null;
}
