// ============================================================
// QMTSW Audio Downloader - Web Edition
// Source site: https://www.qmtsw.com (全民听书网)
// ============================================================

const API_BASE = '';

// ---------------- i18n ----------------
const I18N = {
  zh: {
    appTitle: '全民听书网下载器',
    browse: '浏览', downloads: '下载', bookmarks: '收藏', settings: '设置',
    browseTitle: '浏览有声书',
    albumPlaceholder: '输入专辑ID或专辑链接，例如 21170...',
    openAlbum: '打开专辑',
    tabCategory: '分类浏览', tabAlbum: '专辑直达',
    emptyHint: '选择一个分类开始浏览，或直接输入专辑ID',
    prev: '上一页', next: '下一页', jumpTo: '跳至', pageUnit: '页', go: 'Go',
    perPageLabel: '每页', perPageUnit: '条',
    loading: '加载中...',
    noResults: '没有找到结果',
    downloadsTitle: '下载管理',
    clearAll: '清空已完成',
    noDownloads: '暂无下载任务',
    bookmarksTitle: '收藏列表',
    noBookmarks: '暂无收藏',
    settingsTitle: '设置',
    savePath: '保存路径',
    savePathDesc: '音频文件的默认保存位置',
    'browse_btn': '浏览...',
    refreshInterval: '刷新间隔',
    refreshIntervalDesc: '下载任务状态刷新间隔（毫秒）',
    theme: '主题模式', themeDesc: '选择界面配色方案',
    language: '语言', languageDesc: '界面显示语言',
    about: '关于',
    themeLight: '浅色', themeDark: '深色', themeBlue: '海洋蓝', themeRose: '玫瑰金', themeForest: '森林绿',
    download: '下载', downloadAll: '整本下载', viewDetail: '详情',
    downloaded: '已下载', queued: '排队中', downloading: '下载中', done: '已完成', error: '失败', cancelled: '已取消',
    chapters: '章节', chapter: '章节',
    author: '作者', narrator: '播音', status: '状态', intro: '简介',
    selectRange: '下载范围', from: '从', to: '至',
    allChapters: '全部章节',
    cancel: '取消', retry: '重试',
    openFile: '打开', revealFile: '所在文件夹', deleteFile: '删除',
    toastQueued: '已加入下载队列',
    toastSaved: '设置已保存',
    toastDeleted: '已删除',
    toastCopied: '已复制',
    noSpace: '磁盘空间不足',
    albumNotFound: '未找到该专辑',
    loadFailed: '加载失败',
    networkError: '网络错误',
    confirmClear: '确定要清空已完成的任务吗？',
    confirmDelete: '确定要删除这个文件吗？',
    speed: '速度', remaining: '剩余',
    totalTasks: '总任务', activeTasks: '进行中', doneTasks: '已完成', errorTasks: '失败',
    notShown: '未显示',
    enterAlbumHint: '请输入专辑ID或链接',
    browseOpening: '已打开文件夹选择框，请在弹出的窗口中操作',
    stopAll: '全部停止', retryAll: '全部重试',
    confirmStopAll: '确定要停止所有任务并清空队列吗？已下载的部分将保留。',
    stoppedAll: '已停止 {n} 个任务',
    retriedAll: '已重新加入 {n} 个任务',
    noActiveTasks: '没有正在进行的任务',
    noRetryTasks: '没有可重试的任务',
    skippedMissing: '{n} 个源站缺失的集已跳过',
    missing: '源站缺失',
    library: '媒体库', libraryTitle: '本地媒体库', librarySearch: '搜索文件名或专辑...',
    refresh: '刷新', noLibrary: '未找到音频文件',
    libraryAlbums: '个专辑', libraryFiles: '个文件', viewChapters: '查看章节', collapseChapters: '收起章节',
    tabSearch: '本地搜索', localSearch: '搜索', localSearchPlaceholder: '搜索已浏览或打开的专辑...',
    selectAll: '全选', invertSelection: '反选', selectPending: '未下载/失败',
    downloadSelected: '下载所选', exportIssues: '导出失败清单', noSelection: '请先选择章节',
    noIssues: '没有可导出的失败记录', newChapters: '{n} 个新章节',
    checkUpdates: '检查更新', updatesFound: '发现 {n} 本收藏有更新', noUpdates: '收藏暂无更新',
    autoUpdate: '收藏自动更新', autoUpdateDesc: '定期检查新章节，开启后自动下载新增部分',
    updateInterval: '收藏检查间隔（分钟）', concurrency: '下载并发',
    speedLimit: '总限速（KB/s，0 不限）', maxRetries: '失败重试次数',
    retryBase: '重试基础延迟（毫秒）', scheduledStart: '队列计划开始时间',
    saveStrategy: '保存下载策略', strategySaved: '下载策略已保存',
    proxyTest: '测试代理与直连', proxyTesting: '正在测试连通性...', useProxy: '使用代理（如已配置）', proxyAddress: '代理地址（host:port）',
  },
  en: {
    appTitle: 'QMTSW Audio Downloader',
    browse: 'Browse', downloads: 'Downloads', bookmarks: 'Bookmarks', settings: 'Settings',
    browseTitle: 'Browse Audiobooks',
    albumPlaceholder: 'Enter album ID or URL, e.g. 21170...',
    openAlbum: 'Open Album',
    tabCategory: 'Categories', tabAlbum: 'Direct Link',
    emptyHint: 'Pick a category to browse, or enter an album ID',
    prev: 'Prev', next: 'Next', jumpTo: 'Go to', pageUnit: '', go: 'Go',
    perPageLabel: 'Per page', perPageUnit: 'items',
    loading: 'Loading...',
    noResults: 'No results found',
    downloadsTitle: 'Downloads',
    clearAll: 'Clear Finished',
    noDownloads: 'No download tasks',
    bookmarksTitle: 'Bookmarks',
    noBookmarks: 'No bookmarks',
    settingsTitle: 'Settings',
    savePath: 'Save Path',
    savePathDesc: 'Default location for audio files',
    'browse_btn': 'Browse...',
    refreshInterval: 'Refresh Interval',
    refreshIntervalDesc: 'Task status refresh interval (ms)',
    theme: 'Theme', themeDesc: 'Choose color scheme',
    language: 'Language', languageDesc: 'Interface language',
    about: 'About',
    themeLight: 'Light', themeDark: 'Dark', themeBlue: 'Ocean', themeRose: 'Rose', themeForest: 'Forest',
    download: 'Download', downloadAll: 'Download All', viewDetail: 'Details',
    downloaded: 'Downloaded', queued: 'Queued', downloading: 'Downloading', done: 'Done', error: 'Failed', cancelled: 'Cancelled',
    chapters: 'chapters', chapter: 'chapter',
    author: 'Author', narrator: 'Narrator', status: 'Status', intro: 'Intro',
    selectRange: 'Range', from: 'From', to: 'To',
    allChapters: 'All chapters',
    cancel: 'Cancel', retry: 'Retry',
    openFile: 'Open', revealFile: 'Show in folder', deleteFile: 'Delete',
    toastQueued: 'Added to download queue',
    toastSaved: 'Settings saved',
    toastDeleted: 'Deleted',
    toastCopied: 'Copied',
    noSpace: 'Not enough disk space',
    albumNotFound: 'Album not found',
    loadFailed: 'Failed to load',
    networkError: 'Network error',
    confirmClear: 'Clear all finished tasks?',
    confirmDelete: 'Delete this file?',
    speed: 'Speed', remaining: 'Remaining',
    totalTasks: 'Total', activeTasks: 'Active', doneTasks: 'Done', errorTasks: 'Failed',
    notShown: 'Hidden',
    enterAlbumHint: 'Please enter an album ID or URL',
    browseOpening: 'Folder picker opened — check for the dialog window',
    stopAll: 'Stop All', retryAll: 'Retry All',
    confirmStopAll: 'Stop all tasks and clear the queue? Partially downloaded files are kept.',
    stoppedAll: 'Stopped {n} task(s)',
    retriedAll: 'Re-queued {n} task(s)',
    noActiveTasks: 'No active tasks',
    noRetryTasks: 'No tasks to retry',
    skippedMissing: '{n} missing-on-source episode(s) skipped',
    missing: 'Missing',
    library: 'Library', libraryTitle: 'Local Library', librarySearch: 'Search file or album...',
    refresh: 'Refresh', noLibrary: 'No audio files found',
    libraryAlbums: 'albums', libraryFiles: 'files', viewChapters: 'View chapters', collapseChapters: 'Hide chapters',
    tabSearch: 'Local Search', localSearch: 'Search', localSearchPlaceholder: 'Search browsed or opened albums...',
    selectAll: 'Select All', invertSelection: 'Invert', selectPending: 'Pending / Failed',
    downloadSelected: 'Download Selected', exportIssues: 'Export Failures', noSelection: 'Select chapters first',
    noIssues: 'No failures to export', newChapters: '{n} new chapter(s)',
    checkUpdates: 'Check Updates', updatesFound: '{n} favorite album(s) updated', noUpdates: 'No favorite updates',
    autoUpdate: 'Favorite Auto-update', autoUpdateDesc: 'Check for new chapters and download them automatically',
    updateInterval: 'Favorite check interval (minutes)', concurrency: 'Download Concurrency',
    speedLimit: 'Total speed limit (KB/s, 0 = unlimited)', maxRetries: 'Retry Count',
    retryBase: 'Base retry delay (ms)', scheduledStart: 'Scheduled queue start',
    saveStrategy: 'Save Download Strategy', strategySaved: 'Download strategy saved',
    proxyTest: 'Test Proxy & Direct', proxyTesting: 'Testing connectivity...', useProxy: 'Use proxy when configured', proxyAddress: 'Proxy address (host:port)',
  },
};

