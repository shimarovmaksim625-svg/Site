/* LISTDOMEN — учебный прототип. Интерактив главного экрана и формы заявки. */

(() => {
  'use strict';

  const header = document.querySelector('.site-header');
  const nav = document.getElementById('primary-nav');
  const menuToggle = document.querySelector('.menu-toggle');
  const hero = document.getElementById('hero');
  const modal = document.getElementById('request-modal');
  const reduceMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

  /* --- Шапка: фон при скролле ------------------------------------------- */

  const onScroll = () => {
    header.classList.toggle('is-scrolled', window.scrollY > 8);
  };
  onScroll();
  window.addEventListener('scroll', onScroll, { passive: true });

  /* --- Мобильное меню ---------------------------------------------------- */

  const closeNav = () => {
    document.body.classList.remove('nav-open');
    menuToggle.setAttribute('aria-expanded', 'false');
    menuToggle.setAttribute('aria-label', 'Открыть меню');
  };

  document.querySelectorAll('[data-open-account], [data-open-modal]').forEach((trigger) => {
    trigger.addEventListener('click', closeNav);
  });

  menuToggle.addEventListener('click', () => {
    const open = document.body.classList.toggle('nav-open');
    menuToggle.setAttribute('aria-expanded', String(open));
    menuToggle.setAttribute('aria-label', open ? 'Закрыть меню' : 'Открыть меню');
  });

  nav.addEventListener('click', (event) => {
    if (event.target.closest('a')) closeNav();
  });

  document.addEventListener('keydown', (event) => {
    if (event.key === 'Escape') closeNav();
  });

  window.addEventListener('resize', () => {
    if (window.innerWidth > 860) closeNav();
  });

  /* --- Модальное окно заявки -------------------------------------------- */

  const closeModal = () => {
    if (typeof modal.close === 'function') modal.close();
    else modal.removeAttribute('open');
  };

  document.querySelectorAll('[data-close-modal]').forEach((trigger) => {
    trigger.addEventListener('click', closeModal);
  });

  modal.addEventListener('click', (event) => {
    if (event.target === modal) closeModal();
  });

  modal.addEventListener('close', () => {
    document.body.classList.remove('modal-open');
  });

  /* --- Появление блоков при прокрутке ----------------------------------- */

  const revealItems = document.querySelectorAll('.reveal');

  if (reduceMotion || !('IntersectionObserver' in window)) {
    revealItems.forEach((item) => item.classList.add('is-in'));
  } else {
    const observer = new IntersectionObserver((entries) => {
      entries.forEach((entry) => {
        if (entry.isIntersecting) {
          entry.target.classList.add('is-in');
          observer.unobserve(entry.target);
        }
      });
    }, { threshold: 0.16, rootMargin: '0px 0px -40px' });

    revealItems.forEach((item) => observer.observe(item));
  }

  /* --- Мягкое свечение за курсором в главном экране ---------------------- */

  const finePointer = window.matchMedia('(pointer: fine)').matches;

  if (finePointer && !reduceMotion && hero) {
    hero.addEventListener('pointermove', (event) => {
      const rect = hero.getBoundingClientRect();
      const x = ((event.clientX - rect.left) / rect.width) * 100;
      const y = ((event.clientY - rect.top) / rect.height) * 100;
      hero.style.setProperty('--mx', `${x}%`);
      hero.style.setProperty('--my', `${y}%`);
    }, { passive: true });
  }
})();
