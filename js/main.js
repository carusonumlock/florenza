// Source file — the page actually loads js/bundle.js (plain script, works via
// file:// with no server). After editing this file, rebuild with:
//   npm install   (first time only)
//   npm run build
//
// Every video on the page (hero, ring showcase, alianças background,
// símbolos encerramento) plays on its own via the autoplay/loop/muted/
// playsinline attributes in index.html — nothing here drives them off
// scroll position. This file only wires up the catálogo filter and the
// GSAP fade/parallax reveals, both defined in aliancas.js.

import "./aliancas.js";

// ---------- Hero: alterna foto/vídeo ----------
// 2s após abrir o site, troca a foto (herome.png) pelo vídeo
// (joalheriaMelhor.mp4). Quando o vídeo termina, volta a exibir a foto por
// mais 2s, e repete o ciclo. O gatilho é o evento "ended", não um tempo
// fixo, então trocar o vídeo por um mais curto ou mais longo só encurta ou
// alonga o ciclo — nada aqui precisa mudar junto.
const heroMedia = document.getElementById("heroMedia");
const heroVideo = heroMedia && heroMedia.querySelector(".hero__video");

if (heroMedia && heroVideo) {
  let cycleTimer = 0;

  const showVideo = () => {
    heroMedia.classList.add("is-video-active");
    heroVideo.currentTime = 0;
    heroVideo.play().catch(() => {});
  };

  const showImage = () => {
    heroMedia.classList.remove("is-video-active");
    cycleTimer = window.setTimeout(showVideo, 2000);
  };

  heroVideo.addEventListener("ended", showImage);

  // O ciclo só roda com a hero na tela. Fora dela o vídeo era decodificado
  // à toa — e no celular isso disputa CPU com os outros vídeos e com o
  // WebGL da seção dos anéis. Ao voltar, recomeça pela foto.
  const startCycle = () => {
    window.clearTimeout(cycleTimer);
    cycleTimer = window.setTimeout(showVideo, 2000);
  };

  const stopCycle = () => {
    window.clearTimeout(cycleTimer);
    heroVideo.pause();
    heroMedia.classList.remove("is-video-active");
  };

  new IntersectionObserver(
    (entries) => {
      entries.forEach((entry) => (entry.isIntersecting ? startCycle() : stopCycle()));
    },
    { threshold: 0.01 }
  ).observe(heroMedia);
}

// ---------- Demais vídeos: só decodificam o que está na tela ----------
// aliancas-pedestal.mp4 e simbolos-marcas.mp4 são autoplay/loop e ficavam
// rodando mesmo longe da viewport — três decoders simultâneos travam a
// rolagem no celular. O preload virou "metadata" no HTML para eles não
// baixarem 6 MB junto com o resto da página; o play() abaixo dispara o
// download 600px antes de entrarem em cena, e o pause devolve a CPU
// assim que saem.
const loopVideos = document.querySelectorAll("video[autoplay]");

if (loopVideos.length) {
  const loopObserver = new IntersectionObserver(
    (entries) => {
      entries.forEach((entry) => {
        if (entry.isIntersecting) entry.target.play().catch(() => {});
        else entry.target.pause();
      });
    },
    { rootMargin: "600px 0px", threshold: 0.01 }
  );

  loopVideos.forEach((video) => loopObserver.observe(video));
}