const state = {
  lang: localStorage.getItem('lang') || 'zh',
  theme: localStorage.getItem('theme') || 'light',
  savePath: localStorage.getItem('savePath') || '~/Downloads',
  refreshInterval: parseInt(localStorage.getItem('refreshInterval') || '1000', 10),
  category: 1,
  page: 1,
  totalPages: 1,
  perPage: parseInt(localStorage.getItem('perPage') || '20', 10),
  totalItems: 0,
  results: [],
  currentAlbum: null,
  tasks: [],
  stats: null,
  taskTimer: null,
  categoryRequestSeq: 0,
  library: [],
  libraryTotal: 0,
  serverSettings: null,
  bookmarkTimer: null,
  checkingBookmarks: false,
  autoUpdate: localStorage.getItem('autoUpdate') === '1',
  updateIntervalMin: parseInt(localStorage.getItem('updateIntervalMin') || '30', 10),
  bookmarks: JSON.parse(localStorage.getItem('bookmarks') || '[]'),
  pageMode: 'browse',
};

const $ = (sel) => document.querySelector(sel);
const $$ = (sel) => document.querySelectorAll(sel);
const t = (key) => (I18N[state.lang] && I18N[state.lang][key]) || key;

// ---------------- utils ----------------

function escapeHtml(s) {
  return String(s == null ? '' : s)
    .replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;').replace(/'/g, '&#39;');
}

function formatBytes(n) {
  if (!n || n < 0) return '0 B';
  const units = ['B', 'KB', 'MB', 'GB'];
  let i = 0, v = n;
  while (v >= 1024 && i < units.length - 1) { v /= 1024; i++; }
  return `${v.toFixed(i === 0 ? 0 : 1)} ${units[i]}`;
}

function showToast(msg, duration = 2500) {
  const toast = $('#toast');
  toast.textContent = msg;
  toast.style.display = 'block';
  clearTimeout(toast._timer);
  toast._timer = setTimeout(() => { toast.style.display = 'none'; }, duration);
}

function showLoading(text) {
  $('#loadingText').textContent = text || t('loading');
  $('#loadingOverlay').style.display = 'flex';
}
function hideLoading() { $('#loadingOverlay').style.display = 'none'; }

async function api(path, params, options) {
  const url = new URL(path, window.location.origin);
  if (params) Object.entries(params).forEach(([k, v]) => {
    if (v != null) url.searchParams.set(k, v);
  });
  const opts = options || {};
  const r = await fetch(url, {
    method: opts.method || 'GET',
    headers: opts.body ? { 'Content-Type': 'application/json' } : undefined,
    body: opts.body ? JSON.stringify(opts.body) : undefined,
  });
  const data = await r.json().catch(() => ({}));
  if (!r.ok) throw new Error(data.error || `HTTP ${r.status}`);
  return data;
}

// ---------------- theme & i18n ----------------

function applyI18n() {
  $$('[data-i18n]').forEach((el) => {
    const k = el.dataset.i18n;
    if (I18N[state.lang][k]) el.textContent = I18N[state.lang][k];
  });
  $$('[data-i18n-ph]').forEach((el) => {
    const k = el.dataset.i18nPh;
    if (I18N[state.lang][k]) el.placeholder = I18N[state.lang][k];
  });
  $('#browseFolderBtn').textContent = t('browse_btn');
}

function setLang(lang) {
  state.lang = lang;
  localStorage.setItem('lang', lang);
  $$('.lang-btn').forEach((b) => b.classList.toggle('active', b.dataset.lang === lang));
  $('#langSelect').value = lang;
  applyI18n();
  renderResults();
  renderTasks();
  renderBookmarks();
  if (state.currentAlbum && $('#detailModal').style.display !== 'none') {
    renderAlbumModal(state.currentAlbum);
  }
}

function setTheme(theme) {
  state.theme = theme;
  document.documentElement.setAttribute('data-theme', theme);
  localStorage.setItem('theme', theme);
  $$('.theme-btn').forEach((b) => b.classList.toggle('active', b.dataset.theme === theme));
  $('#themeSelect').value = theme;
}

function switchPage(page) {
  $$('.nav-item').forEach((n) => n.classList.toggle('active', n.dataset.page === page));
  $$('.page').forEach((p) => p.classList.remove('active'));
  const el = $(`#page-${page}`);
  if (el) el.classList.add('active');
  if (page === 'downloads') renderTasks();
  if (page === 'library') loadLibrary();
  if (page === 'bookmarks') renderBookmarks();
  startTaskPolling();
}

// ---------------- browse ----------------

async function loadCategory(cat, page) {
  const requestSeq = ++state.categoryRequestSeq;
  state.pageMode = 'category';
  state.category = cat;
  state.page = page || 1;
  showLoading(t('loading'));
  try {
    const data = await api('/api/category', {
      cat: state.category, page: state.page, perPage: state.perPage,
    });
    if (requestSeq !== state.categoryRequestSeq) return;
    state.results = data.items || [];
    state.totalPages = Math.max(1, data.totalPages || 1);
    state.totalItems = data.totalItems || 0;
    state.page = Math.min(state.page, state.totalPages);
    renderResults();
  } catch (e) {
    if (requestSeq !== state.categoryRequestSeq) return;
    showToast(`${t('loadFailed')}: ${e.message}`);
  } finally {
    if (requestSeq === state.categoryRequestSeq) hideLoading();
  }
}

function coverUrl(cover) {
  if (!cover) return '';
  const abs = cover.startsWith('http') ? cover : `https://www.qmtsw.com${cover}`;
  return `/api/cover?url=${encodeURIComponent(abs)}`;
}

