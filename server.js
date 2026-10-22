// ============================================================
// QMTSW Audio Downloader - Web Edition
// Source site: https://www.qmtsw.com (全民听书网)
//
// 站内页面直连即可访问；音频 CDN (xmcdn.com) 会在 TLS 握手阶段
// 按 SNI 重置连接，因此下载时用节点 IP 连接、置空 SNI、改由 Host
// 头指定域名（Node 的 servername:'' 才真正不发 SNI）。
// ============================================================

const http = require('http');
const https = require('https');
const fs = require('fs');
const path = require('path');
const dns = require('dns');
const crypto = require('crypto');
const { execSync, execFile } = require('child_process');

const PORT = 3211;
const SITE = 'https://www.qmtsw.com';
const UA = 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36';

const MIME = {
  '.html': 'text/html; charset=utf-8',
  '.css': 'text/css; charset=utf-8',
  '.js': 'application/javascript; charset=utf-8',
  '.json': 'application/json; charset=utf-8',
  '.svg': 'image/svg+xml',
  '.png': 'image/png',
  '.ico': 'image/x-icon',
  '.woff2': 'font/woff2',
};

const CATEGORIES = {
  1: '玄幻', 2: '言情', 3: '都市', 4: '恐怖', 5: '惊悚', 6: '推理',
  7: '武侠', 8: '历史', 9: '军事', 10: '穿越', 11: '科幻', 12: '网游',
  13: '评书', 14: '戏曲', 15: '笑话', 16: '儿童', 17: '财经', 18: '广播',
  19: '诗歌', 20: '文学', 21: '粤语', 22: '经典', 23: '相声小品', 24: '百家讲坛',
};

// ---------- helpers ----------

function sendJson(res, code, obj) {
  res.writeHead(code, { 'Content-Type': 'application/json; charset=utf-8' });
  res.end(JSON.stringify(obj));
}

function resolveUserPath(p) {
  if (!p) return p;
  if (p === '~' || p.startsWith('~/') || p.startsWith('~\\')) {
    p = path.join(require('os').homedir(), p.slice(1));
  }
  return path.resolve(p);
}

// 异步执行一段 PowerShell（写临时脚本，避免命令行引号转义问题）
function runPowerShell(script) {
  return new Promise((resolve, reject) => {
    const tmpFile = path.join(require('os').tmpdir(), `qmtsw_${Date.now()}_${Math.random().toString(36).slice(2, 8)}.ps1`);
    try {
      fs.writeFileSync(tmpFile, '\uFEFF' + script, 'utf8');
    } catch (e) {
      return reject(e);
    }
    execFile('powershell', ['-NoProfile', '-ExecutionPolicy', 'Bypass', '-File', tmpFile],
      { timeout: 15000, windowsHide: true, encoding: 'utf8' },
      (err, stdout) => {
        try { fs.unlinkSync(tmpFile); } catch (_) {}
        if (err) return reject(new Error(err.message));
        resolve(String(stdout || ''));
      });
  });
}

function getFreeSpaceBytes(targetDir) {
  try {
    if (typeof fs.statfsSync === 'function') {
      const s = fs.statfsSync(targetDir);
      return s.bavail * s.bsize;
    }
  } catch (_) { /* ignore */ }
  try {
    const root = path.parse(path.resolve(targetDir)).root;
    const drive = root.replace(/[\\/:]/g, '');
    if (drive) {
      const out = execSync(
        `powershell -NoProfile -Command "(Get-PSDrive -Name ${drive} -ErrorAction Stop).Free"`,
        { timeout: 8000, windowsHide: true }
      ).toString().trim();
      const n = parseInt(out, 10);
      if (!isNaN(n)) return n;
    }
  } catch (_) { /* ignore */ }
  return null;
}

