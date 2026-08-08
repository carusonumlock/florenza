// Source file — the page actually loads js/bundle.js (plain script, works via
// file:// with no server). After editing this file, rebuild with:
//   npm install   (first time only)
//   npm run build

import "./aliancas.js";

const introScroll = document.getElementById("introScroll");
const video = document.getElementById("heroVideo");
const scrollCue = document.getElementById("scrollCue");
const heroPayoff = document.getElementById("heroPayoff");
const introWindow = document.getElementById("introWindow");
const catCanvas = document.getElementById("catCanvas");
const wallLeft = document.getElementById("wallLeft");
const wallRight = document.getElementById("wallRight");
const introLetra = document.getElementById("introLetra");
const introReveal = document.getElementById("introReveal");

const categoryScroll = document.getElementById("categoryScroll");
const catWallLeft = document.getElementById("catWallLeft");
const catWallRight = document.getElementById("catWallRight");
const categoryReveal = document.getElementById("categoryReveal");

function clamp(v, min, max) { return Math.max(min, Math.min(max, v)); }
function smoothstep(edge0, edge1, x) {
  const t = clamp((x - edge0) / (edge1 - edge0), 0, 1);
  return t * t * (3 - 2 * t);
}

// ---------- Phase weights ----------
// One tall track (.introScroll, see CSS) is pinned for its entire scroll
// range — the pin never releases and re-attaches elsewhere, so there's no
// point where the page visibly "moves down" to a next section. The phases
// below are just weighted slices of that single 0..1 progress:
//   1. hero video scrubs the ring disassembling
//   2. a window opens over the frozen last frame, revealing categoria
//   3. the categoria frame sequence scrubs (rings lift off the pedestal)
//   4. two marble walls close in from the edges, meeting at the center
//   5. LETRA.png fades in centered over the closed walls, then holds
//   6. LETRA fades back out as the walls reopen, revealing the (empty)
//      product grid that was sitting behind them the whole time
const HERO_WEIGHT = 400;
const DOOR_WEIGHT = 180;
const CAT_WEIGHT = 300;
const WALL_CLOSE_WEIGHT = 160;
const LETRA_WEIGHT = 140;
const WALL_OPEN_WEIGHT = 180;
const TOTAL_WEIGHT = HERO_WEIGHT + DOOR_WEIGHT + CAT_WEIGHT + WALL_CLOSE_WEIGHT + LETRA_WEIGHT + WALL_OPEN_WEIGHT;
const PHASE1_END = HERO_WEIGHT / TOTAL_WEIGHT;
const PHASE2_END = (HERO_WEIGHT + DOOR_WEIGHT) / TOTAL_WEIGHT;
const PHASE3_END = (HERO_WEIGHT + DOOR_WEIGHT + CAT_WEIGHT) / TOTAL_WEIGHT;
const PHASE4_END = (HERO_WEIGHT + DOOR_WEIGHT + CAT_WEIGHT + WALL_CLOSE_WEIGHT) / TOTAL_WEIGHT;
const PHASE5_END = (HERO_WEIGHT + DOOR_WEIGHT + CAT_WEIGHT + WALL_CLOSE_WEIGHT + LETRA_WEIGHT) / TOTAL_WEIGHT;

// ---------- Phase 1: hero video ----------
// The ring "disassembles" by scrubbing video.currentTime directly instead
// of letting it play — progress maps 1:1 to a frame in the clip. Once
// heroT reaches 1 it just stays there (currentTime pinned at duration),
// which is also what makes it a stable, always-correct backdrop for
// phase 2 — no separate frame-freezing hack needed.
let heroDuration = 0;
function onHeroVideoReady() {
  heroDuration = video.duration || 0;
}
if (video.readyState >= 1 && video.duration) {
  onHeroVideoReady();
} else {
  video.addEventListener("loadedmetadata", onHeroVideoReady, { once: true });
}
// iOS/Safari won't decode seeked frames until the video has been "unlocked"
// by a play/pause cycle; muted autoplay is allowed so this is silent.
video.play().then(() => video.pause()).catch(() => {});

// ---------- Phase 3: categoria frame sequence ----------
// The rings lift off the pedestal by scrubbing through a pre-rendered PNG
// sequence (cat/champola) drawn to a canvas instead of a video element —
// exact, jank-free frame stepping instead of relying on <video>.currentTime
// seeks, which only land on keyframes.
const CAT_FRAME_COUNT = 102;
const CAT_FRAME_DIR = "cat/champola/";
const catFrames = [];

function catFrameUrl(i) {
  const name = `preciso_fazer_uma_animação_ut_${String(i).padStart(3, "0")}.png`;
  return CAT_FRAME_DIR + encodeURIComponent(name);
}

for (let i = 0; i < CAT_FRAME_COUNT; i++) {
  const img = new Image();
  img.decoding = "async";
  // Redraw once this frame lands, in case the user is sitting still on it
  // while it was still loading (otherwise the canvas would stay blank/stale
  // until the next scroll event).
  img.onload = () => update();
  img.src = catFrameUrl(i);
  catFrames.push(img);
}

const catCtx = catCanvas.getContext("2d");
function drawCatFrame(progress) {
  const idx = clamp(Math.round(progress * (CAT_FRAME_COUNT - 1)), 0, CAT_FRAME_COUNT - 1);
  const img = catFrames[idx];
  if (img.complete && img.naturalWidth) {
    catCtx.clearRect(0, 0, catCanvas.width, catCanvas.height);
    catCtx.drawImage(img, 0, 0, catCanvas.width, catCanvas.height);
  }
}