function placeholderSvg() {
  return `<svg viewBox="0 0 100 140" width="100%" height="100%">
    <rect width="100" height="140" fill="var(--bg-secondary)"/>
    <circle cx="50" cy="60" r="22" fill="none" stroke="var(--text-tertiary)" stroke-width="2" opacity="0.5"/>
    <path d="M43 50 L43 70 L60 60 Z" fill="var(--text-tertiary)" opacity="0.5"/>
    <rect x="25" y="100" width="50" height="5" rx="2.5" fill="var(--text-tertiary)" opacity="0.25"/>
    <rect x="32" y="112" width="36" height="5" rx="2.5" fill="var(--text-tertiary)" opacity="0.18"/>
  </svg>`;
}

function renderResults() {
  const container = $('#searchResults');
  if (!state.results.length) {
    container.innerHTML = `<div class="empty-state">
      <svg viewBox="0 0 120 120" width="80" height="80">
        <circle cx="60" cy="60" r="50" fill="var(--bg-secondary)"/>
        <circle cx="60" cy="60" r="22" fill="none" stroke="var(--text-tertiary)" stroke-width="2.5" opacity="0.5"/>
        <path d="M52 50 L52 70 L70 60 Z" fill="var(--text-tertiary)" opacity="0.4"/>
      </svg>
      <p>${escapeHtml(t('emptyHint'))}</p>
    </div>`;
    $('#pagination').style.display = 'none';
    return;
  }

  container.innerHTML = state.results.map((item) => {
    const catName = state.pageMode === 'search'
      ? CATEGORY_NAMES[item.category] || t('tabSearch')
      : CATEGORY_NAMES[state.category] || '';
    const isBm = state.bookmarks.some((b) => b.id === item.id);
    return `<div class="result-card" data-id="${escapeHtml(item.id)}">
      <div class="card-cover">
        ${item.cover
          ? `<img src="${coverUrl(item.cover)}" alt="" loading="lazy" onerror="this.outerHTML=placeholderSvg()">`
          : placeholderSvg()}
      </div>
      <div class="card-title">${escapeHtml(item.title)}</div>
      <div class="card-meta">
        <span class="meta-tag type-tag">${escapeHtml(catName)}</span>
        ${item.author ? `<span class="meta-tag">${escapeHtml(item.author)}</span>` : ''}
      </div>
      <div class="card-actions">
        <button class="card-btn" data-action="detail" data-id="${escapeHtml(item.id)}">
          <svg viewBox="0 0 24 24" width="14" height="14" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="11" cy="11" r="7"/><line x1="21" y1="21" x2="16.5" y2="16.5"/></svg>
          ${t('viewDetail')}
        </button>
        <button class="card-btn" data-action="album" data-id="${escapeHtml(item.id)}">
          <svg viewBox="0 0 24 24" width="14" height="14" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><polyline points="7 10 12 15 17 10"/><line x1="12" y1="15" x2="12" y2="3"/></svg>
          ${t('downloadAll')}
        </button>
        <button class="card-btn ${isBm ? 'bookmarked' : ''}" data-action="bookmark" data-id="${escapeHtml(item.id)}">
          <svg viewBox="0 0 24 24" width="14" height="14" fill="${isBm ? 'currentColor' : 'none'}" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M19 21l-7-5-7 5V5a2 2 0 0 1 2-2h10a2 2 0 0 1 2 2z"/></svg>
        </button>
      </div>
    </div>`;
  }).join('');

  container.querySelectorAll('.result-card').forEach((card) => {
    const id = card.dataset.id;
    card.querySelectorAll('.card-btn').forEach((btn) => {
      btn.addEventListener('click', (e) => {
        e.stopPropagation();
        const action = btn.dataset.action;
        if (action === 'detail') openAlbum(id, true);
        else if (action === 'album') downloadAlbum(id);
        else if (action === 'bookmark') toggleBookmark(itemsById(id), card);
      });
    });
    card.addEventListener('click', () => openAlbum(id, true));
  });

  // pagination —— 只要有结果就显示，方便随时改每页条数
  if (state.results.length && state.pageMode === 'category') {
    $('#pagination').style.display = 'flex';
    $('#pageInfo').textContent = `${state.page} / ${state.totalPages}`
      + (state.totalItems ? ` · ${state.totalItems}` : '');
    $('#prevPage').disabled = state.page <= 1;
    $('#nextPage').disabled = state.page >= state.totalPages;
    $('#pageJumpInput').max = state.totalPages;
    $('#pageJumpInput').value = state.page;
    $('#perPageSelect').value = String(state.perPage);
  } else {
    $('#pagination').style.display = 'none';
  }
}

function itemsById(id) {
  return state.results.find((r) => r.id === id) || { id, title: id };
}

const CATEGORY_NAMES = {
  1: '玄幻', 2: '言情', 3: '都市', 4: '恐怖', 5: '惊悚', 6: '推理',
  7: '武侠', 8: '历史', 9: '军事', 10: '穿越', 11: '科幻', 12: '网游',
  13: '评书', 14: '戏曲', 15: '笑话', 16: '儿童', 17: '财经', 18: '广播',
  19: '诗歌', 20: '文学', 21: '粤语', 22: '经典', 23: '相声小品', 24: '百家讲坛',
};

// ---------------- album ----------------

function extractAlbumId(input) {
  const s = String(input || '').trim();
  let m = s.match(/show\/(\d+)\.html/);
  if (m) return m[1];
  m = s.match(/play\/(\d+)-/);
  if (m) return m[1];
  m = s.match(/^(\d+)$/);
  if (m) return m[1];
  return '';
}

async function openAlbum(id, showModal) {
  id = extractAlbumId(id);
  if (!id) { showToast(t('enterAlbumHint')); return; }
  showLoading(t('loading'));
  try {
    const album = await api('/api/album', { id });
    state.currentAlbum = album;
    if (showModal) {
      renderAlbumModal(album);
      $('#detailModal').style.display = 'flex';
    }
  } catch (e) {
    showToast(`${t('albumNotFound')}: ${e.message}`);
  } finally {
    hideLoading();
  }
}

