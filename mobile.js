const motionSource = 'https://cdn.jsdelivr.net/npm/motion@12.23.24/+esm';
const reducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

const modeContent = {
  remote: {
    kicker: 'REMOTE / DAEMON',
    title: '已有主机，也能随身管。',
    description: '并行查看多个 Daemon 的连接状态与响应时间。进入实例即可控制进程、看日志、管理文件。',
    benefits: ['多台连接保持独立', 'HTTPS 优先与二维码配对', 'SignalR 实时状态'],
    foot: '多个连接分别显示状态',
    names: ['daemon-01', 'local-world'],
    locations: ['MSLX / HTTPS', 'ANDROID / JVM'],
    states: ['ONLINE', 'RUNNING'],
    imageLabel: '从一台 Daemon 开始'
  },
  local: {
    kicker: 'LOCAL / ANDROID',
    title: '没有电脑，也能运行 Java。',
    description: '在手机上创建 Minecraft Java 服务端，按游戏版本选运行时，再从应用内控制台进行维护。',
    benefits: ['Java 8 / 17 / 21 / 25', 'Shizuku 可启用独立子进程', '前台服务与常驻通知'],
    foot: '本机实例同样进入服务端总览',
    names: ['remote-daemon', 'phone-world'],
    locations: ['MSLX / HTTPS', 'ANDROID / JAVA'],
    states: ['CONNECTED', 'LOCAL HOST'],
    imageLabel: '手机本机运行服务端'
  }
};

function setMode(mode, focus = false) {
  const content = modeContent[mode];
  const panel = document.querySelector('[data-mobile-panel]');
  if (!content || !panel) return;
  panel.dataset.mode = mode;
  const title = panel.querySelector('[data-mobile-mode-title]');
  const description = panel.querySelector('[data-mobile-mode-description]');
  panel.querySelector('[data-mobile-kicker]').textContent = content.kicker;
  title.textContent = content.title;
  description.textContent = content.description;
  panel.querySelectorAll('[data-instance-name]').forEach((node, index) => { node.textContent = content.names[index]; });
  panel.querySelectorAll('[data-instance-location]').forEach((node, index) => { node.textContent = content.locations[index]; });
  panel.querySelectorAll('.instance-state').forEach((node, index) => { node.textContent = content.states[index]; });
  panel.querySelector('[data-illustration-foot]').textContent = content.foot;
  document.querySelector('[data-mobile-image-label]').textContent = content.imageLabel;
  const list = panel.querySelector('[data-mobile-benefits]');
  list.replaceChildren(...content.benefits.map((benefit) => {
    const item = document.createElement('li');
    item.textContent = benefit;
    return item;
  }));
  document.querySelector('.mobile-mode-control').dataset.active = mode;
  document.querySelectorAll('[data-mobile-mode]').forEach((tab) => {
    const active = tab.dataset.mobileMode === mode;
    tab.classList.toggle('is-active', active);
    tab.setAttribute('aria-selected', String(active));
    tab.tabIndex = active ? 0 : -1;
  });
  panel.setAttribute('aria-labelledby', mode === 'remote' ? 'remote-tab' : 'local-tab');
  if (focus) document.querySelector('[data-mobile-mode="' + mode + '"]')?.focus();
}

function setupTabs() {
  const tabs = [...document.querySelectorAll('[data-mobile-mode]')];
  tabs.forEach((tab, index) => {
    tab.addEventListener('click', () => setMode(tab.dataset.mobileMode));
    tab.addEventListener('keydown', (event) => {
      if (!['ArrowRight', 'ArrowLeft', 'Home', 'End'].includes(event.key)) return;
      event.preventDefault();
      const nextIndex = event.key === 'Home' ? 0
        : event.key === 'End' ? tabs.length - 1
          : (index + (event.key === 'ArrowRight' ? 1 : tabs.length - 1)) % tabs.length;
      setMode(tabs[nextIndex].dataset.mobileMode, true);
    });
  });
}

setupTabs();
setMode('remote');

import(motionSource).then((motion) => {
  if (reducedMotion) return;
  const { animate, inView, scroll, stagger } = motion;
  animate('.mobile-hero-copy > *', { opacity: [.1, 1], y: [14, 0] }, {
    delay: stagger(.07),
    duration: .62,
    ease: [0.16, 1, 0.3, 1]
  });
  animate('.mobile-landscape', { opacity: [.5, 1], y: [14, 0] }, {
    delay: .12,
    duration: .7,
    ease: [0.16, 1, 0.3, 1]
  });
  inView('.mobile-section-heading, .mobile-mode-control, .mobile-mode-panel, .path-item, .mobile-console-view, .mobile-download-callout', (element) => {
    animate(element, { opacity: [.45, 1], y: [13, 0], filter: ['blur(2px)', 'blur(0px)'] }, {
      duration: .6,
      ease: [0.16, 1, 0.3, 1]
    });
  }, { margin: '0px 0px -12% 0px' });
  scroll((progress) => {
    document.documentElement.style.setProperty('--scroll-progress', String(progress));
  }, { target: document.documentElement });
}).catch(() => {});
