(() => {
  const body = document.body;
  const percent = document.querySelector('[data-boot-percent]');
  const status = document.querySelector('[data-boot-status]');
  const bootMessages = ['mounting interface', 'loading local assets', 'indexing control paths', 'ready for operator'];
  let bootValue = 0;
  let bootFinished = false;

  const setBootState = (value) => {
    bootValue = Math.min(value, 100);
    if (percent) percent.textContent = String(Math.round(bootValue)).padStart(3, '0');
    if (status) status.textContent = bootMessages[Math.min(Math.floor(bootValue / 28), bootMessages.length - 1)];
  };

  const finishBoot = () => {
    if (bootFinished) return;
    bootFinished = true;
    setBootState(100);
    window.setTimeout(() => body.classList.add('is-ready'), 180);
  };

  const bootTimer = window.setInterval(() => {
    if (bootValue < 86) setBootState(bootValue + (bootValue < 45 ? 7 : 3));
  }, 110);

  window.addEventListener('load', () => {
    window.clearInterval(bootTimer);
    window.setTimeout(finishBoot, Math.max(250, 1250 - performance.now()));
  }, { once: true });
  window.setTimeout(() => {
    window.clearInterval(bootTimer);
    finishBoot();
  }, 2800);

  const menuButton = document.querySelector('.menu-button');
  const mobileNav = document.querySelector('.mobile-nav');

  if (menuButton && mobileNav) {
    const closeMenu = () => {
      menuButton.classList.remove('is-open');
      menuButton.setAttribute('aria-expanded', 'false');
      menuButton.setAttribute('aria-label', '打开导航');
      mobileNav.classList.remove('is-open');
    };

    menuButton.addEventListener('click', () => {
      const open = menuButton.getAttribute('aria-expanded') === 'true';
      if (open) closeMenu();
      else {
        menuButton.classList.add('is-open');
        menuButton.setAttribute('aria-expanded', 'true');
        menuButton.setAttribute('aria-label', '关闭导航');
        mobileNav.classList.add('is-open');
      }
    });
    mobileNav.querySelectorAll('a').forEach((link) => link.addEventListener('click', closeMenu));
  }

  const modeTabs = [...document.querySelectorAll('[data-mode]')];
  const modePanels = [...document.querySelectorAll('[data-mode-panel]')];

  modeTabs.forEach((tab) => {
    tab.addEventListener('click', () => {
      const nextMode = tab.dataset.mode;
      modeTabs.forEach((item) => {
        const active = item === tab;
        item.classList.toggle('is-active', active);
        item.setAttribute('aria-selected', String(active));
      });
      modePanels.forEach((panel) => {
        panel.hidden = panel.dataset.modePanel !== nextMode;
        panel.classList.toggle('is-active', !panel.hidden);
      });
    });
  });

  const revealItems = document.querySelectorAll('.system-panel, .operation-row, .console-window, .console-aside, .cta');
  revealItems.forEach((item, index) => {
    item.classList.add('reveal-ready');
    item.style.setProperty('--reveal-delay', `${Math.min(index * 55, 240)}ms`);
  });

  if ('IntersectionObserver' in window && !window.matchMedia('(prefers-reduced-motion: reduce)').matches) {
    const observer = new IntersectionObserver((entries, instance) => {
      entries.forEach((entry) => {
        if (!entry.isIntersecting) return;
        entry.target.classList.add('is-visible');
        instance.unobserve(entry.target);
      });
    }, { threshold: .14 });
    revealItems.forEach((item) => observer.observe(item));
  } else {
    revealItems.forEach((item) => item.classList.add('is-visible'));
  }

  const reduceMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  const root = document.documentElement;
  const heroImage = document.querySelector('[data-scroll-parallax="hero"]');
  const heroImageAsset = heroImage?.querySelector('img');
  const heroSignal = document.querySelector('[data-scroll-parallax="signal"]');
  const scrollItems = [...document.querySelectorAll('[data-scroll-speed]')];
  const sectionLinks = [...document.querySelectorAll('.desktop-nav a[href^="#"]')];
  const sections = sectionLinks.map((link) => document.querySelector(link.getAttribute('href'))).filter(Boolean);
  let scrollTicking = false;

  const clamp = (value, min, max) => Math.min(Math.max(value, min), max);

  const updateScrollState = () => {
    const scrollTop = window.scrollY;
    const maxScroll = Math.max(document.documentElement.scrollHeight - window.innerHeight, 1);
    root.style.setProperty('--scroll-progress', (scrollTop / maxScroll).toFixed(4));

    if (!reduceMotion) {
      const viewportCenter = window.innerHeight * .5;
      if (heroImage) {
        const rect = heroImage.getBoundingClientRect();
        const distance = (rect.top + rect.height * .5 - viewportCenter) / Math.max(window.innerHeight, 1);
        heroImage.style.setProperty('--hero-frame-shift', `${clamp(-distance * 20, -20, 20).toFixed(2)}px`);
        if (heroImageAsset) {
          heroImageAsset.style.setProperty('--hero-image-shift', `${clamp(-distance * 28, -28, 28).toFixed(2)}px`);
          heroImageAsset.style.setProperty('--hero-image-scale', clamp(.06 - Math.abs(distance) * .035, 0, .06).toFixed(4));
        }
      }
      if (heroSignal) {
        const rect = heroSignal.getBoundingClientRect();
        const distance = (rect.top + rect.height * .5 - viewportCenter) / Math.max(window.innerHeight, 1);
        heroSignal.style.setProperty('--signal-shift', `${clamp(-distance * 32, -32, 32).toFixed(2)}px`);
      }
      scrollItems.forEach((item) => {
        const rect = item.getBoundingClientRect();
        const distance = (rect.top + rect.height * .5 - viewportCenter) / Math.max(window.innerHeight, 1);
        const speed = Number(item.dataset.scrollSpeed) || 0;
        item.style.setProperty('--scroll-offset', `${clamp(-distance * speed * 18, -22, 22).toFixed(2)}px`);
      });
    }
    scrollTicking = false;
  };

  const queueScrollState = () => {
    if (scrollTicking) return;
    scrollTicking = true;
    window.requestAnimationFrame(updateScrollState);
  };

  window.addEventListener('scroll', queueScrollState, { passive: true });
  window.addEventListener('resize', queueScrollState);
  queueScrollState();

  if (sectionLinks.length && 'IntersectionObserver' in window) {
    const navObserver = new IntersectionObserver((entries) => {
      entries.forEach((entry) => {
        if (!entry.isIntersecting) return;
        sectionLinks.forEach((link) => link.classList.toggle('is-current', link.getAttribute('href') === `#${entry.target.id}`));
      });
    }, { rootMargin: '-18% 0px -65% 0px', threshold: 0 });
    sections.forEach((section) => navObserver.observe(section));
  }
})();
