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
// 2s após abrir o site, troca a foto (herome.png) pelo vídeo (joalheria.mp4).
// Quando o vídeo termina, volta a exibir a foto por mais 2s, e repete o ciclo.
const heroMedia = document.getElementById("heroMedia");
const heroVideo = heroMedia && heroMedia.querySelector(".hero__video");

if (heroMedia && heroVideo) {
  const showVideo = () => {
    heroMedia.classList.add("is-video-active");
    heroVideo.currentTime = 0;
    heroVideo.play().catch(() => {});
  };

  const showImage = () => {
    heroMedia.classList.remove("is-video-active");
    window.setTimeout(showVideo, 2000);
  };

  heroVideo.addEventListener("ended", showImage);
  window.setTimeout(showVideo, 2000);
}
