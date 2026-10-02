import { createScene } from './scene.js';

const reducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
let motionApi = null;
let Three = null;

const importFromCDNs = async (sources) => {
  for (const source of sources) {
    try {
      return await import(source);
    } catch {}
  }
  return null;
};

const motionPromise = importFromCDNs([
  'https://cdn.jsdelivr.net/npm/motion@12.23.24/+esm',
  'https://esm.sh/motion@12.23.24'
])
  .then((module) => { motionApi = module; return module; })
  .catch(() => null);

const threePromise = importFromCDNs([
  'https://cdn.jsdelivr.net/npm/three@0.180.0/build/three.module.js',
  'https://unpkg.com/three@0.180.0/build/three.module.js'
])
  .then((module) => { Three = module; return module; })
  .catch(() => null);

const flowContent = {
  connect: {
    kicker: 'PAIR / CONFIGURE',
    title: '扫一下配对码，<br>或者手动填写连接。',
    description: '配对已有 Daemon，也可以设置地址与 API Key。连接优先使用 HTTPS；密钥由 Android Keystore 加密保存。'
  },
  create: {
    kicker: 'CREATE / PREPARE',
    title: '选运行位置，<br>再确定核心与 Java。',
    description: '分步向导可为 Daemon 或本机创建实例，匹配 Java 版本并准备服务器资源。手机开服无需 Termux。'
  },
  operate: {
    kicker: 'CONSOLE / MAINTAIN',
    title: '回到实例，<br>接着把日常运维做完。',
    description: '实时跟进 ANSI 彩色日志、发送命令，维护文件、Mod、插件与 server.properties。'
  }
};

function setupFlow() {
  const tabs = [...document.querySelectorAll('[data-flow-step]')];
  const panel = document.querySelector('[data-flow-panel]');
  if (!tabs.length || !panel) return;
  tabs.forEach((tab, index) => { tab.tabIndex = index === 0 ? 0 : -1; });

  const update = (tab, moveFocus = false) => {
    const key = tab.dataset.flowStep;
    const copy = flowContent[key];
    tabs.forEach((item) => {
      const active = item === tab;
      item.classList.toggle('is-active', active);
      item.setAttribute('aria-selected', String(active));
      item.tabIndex = active ? 0 : -1;
    });
    panel.setAttribute('aria-labelledby', tab.id);
    panel.querySelector('[data-flow-kicker]').textContent = copy.kicker;
    panel.querySelector('[data-flow-title]').innerHTML = copy.title;
    panel.querySelector('[data-flow-description]').textContent = copy.description;
    if (moveFocus) tab.focus();
    if (motionApi && !reducedMotion) {
      motionApi.animate(panel, { opacity: [.45, 1], y: [9, 0] }, { duration: .45, ease: [0.16, 1, 0.3, 1] });
    }
  };

  tabs.forEach((tab, index) => {
    tab.addEventListener('click', () => update(tab));
    tab.addEventListener('keydown', (event) => {
      if (!['ArrowRight', 'ArrowLeft', 'Home', 'End'].includes(event.key)) return;
      event.preventDefault();
      let next = index;
      if (event.key === 'ArrowRight') next = (index + 1) % tabs.length;
      if (event.key === 'ArrowLeft') next = (index - 1 + tabs.length) % tabs.length;
      if (event.key === 'Home') next = 0;
      if (event.key === 'End') next = tabs.length - 1;
      update(tabs[next], true);
    });
  });
}

function sceneFactory(canvas, isStory) {
  if (!canvas) return null;
  const parent = canvas.parentElement;
  const showFallback = () => {
    parent?.classList.add('scene-fallback');
    if (!isStory) {
      const label = document.querySelector('.art-footnote');
      if (label) label.textContent = '3D SCENE UNAVAILABLE / SHOWING STATIC VIEW';
    }
  };
  const state = Three && createScene(Three, canvas, { isStory, reducedMotion });
  if (!state) {
    showFallback();
    return null;
  }
  parent.classList.add('scene-ready');
  return state;
}