function renderAlbumModal(album) {
  $('#detailTitle').textContent = album.title;
  const chapters = album.chapters || [];
  const body = $('#detailBody');

  body.innerHTML = `
    <div class="album-header">
      <div class="album-cover">
        ${album.coverUrl
          ? `<img src="${coverUrl(album.coverUrl.replace('https://www.qmtsw.com', ''))}" alt="" onerror="this.outerHTML=placeholderSvg()">`
          : placeholderSvg()}
      </div>
      <div class="album-meta">
        <h3>${escapeHtml(album.title)}</h3>
        <div class="album-tags">
          ${album.status ? `<span class="meta-tag status-active">${escapeHtml(album.status)}</span>` : ''}
          <span class="meta-tag">${chapters.length} ${t('chapters')}</span>
          ${album.author ? `<span class="meta-tag">${t('author')}: ${escapeHtml(album.author)}</span>` : ''}
          ${album.narrator ? `<span class="meta-tag">${t('narrator')}: ${escapeHtml(album.narrator)}</span>` : ''}
        </div>
        ${album.intro ? `<div class="album-intro">${escapeHtml(album.intro)}</div>` : ''}
        <div class="album-actions">
          <button class="btn-primary btn-sm" id="dlAlbumAll">
            <svg viewBox="0 0 24 24" width="14" height="14" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" style="vertical-align:-2px"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><polyline points="7 10 12 15 17 10"/><line x1="12" y1="15" x2="12" y2="3"/></svg>
            ${t('downloadAll')}
          </button>
          <button class="btn-secondary btn-sm" id="bmAlbumBtn">${t('bookmarks')}</button>
        </div>
      </div>
    </div>

    <div class="chapter-toolbar">
      <span>${t('selectRange')}</span>
      <input type="number" class="range-input" id="rangeFrom" value="1" min="1" max="${chapters.length}">
      <span>${t('from')} ~</span>
      <input type="number" class="range-input" id="rangeTo" value="${chapters.length}" min="1" max="${chapters.length}">
      <span>${t('to')}</span>
      <button class="btn-secondary btn-sm" id="dlRangeBtn">${t('download')}</button>
      <span style="margin-left:auto" id="albumTaskSummary"></span>
    </div>
    <div class="chapter-toolbar chapter-batch-toolbar">
      <button class="btn-secondary btn-sm" id="selectAllChapters">${t('selectAll')}</button>
      <button class="btn-secondary btn-sm" id="invertChapters">${t('invertSelection')}</button>
      <button class="btn-secondary btn-sm" id="selectPendingChapters">${t('selectPending')}</button>
      <button class="btn-primary btn-sm" id="dlSelectedBtn">${t('downloadSelected')}</button>
      <button class="btn-secondary btn-sm" id="exportIssuesBtn">${t('exportIssues')}</button>
    </div>

    <div class="chapter-list" id="chapterList">
      ${chapters.map((ch) => `
        <div class="chapter-item" data-index="${ch.index}">
          <input type="checkbox" class="chapter-check" data-check="${ch.index}" aria-label="${escapeHtml(ch.title)}">
          <span class="chapter-index">${String(ch.index + 1).padStart(4, '0')}</span>
          <span class="chapter-title" title="${escapeHtml(ch.title)}">${escapeHtml(ch.title)}</span>
          <span class="chapter-status" data-status-for="${ch.index}"></span>
          <button class="chapter-btn" data-dl="${ch.index}">${t('download')}</button>
        </div>
      `).join('')}
    </div>
  `;

  $('#dlAlbumAll').addEventListener('click', () => downloadAlbum(album.id));
  $('#bmAlbumBtn').addEventListener('click', () => {
    toggleBookmark({ id: album.id, title: album.title, cover: album.cover ? album.cover.replace('https://www.qmtsw.com', '') : '', chapterCount: chapters.length });
    $('#bmAlbumBtn').textContent = isBookmarked(album.id) ? `★ ${t('bookmarks')}` : t('bookmarks');
  });
  $('#dlRangeBtn').addEventListener('click', () => {
    const from = Math.max(0, parseInt($('#rangeFrom').value, 10) - 1) || 0;
    const to = Math.min(chapters.length - 1, (parseInt($('#rangeTo').value, 10) || chapters.length) - 1);
    downloadAlbum(album.id, from, to);
  });
  $('#selectAllChapters').addEventListener('click', () => {
    $$('.chapter-check').forEach((box) => { box.checked = true; });
  });
  $('#invertChapters').addEventListener('click', () => {
    $$('.chapter-check').forEach((box) => { box.checked = !box.checked; });
  });
  $('#selectPendingChapters').addEventListener('click', () => {
    const statuses = chapterStatusMap();
    $$('.chapter-check').forEach((box) => {
      const task = statuses[parseInt(box.dataset.check, 10)];
      box.checked = !task || task.status !== 'done';
    });
  });
  $('#dlSelectedBtn').addEventListener('click', () => {
    const indexes = Array.from($$('.chapter-check:checked')).map((box) => parseInt(box.dataset.check, 10));
    if (!indexes.length) { showToast(t('noSelection')); return; }
    downloadAlbum(album.id, null, null, indexes);
  });
  $('#exportIssuesBtn').addEventListener('click', () => exportChapterIssues(album));
  body.querySelectorAll('.chapter-btn').forEach((btn) => {
    btn.addEventListener('click', () => {
      const idx = parseInt(btn.dataset.dl, 10);
      const ch = chapters.find((c) => c.index === idx);
      downloadChapter(album, ch);
    });
  });

  updateChapterStatuses();
}

function exportChapterIssues(album) {
  const latest = new Map();
  for (const task of state.tasks) {
    if (String(task.albumId) !== String(album.id) || task.status !== 'error') continue;
    if (!latest.has(task.index) || latest.get(task.index).id < task.id) latest.set(task.index, task);
  }
  const rows = [...latest.values()].sort((a, b) => a.index - b.index);
  if (!rows.length) { showToast(t('noIssues')); return; }
  const csv = [
    ['章节序号', '章节标题', '状态', '原因'],
    ...rows.map((task) => [task.index + 1, task.chapterTitle || task.fileName,
      /源站缺失/.test(task.error || '') ? '源站缺失' : '失败', task.error || '']),
  ].map((row) => row.map((cell) => `"${String(cell).replace(/"/g, '""')}"`).join(',')).join('\r\n');
  const blob = new Blob(['\uFEFF' + csv], { type: 'text/csv;charset=utf-8' });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = `${String(album.title || album.id).replace(/[<>:"/\\|?*]/g, '_')}-失败清单.csv`;
  link.click();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}

function chapterStatusMap() {
  const map = {};
  for (const task of state.tasks) {
    if (task.albumId !== String(state.currentAlbum && state.currentAlbum.id)) continue;
    if (!map[task.index] || map[task.index].id < task.id) map[task.index] = task;
  }
  return map;
}

function updateChapterStatuses() {
  if (!$('#chapterList')) return;
  const map = chapterStatusMap();
  $$('[data-status-for]').forEach((el) => {
    const idx = parseInt(el.dataset.statusFor, 10);
    const task = map[idx];
    if (!task) {
      el.textContent = '';
      el.className = 'chapter-status';
      return;
    }
    if (task.status === 'done') {
      el.textContent = t('done');
      el.className = 'chapter-status done';
    } else if (task.status === 'error') {
      const missing = /源站缺失/.test(task.error || '');
      el.textContent = missing ? t('missing') : t('error');
      el.className = `chapter-status ${missing ? 'missing' : 'error'}`;
      el.title = task.error || '';
    } else if (task.status === 'downloading') {
      el.textContent = `${task.progress}%`;
      el.className = 'chapter-status active';
    } else {
      el.textContent = t(task.status) || task.status;
      el.className = 'chapter-status';
    }
  });
  const summary = $('#albumTaskSummary');
  if (summary) {
    const list = Object.values(map);
    const done = list.filter((x) => x.status === 'done').length;
    const missing = list.filter((x) => x.status === 'error' && /源站缺失/.test(x.error || '')).length;
    const err = list.filter((x) => x.status === 'error' && !/源站缺失/.test(x.error || '')).length;
    const parts = [`${done}/${list.length}`];
    if (missing) parts.push(`${missing} ${t('missing')}`);
    if (err) parts.push(`${err} ${t('error')}`);
    summary.textContent = list.length ? parts.join(' · ') : '';
  }
}

async function downloadChapter(album, chapter) {
  try {
    await api('/api/download', {
      id: album.id,
      index: chapter.index,
      line: chapter.line,
      title: chapter.title,
      album: album.title,
      cover: album.cover || '',
      path: state.savePath,
    });
    showToast(t('toastQueued'));
    refreshTasks();
  } catch (e) {
    showToast(`${t('networkError')}: ${e.message}`);
  }
}

async function downloadAlbum(id, from, to, indexes) {
  id = extractAlbumId(id);
  if (!id) { showToast(t('enterAlbumHint')); return; }
  try {
    const params = { id, mode: 'album', path: state.savePath };
    if (from != null) params.from = from;
    if (to != null) params.to = to;
    if (indexes && indexes.length) params.indexes = indexes.join(',');
    const r = await api('/api/download', params);
    showToast(`${t('toastQueued')} (${r.queued})`);
    refreshTasks();
  } catch (e) {
    showToast(`${t('networkError')}: ${e.message}`);
  }
}

// ---------------- tasks ----------------

let taskTotal = 0;

