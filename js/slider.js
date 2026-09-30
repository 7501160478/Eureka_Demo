/* =========================================================
   EUREKA · Diabetic Care Club
   Hero slider (home-design-5.html)
   ========================================================= */
(function () {
  'use strict';

  const root = document.querySelector('[data-slider]');
  if (!root) return;

  const slides = [...root.querySelectorAll('.d5-slide')];
  const dots = [...root.querySelectorAll('.d5-dot')];
  const reduceMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  const DELAY = 6000;

  let index = 0;
  let timer = null;
  let paused = false;

  function show(i) {
    index = (i + slides.length) % slides.length;
    slides.forEach((slide, n) => {
      const active = n === index;
      slide.classList.toggle('is-active', active);
      slide.setAttribute('aria-hidden', String(!active));
      slide.inert = !active;
    });
    dots.forEach((dot, n) => dot.setAttribute('aria-current', String(n === index)));
  }

  function stop() {
    clearInterval(timer);
    timer = null;
  }

  function start() {
    stop();
    if (!reduceMotion && !paused && !document.hidden) timer = setInterval(() => show(index + 1), DELAY);
  }

  const go = i => { show(i); start(); };

  root.querySelector('.d5-prev').addEventListener('click', () => go(index - 1));
  root.querySelector('.d5-next').addEventListener('click', () => go(index + 1));
  dots.forEach((dot, n) => dot.addEventListener('click', () => go(n)));

  // Pause while the visitor is reading or using the slider.
  const pause = () => { paused = true; stop(); };
  const resume = () => { paused = false; start(); };
  root.addEventListener('mouseenter', pause);
  root.addEventListener('mouseleave', resume);
  root.addEventListener('focusin', pause);
  root.addEventListener('focusout', e => { if (!root.contains(e.relatedTarget)) resume(); });

  root.addEventListener('keydown', e => {
    if (e.key === 'ArrowLeft') go(index - 1);
    if (e.key === 'ArrowRight') go(index + 1);
  });

  document.addEventListener('visibilitychange', () => (document.hidden ? stop() : start()));

  show(0);
  start();
})();