async function startThree() {
  await threePromise;
  const hero = sceneFactory(document.querySelector('[data-world-canvas]'), false);
  const story = sceneFactory(document.querySelector('[data-story-canvas]'), true);
  const scenes = [hero, story].filter(Boolean);
  if (!scenes.length) return;
  let animationFrame = 0;
  let isVisible = !document.hidden;
  let heroActive = false;
  let storyActive = false;
  let lastFrame = 0;

  const renderLoop = (time) => {
    animationFrame = 0;
    if (!isVisible || reducedMotion) return;
    if (time - lastFrame >= 15) {
      lastFrame = time;
      if (heroActive) hero?.render();
      if (storyActive) story?.render();
    }
    if (heroActive || storyActive) animationFrame = requestAnimationFrame(renderLoop);
  };
  const schedule = () => {
    if (reducedMotion) {
      if (heroActive) hero?.render();
      if (storyActive) story?.render();
      return;
    }
    if (!animationFrame && (heroActive || storyActive) && isVisible) animationFrame = requestAnimationFrame(renderLoop);
  };

  const visibility = new IntersectionObserver((entries) => {
    entries.forEach((entry) => {
      if (entry.target.matches('[data-hero-art]')) heroActive = entry.isIntersecting;
      if (entry.target.matches('[data-world-stage]')) storyActive = entry.isIntersecting;
    });
    schedule();
  }, { threshold: .02 });
  const heroArt = document.querySelector('[data-hero-art]');
  const stage = document.querySelector('[data-world-stage]');
  if (heroArt) visibility.observe(heroArt);
  if (stage) visibility.observe(stage);

  const handleVisibility = () => {
    isVisible = !document.hidden;
    if (isVisible) schedule();
    else if (animationFrame) cancelAnimationFrame(animationFrame);
    if (!isVisible) animationFrame = 0;
  };
  document.addEventListener('visibilitychange', handleVisibility);

  const onPointer = (event) => {
    const box = hero?.parent.getBoundingClientRect();
    if (!box) return;
    hero.pointerX = ((event.clientX - box.left) / box.width - .5) * 2;
    hero.pointerY = ((event.clientY - box.top) / box.height - .5) * 2;
    schedule();
  };
  heroArt?.addEventListener('pointermove', onPointer, { passive: true });
  const onPointerLeave = () => {
    if (!hero) return;
    hero.pointerX = 0;
    hero.pointerY = 0;
    schedule();
  };
  heroArt?.addEventListener('pointerleave', onPointerLeave, { passive: true });

  const updateFocus = (mode) => {
    scenes.forEach((item) => { item.focus = mode; item.render(); });
    const labels = {
      remote: ['远程节点', '多个 Daemon · 独立连接状态'],
      local: ['手机本机', 'Android · Minecraft Java Server']
    };
    const title = document.querySelector('[data-readout-title]');
    const copy = document.querySelector('[data-readout-copy]');
    if (title) title.textContent = labels[mode][0];
    if (copy) copy.textContent = labels[mode][1];
    document.querySelectorAll('[data-art-mode]').forEach((button) => {
      const active = button.dataset.artMode === mode;
      button.classList.toggle('is-active', active);
      button.setAttribute('aria-pressed', String(active));
    });
    document.querySelector('.art-control')?.setAttribute('data-active', mode);
  };
  document.querySelectorAll('[data-art-mode]').forEach((button) => {
    button.addEventListener('click', () => updateFocus(button.dataset.artMode));
  });

  const cleanup = () => {
    if (animationFrame) cancelAnimationFrame(animationFrame);
    visibility.disconnect();
    document.removeEventListener('visibilitychange', handleVisibility);
    heroArt?.removeEventListener('pointermove', onPointer);
    heroArt?.removeEventListener('pointerleave', onPointerLeave);
    scenes.forEach((item) => item.dispose());
  };
  window.addEventListener('pagehide', cleanup, { once: true });

  const scrollStops = [];
  if (motionApi && !reducedMotion) {
    const storySection = document.querySelector('#world');
    const chapters = [...document.querySelectorAll('[data-chapter]')];
    const phaseLabels = ['01 — CONNECT', '02 — LOCAL HOST', '03 — RESOURCES', '04 — CONSOLE'];
    const markerThresholds = { remote: 0, local: .27, resources: .53, console: .78 };
    const phase = document.querySelector('[data-stage-phase]');
    const updateChapter = (progress) => {
      const index = Math.min(chapters.length - 1, Math.floor(progress * chapters.length));
      chapters.forEach((chapter, chapterIndex) => chapter.classList.toggle('is-active', chapterIndex === index));
      if (phase) phase.textContent = phaseLabels[index];
      document.querySelectorAll('[data-orbit-label]').forEach((label) => {
        label.classList.toggle('is-lit', progress >= markerThresholds[label.dataset.orbitLabel]);
      });
    };
    if (storySection) {
      const controls = motionApi.scroll((progress) => {
        story.progress = progress;
        updateChapter(progress);
        if (storyActive) { story.render(); schedule(); }
      }, { target: storySection, offset: ['start end', 'end start'] });
      scrollStops.push(() => controls.stop());
      updateChapter(0);
    }
  }
  window.addEventListener('pagehide', () => scrollStops.forEach((stop) => stop()), { once: true });
}