function sanitizeName(name) {
  return String(name)
    .replace(/[<>:"/\\|?*\x00-\x1f]/g, '_')
    .replace(/\s+/g, ' ')
    .trim()
    .slice(0, 120) || 'untitled';
}

// ---------- HTTP client for the site ----------

const REQUEST_TIMEOUT = 30000;

function siteRequest(targetUrl, opts) {
  opts = opts || {};
  return new Promise((resolve, reject) => {
    const parsed = new URL(targetUrl);
    const isHttps = parsed.protocol === 'https:';
    const lib = isHttps ? https : http;
    const headers = {
      'User-Agent': UA,
      'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
      'Accept-Language': 'zh-CN,zh;q=0.9',
      'Referer': SITE + '/',
      ...(opts.headers || {}),
    };
    const req = lib.request({
      hostname: parsed.hostname,
      port: parsed.port || (isHttps ? 443 : 80),
      path: parsed.pathname + parsed.search,
      method: opts.method || 'GET',
      headers,
      rejectUnauthorized: false,
      timeout: REQUEST_TIMEOUT,
    }, (r) => {
      const chunks = [];
      r.on('data', (c) => chunks.push(c));
      r.on('end', () => resolve({
        statusCode: r.statusCode,
        headers: r.headers,
        body: Buffer.concat(chunks),
      }));
    });
    req.on('error', reject);
    req.on('timeout', () => req.destroy(new Error('Request timeout')));
    if (opts.body) req.write(opts.body);
    req.end();
  });
}

// 站点侧的 5xx 多为 Cloudflare 回源失败（520/521/522/523/524），
// 源站恢复的瞬间可能仍在返回这些码，重试几次能明显提升成功率。
const SITE_MAX_RETRIES = 3;       // 最多额外重试 3 次
const SITE_RETRY_DELAYS = [800, 2000, 4500];

function isSiteUnavailable(status) {
  return status >= 500 && status <= 599;
}

// 把状态码翻译成用户能看懂的原因
function siteErrorText(status) {
  const map = {
    520: '源站暂时不可用（Cloudflare 520：源站返回了无法识别的响应）',
    521: '源站暂时不可用（Cloudflare 521：源站拒绝连接）',
    522: '源站暂时不可用（Cloudflare 522：连接源站超时）',
    523: '源站暂时不可用（Cloudflare 523：源站不可达）',
    524: '源站暂时不可用（Cloudflare 524：源站响应超时）',
    525: '源站暂时不可用（Cloudflare 525：TLS 握手失败）',
    526: '源站暂时不可用（Cloudflare 526：证书无效）',
    530: '源站暂时不可用（Cloudflare 530）',
    444: '站点拒绝连接（Cloudflare 444）',
  };
  if (map[status]) return `${map[status]}，通常是 qmtsw.com 服务器故障，请稍后重试`;
  if (status === 404) return '页面不存在（404）';
  if (status === 403) return '访问被拒绝（403）';
  return `站点返回 ${status}`;
}

async function siteGetText(url, opts) {
  let lastStatus = 0;
  let lastErr = null;

  for (let attempt = 0; attempt <= SITE_MAX_RETRIES; attempt++) {
    try {
      const r = await siteRequest(url, opts);
      if (!isSiteUnavailable(r.statusCode)) {
        let text = r.body.toString('utf8');
        // 站点历史上用过 GBK，若 UTF-8 解出大量替换字符则回退
        if (opts && opts.encoding === 'gbk') {
          text = r.body.toString('latin1');
        }
        return { status: r.statusCode, text };
      }
      lastStatus = r.statusCode;
    } catch (e) {
      lastErr = e;
    }

    if (attempt < SITE_MAX_RETRIES) {
      const delay = SITE_RETRY_DELAYS[attempt] || 5000;
      console.log(`[site] ${url} 第 ${attempt + 1} 次失败` +
        (lastStatus ? ` (HTTP ${lastStatus})` : ` (${lastErr && lastErr.message})`) +
        `，${delay}ms 后重试`);
      await new Promise((res) => setTimeout(res, delay));
    }
  }

  // 全部重试用尽
  if (lastStatus) {
    return { status: lastStatus, text: '', unavailable: true };
  }
  throw lastErr || new Error('站点请求失败');
}

// ---------- audio CDN download with SNI bypass ----------

const dnsCache = new Map();
async function resolveCdnIps(host) {
  const hit = dnsCache.get(host);
  if (hit && Date.now() - hit.t < 300000) return hit.ips;
  const ips = await new Promise((resolve, reject) => {
    dns.resolve4(host, (err, addrs) => {
      if (err || !addrs || !addrs.length) reject(err || new Error('no A record'));
      else resolve(addrs);
    });
  });
  dnsCache.set(host, { ips, t: Date.now() });
  return ips;
}

// 各 CDN 域名的可用节点池。aod 的默认解析节点长期只有几十 KB/s，
// 而 fdfs 的节点能到几百 KB/s，因此下载时对同一文件在多个候选节点
// 上做短时测速，选最快的那个再正式传输。
// 节点 IP 会变，这里只做种子；解析失败时仍会回退到 DNS 结果。
const NODE_SEEDS = {
  'aod.cos.tx.xmcdn.com': ['60.188.103.134', '60.188.103.146'],
  'fdfs.xmcdn.com': ['117.68.3.100'],
  // fdfs 域名的 DNS 常常解析到很慢的节点，下面这些是同 CDN 的备用节点
  'fdfs.xmcdn.com#alt': ['117.68.3.100'],
};

const speedCache = new Map(); // `${host}|${path}` -> { ip, at }

function cdnHeaders(host) {
  return {
    'Host': host,
    'User-Agent': UA,
    'Referer': SITE + '/',
    'Accept': '*/*',
    'Accept-Encoding': 'identity',
  };
}

function cdnConnect(ip, host, reqPath, method, timeout) {
  return new Promise((resolve, reject) => {
    const req = https.request({
      hostname: ip,
      port: 443,
      path: reqPath,
      method: method || 'GET',
      servername: '',            // 关键：不发 SNI，绕开域名阻断
      rejectUnauthorized: false,
      // 关键：CDN 对 TLS 1.3 连接限速到约 50 KB/s，TLS 1.2 能跑满带宽
      minVersion: 'TLSv1.2',
      maxVersion: 'TLSv1.2',
      headers: cdnHeaders(host),
      timeout: timeout || 60000,
    }, (r) => resolve({ req, res: r }));
    req.on('error', reject);
    req.on('timeout', () => req.destroy(new Error('CDN timeout')));
    req.end();
  });
}

// 连接 CDN 节点 IP，不发 SNI，用 Host 头指明域名。
// 依次尝试候选节点，首个成功建立连接的即返回。
async function cdnRequest(audioUrl, method) {
  let parsed;
  try { parsed = new URL(audioUrl); } catch (e) { throw new Error('Bad audio url'); }
  const host = parsed.hostname;
  const reqPath = parsed.pathname + parsed.search;

  let ips = [];
  try {
    ips = await resolveCdnIps(host);
  } catch (_) { /* 解析失败时用种子 IP */ }
  const seeds = NODE_SEEDS[host] || [];
  for (const ip of seeds) if (!ips.includes(ip)) ips.push(ip);
  if (!ips.length) throw new Error(`CDN DNS 解析失败: ${host}`);

  // 优先用上次成功的节点
  const cacheKey = `${host}|${reqPath}`;
  const cached = speedCache.get(cacheKey);
  const candidates = [];
  if (cached && Date.now() - cached.at < 600000) candidates.push(cached.ip);
  for (const ip of ips) if (!candidates.includes(ip)) candidates.push(ip);

  let lastErr = null;
  for (const ip of candidates) {
    try {
      const { res } = await cdnConnect(ip, host, reqPath, method, 60000);
      // 4xx/5xx 属于文件本身的问题，不必再换节点
      if (res.statusCode >= 400 && res.statusCode < 500) {
        speedCache.set(cacheKey, { ip, at: Date.now() });
        return res;
      }
      speedCache.set(cacheKey, { ip, at: Date.now() });
      return res;
    } catch (e) {
      lastErr = e;
    }
  }
  throw new Error(`CDN 连接失败: ${lastErr ? lastErr.message : 'unknown'}`);
}

// ---------- HTML parsing ----------

function decodeHtml(s) {
  return String(s)
    .replace(/&nbsp;/g, ' ')
    .replace(/&amp;/g, '&')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'");
}
function stripTags(s) {
  return decodeHtml(String(s).replace(/<[^>]*>/g, '')).replace(/\s+/g, ' ').trim();
}

// 分类页 -> 专辑列表 + 总页数
function parseCategoryPage(html, catId) {
  const items = [];
  // 每个条目: <a href="/show/ID.html" class="img-80 ..."> ... <img src="..." alt="标题">
  const re = /<a href="\/show\/(\d+)\.html"[^>]*>\s*<span class="img-box"[^>]*><img src="([^"]*)" alt="([^"]*)"/g;
  let m;
  while ((m = re.exec(html))) {
    items.push({ id: m[1], cover: m[2], title: decodeHtml(m[3]) });
  }
  // 简介与作者
  const descRe = /<p class="f-gray mb10 f-12">([\s\S]*?)<\/p>/g;
  const descs = [];
  while ((m = descRe.exec(html))) descs.push(stripTags(m[1]));
  items.forEach((it, i) => {
    const d = descs[i] || '';
    it.desc = d;
    const au = d.match(/作者[：:]([^，,由]+)/);
    if (au) it.author = au[1].trim();
    const na = d.match(/由([^，,播]+)播/);
    if (na) it.narrator = na[1].trim();
  });

  let totalPages = 1;
  const lastRe = new RegExp(`/book/${catId}-(\\d+)\\.html"><span class="page">尾页`);
  const lm = html.match(lastRe);
  if (lm) totalPages = parseInt(lm[1], 10) || 1;

  return { items, totalPages };
}

// 专辑页 -> 元信息 + 章节列表
function parseShowPage(html) {
  const titleM = html.match(/<h1 class="style-title[^"]*">([\s\S]*?)<\/h1>/);
  const coverM = html.match(/<div class="img-100 fl mr15"><span class="img-box"[^>]*><img src="([^"]*)"/);
  const stateM = html.match(/<span class="mr10">([^<]{2,12})<\/span>/);
  const introM = html.match(/内容介绍[：:]([\s\S]*?)<\/p>/);
  const authorM = html.match(/作者[：:]\s*<a[^>]*>([^<]+)<\/a>/);
  const narratorM = html.match(/播音[：:]\s*<a[^>]*>([^<]+)<\/a>/);

  const chapters = [];
  const re = /<a\s+title=["']([^"']*)["']\s+href=["'](\/play\/(\d+)-(\d+)-(\d+)\.html)["']/g;
  let m;
  while ((m = re.exec(html))) {
    chapters.push({ title: decodeHtml(m[1]), path: m[2], albumId: m[3], line: m[4], index: parseInt(m[5], 10) });
  }

  return {
    title: titleM ? stripTags(titleM[1]) : '',
    cover: coverM ? coverM[1] : '',
    status: stateM ? stripTags(stateM[1]) : '',
    intro: introM ? stripTags(introM[1]) : '',
    author: authorM ? stripTags(authorM[1]) : '',
    narrator: narratorM ? stripTags(narratorM[1]) : '',
    chapters,
  };
}

// 播放页 -> 音频直链
function parsePlayPage(html) {
  const nowM = html.match(/var\s+now\s*=\s*(?:"([^"]*)"|unescape\("([^"]*)"\))/);
  const nextM = html.match(/var\s+next\s*=\s*(?:"([^"]*)"|unescape\("([^"]*)"\))/);
  const dec = (s) => {
    if (s == null) return '';
    if (/%[0-9A-Fa-f]{2}/.test(s)) {
      try { return decodeURIComponent(s); } catch (_) { return s; }
    }
    return s;
  };
  return {
    now: dec(nowM ? (nowM[1] != null ? nowM[1] : nowM[2]) : ''),
    next: dec(nextM ? (nextM[1] != null ? nextM[1] : nextM[2]) : ''),
  };
}

