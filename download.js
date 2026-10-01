(() => {
  const body = document.body;
  const percent = document.querySelector('[data-boot-percent]');
  const bootStatus = document.querySelector('[data-boot-status]');
  const bootMessages = ['mounting release channel', 'requesting CNB metadata', 'resolving APK assets', 'ready to install'];
  let bootValue = 0;
  let bootFinished = false;

  const setBootState = (value) => {
    bootValue = Math.min(value, 100);
    if (percent) percent.textContent = String(Math.round(bootValue)).padStart(3, '0');
    if (bootStatus) bootStatus.textContent = bootMessages[Math.min(Math.floor(bootValue / 28), bootMessages.length - 1)];
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

  const CNB_REPO = 'WLudy/MSLX_APP-Android';
  const CNB_REPO_URL = `https://cnb.cool/${CNB_REPO}`;
  const CNB_API_BASE = 'https://api.cnb.cool';
  const CNB_RELEASE_API = `${CNB_API_BASE}/${CNB_REPO}/-/releases/latest`;
  const CNB_RELEASE_READER = `https://r.jina.ai/http://cnb.cool/${CNB_REPO}/-/releases/latest`;
  const CNB_RELEASES_PAGE = `${CNB_REPO_URL}/-/releases`;
  const CNB_DOWNLOAD_BASE = `${CNB_REPO_URL}/-/releases/download`;
  const GITHUB_RELEASE_API = 'https://api.github.com/repos/WLudy1012/MSLX_APP-Android/releases/latest';
  const APK_NAMES = { full: 'app-release.apk', lite: 'app-release-lite.apk' };
  const CACHED_RELEASE = {
    tag: 'v1.7.7-Beta',
    title: 'MSLX_APP-Android v1.7.7-Beta',
    publishedAt: '2026-09-26T08:51:57Z',
    assets: [
      { name: APK_NAMES.full, url: `${CNB_DOWNLOAD_BASE}/v1.7.7-Beta/${APK_NAMES.full}`, size: 49231948, hash: 'cefb958f8968b068647d728024f4f28567793ab48b610995167100d9b648ce2d' },
      { name: APK_NAMES.lite, url: `${CNB_DOWNLOAD_BASE}/v1.7.7-Beta/${APK_NAMES.lite}`, size: 11534336, hash: '94932de84d473840124181aff7c30d00150dda941e65126c2f91eadf389ab28c' },
    ],
    releaseUrl: `${CNB_REPO_URL}/-/releases/tag/v1.7.7-Beta`,
    source: 'CNB cache',
  };

  const getText = (value) => typeof value === 'string' ? value.trim() : '';
  const pickRelease = (payload) => {
    if (Array.isArray(payload)) return payload.find((item) => item?.is_latest || item?.latest || item?.isLatest) || payload[0] || null;
    if (!payload || typeof payload !== 'object') return null;
    if (payload.release && typeof payload.release === 'object') return pickRelease(payload.release);
    if (Array.isArray(payload.data)) return pickRelease(payload.data);
    if (payload.data && typeof payload.data === 'object') return pickRelease(payload.data);
    return payload;
  };

  const getTag = (release) => getText(release.tag_name || release.tag || release.tagName || release.ref);
  const getAssetName = (asset) => getText(asset.name || asset.filename || asset.file_name || asset.path?.split('/').pop());
  const getAssetUrl = (asset, tag, name) => {
    const url = getText(asset.browser_download_url || asset.brower_download_url || asset.download_url || asset.downloadUrl || asset.web_url);
    return /^https?:\/\//i.test(url) ? url : tag && name ? `${CNB_DOWNLOAD_BASE}/${encodeURIComponent(tag)}/${encodeURIComponent(name)}` : '';
  };
  const getHash = (asset, bodyText, name) => {
    const directHash = getText(asset.hash_value || asset.sha256 || asset.digest || asset.hash);
    const normalized = directHash.replace(/^sha256:/i, '').toLowerCase();
    if (/^[a-f0-9]{64}$/.test(normalized)) return normalized;
    const line = getText(bodyText).split(/\r?\n/).find((item) => item.toLowerCase().includes(name.toLowerCase()));
    return line?.match(/[a-f0-9]{64}/i)?.[0]?.toLowerCase() || '';
  };

  const normalizeRelease = (payload) => {
    const release = pickRelease(payload);
    if (!release) throw new Error('CNB Release 响应为空');
    const tag = getTag(release);
    if (!tag) throw new Error('CNB Release 缺少 tag');
    const rawAssets = release.assets || release.attachments || release.files || [];
    const assetList = Array.isArray(rawAssets) ? rawAssets : Object.values(rawAssets || {});
    const bodyText = release.body || release.description || '';
    const assets = assetList.map((asset) => {
      const name = getAssetName(asset);
      return {
        name,
        url: getAssetUrl(asset, tag, name),
        size: Number(asset.size || asset.file_size || asset.fileSize || 0),
        hash: getHash(asset, bodyText, name),
      };
    }).filter((asset) => asset.name);
    return {
      tag,
      title: getText(release.name || release.title) || tag,
      publishedAt: release.published_at || release.publishedAt || release.created_at || release.createdAt,
      assets,
      releaseUrl: getText(release.html_url || release.web_url) || `${CNB_REPO_URL}/-/releases/tag/${encodeURIComponent(tag)}`,
      source: 'CNB API',
    };
  };

  const parseReaderSize = (value) => {
    const match = getText(value).match(/([\d.]+)\s*(KB|MB|GB)/i);
    if (!match) return 0;
    const units = { KB: 1024, MB: 1024 ** 2, GB: 1024 ** 3 };
    return Number(match[1]) * units[match[2].toUpperCase()];
  };

  const normalizeReaderRelease = (markdown) => {
    const body = getText(markdown);
    const heading = body.match(/^##\s+(.+?)\s*$/m);
    const headingText = getText(heading?.[1]);
    const tag = headingText.match(/\b(v?\d+(?:\.\d+)+(?:-[A-Za-z0-9.-]+)?)\b/)?.[1] || body.match(/\b(v?\d+(?:\.\d+)+(?:-[A-Za-z0-9.-]+)?)\b/)?.[1] || '';
    if (!tag) throw new Error('CNB Release 页面缺少 tag');
    const assets = body.split(/\r?\n/).map((line) => {
      const match = line.match(/^\|\s*`?([^`|]+)`?\s*\|.*?\|\s*([^|]+?)\s*\|\s*`?([a-f0-9]{64})`?\s*\|$/i);
      if (!match) return null;
      const name = getText(match[1]);
      return {
        name,
        url: `${CNB_DOWNLOAD_BASE}/${encodeURIComponent(tag)}/${encodeURIComponent(name)}`,
        size: parseReaderSize(match[2]),
        hash: getText(match[3]).toLowerCase(),
      };
    }).filter(Boolean);
    return {
      tag,
      title: headingText || tag,
      publishedAt: '',
      assets,
      releaseUrl: `${CNB_REPO_URL}/-/releases/tag/${encodeURIComponent(tag)}`,
      source: 'CNB Release 页面',
    };
  };

  const fallbackAsset = (tag, name) => ({ name, url: `${CNB_DOWNLOAD_BASE}/${encodeURIComponent(tag)}/${encodeURIComponent(name)}`, size: 0, hash: '' });
  const findAsset = (release, name) => release.assets.find((asset) => asset.name.toLowerCase() === name.toLowerCase()) || fallbackAsset(release.tag, name);
  const formatSize = (size) => {
    if (!Number.isFinite(size) || size <= 0) return 'CNB Release 附件';
    const megabytes = size / 1024 / 1024;
    return `${megabytes >= 100 ? megabytes.toFixed(0) : megabytes.toFixed(1)} MB`;
  };
  const formatDate = (value) => {
    if (!value) return '发布时间待 CNB 返回';
    const date = new Date(value);
    if (Number.isNaN(date.getTime())) return value;
    return new Intl.DateTimeFormat('zh-CN', { year: 'numeric', month: '2-digit', day: '2-digit' }).format(date);
  };

  const apiState = document.querySelector('[data-api-state]');
  const releaseVersion = document.querySelector('[data-release-version]');
  const releaseVersionCopy = document.querySelector('[data-release-version-copy]');
  const releaseDate = document.querySelector('[data-release-date]');
  const releaseSummary = document.querySelector('[data-release-summary]');
  const releaseLink = document.querySelector('[data-release-link]');
  const releaseSource = document.querySelector('[data-release-source]');
  const apiNote = document.querySelector('[data-api-note]');

  const setApiState = (label, ready) => {
    if (!apiState) return;
    apiState.textContent = label;
    apiState.dataset.ready = String(ready);
  };

  const setCard = (key, asset) => {
    const card = document.querySelector(`[data-artifact-card="${key}"]`);
    if (!card) return;
    const size = card.querySelector('[data-asset-size]');
    const hash = card.querySelector('[data-asset-hash]');
    const status = card.querySelector('[data-asset-status]');
    const link = card.querySelector('[data-download-link]');
    if (size) size.textContent = formatSize(asset.size);
    if (hash) hash.textContent = asset.hash ? `SHA-256 ${asset.hash.slice(0, 12)}…` : 'SHA-256 见 CNB Release 说明';
    if (link) {
      link.href = asset.url || CNB_RELEASES_PAGE;
      link.setAttribute('aria-disabled', String(!asset.url));
      link.classList.toggle('is-ready', Boolean(asset.url));
    }
    if (status) {
      status.textContent = asset.url ? 'CNB 直链已就绪' : '未找到附件，请打开 Release 页面';
      status.classList.toggle('is-ready', Boolean(asset.url));
    }
  };

  const fetchWithTimeout = async (endpoint, options, timeoutMs) => {
    const controller = new AbortController();
    const timer = window.setTimeout(() => controller.abort(), timeoutMs);
    try {
      return await fetch(endpoint, { ...options, signal: controller.signal });
    } finally {
      window.clearTimeout(timer);
    }
  };

  const loadProvider = async (provider) => {
    const response = await fetchWithTimeout(provider.endpoint, {
      headers: { Accept: provider.type === 'reader' ? 'text/plain' : 'application/json' },
      cache: provider.type === 'reader' ? 'default' : 'no-store',
    }, provider.timeoutMs);
    if (!response.ok) throw new Error(`${provider.name} HTTP ${response.status}`);
    const release = provider.type === 'reader'
      ? normalizeReaderRelease(await response.text())
      : normalizeRelease(await response.json());
    if (provider.endpoint === GITHUB_RELEASE_API) {
      release.source = 'GitHub tag / CNB URL';
      release.releaseUrl = `${CNB_REPO_URL}/-/releases/tag/${encodeURIComponent(release.tag)}`;
      release.assets = release.assets.map((asset) => ({ ...asset, url: `${CNB_DOWNLOAD_BASE}/${encodeURIComponent(release.tag)}/${encodeURIComponent(asset.name)}` }));
    }
    return release;
  };

  const loadRelease = async () => {
    const providers = [
      { endpoint: GITHUB_RELEASE_API, type: 'json', name: 'GitHub Release', timeoutMs: 4500 },
      { endpoint: CNB_RELEASE_API, type: 'json', name: 'CNB API', timeoutMs: 2500 },
      { endpoint: CNB_RELEASE_READER, type: 'reader', name: 'CNB Release 页面', timeoutMs: 8000 },
    ];
    return Promise.any(providers.map(loadProvider));
  };

  const showRelease = (release, pending = false) => {
    const version = release.title || release.tag;
    const date = formatDate(release.publishedAt);
    if (releaseVersion) releaseVersion.textContent = release.tag;
    if (releaseVersionCopy) releaseVersionCopy.textContent = version;
    if (releaseDate) releaseDate.textContent = date;
    if (releaseSummary) releaseSummary.textContent = `发布于 ${date}`;
    if (releaseSource) releaseSource.textContent = `${release.source} / ${release.assets.length} ASSETS`;
    if (releaseLink) releaseLink.href = release.releaseUrl;
    if (apiNote) {
      apiNote.textContent = pending
        ? '正在后台同步最新 Release，当前先展示最近可用版本。'
        : release.source === 'CNB API'
        ? '已从 CNB Release API 解析最新附件，按钮使用对应的 CNB 直链。'
        : release.source === 'CNB Release 页面'
          ? 'CNB API 需要访问令牌，已从公开的最新 Release 页面解析附件，按钮仍使用 CNB 直链。'
          : release.source === 'CNB cache'
            ? '当前显示最近一次可用的 CNB Release，页面会继续尝试同步最新版本。'
            : 'CNB API 暂时不可读，已用 GitHub 最新 tag 生成同版本的 CNB 直链。';
    }
    setApiState(pending ? 'SYNCING' : release.source === 'CNB cache' ? 'CACHED' : 'READY', true);
    setCard('full', findAsset(release, APK_NAMES.full));
    setCard('lite', findAsset(release, APK_NAMES.lite));
  };

  const showError = (error) => {
    setApiState('ERROR', false);
    if (releaseVersion) releaseVersion.textContent = 'OFFLINE';
    if (releaseVersionCopy) releaseVersionCopy.textContent = '暂时无法读取';
    if (releaseDate) releaseDate.textContent = 'CNB API 请求失败';
    if (releaseSummary) releaseSummary.textContent = '请打开 Release 页面手动选择附件';
    if (releaseSource) releaseSource.textContent = 'API ERROR';
    if (apiNote) apiNote.textContent = `无法读取最新 CNB Release${error?.message ? `（${error.message}）` : ''}，已保留 CNB 与 GitHub 备用入口。`;
    ['full', 'lite'].forEach((key) => {
      const card = document.querySelector(`[data-artifact-card="${key}"]`);
      const status = card?.querySelector('[data-asset-status]');
      if (status) status.textContent = 'API 不可用，请打开 CNB Release 页面';
    });
  };

  showRelease(CACHED_RELEASE, true);
  loadRelease().then((release) => showRelease(release)).catch(() => {
    if (apiState) apiState.textContent = 'CACHED';
    if (apiNote) apiNote.textContent = '实时同步暂时不可用，已保留最近一次可用的 CNB Release 和下载直链。';
  });

  let scrollTicking = false;
  const updateProgress = () => {
    const maxScroll = Math.max(document.documentElement.scrollHeight - window.innerHeight, 1);
    document.documentElement.style.setProperty('--scroll-progress', (window.scrollY / maxScroll).toFixed(4));
    scrollTicking = false;
  };
  const queueProgress = () => {
    if (scrollTicking) return;
    scrollTicking = true;
    window.requestAnimationFrame(updateProgress);
  };
  window.addEventListener('scroll', queueProgress, { passive: true });
  window.addEventListener('resize', queueProgress);
  queueProgress();
})();