// ---------- Phase 2: the window ----------
// Grows via clip-path (a crop reveal, not a scale transform) so whatever
// it uncovers is always shown at its true size — no zoom mismatch between
// what the window shows mid-growth and what phase 3 displays afterwards.
// Starts at inset(50% 50%) — a zero-size point, fully invisible — so
// nothing appears until doorT actually starts moving, i.e. only once the
// ring-disassembling scroll (phase 1) has completely finished.
const WINDOW_START_H = 50; // % horizontal inset at doorT = 0
const WINDOW_START_V = 50; // % vertical inset at doorT = 0

// ---------- Single scroll-driven timeline ----------
function update() {
  const rect = introScroll.getBoundingClientRect();
  const scrollable = rect.height - window.innerHeight;
  const progress = clamp(-rect.top / scrollable, 0, 1);

  const heroT = clamp(progress / PHASE1_END, 0, 1);
  const doorT = clamp((progress - PHASE1_END) / (PHASE2_END - PHASE1_END), 0, 1);
  const catT = clamp((progress - PHASE2_END) / (PHASE3_END - PHASE2_END), 0, 1);
  const wallCloseT = clamp((progress - PHASE3_END) / (PHASE4_END - PHASE3_END), 0, 1);
  const letraT = clamp((progress - PHASE4_END) / (PHASE5_END - PHASE4_END), 0, 1);
  const reopenT = clamp((progress - PHASE5_END) / (1 - PHASE5_END), 0, 1);

  if (heroDuration) video.currentTime = heroT * heroDuration;

  const cueOpacity = 1 - smoothstep(0, 0.04, heroT);
  scrollCue.style.opacity = cueOpacity;
  scrollCue.style.pointerEvents = cueOpacity < 0.05 ? "none" : "auto";

  const payoffVisible = smoothstep(0.86, 0.96, heroT) > 0.5 && doorT < 0.05;
  heroPayoff.classList.toggle("is-visible", payoffVisible);

  const growT = smoothstep(0, 1, doorT);
  const hInset = WINDOW_START_H * (1 - growT);
  const vInset = WINDOW_START_V * (1 - growT);
  introWindow.style.clipPath = `inset(${vInset}% ${hInset}%)`;
  catCanvas.style.opacity = smoothstep(0.55, 0.88, doorT);

  drawCatFrame(catT);

  // Walls: close (phase 4), stay shut through phase 5, then reopen a beat
  // after LETRA starts fading out (phase 6) — closedAmount is 1 = fully
  // shut (meeting at center), 0 = fully open (off-screen at the edges).
  const closingT = smoothstep(0, 1, wallCloseT);
  const openingT = smoothstep(0.1, 1, reopenT);
  const closedAmount = closingT * (1 - openingT);
  wallLeft.style.transform = `translateX(${-100 * (1 - closedAmount)}%)`;
  wallRight.style.transform = `translateX(${100 * (1 - closedAmount)}%) scaleX(-1)`;

  // LETRA: fades in once the walls are shut, holds, then fades back out
  // as they start reopening.
  const letraIn = smoothstep(0, 0.35, letraT);
  const letraOut = 1 - smoothstep(0, 0.4, reopenT);
  introLetra.style.opacity = reopenT > 0 ? letraOut : letraIn;

  // The product grid sits behind the walls the whole time — it only needs
  // to be "on" once the walls have shut for the first time; from then on
  // the walls' own position is what reveals or hides it.
  introReveal.style.opacity = progress >= PHASE4_END ? 1 : 0;
}

// ---------- Categorias: portas de mármore no fim das Alianças ----------
// Segundo trecho pinado, independente do primeiro, com a mesma lógica de
// fechar/aguardar/reabrir — só que sem vídeo/canvas, e revelando a grade
// de categorias (.categoryScroll__reveal) em vez do produto único.
const CAT_CLOSE_WEIGHT = 40;
const CAT_HOLD_WEIGHT = 20;
const CAT_OPEN_WEIGHT = 40;
const CAT_TOTAL_WEIGHT = CAT_CLOSE_WEIGHT + CAT_HOLD_WEIGHT + CAT_OPEN_WEIGHT;
const CAT_PHASE1_END = CAT_CLOSE_WEIGHT / CAT_TOTAL_WEIGHT;
const CAT_PHASE2_END = (CAT_CLOSE_WEIGHT + CAT_HOLD_WEIGHT) / CAT_TOTAL_WEIGHT;

function updateCategoryScroll() {
  const rect = categoryScroll.getBoundingClientRect();
  const scrollable = rect.height - window.innerHeight;
  // On small screens the pin is dropped for a plain static grid (see
  // aliancas.css) — nothing left to scrub, so skip the math entirely.
  if (scrollable <= 0) return;

  const progress = clamp(-rect.top / scrollable, 0, 1);
  const closeT = clamp(progress / CAT_PHASE1_END, 0, 1);
  const reopenT = clamp((progress - CAT_PHASE2_END) / (1 - CAT_PHASE2_END), 0, 1);

  const closingT = smoothstep(0, 1, closeT);
  const openingT = smoothstep(0.1, 1, reopenT);
  const closedAmount = closingT * (1 - openingT);

  catWallLeft.style.transform = `translateX(${-100 * (1 - closedAmount)}%)`;
  catWallRight.style.transform = `translateX(${100 * (1 - closedAmount)}%) scaleX(-1)`;

  // Same trick as introReveal: flip to visible only once the doors have
  // shut for the first time, while they're still fully opaque — by the
  // time they part again it's already on, so there's no flash/fade-in.
  categoryReveal.style.opacity = progress >= CAT_PHASE1_END ? 1 : 0;
}

let ticking = false;
function onScroll() {
  if (ticking) return;
  ticking = true;
  requestAnimationFrame(() => {
    ticking = false;
    update();
    updateCategoryScroll();
  });
}

window.addEventListener("scroll", onScroll, { passive: true });
update();
updateCategoryScroll();