async function fetchAlbumChapters(albumId) {
  const { status, text } = await siteGetText(`${SITE}/show/${albumId}.html`);
  if (status !== 200) throw new Error(siteErrorText(status));
  return parseShowPage(text);
}

// ---------- 分类列表切页 ----------
// 站点每页固定 16 条，不支持指定条数。为了支持“每页显示 N 条”，
// 缓存站点的原始分页，再按 perPage 重新切片。
const SITE_PAGE_SIZE = 16;
const CATEGORY_CACHE_TTL = 10 * 60 * 1000;
const categoryPageCache = new Map(); // `${cat}:${sitePage}` -> { items, totalPages, at }

function clampPerPage(n) {
  if (!n || isNaN(n)) return 20;
  return Math.max(5, Math.min(200, n));
}

async function getSiteCategoryPage(cat, sitePage) {
  const key = `${cat}:${sitePage}`;
  const hit = categoryPageCache.get(key);
  if (hit && Date.now() - hit.at < CATEGORY_CACHE_TTL) return hit;

  const url = sitePage <= 1 ? `${SITE}/book/${cat}.html` : `${SITE}/book/${cat}-${sitePage}.html`;
  const { status, text } = await siteGetText(url);
  if (status !== 200) throw new Error(siteErrorText(status));
  const data = parseCategoryPage(text, cat);

  const entry = { items: data.items, totalPages: data.totalPages, at: Date.now() };
  categoryPageCache.set(key, entry);
  return entry;
}