function applyMotion() {
  if (!motionApi || reducedMotion) return;
  const { animate, inView, scroll, stagger } = motionApi;
  animate('.hero-copy > *', { opacity: [0, 1], y: [17, 0] }, {
    delay: stagger(.075),
    duration: .75,
    ease: [0.16, 1, 0.3, 1]
  });
  animate('.hero-art', { opacity: [0, 1], scale: [.985, 1] }, {
    delay: .16,
    duration: .95,
    ease: [0.16, 1, 0.3, 1]
  });

  const scrollCleanup = scroll((progress) => {
    document.documentElement.style.setProperty('--scroll-progress', String(progress));
  }, { target: document.documentElement });
  window.addEventListener('pagehide', () => scrollCleanup.stop(), { once: true });

  const stopReveals = inView('.world-intro, .section-heading, .workflow-map, .console-copy, .console-display, .cta-content, .cta-actions', (element) => {
    animate(element, { opacity: [0, 1], y: [20, 0], filter: ['blur(3px)', 'blur(0px)'] }, {
      duration: .75,
      ease: [0.16, 1, 0.3, 1]
    });
  }, { margin: '0px 0px -13% 0px' });
  window.addEventListener('pagehide', stopReveals, { once: true });

  const magneticButtons = [...document.querySelectorAll('.magnetic')];
  const pointerCleanup = [];
  magneticButtons.forEach((button) => {
    let moveX = 0;
    let moveY = 0;
    const move = (event) => {
      const rect = button.getBoundingClientRect();
      moveX = (event.clientX - rect.left - rect.width / 2) * .08;
      moveY = (event.clientY - rect.top - rect.height / 2) * .08;
      animate(button, { x: moveX, y: moveY }, { type: 'spring', stiffness: 180, damping: 19 });
    };
    const reset = () => animate(button, { x: 0, y: 0 }, { type: 'spring', stiffness: 180, damping: 19 });
    button.addEventListener('pointermove', move, { passive: true });
    button.addEventListener('pointerleave', reset, { passive: true });
    pointerCleanup.push(() => {
      button.removeEventListener('pointermove', move);
      button.removeEventListener('pointerleave', reset);
    });
  });
  window.addEventListener('pagehide', () => pointerCleanup.forEach((remove) => remove()), { once: true });
}

setupFlow();
motionPromise.then(applyMotion);
threePromise.then(startThree);
