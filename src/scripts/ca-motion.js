/* ============================================================================
   College Access — Motion Engine v1.0
   Vanilla JS, zéro dépendance. À charger avec `defer`.

     <link rel="stylesheet" href="src/styles/tokens.css">
     <link rel="stylesheet" href="src/styles/motion.css">
     <script src="src/scripts/ca-motion.js" defer></script>

   Le CSS porte le mouvement, le JS ne fait que déclencher et mesurer :
   observation du scroll, découpe de texte, comptage, longueurs SVG,
   pointeur (tilt / magnétique) et parallaxe.

   API : CAMotion.init(root) · CAMotion.refresh() · CAMotion.countUp(el)
         CAMotion.play(el) · CAMotion.reducedMotion
   ========================================================================== */

(function (global) {
  'use strict';

  var REDUCED = global.matchMedia
    ? global.matchMedia('(prefers-reduced-motion: reduce)').matches
    : false;

  /* --- utilitaires --------------------------------------------------------- */

  function els(sel, root) { return Array.prototype.slice.call((root || document).querySelectorAll(sel)); }
  function num(v, fallback) { var n = parseFloat(v); return isNaN(n) ? fallback : n; }
  function clamp(v, min, max) { return Math.min(max, Math.max(min, v)); }

  /* Courbe de sortie alignée sur --ca-ease-out (expo out). */
  function easeOutExpo(t) { return t === 1 ? 1 : 1 - Math.pow(2, -10 * t); }

  /* Formatage FR : espace fine insécable comme séparateur de milliers. */
  function format(value, decimals, prefix, suffix, separator) {
    var fixed = value.toFixed(decimals);
    var parts = fixed.split('.');
    if (separator !== 'none') {
      parts[0] = parts[0].replace(/\B(?=(\d{3})+(?!\d))/g, separator || ' ');
    }
    return (prefix || '') + parts.join(',') + (suffix || '');
  }

  /* ==========================================================================
     1. Observation : ajoute .is-inview quand l'élément entre dans le viewport
     ======================================================================== */

  var observer = null;

  function observe(el) {
    if (el.dataset.caObserved === '1') return;
    el.dataset.caObserved = '1';

    if (REDUCED || !global.IntersectionObserver) { play(el); return; }
    if (!observer) {
      observer = new IntersectionObserver(onIntersect, {
        threshold: num(document.documentElement.dataset.caThreshold, 0.18),
        rootMargin: '0px 0px -8% 0px'
      });
    }
    observer.observe(el);
  }

  function onIntersect(entries) {
    entries.forEach(function (entry) {
      if (!entry.isIntersecting) return;
      var el = entry.target;
      play(el);
      if (el.dataset.caRepeat !== 'true') observer.unobserve(el);
    });
  }

  /* Déclenche l'élément, quel que soit son type. */
  function play(el) {
    el.classList.add('is-inview');

    if (el.hasAttribute('data-ca-count')) countUp(el);

    el.addEventListener('animationend', function onEnd() {
      el.classList.add('is-done');
      el.removeEventListener('animationend', onEnd);
    });
    return el;
  }

  /* ==========================================================================
     2. Stagger : indexe les enfants d'un groupe
     ======================================================================== */

  function setupStagger(root) {
    els('[data-ca-stagger]', root).forEach(function (group) {
      var step = group.dataset.caStagger;
      if (step) group.style.setProperty('--ca-stagger', step);
      Array.prototype.forEach.call(group.children, function (child, i) {
        child.style.setProperty('--ca-index', i);
      });
    });
  }

  /* ==========================================================================
     3. Découpe de texte — chars / words / lines
     Le texte reste lisible pour les lecteurs d'écran : aria-label sur le
     conteneur, aria-hidden sur les fragments.
     ======================================================================== */

  function splitText(el) {
    if (el.dataset.caSplitDone === '1') return;
    var mode = el.dataset.caSplit || 'words';
    var source = el.textContent.replace(/\s+/g, ' ').trim();

    el.setAttribute('aria-label', source);
    el.textContent = '';

    var frag = document.createDocumentFragment();
    var index = 0;

    if (mode === 'lines') {
      source.split(/\s*\|\s*/).forEach(function (lineText) {   // séparateur "|"
        var line = document.createElement('span');
        line.className = 'ca-split-line';
        var inner = document.createElement('span');
        inner.className = 'ca-split-word';
        inner.setAttribute('aria-hidden', 'true');
        inner.style.setProperty('--ca-index', index++);
        inner.textContent = lineText;
        line.appendChild(inner);
        frag.appendChild(line);
      });
    } else {
      source.split(' ').forEach(function (wordText, wi, arr) {
        var word = document.createElement('span');
        word.className = 'ca-split-word';
        word.setAttribute('aria-hidden', 'true');

        if (mode === 'chars') {
          wordText.split('').forEach(function (ch) {
            var c = document.createElement('span');
            c.className = 'ca-split-char';
            c.style.setProperty('--ca-index', index++);
            c.textContent = ch;
            word.appendChild(c);
          });
        } else {
          word.style.setProperty('--ca-index', index++);
          word.textContent = wordText;
        }

        frag.appendChild(word);
        if (wi < arr.length - 1) frag.appendChild(document.createTextNode(' '));
      });
    }

    el.appendChild(frag);
    el.dataset.caSplitDone = '1';
  }

  /* ==========================================================================
     4. Compteurs
     La valeur finale est écrite dans le HTML (data-ca-count) : la donnée
     reste exacte même sans JS. On ne compte que vers cette valeur.
     ======================================================================== */

  function countUp(el) {
    if (el.dataset.caCountDone === '1' && el.dataset.caRepeat !== 'true') return;
    el.dataset.caCountDone = '1';

    var target    = num(el.dataset.caCount, 0);
    var from      = num(el.dataset.caFrom, 0);
    var decimals  = num(el.dataset.caDecimals, 0);
    var duration  = num(el.dataset.caDuration, 1400);
    var prefix    = el.dataset.caPrefix || '';
    var suffix    = el.dataset.caSuffix || '';
    var separator = el.dataset.caSeparator;

    el.classList.add('ca-count');

    if (REDUCED || duration <= 0) {
      el.textContent = format(target, decimals, prefix, suffix, separator);
      return;
    }

    var start = null;
    function frame(ts) {
      if (start === null) start = ts;
      var t = clamp((ts - start) / duration, 0, 1);
      el.textContent = format(from + (target - from) * easeOutExpo(t), decimals, prefix, suffix, separator);
      if (t < 1) requestAnimationFrame(frame);
      else el.textContent = format(target, decimals, prefix, suffix, separator);
    }
    requestAnimationFrame(frame);
  }

  /* ==========================================================================
     5. Jauges, anneaux, tracés SVG
     ======================================================================== */

  function setupBars(root) {
    els('.ca-bar[data-ca-value]', root).forEach(function (bar) {
      var value = clamp(num(bar.dataset.caValue, 0), 0, 100);
      bar.style.setProperty('--ca-bar-value', value + '%');
      if (!bar.querySelector('.ca-bar__fill')) {
        var fill = document.createElement('span');
        fill.className = 'ca-bar__fill';
        bar.appendChild(fill);
      }
      if (!bar.hasAttribute('role')) {
        bar.setAttribute('role', 'progressbar');
        bar.setAttribute('aria-valuenow', String(value));
        bar.setAttribute('aria-valuemin', '0');
        bar.setAttribute('aria-valuemax', '100');
      }
      observe(bar);
    });
  }

  function setupRings(root) {
    els('.ca-ring[data-ca-value]', root).forEach(function (ring) {
      var circle = ring.querySelector('.ca-ring__value');
      if (!circle) return;
      var r = num(circle.getAttribute('r'), 0);
      var length = 2 * Math.PI * r;
      var value = clamp(num(ring.dataset.caValue, 0), 0, 100);
      ring.style.setProperty('--ca-ring-length', length.toFixed(2));
      ring.style.setProperty('--ca-ring-offset', (length * (1 - value / 100)).toFixed(2));
      var track = ring.querySelector('.ca-ring__track');
      if (track) track.setAttribute('stroke-dasharray', length.toFixed(2));
      circle.setAttribute('stroke-dasharray', length.toFixed(2));
      observe(ring);
    });
  }

  function setupDraws(root) {
    els('[data-ca-draw]', root).forEach(function (path) {
      var length = typeof path.getTotalLength === 'function' ? path.getTotalLength() : 1000;
      path.style.setProperty('--ca-path-length', length.toFixed(2));
      observe(path);
    });
  }

  /* ==========================================================================
     6. Pointeur — tilt, magnétique
     Désactivés au clavier, au toucher et en reduced-motion.
     ======================================================================== */

  var FINE_POINTER = global.matchMedia
    ? global.matchMedia('(hover: hover) and (pointer: fine)').matches
    : false;

  function setupTilt(root) {
    if (REDUCED || !FINE_POINTER) return;
    els('[data-ca-tilt]', root).forEach(function (card) {
      var max = num(card.dataset.caTilt, 6);

      card.addEventListener('pointermove', function (e) {
        var rect = card.getBoundingClientRect();
        var px = (e.clientX - rect.left) / rect.width - 0.5;
        var py = (e.clientY - rect.top) / rect.height - 0.5;
        card.style.setProperty('--ca-tilt-y', (px * max).toFixed(2) + 'deg');
        card.style.setProperty('--ca-tilt-x', (-py * max).toFixed(2) + 'deg');
      });

      card.addEventListener('pointerleave', function () {
        card.style.setProperty('--ca-tilt-x', '0deg');
        card.style.setProperty('--ca-tilt-y', '0deg');
      });
    });
  }

  function setupMagnetic(root) {
    if (REDUCED || !FINE_POINTER) return;
    els('[data-ca-magnetic]', root).forEach(function (btn) {
      var strength = num(btn.dataset.caMagnetic, 6);

      btn.addEventListener('pointermove', function (e) {
        var rect = btn.getBoundingClientRect();
        var px = (e.clientX - rect.left) / rect.width - 0.5;
        var py = (e.clientY - rect.top) / rect.height - 0.5;
        btn.style.setProperty('--ca-mag-x', (px * strength * 2).toFixed(1) + 'px');
        btn.style.setProperty('--ca-mag-y', (py * strength * 2).toFixed(1) + 'px');
      });

      btn.addEventListener('pointerleave', function () {
        btn.style.setProperty('--ca-mag-x', '0px');
        btn.style.setProperty('--ca-mag-y', '0px');
      });
    });
  }

  /* ==========================================================================
     7. Parallaxe au scroll — une seule boucle rAF pour toute la page
     ======================================================================== */

  var parallaxItems = [];
  var ticking = false;

  function setupParallax(root) {
    if (REDUCED) return;
    els('[data-ca-parallax]', root).forEach(function (el) {
      if (parallaxItems.indexOf(el) === -1) parallaxItems.push(el);
    });
    if (parallaxItems.length && !ticking) {
      global.addEventListener('scroll', requestParallax, { passive: true });
      global.addEventListener('resize', requestParallax);
      requestParallax();
    }
  }

  function requestParallax() {
    if (ticking) return;
    ticking = true;
    requestAnimationFrame(function () {
      var vh = global.innerHeight;
      parallaxItems.forEach(function (el) {
        var rect = el.getBoundingClientRect();
        if (rect.bottom < -200 || rect.top > vh + 200) return;
        var speed = num(el.dataset.caParallax, 0.15);
        var progress = (rect.top + rect.height / 2 - vh / 2) / vh;   /* -1 … 1 */
        el.style.setProperty('--ca-parallax-y', (-progress * speed * 100).toFixed(1) + 'px');
      });
      ticking = false;
    });
  }

  /* ==========================================================================
     8. Marquee — duplication du contenu pour une boucle sans couture
     ======================================================================== */

  function setupMarquee(root) {
    els('.ca-marquee', root).forEach(function (marquee) {
      var track = marquee.querySelector('.ca-marquee__track');
      if (!track || track.dataset.caCloned === '1') return;

      /* On duplique une fois le contenu : le keyframe translate de -50%,
         la boucle est donc invisible. Les copies sortent de l'arbre a11y. */
      var originals = Array.prototype.slice.call(track.children);
      originals.forEach(function (child) {
        var copy = child.cloneNode(true);
        copy.setAttribute('aria-hidden', 'true');
        track.appendChild(copy);
      });

      track.dataset.caCloned = '1';
      if (marquee.dataset.caDuration) {
        track.style.setProperty('--ca-marquee-dur', marquee.dataset.caDuration);
      }
    });
  }

  /* ==========================================================================
     9. Init
     ======================================================================== */

  function init(root) {
    root = root || document;

    els('[data-ca-split]', root).forEach(splitText);
    setupStagger(root);
    setupBars(root);
    setupRings(root);
    setupDraws(root);
    setupMarquee(root);
    setupTilt(root);
    setupMagnetic(root);
    setupParallax(root);

    els('[data-ca-reveal], [data-ca-split], [data-ca-count], .ca-rule, .ca-rule-y, .ca-ghost, .ca-logo-reveal, .ca-btn-pulse', root)
      .forEach(observe);

    document.documentElement.classList.add('ca-motion-ready');
  }

  function refresh() { init(document); }

  global.CAMotion = {
    init: init,
    refresh: refresh,
    play: play,
    countUp: countUp,
    splitText: splitText,
    reducedMotion: REDUCED
  };

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', function () { init(document); });
  } else {
    init(document);
  }
})(typeof window !== 'undefined' ? window : this);
