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

async function api(path, params) {
  const url = new URL(path, window.location.origin);
  if (params) Object.entries(params).forEach(([k, v]) => {
    if (v != null) url.searchParams.set(k, v);
  });
  const r = await fetch(url);
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
  if (page === 'downloads') { renderTasks(); startTaskPolling(); }
  else stopTaskPolling();
  if (page === 'bookmarks') renderBookmarks();
}

// ---------------- browse ----------------

async function loadCategory(cat, page) {
  state.category = cat;
  state.page = page || 1;
  showLoading(t('loading'));
  try {
    const data = await api('/api/category', {
      cat: state.category, page: state.page, perPage: state.perPage,
    });
    state.results = data.items || [];
    state.totalPages = Math.max(1, data.totalPages || 1);
    state.totalItems = data.totalItems || 0;
    state.page = Math.min(state.page, state.totalPages);
    renderResults();
  } catch (e) {
    showToast(`${t('loadFailed')}: ${e.message}`);
  } finally {
    hideLoading();
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

  const catName = CATEGORY_NAMES[state.category] || '';
  container.innerHTML = state.results.map((item) => {
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
  if (state.results.length) {
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

    <div class="chapter-list" id="chapterList">
      ${chapters.map((ch) => `
        <div class="chapter-item" data-index="${ch.index}">
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
    toggleBookmark({ id: album.id, title: album.title, cover: album.cover ? album.cover.replace('https://www.qmtsw.com', '') : '' });
    $('#bmAlbumBtn').textContent = isBookmarked(album.id) ? `★ ${t('bookmarks')}` : t('bookmarks');
  });
  $('#dlRangeBtn').addEventListener('click', () => {
    const from = Math.max(0, parseInt($('#rangeFrom').value, 10) - 1) || 0;
    const to = Math.min(chapters.length - 1, (parseInt($('#rangeTo').value, 10) || chapters.length) - 1);
    downloadAlbum(album.id, from, to);
  });
  body.querySelectorAll('.chapter-btn').forEach((btn) => {
    btn.addEventListener('click', () => {
      const idx = parseInt(btn.dataset.dl, 10);
      const ch = chapters.find((c) => c.index === idx);
      downloadChapter(album, ch);
    });
  });

  updateChapterStatuses();
}

function chapterStatusMap() {
  const map = {};
  for (const task of state.tasks) {
    if (task.albumId !== String(state.currentAlbum && state.currentAlbum.id)) continue;
    map[task.index] = task;
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
      path: state.savePath,
    });
    showToast(t('toastQueued'));
    refreshTasks();
  } catch (e) {
    showToast(`${t('networkError')}: ${e.message}`);
  }
}

async function downloadAlbum(id, from, to) {
  id = extractAlbumId(id);
  if (!id) { showToast(t('enterAlbumHint')); return; }
  try {
    const params = { id, mode: 'album', path: state.savePath };
    if (from != null) params.from = from;
    if (to != null) params.to = to;
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
    });
  }
  localStorage.setItem('bookmarks', JSON.stringify(state.bookmarks));
  updateBadges();
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
        <div class="bm-sub">ID: ${escapeHtml(b.id)}</div>
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

// ---------------- settings ----------------

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
      if (state.pageMode === 'category') loadCategory(state.category, state.page);
    });
  });

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
}

// ---------------- init ----------------

function init() {
  setTheme(state.theme);
  setLang(state.lang);
  $('#savePathInput').value = state.savePath;
  $('#refreshInput').value = state.refreshInterval;
  $('#perPageSelect').value = String(state.perPage);
  bindEvents();
  updateBadges();
  updateDiskFree();
  refreshTasks();
  loadCategory(1, 1);
  startTaskPolling();

  // 支持 ?album=21170 直接打开专辑
  const params = new URLSearchParams(window.location.search);
  const albumParam = params.get('album');
  if (albumParam) {
    $('#albumInput').value = albumParam;
    openAlbum(albumParam, true);
  }
}

document.addEventListener('DOMContentLoaded', init);