async function refreshTasks() {
  try {
    const data = await api('/api/tasks');
    state.tasks = data.tasks || [];
    state.stats = data.stats || null;
    taskTotal = data.total != null ? data.total : state.tasks.length;
    const active = (data.stats ? data.stats.queued + data.stats.active : 0)
      || state.tasks.filter((x) => x.status === 'queued' || x.status === 'downloading').length;
    const badge = $('#downloadBadge');
    if (active > 0) {
      badge.textContent = active;
      badge.style.display = 'inline-block';
    } else {
      badge.style.display = 'none';
    }
    if ($('#page-downloads').classList.contains('active')) renderTasks();
    updateChapterStatuses();
  } catch (_) { /* ignore polling errors */ }
}

function startTaskPolling() {
  if (state.taskTimer) return;
  state.taskTimer = setInterval(refreshTasks, state.refreshInterval);
}
function stopTaskPolling() {
  if (state.taskTimer) { clearInterval(state.taskTimer); state.taskTimer = null; }
}

function statusText(task) {
  switch (task.status) {
    case 'queued': return t('queued');
    case 'downloading': return `${task.progress}%`;
    case 'done': return t('done');
    case 'error': return t('error');
    case 'cancelled': return t('cancelled');
    default: return task.status;
  }
}

// 增量渲染状态：id 顺序 + 每行的内容签名
const taskView = { order: '', sigs: new Map() };

// 抓住所有会影响这一行外观的字段
function taskSignature(task) {
  return [
    task.status, task.progress, task.received, task.total, task.error,
    task.filePath, task.speed, task.fileName, task.albumTitle,
  ].join('\u0001');
}

function taskRowHtml(task) {
  const isDone = task.status === 'done';
  const isErr = task.status === 'error';
  const isMissing = isErr && /源站缺失/.test(task.error || '');
  const isCancelled = task.status === 'cancelled';
  const isActive = task.status === 'downloading';
  const pct = isDone ? 100 : (task.progress || 0);
  return `<div class="download-item${isCancelled ? ' is-cancelled' : ''}" data-task-id="${task.id}">
    <div class="item-icon">
      <svg viewBox="0 0 24 24" width="24" height="24" fill="none" stroke="${isMissing ? '#d97706' : isErr ? '#dc2626' : isDone ? '#16a34a' : isCancelled ? 'var(--text-tertiary)' : 'var(--accent-primary)'}" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" class="${isActive ? 'spin' : ''}">
        ${isDone
          ? '<path d="M20 6L9 17l-5-5"/>'
          : isMissing
          ? '<circle cx="12" cy="12" r="10"/><line x1="12" y1="8" x2="12" y2="13"/><line x1="12" y1="16" x2="12.01" y2="16"/>'
          : isErr
          ? '<circle cx="12" cy="12" r="10"/><line x1="15" y1="9" x2="9" y2="15"/><line x1="9" y1="9" x2="15" y2="15"/>'
          : isCancelled
          ? '<circle cx="12" cy="12" r="10"/><rect x="9" y="9" width="6" height="6" rx="1"/>'
          : '<circle cx="12" cy="12" r="10"/><polyline points="12 6 12 12 16 14"/>'}
      </svg>
    </div>
    <div class="item-info">
      <div class="item-name">${escapeHtml(task.fileName)}</div>
      <div class="item-album">${escapeHtml(task.albumTitle || '')}</div>
      <div class="item-status">
        ${task.status === 'queued' || isActive
          ? `<div class="progress-bar"><div class="progress-fill" style="width:${pct}%"></div></div>`
          : ''}
        ${isErr
          ? `<span class="${isMissing ? 'status-missing-text' : 'status-error-text'}" title="${escapeHtml(task.error || t('error'))}">${escapeHtml(task.error || t('error'))}</span>`
          : isDone
          ? `<span class="status-done-text">${formatBytes(task.total || task.received)}</span>`
          : isCancelled
          ? `<span class="status-cancelled-text">${t('cancelled')}${task.received ? ` · ${formatBytes(task.received)}` : ''}</span>`
          : `<span>${statusText(task)}${task.total ? ` · ${formatBytes(task.received)} / ${formatBytes(task.total)}` : ''}</span>`}
        ${isActive && task.speed ? `<span class="item-speed">${formatBytes(task.speed)}/s</span>` : ''}
      </div>
    </div>
    <div class="item-actions">
      ${isDone && task.filePath ? `
        <button class="card-btn" data-act="open" data-path="${escapeHtml(task.filePath)}">${t('openFile')}</button>
        <button class="card-btn" data-act="reveal" data-path="${escapeHtml(task.filePath)}">${t('revealFile')}</button>
      ` : ''}
      ${isErr || isCancelled ? `<button class="card-btn" data-act="retry" data-id="${task.id}">${t('retry')}</button>` : ''}
      ${isActive || task.status === 'queued' ? `<button class="card-btn" data-act="cancel" data-id="${task.id}">${t('cancel')}</button>` : ''}
    </div>
  </div>`;
}

function renderTaskStats(stats) {
  const statsEl = $('#downloadStats');
  if (!state.tasks.length) { statsEl.innerHTML = ''; return; }
  const s = stats || {};
  const counts = {
    queued: s.queued != null ? s.queued : state.tasks.filter((x) => x.status === 'queued').length,
    downloading: s.active != null ? s.active : state.tasks.filter((x) => x.status === 'downloading').length,
    done: s.done != null ? s.done : state.tasks.filter((x) => x.status === 'done').length,
    error: s.error != null ? s.error : state.tasks.filter((x) => x.status === 'error').length,
    cancelled: s.cancelled != null ? s.cancelled : state.tasks.filter((x) => x.status === 'cancelled').length,
  };
  const total = Math.max(taskTotal, state.tasks.length);
  const hidden = total - state.tasks.length;
  statsEl.innerHTML = `
    <div class="stat-chip"><span>${t('totalTasks')}</span><strong>${total}</strong></div>
    <div class="stat-chip active"><span>${t('activeTasks')}</span><strong>${counts.queued + counts.downloading}</strong></div>
    <div class="stat-chip done"><span>${t('doneTasks')}</span><strong>${counts.done}</strong></div>
    <div class="stat-chip error"><span>${t('errorTasks')}</span><strong>${counts.error}</strong></div>
    ${counts.cancelled ? `<div class="stat-chip"><span>${t('cancelled')}</span><strong>${counts.cancelled}</strong></div>` : ''}
    ${hidden > 0 ? `<div class="stat-chip"><span>${t('notShown')}</span><strong>${hidden}</strong></div>` : ''}
  `;
}

function renderTasks() {
  const container = $('#downloadList');

  if (!state.tasks.length) {
    container.innerHTML = `<div class="empty-state">
      <svg viewBox="0 0 120 120" width="80" height="80">
        <circle cx="60" cy="60" r="50" fill="var(--bg-secondary)"/>
        <path d="M45 55 L45 85 Q45 92 52 92 L68 92 Q75 92 75 85 L75 55" fill="none" stroke="var(--text-tertiary)" stroke-width="2.5" stroke-linecap="round"/>
        <path d="M50 55 L50 48 Q50 40 60 40 Q70 40 70 48 L70 55" fill="none" stroke="var(--text-tertiary)" stroke-width="2.5" stroke-linecap="round"/>
      </svg>
      <p>${escapeHtml(t('noDownloads'))}</p>
    </div>`;
    taskView.order = '';
    taskView.sigs.clear();
    renderTaskStats();
    return;
  }

  renderTaskStats(state.stats);

  const order = state.tasks.map((x) => x.id).join(',');
  if (order !== taskView.order) {
    // 任务增删或顺序变化 —— 整表重建
    container.innerHTML = state.tasks.map(taskRowHtml).join('');
    taskView.order = order;
    taskView.sigs.clear();
    for (const task of state.tasks) taskView.sigs.set(task.id, taskSignature(task));
    return;
  }

  // 顺序不变 —— 只替换内容有变化的行，其余保持原 DOM
  for (const task of state.tasks) {
    const sig = taskSignature(task);
    if (taskView.sigs.get(task.id) === sig) continue;
    const el = container.querySelector(`[data-task-id="${task.id}"]`);
    if (!el) continue;
    const tmp = document.createElement('div');
    tmp.innerHTML = taskRowHtml(task);
    const next = tmp.firstElementChild;
    if (next) el.replaceWith(next);
    taskView.sigs.set(task.id, sig);
  }
}

