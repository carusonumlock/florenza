/* Seletor de metal da seção Prata 925 / Ouro 18K.
 *
 * Arquivo separado de propósito: não importa, não conhece e não toca em
 * js/rings-3d.js — a cena Three.js, o .glb, os materiais e as interações
 * dos anéis seguem exatamente como estavam. Aqui só entram e saem classes
 * de estado na <section>; todo o efeito visual (luz, vinheta, posição do
 * indicador) é resolvido em css/rings-3d.css a partir delas.
 *
 * Hover e foco são 100% CSS (:has). Este script existe só para o clique/
 * toque, que precisa de estado persistente — em touch não há hover. */
(function () {
  var section = document.getElementById('ringsSection');
  if (!section) return;

  var buttons = section.querySelectorAll('.rings3d-metal');
  if (!buttons.length) return;

  var CLASS = { silver: 'is-silver', gold: 'is-gold' };

  function select(metal) {
    section.classList.remove(CLASS.silver, CLASS.gold);
    if (metal) section.classList.add(CLASS[metal]);
    Array.prototype.forEach.call(buttons, function (btn) {
      btn.setAttribute('aria-pressed', String(btn.dataset.metal === metal));
    });
  }

  Array.prototype.forEach.call(buttons, function (btn) {
    btn.addEventListener('click', function () {
      var metal = btn.dataset.metal;
      // clicar de novo no metal já escolhido devolve a seção ao neutro
      select(section.classList.contains(CLASS[metal]) ? null : metal);
    });
  });
})();