// 按“每页 perPage 条”返回分类的第 page 页。
// 只抓取覆盖该切片所需的站点分页，并在必要时抓尾页来确认真实总数。
async function getCategorySlice(cat, page, perPage) {
  const first = await getSiteCategoryPage(cat, 1);

  // 并发抓取覆盖当前切片所需的站点页
  const start = (page - 1) * perPage;
  const end = start + perPage;
  const needed = Math.min(first.totalPages, Math.ceil(end / SITE_PAGE_SIZE));
  const pages = [];
  for (let i = 1; i <= needed; i++) pages.push(i);

  const last = await getSiteCategoryPage(cat, first.totalPages);
  const totalItems = (first.totalPages - 1) * SITE_PAGE_SIZE + last.items.length;

  const entries = await Promise.all(pages.map((i) => getSiteCategoryPage(cat, i)));
  const all = entries.flatMap((e) => e.items);
  return { items: all.slice(start, end), totalItems };
}

async function resolveEpisodeAudio(albumId, index, line) {
  line = line == null ? 0 : line;
  const { status, text } = await siteGetText(`${SITE}/play/${albumId}-${line}-${index}.html`);
  if (status !== 200) throw new Error(siteErrorText(status));
  const { now } = parsePlayPage(text);
  if (!now) throw new Error('播放页中未找到音频地址');
  return now;
}

// ---------- download tasks ----------

const tasks = new Map();      // taskId -> task
const taskByKey = new Map();  // albumId:index -> taskId
let taskSeq = 0;

function newTask(fields) {
  const id = ++taskSeq;
  const task = {
    id, status: 'queued', progress: 0, received: 0, total: 0,
    error: '', filePath: '', speed: 0, createdAt: Date.now(), startedAt: 0, finishedAt: 0,
    ...fields,
  };
  tasks.set(id, task);
  taskByKey.set(`${task.albumId}:${task.index}`, id);
  return task;
}

// 单个文件最多重试的次数（CDN 偶发断流）
const MAX_RETRIES = 2;

// 单次 /api/tasks 返回的明细条数上限（统计仍按全量计算）
const MAX_TASKS_IN_LIST = 2000;

// 让正在进行的请求可以被“全部停止”打断。
// 必须带 Error 调用 destroy，否则 IncomingMessage 只发 close 不发 error，
// 下载 Promise 永远不会 settle，activeCount 会泄漏导致队列卡死。
function abortTask(task) {
  task.status = 'cancelled';
  task.error = '';
  if (task.currentReq) {
    try { task.currentReq.destroy(new Error('任务已停止')); } catch (_) {}
    task.currentReq = null;
  }
}