// ---------------- bookmarks ----------------

function isBookmarked(id) {
  return state.bookmarks.some((b) => String(b.id) === String(id));
}

function toggleBookmark(item, cardEl) {
  if (!item || !item.id) return;
  const idx = state.bookmarks.findIndex((b) => String(b.id) === String(item.id));
  if (idx >= 0) {
    state.bookmarks.splice(idx, 1);
  } else {
    state.bookmarks.push({
      id: String(item.id),
      title: item.title || String(item.id),
      cover: item.cover || '',
      chapterCount: Number.isFinite(item.chapterCount) ? item.chapterCount : null,
      newCount: 0,
      lastChecked: 0,
    });
  }
  saveBookmarks();
  renderBookmarks();
  if (cardEl) {
    const btn = cardEl.querySelector('[data-action="bookmark"]');
    const on = isBookmarked(item.id);
    if (btn) {
      btn.classList.toggle('bookmarked', on);
      const svg = btn.querySelector('svg');
      if (svg) svg.setAttribute('fill', on ? 'currentColor' : 'none');
    }
  }
}

function renderBookmarks() {
  const container = $('#bookmarkList');
  if (!state.bookmarks.length) {
    container.innerHTML = `<div class="empty-state">
      <svg viewBox="0 0 120 120" width="80" height="80">
        <circle cx="60" cy="60" r="50" fill="var(--bg-secondary)"/>
        <path d="M45 35 L45 85 L60 72 L75 85 L75 35 Q75 32 72 32 L48 32 Q45 32 45 35 Z" fill="none" stroke="var(--text-tertiary)" stroke-width="2.5" stroke-linejoin="round"/>
      </svg>
      <p>${escapeHtml(t('noBookmarks'))}</p>
    </div>`;
    return;
  }
  container.innerHTML = state.bookmarks.map((b) => `
    <div class="bookmark-item">
      ${b.cover ? `<img class="bookmark-cover" src="${coverUrl(b.cover)}" alt="" onerror="this.style.display='none'">` : ''}
      <div class="bookmark-info">
        <div class="bm-title">${escapeHtml(b.title)}</div>
        <div class="bm-sub">ID: ${escapeHtml(b.id)}${b.chapterCount != null ? ` · ${b.chapterCount} ${t('chapters')}` : ''}${b.newCount ? ` · ${t('newChapters').replace('{n}', b.newCount)}` : ''}</div>
      </div>
      <button class="card-btn" data-bm="open" data-id="${escapeHtml(b.id)}">${t('viewDetail')}</button>
      <button class="card-btn" data-bm="dl" data-id="${escapeHtml(b.id)}">${t('downloadAll')}</button>
      <button class="card-btn" data-bm="del" data-id="${escapeHtml(b.id)}">${t('deleteFile')}</button>
    </div>
  `).join('');

  container.querySelectorAll('[data-bm]').forEach((btn) => {
    btn.addEventListener('click', () => {
      const act = btn.dataset.bm;
      const id = btn.dataset.id;
      if (act === 'open') openAlbum(id, true);
      else if (act === 'dl') downloadAlbum(id);
      else if (act === 'del') {
        toggleBookmark({ id });
      }
    });
  });
}

function updateBadges() {
  const bm = state.bookmarks.length;
  const badge = $('#bookmarkBadge');
  if (bm > 0) { badge.textContent = bm; badge.style.display = 'inline-block'; }
  else badge.style.display = 'none';
}

// ---------------- local discovery & library ----------------

async function localSearch() {
  const query = $('#localSearchInput').value.trim();
  state.categoryRequestSeq++;
  state.pageMode = 'search';
  showLoading(t('loading'));
  try {
    const data = await api('/api/search', { q: query });
    state.results = data.items || [];
    renderResults();
    const history = $('#searchHistory');
    history.innerHTML = (data.history || []).slice(0, 8).map((q) =>
      `<button class="history-btn" data-query="${escapeHtml(q)}">${escapeHtml(q)}</button>`).join('');
    history.querySelectorAll('[data-query]').forEach((btn) => btn.addEventListener('click', () => {
      $('#localSearchInput').value = btn.dataset.query;
      localSearch();
    }));
  } catch (e) {
    showToast(`${t('loadFailed')}: ${e.message}`);
  } finally {
    hideLoading();
  }
}

async function loadLibrary() {
  try {
    const data = await api('/api/library', {
      path: state.savePath,
      q: $('#librarySearchInput') ? $('#librarySearchInput').value.trim() : '',
    });
    state.library = data.items || [];
    state.libraryTotal = data.total || 0;
    renderLibrary(data);
  } catch (e) {
    showToast(`${t('loadFailed')}: ${e.message}`);
  }
}

function renderLibrary(meta) {
  const container = $('#libraryList');
  if (!container) return;
  const grouped = new Map();
  state.library.forEach((item) => {
    const relative = String(item.relativePath || item.name);
    const directory = relative.slice(0, Math.max(0, relative.length - item.name.length)).replace(/[\\/]+$/, '');
    const key = directory ? `dir:${directory}` : 'root:';
    if (!grouped.has(key)) grouped.set(key, { title: item.album || t('libraryTitle'), items: [], size: 0, mtime: 0, cover: '' });
    const group = grouped.get(key);
    group.items.push(item);
    if (!group.cover && item.cover) group.cover = item.cover;
    group.size += Number(item.size) || 0;
    group.mtime = Math.max(group.mtime, Number(item.mtime) || 0);
  });
  const albums = Array.from(grouped.values()).sort((a, b) => b.mtime - a.mtime);
  $('#libraryStats').textContent = `${albums.length} ${t('libraryAlbums')} · ${state.libraryTotal} ${t('libraryFiles')} · ${meta && meta.root ? meta.root : state.savePath}`;
  if (!state.library.length) {
    container.innerHTML = `<div class="empty-state"><p>${escapeHtml(t('noLibrary'))}</p></div>`;
    return;
  }
  container.innerHTML = albums.map((group) => {
    group.items.sort((a, b) => a.name.localeCompare(b.name, undefined, { numeric: true }));
    return `<div class="result-card library-album-card">
      <div class="card-cover library-cover" data-lib-album>
        ${group.cover
          ? `<img src="/api/library-cover?path=${encodeURIComponent(group.cover)}" alt="" loading="lazy" onerror="this.outerHTML=placeholderSvg()">`
          : placeholderSvg()}
      </div>
      <div class="card-title">${escapeHtml(group.title)}</div>
      <div class="card-meta">
        <span class="meta-tag type-tag">${group.items.length} ${t('libraryFiles')}</span>
        <span class="meta-tag">${formatBytes(group.size)}</span>
      </div>
      <div class="card-actions">
        <button class="card-btn library-album-toggle" data-lib-album aria-expanded="false">${t('viewChapters')}</button>
      </div>
      <div class="library-chapters">${group.items.map((item) => `<div class="library-item">
        <div class="library-info">
          <div class="library-name">${escapeHtml(item.name)}</div>
          <div class="library-meta">${formatBytes(item.size)} · ${new Date(item.mtime).toLocaleString()}</div>
        </div>
        <div class="library-actions">
          <button class="card-btn" data-lib="open" data-path="${escapeHtml(item.path)}">${t('openFile')}</button>
          <button class="card-btn" data-lib="reveal" data-path="${escapeHtml(item.path)}">${t('revealFile')}</button>
          <button class="card-btn" data-lib="delete" data-path="${escapeHtml(item.path)}">${t('deleteFile')}</button>
        </div>
      </div>`).join('')}</div>
    </div>`;
  }).join('');
}

