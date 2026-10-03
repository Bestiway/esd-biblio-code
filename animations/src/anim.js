/*
 * Moteur d'animation déterministe pour l'export vidéo.
 * Toutes les animations sont créées en pause : le script de rendu appelle
 * CA.seek(t) pour chaque frame, ce qui garantit un rendu image par image
 * identique à chaque export (pas de dépendance à l'horloge du navigateur).
 */
window.CA = (function () {
  const animations = [];

  const EASE = {
    out: 'cubic-bezier(0.16, 1, 0.3, 1)',      // sortie douce, style Apple
    inOut: 'cubic-bezier(0.65, 0, 0.35, 1)',
    in: 'cubic-bezier(0.55, 0, 1, 0.45)',
  };

  function animate(el, keyframes, { at = 0, dur = 1, easing = EASE.out } = {}) {
    const a = el.animate(keyframes, {
      delay: at * 1000,
      duration: dur * 1000,
      easing,
      fill: 'both',
    });
    a.pause();
    animations.push(a);
    return a;
  }

  /* Le texte monte dans sa fenêtre de masque. el = .ca-mask */
  function revealUp(el, opts = {}) {
    return animate(el.querySelector('span'), [
      { transform: 'translateY(112%)' },
      { transform: 'translateY(0%)' },
    ], { dur: 0.9, ...opts });
  }

  /* Trait qui se trace depuis la gauche */
  function drawLine(el, opts = {}) {
    return animate(el, [
      { transform: 'scaleX(0)' },
      { transform: 'scaleX(1)' },
    ], { dur: 0.6, ...opts });
  }

  function fadeIn(el, opts = {}) {
    return animate(el, [{ opacity: 0 }, { opacity: 1 }], { dur: 0.6, ...opts });
  }

  /* Sortie de la scène entière */
  function fadeOut(el, opts = {}) {
    return animate(el, [
      { opacity: 1, transform: 'translateY(0px)' },
      { opacity: 0, transform: 'translateY(-28px)' },
    ], { dur: 0.5, easing: EASE.in, ...opts });
  }

  function seek(t) {
    const ms = Math.max(0, t * 1000);
    for (const a of animations) a.currentTime = ms;
  }

  return { animate, revealUp, drawLine, fadeIn, fadeOut, seek, EASE, animations };
})();