async function downloadOnce(task, audioUrl, destDir, fileName) {
  if (task.status === 'cancelled') return;
  const r = await cdnRequest(audioUrl, 'GET');
  // 记录底层 socket 所属请求，便于中止
  task.currentReq = r;

  if (r.statusCode !== 200) {
    r.resume();
    const body = await new Promise((resolve) => {
      let buf = '';
      r.on('data', (c) => { if (buf.length < 300) buf += c.toString('utf8'); });
      r.on('end', () => resolve(buf));
      r.on('error', () => resolve(buf));
      setTimeout(() => resolve(buf), 3000);
    });
    if (r.statusCode === 404) {
      // 区分“源头没有这个文件”和别的原因
      if (/NoSuchKey|The specified key does not exist/i.test(body)) {
        throw new Error('该集在源站缺失（CDN 无此文件）');
      }
      throw new Error('CDN 返回 404');
    }
    if (r.statusCode === 403) throw new Error('CDN 返回 403（拒绝访问）');
    throw new Error(`CDN 返回 ${r.statusCode}`);
  }

  const total = parseInt(r.headers['content-length'] || '0', 10);
  task.total = total;
  task.status = 'downloading';
  task.startedAt = Date.now();
  task.received = 0;
  task.progress = 0;

  if (!fs.existsSync(destDir)) fs.mkdirSync(destDir, { recursive: true });
  const ext = /\.mp3(\?|$)/i.test(audioUrl) ? '.mp3' : '.m4a';
  const filePath = path.join(destDir, sanitizeName(fileName) + ext);
  task.filePath = filePath;

  const free = getFreeSpaceBytes(destDir);
  if (free != null && total > 0 && free < total) {
    r.resume();
    throw new Error(`磁盘空间不足（可用 ${(free / 1048576).toFixed(0)} MB，需要 ${(total / 1048576).toFixed(0)} MB）`);
  }

  await new Promise((resolve, reject) => {
    const ws = fs.createWriteStream(filePath);
    let lastTick = Date.now();
    let lastBytes = 0;
    let settled = false;
    const fail = (err) => {
      if (settled) return;
      settled = true;
      try { ws.destroy(); } catch (_) {}
      reject(err);
    };

    r.on('data', (chunk) => {
      task.received += chunk.length;
      if (total) task.progress = Math.min(99, Math.round(task.received / total * 100));
      const now = Date.now();
      if (now - lastTick >= 500) {
        task.speed = Math.round((task.received - lastBytes) / ((now - lastTick) / 1000));
        lastTick = now;
        lastBytes = task.received;
      }
      // 手动处理背压，避免默认 pipe 的高水位节流
      if (!ws.write(chunk)) r.pause();
    });
    ws.on('drain', () => { if (!settled) r.resume(); });
    r.on('end', () => {
      if (settled) return;
      settled = true;
      ws.end(() => {
        task.progress = 100;
        task.status = 'done';
        task.finishedAt = Date.now();
        task.size = task.received;
        resolve();
      });
    });
    r.on('error', (e) => {
      try { r.destroy(); } catch (_) {}
      fail(new Error('传输中断: ' + e.message));
    });
    // 对端静默断开（只触发 close）时兜底，避免 Promise 永不结算
    r.on('close', () => {
      if (!settled) fail(new Error('连接被中断'));
    });
    ws.on('error', (e) => {
      try { r.destroy(); } catch (_) {}
      fail(e);
    });
  });
}

async function runDownload(task, audioUrl, destDir, fileName) {
  let lastErr = null;
  for (let attempt = 0; attempt <= MAX_RETRIES; attempt++) {
    if (task.status === 'cancelled') return;
    try {
      await downloadOnce(task, audioUrl, destDir, fileName);
      if (task.status === 'cancelled') return;
      return;
    } catch (e) {
      lastErr = e;
      if (task.status === 'cancelled') return;
      // 源站缺失、403、磁盘空间不足都不值得重试
      if (/源站缺失|403|磁盘空间/.test(e.message)) break;
      if (attempt < MAX_RETRIES) {
        task.status = 'queued';
        task.error = `重试中 (${attempt + 1}/${MAX_RETRIES})`;
        await new Promise((r) => setTimeout(r, 800 * (attempt + 1)));
      }
    }
  }
  if (task.status === 'cancelled') return;
  task.status = 'error';
  task.error = lastErr ? lastErr.message : 'unknown error';
  task.finishedAt = Date.now();
}

// 下载队列：并发 CONCURRENCY 路，兼顾速度与 CDN 友好度
let CONCURRENCY = 3;
let activeCount = 0;
const queue = [];

function enqueue(job) { queue.push(job); pumpQueue(); }

async function pumpQueue() {
  while (activeCount < CONCURRENCY && queue.length) {
    const job = queue.shift();
    activeCount++;
    (async () => {
      try { await job(); } catch (_) { /* task 内部已记录错误 */ }
      finally {
        activeCount--;
        pumpQueue();
      }
    })();
  }
}

// 清空排队中的任务（正在下载的由 abortTask 处理）
function clearQueue() {
  queue.length = 0;
}

// 把任务重新放回队列执行
function requeueTask(task) {
  const job = async () => {
    if (task.status === 'cancelled') return;
    try {
      const audioUrl = await resolveEpisodeAudio(task.albumId, task.index, task.line || 0);
      await runDownload(task, audioUrl, task.destDir, task.baseName);
    } catch (e) {
      if (task.status !== 'cancelled') {
        task.status = 'error';
        task.error = e.message;
        task.finishedAt = Date.now();
      }
    }
  };
  enqueue(job);
}