// ---------------- bookmark updates ----------------

function saveBookmarks() {
  localStorage.setItem('bookmarks', JSON.stringify(state.bookmarks));
  updateBadges();
}

async function checkBookmarkUpdates(manual) {
  if (state.checkingBookmarks) return;
  if (!state.bookmarks.length) {
    if (manual) showToast(t('noBookmarks'));
    return;
  }
  state.checkingBookmarks = true;
  let updated = 0;
  let failed = 0;
  try {
    for (const bookmark of state.bookmarks) {
      try {
        const album = await api('/api/album', { id: bookmark.id });
        const count = (album.chapters || []).length;
        const previous = Number.isFinite(bookmark.chapterCount) ? bookmark.chapterCount : null;
        bookmark.title = album.title || bookmark.title;
        bookmark.cover = album.cover || bookmark.cover || '';
        if (previous == null) {
          bookmark.chapterCount = count;
        } else if (count > previous) {
          bookmark.newCount = count - previous;
          updated++;
          bookmark.chapterCount = count;
          if (state.autoUpdate) {
            await downloadAlbum(bookmark.id, previous, count - 1);
            bookmark.newCount = 0;
          }
        } else {
          bookmark.chapterCount = count;
          bookmark.newCount = 0;
        }
        bookmark.lastChecked = Date.now();
      } catch (_) {
        failed++;
      }
    }
    saveBookmarks();
    renderBookmarks();
    if (manual) {
      if (updated) showToast(t('updatesFound').replace('{n}', updated));
      else if (!failed) showToast(t('noUpdates'));
      else showToast(`${t('loadFailed')} (${failed})`);
    }
  } finally {
    state.checkingBookmarks = false;
  }
}

function restartBookmarkTimer() {
  if (state.bookmarkTimer) clearInterval(state.bookmarkTimer);
  const minutes = Math.max(5, Math.min(1440, state.updateIntervalMin || 30));
  state.bookmarkTimer = setInterval(() => checkBookmarkUpdates(false), minutes * 60000);
}

// ---------------- settings ----------------

async function loadServerSettings() {
  try {
    const data = await api('/api/settings');
    state.serverSettings = data.settings;
    const s = data.settings;
    $('#concurrencyInput').value = s.concurrency;
    $('#speedLimitInput').value = Math.round(s.speedLimitBps / 1024);
    $('#maxRetriesInput').value = s.maxRetries;
    $('#retryBaseInput').value = s.retryBaseMs;
    $('#useProxyInput').checked = s.useProxy !== false;
    $('#proxyAddressInput').value = s.proxyAddress == null ? '127.0.0.1:7890' : s.proxyAddress;
    if (s.downloadRoot) {
      state.savePath = s.downloadRoot;
      $('#savePathInput').value = s.downloadRoot;
      localStorage.setItem('savePath', s.downloadRoot);
    }
    if (s.startAt) {
      const date = new Date(s.startAt);
      const local = new Date(date.getTime() - date.getTimezoneOffset() * 60000);
      $('#scheduleInput').value = local.toISOString().slice(0, 16);
    }
  } catch (e) {
    showToast(`${t('loadFailed')}: ${e.message}`);
  }
}

async function saveServerSettings(partial) {
  const data = await api('/api/settings', null, { method: 'POST', body: partial });
  state.serverSettings = data.settings;
  return data;
}

async function saveStrategySettings() {
  try {
    const schedule = $('#scheduleInput').value;
    await saveServerSettings({
      concurrency: parseInt($('#concurrencyInput').value, 10),
      speedLimitBps: Math.max(0, parseInt($('#speedLimitInput').value, 10) || 0) * 1024,
      maxRetries: parseInt($('#maxRetriesInput').value, 10),
      retryBaseMs: parseInt($('#retryBaseInput').value, 10),
      useProxy: $('#useProxyInput').checked,
      proxyAddress: $('#proxyAddressInput').value.trim(),
      startAt: schedule ? new Date(schedule).toISOString() : '',
      downloadRoot: state.savePath,
    });
    showToast(t('strategySaved'));
  } catch (e) {
    showToast(e.message);
  }
}

async function testProxyConnections() {
  const output = $('#proxyTestResult');
  output.textContent = t('proxyTesting');
  try {
    const data = await api('/api/proxy-test');
    output.innerHTML = (data.results || []).map((result) => `<div class="${result.ok ? 'proxy-ok' : 'proxy-error'}">
      ${escapeHtml(result.label)} · ${result.ok ? `HTTP ${result.status}` : escapeHtml(result.error || 'Failed')} · ${result.elapsedMs} ms
    </div>`).join('');
  } catch (e) {
    output.textContent = e.message;
  }
}

async function updateDiskFree() {
  try {
    const data = await api('/api/disk-space', { path: state.savePath });
    $('#diskFreeInfo').textContent = data.free != null
      ? `${t('savePath')}: ${formatBytes(data.free)} free`
      : '';
  } catch (_) { $('#diskFreeInfo').textContent = ''; }
}

// ---------------- events ----------------

