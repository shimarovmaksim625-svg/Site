/* ListMedia — свечение за курсором на всех разделах.
   Координаты пишутся в CSS-переменные --glow-x / --glow-y,
   слой свечения — первый слой background у .screen. */

(() => {
  'use strict';

  const canHover = window.matchMedia('(hover: hover) and (pointer: fine)').matches;
  const reduceMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

  if (!canHover || reduceMotion) return;

  const targets = document.querySelectorAll('.screen');
  if (!targets.length) return;

  const hide = (target) => {
    target.style.setProperty('--glow-x', '-9999px');
    target.style.setProperty('--glow-y', '-9999px');
  };

  targets.forEach((target) => {
    target.addEventListener('pointermove', (event) => {
      const rect = target.getBoundingClientRect();
      target.style.setProperty('--glow-x', `${event.clientX - rect.left}px`);
      target.style.setProperty('--glow-y', `${event.clientY - rect.top}px`);
    }, { passive: true });

    target.addEventListener('pointerleave', () => hide(target));
  });
})();
