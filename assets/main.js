/* ListMedia — учебный прототип, версия 2.
   Переключение полноэкранных разделов и форма заявки. */

(() => {
  'use strict';

  const root = document.documentElement;

  /* Если main.js не загрузился, страница через 2 с вернётся к обычной вёрстке. */
  root.classList.add('js');
  root.dataset.deck = 'ready';

  const screens = Array.from(document.querySelectorAll('.screen'));
  if (!screens.length) return;

  const nav = document.getElementById('primary-nav');
  const navLinks = Array.from(document.querySelectorAll('.nav-link[data-goto]'));
  const openButtons = Array.from(document.querySelectorAll('[data-open-request]'));
  const navToggle = document.querySelector('[data-nav-toggle]');
  const navScrim = document.querySelector('[data-nav-close]');
  const navMedia = window.matchMedia('(max-width: 900px)');
  const status = document.getElementById('deck-status');
  const skipLink = document.querySelector('[data-skip]');
  const main = document.getElementById('main');

  const reduceMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  const coarsePointer = window.matchMedia('(pointer: coarse)').matches;

  const indexById = new Map(screens.map((screen, index) => [screen.id, index]));
  const titles = screens.map((screen) => {
    const heading = screen.querySelector('h1, h2');
    return heading ? heading.textContent.replace(/\s+/g, ' ').trim() : screen.id;
  });

  let current = -1;
  const leaveTimers = new WeakMap();

  /* Задержка появления элементов внутри раздела */
  screens.forEach((screen) => {
    screen.querySelectorAll('.reveal').forEach((el, i) => {
      el.style.setProperty('--i', String(Math.min(i, 8)));
    });
  });

  const headingOf = (index) => screens[index].querySelector('h1, h2');

  const focusHeading = (index) => {
    const heading = headingOf(index);
    if (heading) heading.focus({ preventScroll: true });
  };

  const setActive = (index, { announce = true, focus = false } = {}) => {
    const next = (index + screens.length) % screens.length;
    const prev = current;
    current = next;

    if (prev !== -1 && prev !== next) {
      const prevScreen = screens[prev];
      if (leaveTimers.has(prevScreen)) {
        clearTimeout(leaveTimers.get(prevScreen));
        leaveTimers.delete(prevScreen);
      }
      if (!reduceMotion) {
        prevScreen.classList.add('is-leaving');
        const timer = window.setTimeout(() => {
          prevScreen.classList.remove('is-leaving');
          leaveTimers.delete(prevScreen);
        }, 460);
        leaveTimers.set(prevScreen, timer);
      }
    }

    const nextScreen = screens[next];
    if (leaveTimers.has(nextScreen)) {
      clearTimeout(leaveTimers.get(nextScreen));
      leaveTimers.delete(nextScreen);
    }
    nextScreen.classList.remove('is-leaving');

    /* Если фокус был внутри уходящего раздела (например, на кнопке CTA),
       переносим его в новый раздел — иначе aria-hidden получит фокус. */
    const focusedScreen = document.activeElement && document.activeElement.closest
      ? document.activeElement.closest('.screen')
      : null;
    const moveFocus = Boolean(focusedScreen) && focusedScreen !== screens[next];

    screens.forEach((screen, i) => {
      const isActive = i === next;
      screen.classList.toggle('is-active', isActive);
      screen.inert = !isActive;
      if (isActive) screen.removeAttribute('aria-hidden');
      else screen.setAttribute('aria-hidden', 'true');
      if (isActive && screen.scrollTop) screen.scrollTop = 0;
    });

    navLinks.forEach((link) => {
      if (link.dataset.goto === screens[next].id) link.setAttribute('aria-current', 'page');
      else link.removeAttribute('aria-current');
    });

    if (announce && status) {
      status.textContent = `Раздел ${next + 1} из ${screens.length}: ${titles[next]}`;
    }

    if (focus || moveFocus) focusHeading(next);

    const activeLink = navLinks.find((link) => link.dataset.goto === screens[next].id);
    if (activeLink && nav && nav.scrollWidth > nav.clientWidth) {
      activeLink.scrollIntoView({ block: 'nearest', inline: 'nearest' });
    }
  };

  const showId = (id, options = {}) => {
    const index = indexById.get(id);
    if (index === undefined) return false;
    setActive(index, options);
    return true;
  };

  const navigate = (id, options = {}) => {
    showId(id, options);
    if (window.location.hash !== `#${id}`) {
      window.history.pushState({ screen: id }, '', `#${id}`);
    }
  };

  /* --- Меню на телефоне -------------------------------------------------- */

  let navOpen = false;

  const syncNavMode = () => {
    if (!nav) return;
    nav.inert = navMedia.matches && !navOpen;
    if (main) main.inert = navMedia.matches && navOpen;

    if (!navMedia.matches && navOpen) {
      navOpen = false;
      nav.classList.remove('is-open');
      document.body.classList.remove('nav-open');
      if (navToggle) navToggle.setAttribute('aria-expanded', 'false');
      if (navScrim) navScrim.classList.remove('is-open');
      if (main) main.inert = false;
    }
  };

  const setMenu = (open, { moveFocus = false } = {}) => {
    if (!nav || !navToggle) return;

    navOpen = Boolean(open) && navMedia.matches;
    nav.classList.toggle('is-open', navOpen);
    navToggle.setAttribute('aria-expanded', String(navOpen));
    navToggle.setAttribute('aria-label', navOpen ? 'Закрыть меню разделов' : 'Открыть меню разделов');
    if (navScrim) navScrim.classList.toggle('is-open', navOpen);
    document.body.classList.toggle('nav-open', navOpen);
    syncNavMode();

    if (!moveFocus) return;

    if (navOpen) {
      const active = nav.querySelector('.nav-link[aria-current="page"]') || nav.querySelector('.nav-link');
      if (active) active.focus({ preventScroll: true });
    } else {
      navToggle.focus({ preventScroll: true });
    }
  };

  if (navToggle) {
    navToggle.addEventListener('click', () => setMenu(!navOpen, { moveFocus: true }));
  }

  if (navScrim) {
    navScrim.addEventListener('click', () => setMenu(false, { moveFocus: true }));
  }

  document.addEventListener('keydown', (event) => {
    if (event.key !== 'Escape' || !navOpen) return;
    setMenu(false, { moveFocus: true });
  });

  if (navMedia.addEventListener) {
    navMedia.addEventListener('change', () => setMenu(false));
  } else if (navMedia.addListener) {
    navMedia.addListener(() => setMenu(false));
  }

  syncNavMode();

  /* --- Переходы по ссылкам с data-goto и прокрутка наверх ----------------- */

  document.addEventListener('click', (event) => {
    const topLink = event.target.closest('[data-scroll-top]');
    if (topLink) {
      event.preventDefault();
      const activeScreen = screens[current];
      if (activeScreen) {
        activeScreen.scrollTo({ top: 0, behavior: reduceMotion ? 'auto' : 'smooth' });
      }
      focusHeading(current);
      return;
    }

    const link = event.target.closest('[data-goto]');
    if (!link) return;

    const id = link.dataset.goto;
    if (!indexById.has(id)) return;

    event.preventDefault();
    const wasOpen = navOpen;
    if (wasOpen) setMenu(false);
    navigate(id, wasOpen ? { focus: true } : {});
  });

  /* --- Кнопки «Оставить заявку» ведут в раздел с формой ------------------ */

  const form = document.getElementById('request-form');
  const success = document.getElementById('form-success');
  const successTitle = document.getElementById('success-title');
  const resetButton = document.getElementById('form-reset');

  const reopenForm = () => {
    if (!form || !success || !form.hidden) return;
    form.reset();
    success.hidden = true;
    form.hidden = false;
  };

  openButtons.forEach((button) => {
    button.addEventListener('click', () => {
      setMenu(false);
      reopenForm();
      navigate('request');

      window.requestAnimationFrame(() => {
        if (coarsePointer || reduceMotion) {
          focusHeading(indexById.get('request'));
          return;
        }

        const firstField = document.querySelector('#request-form input');
        if (firstField) firstField.focus({ preventScroll: true });
      });
    });
  });

  /* --- Клавиатура в верхней панели --------------------------------------- */

  if (nav) {
    nav.addEventListener('keydown', (event) => {
      const links = Array.from(nav.querySelectorAll('.nav-link'));
      const index = links.indexOf(document.activeElement);
      if (index === -1) return;

      let target = null;

      if (event.key === 'ArrowRight') target = links[(index + 1) % links.length];
      else if (event.key === 'ArrowLeft') target = links[(index - 1 + links.length) % links.length];
      else if (event.key === 'Home') target = links[0];
      else if (event.key === 'End') target = links[links.length - 1];

      if (!target) return;
      event.preventDefault();
      target.focus();
    });
  }

  /* --- Ссылка «Перейти к содержимому» ------------------------------------ */

  if (skipLink) {
    skipLink.addEventListener('click', (event) => {
      event.preventDefault();
      const heading = headingOf(current);
      if (heading) heading.focus();
      else if (main) main.focus();
    });
  }

  /* --- Кнопки назад/вперёд в браузере ------------------------------------ */

  const syncFromLocation = () => {
    const id = window.location.hash.slice(1);
    const nextIndex = indexById.has(id) ? indexById.get(id) : 0;
    if (nextIndex !== current) setActive(nextIndex);
  };

  window.addEventListener('popstate', syncFromLocation);
  window.addEventListener('hashchange', syncFromLocation);

  /* --- Свечение за курсором подключается отдельным файлом glow.js --------- */

  /* --- Форма заявки ------------------------------------------------------ */

  if (form && success) {
    const requiredTextFields = Array.from(
      form.querySelectorAll('input[required]:not([type="checkbox"]), textarea[required]')
    );

    requiredTextFields.forEach((field) => {
      field.addEventListener('input', () => field.setCustomValidity(''));
    });

    form.addEventListener('submit', (event) => {
      event.preventDefault();

      requiredTextFields.forEach((field) => {
        if (field.value.length > 0 && field.value.trim() === '') {
          field.setCustomValidity('Заполните это поле.');
        } else {
          field.setCustomValidity('');
        }
      });

      if (!form.reportValidity()) return;

      form.hidden = true;
      success.hidden = false;
      if (successTitle) successTitle.focus({ preventScroll: true });
    });

    if (resetButton) {
      resetButton.addEventListener('click', () => {
        form.reset();
        success.hidden = true;
        form.hidden = false;

        const firstField = form.querySelector('input');
        if (firstField) firstField.focus({ preventScroll: true });
      });
    }
  }

  /* --- Стартовый раздел -------------------------------------------------- */

  const initialId = window.location.hash.slice(1);
  setActive(indexById.has(initialId) ? indexById.get(initialId) : 0, { announce: false });
})();
