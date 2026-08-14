"use client";

import { useEffect, useRef } from "react";

/**
 * Hero: alterna foto e vídeo — portado de js/main.js.
 *
 * 2s depois de abrir, a foto (herome.png) dá lugar ao vídeo
 * (joalheriaMelhor.mp4). Quando o vídeo termina, a foto volta por mais 2s e o
 * ciclo recomeça. O gatilho é o evento "ended", não um tempo fixo: trocar o
 * vídeo por um mais curto ou mais longo só encurta ou alonga o ciclo, sem
 * mexer neste arquivo.
 *
 * O ciclo só roda com a hero na tela. Fora dela o vídeo era decodificado à toa
 * — no celular isso disputa CPU com os outros vídeos e com o WebGL da seção
 * dos anéis. Ao voltar, recomeça pela foto.
 */
export function HeroMedia() {
  const mediaRef = useRef<HTMLDivElement>(null);
  const videoRef = useRef<HTMLVideoElement>(null);

  useEffect(() => {
    const media = mediaRef.current;
    const video = videoRef.current;
    if (!media || !video) return;

    let cycleTimer = 0;

    const showVideo = () => {
      media.classList.add("is-video-active");
      video.currentTime = 0;
      video.play().catch(() => {});
    };

    const showImage = () => {
      media.classList.remove("is-video-active");
      cycleTimer = window.setTimeout(showVideo, 2000);
    };

    const startCycle = () => {
      window.clearTimeout(cycleTimer);
      cycleTimer = window.setTimeout(showVideo, 2000);
    };

    const stopCycle = () => {
      window.clearTimeout(cycleTimer);
      video.pause();
      media.classList.remove("is-video-active");
    };

    video.addEventListener("ended", showImage);

    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => (entry.isIntersecting ? startCycle() : stopCycle()));
      },
      { threshold: 0.01 }
    );
    observer.observe(media);

    return () => {
      window.clearTimeout(cycleTimer);
      video.removeEventListener("ended", showImage);
      observer.disconnect();
    };
  }, []);

  return (
    <div className="hero__media" id="heroMedia" ref={mediaRef}>
      {/* No celular a hero entra em cross-fade com o vídeo em tela cheia: o PNG
          de 1,6 MB (6 MB descomprimidos) era o item mais pesado dessa
          composição. A versão mobile é o mesmo quadro em 1100px / JPEG q72 =
          39 KB. O desktop segue com o PNG original. */}
      <picture>
        <source media="(max-width: 860px)" srcSet="/herome-mobile.jpg" />
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          className="hero__img"
          src="/herome.png"
          alt="Mãos entrelaçadas de um casal usando alianças e anel de noivado Florenza, sobre terno marrom, com fundo de mármore escuro veios dourados"
          loading="eager"
          decoding="async"
        />
      </picture>
      <video
        className="hero__video"
        ref={videoRef}
        src="/joalheriaMelhor.mp4"
        muted
        playsInline
        preload="auto"
        aria-hidden="true"
      />
    </div>
  );
}