// 停止所有任务（排队 + 进行中）
function stopAllTasks() {
  let stopped = 0;
  for (const task of tasks.values()) {
    if (task.status === 'queued' || task.status === 'downloading') {
      abortTask(task);
      stopped++;
    }
  }
  clearQueue();
  return stopped;
}

// 重试所有失败/取消的任务（源站缺失的集重试也没用，跳过）
function retryAllTasks() {
  let retried = 0, skipped = 0;
  for (const task of tasks.values()) {
    if (task.status !== 'error' && task.status !== 'cancelled') continue;
    if (task.status === 'error' && /源站缺失/.test(task.error)) { skipped++; continue; }
    task.status = 'queued';
    task.error = '';
    task.progress = 0;
    task.received = 0;
    task.speed = 0;
    task.startedAt = 0;
    task.finishedAt = 0;
    requeueTask(task);
    retried++;
  }
  return { retried, skipped };
}

// ---------- server ----------

const server = http.createServer(async (req, res) => {
  const parsed = new URL(req.url, 'http://localhost');
  const query = Object.fromEntries(parsed.searchParams.entries());
  const p = parsed.pathname;

  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
  if (req.method === 'OPTIONS') { res.writeHead(204); res.end(); return; }

  try {
    // --- 分类列表 ---
    if (p === '/api/categories') {
      const out = Object.entries(CATEGORIES).map(([id, name]) => ({ id: Number(id), name }));
      return sendJson(res, 200, { categories: out });
    }

    // --- 分类分页 ---
    // perPage 是「每页显示条数」，站点的每页固定 16 条，两者无关。
    // 这里把该类别的全部条目按 perPage 重新切页，再按 page 取对应切片。
    if (p === '/api/category') {
      const cat = parseInt(query.cat, 10);
      const page = parseInt(query.page, 10) || 1;
      const perPage = clampPerPage(parseInt(query.perPage, 10));
      if (!CATEGORIES[cat]) return sendJson(res, 400, { error: '无效分类' });

      const slice = await getCategorySlice(cat, page, perPage);
      const totalPages = Math.max(1, Math.ceil(slice.totalItems / perPage));
      return sendJson(res, 200, {
        category: { id: cat, name: CATEGORIES[cat] },
        page,
        perPage,
        totalPages,
        totalItems: slice.totalItems,
        items: slice.items,
      });
    }

    // --- 专辑详情 ---
    if (p === '/api/album') {
      const id = String(query.id || '').replace(/\D/g, '');
      if (!id) return sendJson(res, 400, { error: '缺少专辑ID' });
      const data = await fetchAlbumChapters(id);
      if (!data.title) return sendJson(res, 404, { error: '专辑不存在或页面结构变化' });
      data.id = id;
      const coverUrl = data.cover
        ? (data.cover.startsWith('http') ? data.cover : SITE + data.cover)
        : '';
      return sendJson(res, 200, { ...data, coverUrl });
    }

    // --- 单集音频地址解析 ---
    if (p === '/api/resolve') {
      const id = String(query.id || '').replace(/\D/g, '');
      const index = parseInt(query.index, 10);
      const line = parseInt(query.line, 10) || 0;
      if (!id || isNaN(index)) return sendJson(res, 400, { error: '缺少专辑ID或集序号' });
      const audioUrl = await resolveEpisodeAudio(id, index, line);
      return sendJson(res, 200, { audioUrl });
    }

    // --- 下载：单集 / 整本 ---
    if (p === '/api/download') {
      const id = String(query.id || '').replace(/\D/g, '');
      const savePath = resolveUserPath(query.path || '~/Downloads');
      if (!id) return sendJson(res, 400, { error: '缺少专辑ID' });

      if (query.mode === 'album') {
        const album = await fetchAlbumChapters(id);
        if (!album.title) return sendJson(res, 404, { error: '专辑不存在' });
        const dir = path.join(savePath, sanitizeName(album.title));
        const from = query.from != null ? parseInt(query.from, 10) : 0;
        const to = query.to != null ? parseInt(query.to, 10) : album.chapters.length - 1;
        let created = 0;
        for (const ch of album.chapters) {
          if (ch.index < from || ch.index > to) continue;
          const key = `${id}:${ch.index}`;
          const existing = taskByKey.get(key);
          if (existing && tasks.get(existing) && ['queued', 'downloading', 'done'].includes(tasks.get(existing).status)) continue;
          const fileName = `${String(ch.index + 1).padStart(4, '0')} ${ch.title}`;
          const task = newTask({
            albumId: id, albumTitle: album.title, index: ch.index,
            chapterTitle: ch.title, fileName,
            line: parseInt(ch.line, 10) || 0,
            destDir: dir, baseName: fileName,
          });
          created++;
          enqueue(async () => {
            if (task.status === 'cancelled') return;
            try {
              const audioUrl = await resolveEpisodeAudio(id, ch.index, ch.line);
              await runDownload(task, audioUrl, dir, fileName);
            } catch (e) {
              if (task.status !== 'cancelled') {
                task.status = 'error';
                task.error = e.message;
              }
            }
          });
        }
        return sendJson(res, 200, { queued: created, albumTitle: album.title, dir });
      }

      // 单集
      const index = parseInt(query.index, 10);
      const line = parseInt(query.line, 10) || 0;
      const chapterTitle = query.title || `第${index + 1}集`;
      if (isNaN(index)) return sendJson(res, 400, { error: '缺少集序号' });
      const key = `${id}:${index}`;
      const existingId = taskByKey.get(key);
      if (existingId) {
        const t = tasks.get(existingId);
        if (t && ['queued', 'downloading', 'done'].includes(t.status)) {
          return sendJson(res, 200, { taskId: t.id, reused: true });
        }
      }
      const albumTitle = query.album || id;
      const dir = path.join(savePath, sanitizeName(albumTitle));
      const fileName = `${String(index + 1).padStart(4, '0')} ${chapterTitle}`;
      const task = newTask({
        albumId: id, albumTitle: albumTitle, index,
        chapterTitle, fileName,
        line, destDir: dir, baseName: fileName,
      });
      enqueue(async () => {
        if (task.status === 'cancelled') return;
        try {
          const audioUrl = await resolveEpisodeAudio(id, index, line);
          await runDownload(task, audioUrl, dir, fileName);
        } catch (e) {
          if (task.status !== 'cancelled') {
            task.status = 'error';
            task.error = e.message;
          }
        }
      });
      return sendJson(res, 200, { taskId: task.id, filePath: task.filePath });
    }

    // --- 任务列表 ---
    // 只把最新 MAX_TASKS_IN_LIST 条明细发给前端（避免响应无限膨胀），
    // 统计数字则按全量任务计算，保证「总任务/已完成/失败」准确。
    if (p === '/api/tasks') {
      const all = [...tasks.values()];
      const list = all
        .sort((a, b) => b.id - a.id)
        .slice(0, MAX_TASKS_IN_LIST)
        .map((t) => ({
          id: t.id, albumId: t.albumId, albumTitle: t.albumTitle,
          index: t.index, chapterTitle: t.chapterTitle, fileName: t.fileName,
          status: t.status, progress: t.progress, received: t.received,
          total: t.total, error: t.error, filePath: t.filePath, speed: t.speed,
        }));
      return sendJson(res, 200, {
        tasks: list,
        total: all.length,
        truncated: all.length > MAX_TASKS_IN_LIST,
        stats: {
          queued: all.filter((t) => t.status === 'queued').length,
          active: all.filter((t) => t.status === 'downloading').length,
          done: all.filter((t) => t.status === 'done').length,
          error: all.filter((t) => t.status === 'error').length,
          cancelled: all.filter((t) => t.status === 'cancelled').length,
        },
      });
    }

    // --- 取消单个任务 ---
    if (p === '/api/cancel') {
      const id = parseInt(query.id, 10);
      const t = tasks.get(id);
      if (!t) return sendJson(res, 404, { error: '任务不存在' });
      if (t.status === 'queued' || t.status === 'downloading') abortTask(t);
      return sendJson(res, 200, { success: true });
    }

    // --- 全部停止 ---
    if (p === '/api/stop-all') {
      const stopped = stopAllTasks();
      return sendJson(res, 200, { success: true, stopped });
    }

    // --- 全部重试 ---
    if (p === '/api/retry-all') {
      const r = retryAllTasks();
      return sendJson(res, 200, { success: true, retried: r.retried, skipped: r.skipped });
    }

    // --- 重试单个任务 ---
    if (p === '/api/retry') {
      const id = parseInt(query.id, 10);
      const t = tasks.get(id);
      if (!t) return sendJson(res, 404, { error: '任务不存在' });
      if (t.status === 'downloading' || t.status === 'queued') {
        return sendJson(res, 400, { error: '任务正在进行中' });
      }
      t.status = 'queued';
      t.error = '';
      t.progress = 0;
      t.received = 0;
      t.speed = 0;
      t.finishedAt = 0;
      requeueTask(t);
      return sendJson(res, 200, { success: true });
    }

    // --- 清理已完成/失败任务 ---
    if (p === '/api/clear-tasks') {
      for (const [id, t] of [...tasks]) {
        if (t.status !== 'downloading' && t.status !== 'queued') {
          tasks.delete(id);
          taskByKey.delete(`${t.albumId}:${t.index}`);
        }
      }
      return sendJson(res, 200, { success: true });
    }

    // --- 文件系统操作 ---
    // 注意：系统对话框会阻塞到用户选择为止，必须用异步 execFile。
    // 若用 execSync，整个 Node 事件循环会被冻结，页面轮询全部停摆，
    // 看起来就像“点了没反应”。
    if (p === '/api/browse-folder') {
      const tmpFile = path.join(require('os').tmpdir(),
        `qmtsw_browse_${Date.now()}_${Math.random().toString(36).slice(2, 8)}.ps1`);
      // 建一个不可见的置顶 owner 窗口，确保对话框显示在浏览器窗口之上
      const ps = `[Console]::OutputEncoding = [System.Text.Encoding]::UTF8
Add-Type -AssemblyName System.Windows.Forms
Add-Type -AssemblyName System.Drawing
$owner = New-Object System.Windows.Forms.Form
$owner.TopMost = $true
$owner.ShowInTaskbar = $false
$owner.FormBorderStyle = 'None'
$owner.StartPosition = 'CenterScreen'
$owner.Size = New-Object System.Drawing.Size(1,1)
$owner.Show()
$dialog = New-Object System.Windows.Forms.FolderBrowserDialog
$dialog.Description = '选择保存目录'
$dialog.ShowNewFolderButton = $true
$result = ''
if ($dialog.ShowDialog($owner) -eq 'OK') { $result = $dialog.SelectedPath }
$owner.Close()
[Console]::Out.WriteLine($result)`;
      fs.writeFileSync(tmpFile, '\uFEFF' + ps, 'utf8');

      const result = await new Promise((resolve, reject) => {
        execFile('powershell', ['-NoProfile', '-STA', '-ExecutionPolicy', 'Bypass', '-File', tmpFile],
          { timeout: 120000, windowsHide: true, encoding: 'utf8' },
          (err, stdout) => {
            try { fs.unlinkSync(tmpFile); } catch (_) {}
            if (err) return reject(new Error(`无法打开文件夹选择框: ${err.message}`));
            resolve(String(stdout || '').trim());
          });
      });
      return sendJson(res, 200, { path: result || null });
    }

    if (p === '/api/disk-space') {
      const target = resolveUserPath(query.path || '~/Downloads');
      return sendJson(res, 200, { free: getFreeSpaceBytes(target), path: target });
    }

    if (p === '/api/open-file') {
      const filePath = resolveUserPath(query.path || '');
      if (!filePath || !fs.existsSync(filePath)) return sendJson(res, 404, { error: '文件不存在' });
      await runPowerShell(`Start-Process -FilePath '${filePath.replace(/'/g, "''")}'`);
      return sendJson(res, 200, { success: true });
    }

    if (p === '/api/reveal-file') {
      const filePath = resolveUserPath(query.path || '');
      if (!filePath || !fs.existsSync(filePath)) return sendJson(res, 404, { error: '文件不存在' });
      await runPowerShell(`Start-Process explorer.exe -ArgumentList '/select,"${filePath.replace(/'/g, "''")}"'`);
      return sendJson(res, 200, { success: true });
    }

    if (p === '/api/delete-file') {
      const filePath = resolveUserPath(query.path || '');
      if (!filePath || !fs.existsSync(filePath)) return sendJson(res, 404, { error: '文件不存在' });
      fs.unlinkSync(filePath);
      return sendJson(res, 200, { success: true });
    }

    // --- 封面代理（站内图片直连即可，代理是为避免浏览器跨域） ---
    if (p === '/api/cover') {
      const target = query.url || '';
      if (!target.startsWith(SITE)) return sendJson(res, 400, { error: 'Invalid url' });
      const r = await siteRequest(target);
      res.writeHead(r.statusCode, {
        'Content-Type': r.headers['content-type'] || 'image/jpeg',
        'Cache-Control': 'public, max-age=86400',
      });
      return res.end(r.body);
    }

  } catch (e) {
    console.error('[API]', p, e.message);
    return sendJson(res, 502, { error: e.message });
  }

  // --- 静态文件 ---
  let filePath = p === '/' ? '/index.html' : p;
  filePath = path.join(__dirname, 'public', filePath);
  const ext = path.extname(filePath);
  fs.readFile(filePath, (err, data) => {
    if (err) {
      res.writeHead(404, { 'Content-Type': 'text/plain; charset=utf-8' });
      res.end('Not Found');
    } else {
      res.writeHead(200, { 'Content-Type': MIME[ext] || 'application/octet-stream' });
      res.end(data);
    }
  });
});

server.on('error', (e) => {
  if (e.code === 'EADDRINUSE') {
    console.error(`Port ${PORT} is already in use. Trying to kill existing process...`);
    try {
      const out = execSync(`netstat -ano | findstr ":${PORT}" | findstr "LISTENING"`, { encoding: 'utf8' });
      const pids = [...new Set(out.trim().split('\n').map((l) => l.trim().split(/\s+/).pop()))];
      for (const pid of pids) {
        if (pid && pid !== String(process.pid)) {
          console.log(`Killing PID ${pid}...`);
          try { execSync(`taskkill /f /pid ${pid}`); } catch (_) {}
        }
      }
      setTimeout(() => {
        server.listen(PORT, '127.0.0.1');
        console.log(`Retried listening on port ${PORT}`);
      }, 2000);
    } catch (err) {
      console.error('Failed to free port:', err.message);
      process.exit(1);
    }
  } else {
    console.error('Server error:', e);
    process.exit(1);
  }
});

server.listen(PORT, '127.0.0.1', () => {
  console.log(`Server running at http://localhost:${PORT}`);
  console.log('Source: https://www.qmtsw.com');
  console.log('Audio CDN access: IP + Host header, SNI disabled');
});