function bindEvents() {
  // nav
  $$('.nav-item').forEach((item) => {
    item.addEventListener('click', (e) => {
      e.preventDefault();
      switchPage(item.dataset.page);
    });
  });

  // theme
  $$('.theme-btn').forEach((btn) => {
    btn.addEventListener('click', () => setTheme(btn.dataset.theme));
  });
  $('#themeSelect').addEventListener('change', (e) => setTheme(e.target.value));

  // lang
  $$('.lang-btn').forEach((btn) => {
    btn.addEventListener('click', () => setLang(btn.dataset.lang));
  });
  $('#langSelect').addEventListener('change', (e) => setLang(e.target.value));

  // category tabs
  $$('.cat-tab').forEach((tab) => {
    tab.addEventListener('click', () => {
      $$('.cat-tab').forEach((x) => x.classList.remove('active'));
      tab.classList.add('active');
      loadCategory(parseInt(tab.dataset.cat, 10), 1);
    });
  });

  // top tabs
  $$('.tab').forEach((tab) => {
    tab.addEventListener('click', () => {
      $$('.tab').forEach((x) => x.classList.remove('active'));
      tab.classList.add('active');
      state.pageMode = tab.dataset.tab;
      $('#categoryTabs').style.display = state.pageMode === 'category' ? 'flex' : 'none';
      $('#localSearchBar').style.display = state.pageMode === 'search' ? 'flex' : 'none';
      if (state.pageMode === 'category') loadCategory(state.category, state.page);
      else if (state.pageMode === 'search') localSearch();
      else {
        state.categoryRequestSeq++;
        $('#pagination').style.display = 'none';
      }
    });
  });

  $('#localSearchBtn').addEventListener('click', localSearch);
  $('#localSearchInput').addEventListener('keydown', (e) => {
    if (e.key === 'Enter') localSearch();
  });

  $('#librarySearchBtn').addEventListener('click', loadLibrary);
  $('#libraryRefreshBtn').addEventListener('click', loadLibrary);
  $('#librarySearchInput').addEventListener('keydown', (e) => {
    if (e.key === 'Enter') loadLibrary();
  });
  $('#libraryList').addEventListener('click', async (e) => {
    const albumTrigger = e.target.closest('[data-lib-album]');
    if (albumTrigger) {
      const card = albumTrigger.closest('.library-album-card');
      const expanded = card.classList.toggle('expanded');
      const toggle = card.querySelector('.library-album-toggle');
      toggle.textContent = t(expanded ? 'collapseChapters' : 'viewChapters');
      toggle.setAttribute('aria-expanded', String(expanded));
      return;
    }
    const btn = e.target.closest('[data-lib]');
    if (!btn) return;
    const action = btn.dataset.lib;
    try {
      if (action === 'delete') {
        if (!confirm(t('confirmDelete'))) return;
        await api('/api/delete-file', { path: btn.dataset.path });
        showToast(t('toastDeleted'));
        loadLibrary();
      } else {
        await api(action === 'open' ? '/api/open-file' : '/api/reveal-file', { path: btn.dataset.path });
      }
    } catch (error) {
      showToast(error.message);
    }
  });

  $('#checkBookmarksBtn').addEventListener('click', () => checkBookmarkUpdates(true));

  // album direct open
  $('#openAlbumBtn').addEventListener('click', () => openAlbum($('#albumInput').value, true));
  $('#albumInput').addEventListener('keydown', (e) => {
    if (e.key === 'Enter') openAlbum($('#albumInput').value, true);
  });

  // pagination
  $('#prevPage').addEventListener('click', () => {
    if (state.page > 1) loadCategory(state.category, state.page - 1);
  });
  $('#nextPage').addEventListener('click', () => {
    if (state.page < state.totalPages) loadCategory(state.category, state.page + 1);
  });
  $('#pageJumpBtn').addEventListener('click', () => {
    const n = parseInt($('#pageJumpInput').value, 10);
    if (n >= 1 && n <= state.totalPages) loadCategory(state.category, n);
  });
  $('#pageJumpInput').addEventListener('keydown', (e) => {
    if (e.key === 'Enter') $('#pageJumpBtn').click();
  });

  // 每页条数
  $('#perPageSelect').addEventListener('change', (e) => {
    const v = parseInt(e.target.value, 10) || 20;
    state.perPage = v;
    localStorage.setItem('perPage', v);
    loadCategory(state.category, 1);
  });

  // modal
  $('#modalClose').addEventListener('click', () => { $('#detailModal').style.display = 'none'; });
  $('#detailModal').addEventListener('click', (e) => {
    if (e.target.id === 'detailModal') $('#detailModal').style.display = 'none';
  });

  // downloads —— 事件委托，行被替换后无需重新绑定
  $('#downloadList').addEventListener('click', async (e) => {
    const btn = e.target.closest('[data-act]');
    if (!btn) return;
    const act = btn.dataset.act;
    if (act === 'open' || act === 'reveal') {
      try {
        await api(act === 'open' ? '/api/open-file' : '/api/reveal-file', { path: btn.dataset.path });
      } catch (err) { showToast(err.message); }
    } else if (act === 'retry') {
      try {
        await api('/api/retry', { id: btn.dataset.id });
        showToast(t('toastQueued'));
        refreshTasks();
      } catch (err) { showToast(err.message); }
    } else if (act === 'cancel') {
      try {
        await api('/api/cancel', { id: btn.dataset.id });
        refreshTasks();
      } catch (err) { showToast(err.message); }
    }
  });

  $('#clearDownloads').addEventListener('click', async () => {
    if (!confirm(t('confirmClear'))) return;
    try {
      await api('/api/clear-tasks');
      taskView.order = '';
      refreshTasks();
    } catch (e) { showToast(e.message); }
  });

  $('#stopAllDownloads').addEventListener('click', async () => {
    if (!confirm(t('confirmStopAll'))) return;
    try {
      const data = await api('/api/stop-all');
      if (data.stopped > 0) showToast(t('stoppedAll').replace('{n}', data.stopped));
      else showToast(t('noActiveTasks'));
      refreshTasks();
    } catch (e) { showToast(e.message); }
  });

  $('#retryAllDownloads').addEventListener('click', async () => {
    try {
      const data = await api('/api/retry-all');
      if (data.retried > 0) {
        let msg = t('retriedAll').replace('{n}', data.retried);
        if (data.skipped > 0) msg += ` · ${t('skippedMissing').replace('{n}', data.skipped)}`;
        showToast(msg, 3500);
      } else if (data.skipped > 0) {
        showToast(t('skippedMissing').replace('{n}', data.skipped), 3500);
      } else {
        showToast(t('noRetryTasks'));
      }
      refreshTasks();
    } catch (e) { showToast(e.message); }
  });

  // settings
  $('#savePathInput').addEventListener('change', (e) => {
    state.savePath = e.target.value;
    localStorage.setItem('savePath', state.savePath);
    saveServerSettings({ downloadRoot: state.savePath }).catch((error) => showToast(error.message));
    updateDiskFree();
    showToast(t('toastSaved'));
  });
  $('#browseFolderBtn').addEventListener('click', async () => {
    const btn = $('#browseFolderBtn');
    if (btn.disabled) return;
    btn.disabled = true;
    btn.textContent = t('browseOpening');
    showToast(t('browseOpening'), 4000);
    try {
      const data = await api('/api/browse-folder');
      if (data.path) {
        state.savePath = data.path;
        $('#savePathInput').value = data.path;
        localStorage.setItem('savePath', data.path);
        saveServerSettings({ downloadRoot: data.path }).catch((error) => showToast(error.message));
        updateDiskFree();
        showToast(t('toastSaved'));
      }
    } catch (e) {
      showToast(e.message, 5000);
    } finally {
      btn.disabled = false;
      btn.textContent = t('browse_btn');
    }
  });
  $('#refreshInput').addEventListener('change', (e) => {
    const v = Math.max(500, Math.min(5000, parseInt(e.target.value, 10) || 1000));
    state.refreshInterval = v;
    e.target.value = v;
    localStorage.setItem('refreshInterval', v);
    if (state.taskTimer) { stopTaskPolling(); startTaskPolling(); }
    showToast(t('toastSaved'));
  });

  $('#saveStrategyBtn').addEventListener('click', saveStrategySettings);
  $('#proxyTestBtn').addEventListener('click', testProxyConnections);
  $('#autoUpdateInput').addEventListener('change', (e) => {
    state.autoUpdate = e.target.checked;
    localStorage.setItem('autoUpdate', state.autoUpdate ? '1' : '0');
    showToast(t('toastSaved'));
  });
  $('#updateIntervalInput').addEventListener('change', (e) => {
    state.updateIntervalMin = Math.max(5, Math.min(1440, parseInt(e.target.value, 10) || 30));
    e.target.value = state.updateIntervalMin;
    localStorage.setItem('updateIntervalMin', state.updateIntervalMin);
    restartBookmarkTimer();
    showToast(t('toastSaved'));
  });
}

// ---------------- init ----------------

function init() {
  setTheme(state.theme);
  setLang(state.lang);
  $('#savePathInput').value = state.savePath;
  $('#refreshInput').value = state.refreshInterval;
  $('#perPageSelect').value = String(state.perPage);
  $('#autoUpdateInput').checked = state.autoUpdate;
  $('#updateIntervalInput').value = state.updateIntervalMin;
  bindEvents();
  updateBadges();
  loadServerSettings().then(updateDiskFree);
  refreshTasks();
  loadCategory(1, 1);
  startTaskPolling();
  restartBookmarkTimer();
  setTimeout(() => checkBookmarkUpdates(false), 3000);

  // 支持 ?album=21170 直接打开专辑
  const params = new URLSearchParams(window.location.search);
  const albumParam = params.get('album');
  if (albumParam) {
    $('#albumInput').value = albumParam;
    openAlbum(albumParam, true);
  }
}

document.addEventListener('DOMContentLoaded', init);
