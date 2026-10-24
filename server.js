// ============================================================
// QMTSW Audio Downloader - Web Edition
// Source site: https://www.qmtsw.com (全民听书网)
//
// 站内页面走 HTTP 代理（环境变量或 Windows 系统代理），音频 CDN
// (xmcdn.com) 则在 TLS 握手阶段按 SNI 重置连接，因此下载时用节点 IP
// 连接、置空 SNI、改由 Host 头指定域名（Node 的 servername:'' 才真正不发 SNI）。
// ============================================================

const http = require('http');
const https = require('https');
const fs = require('fs');
const path = require('path');
const dns = require('dns');
const crypto = require('crypto');
const os = require('os');
const { Transform, pipeline } = require('stream');
const { promisify } = require('util');
const { execSync, execFile, execFileSync } = require('child_process');

const pipelineAsync = promisify(pipeline);
const PORT = Number(process.env.QMTSW_PORT) || 3211;
const SITE = 'https://www.qmtsw.com';
const UA = 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36';
const DATA_DIR = process.env.QMTSW_DATA_DIR
  ? path.resolve(process.env.QMTSW_DATA_DIR)
  : path.join(os.homedir(), '.qmtsw-downloader');
const STATE_FILE = path.join(DATA_DIR, 'state.json');
const DEFAULT_SETTINGS = {
  concurrency: 3,
  speedLimitBps: 0,
  maxRetries: 2,
  retryBaseMs: 800,
  startAt: '',
  useProxy: true,
  proxyAddress: '127.0.0.1:7890',
  downloadRoot: path.join(os.homedir(), 'Downloads'),
};
const settings = { ...DEFAULT_SETTINGS };
const albumIndex = new Map();
let searchHistory = [];
let persistTimer = null;
let nextBandwidthAt = 0;

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

function readJsonBody(req) {
  return new Promise((resolve, reject) => {
    const chunks = [];
    let size = 0;
    req.on('data', (chunk) => {
      size += chunk.length;
      if (size > 65536) {
        reject(new Error('请求体过大'));
        req.destroy();
        return;
      }
      chunks.push(chunk);
    });
    req.on('end', () => {
      try {
        const text = Buffer.concat(chunks).toString('utf8');
        resolve(text ? JSON.parse(text) : {});
      } catch (_) {
        reject(new Error('无效 JSON'));
      }
    });
    req.on('error', reject);
  });
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
  if (process.platform !== 'win32') {
    try {
      const out = execFileSync('df', ['-kP', targetDir], { timeout: 8000, encoding: 'utf8' });
      const lines = out.trim().split(/\r?\n/);
      const parts = lines[lines.length - 1].trim().split(/\s+/);
      const available = Number(parts[3]);
      if (Number.isFinite(available)) return available * 1024;
    } catch (_) { /* ignore */ }
  }
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

// Node 的 http/https 不会自动读取 HTTP(S)_PROXY，也不读 Windows 系统代理。
// 部分网络下直连 Cloudflare 会被调度到 AMS/LAX 节点并回源失败（520），
// 经本机代理走 NRT 等节点则正常，所以这里显式支持代理。
let cachedProxies; // undefined = 尚未检测，数组 = 按优先级排列的候选代理（可能为空）

function parseProxySpec(raw) {
  if (!raw) return null;
  let spec = String(raw).trim();
  if (!spec || /^(none|off|direct|0)$/i.test(spec)) return null;
  // Windows 注册表形式：http=host:port;https=host:port
  if (spec.includes('=')) {
    const parts = {};
    for (const seg of spec.split(';')) {
      const i = seg.indexOf('=');
      if (i > 0) parts[seg.slice(0, i).trim().toLowerCase()] = seg.slice(i + 1).trim();
    }
    spec = parts.https || parts.http || parts.socks || '';
    if (!spec) return null;
  }
  spec = spec.replace(/^[a-z][a-z0-9+.-]*:\/\//i, '').replace(/\/.*$/, '');
  const m = spec.match(/^\[?([^\]]+?)\]?:(\d+)$/);
  if (!m) return null;
  return { host: m[1], port: Number(m[2]) };
}

async function resolveWindowsProxy() {
  if (process.platform !== 'win32') return null;
  try {
    const out = await runPowerShell(
      "$p = Get-ItemProperty 'HKCU:\\Software\\Microsoft\\Windows\\CurrentVersion\\Internet Settings'\r\n" +
      "if ($p.ProxyEnable -eq 1 -and $p.ProxyServer) { Write-Output $p.ProxyServer }"
    );
    return parseProxySpec(out);
  } catch (_) {
    return null;
  }
}

// 候选代理按优先级排列：显式配置优先，其后依次是环境变量与系统代理。
// 长连接下代理可能偶发 TLS 断连，保留多个候选便于切换。
async function getSiteProxies() {
  if (cachedProxies !== undefined) return cachedProxies;
  const explicit = process.env.QMTSW_PROXY;
  if (explicit && /^(none|off|direct|0)$/i.test(explicit.trim())) {
    cachedProxies = [];
    console.log('[proxy] QMTSW_PROXY 已禁用代理，站点请求直连');
    return cachedProxies;
  }
  const candidates = [
    settings.proxyAddress,
    explicit,
    process.env.HTTPS_PROXY || process.env.https_proxy,
    process.env.HTTP_PROXY || process.env.http_proxy,
  ];
  const list = [];
  for (const raw of candidates) {
    const p = parseProxySpec(raw);
    if (p && !list.some((x) => x.host === p.host && x.port === p.port)) list.push(p);
  }
  const sys = await resolveWindowsProxy();
  if (sys && !list.some((x) => x.host === sys.host && x.port === sys.port)) list.push(sys);

  cachedProxies = list;
  if (list.length) {
    console.log('[proxy] 站点请求代理候选：' + list.map((p) => `${p.host}:${p.port}`).join(' → '));
  } else {
    console.log('[proxy] 未配置代理，站点请求直连');
  }
  return cachedProxies;
}

function buildSiteHeaders(opts) {
  return {
    'User-Agent': UA,
    'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
    'Accept-Language': 'zh-CN,zh;q=0.9',
    'Referer': SITE + '/',
    ...((opts && opts.headers) || {}),
  };
}

function directRequest(targetUrl, opts) {
  opts = opts || {};
  return new Promise((resolve, reject) => {
    const parsed = new URL(targetUrl);
    const isHttps = parsed.protocol === 'https:';
    const lib = isHttps ? https : http;
    const req = lib.request({
      hostname: parsed.hostname,
      port: parsed.port || (isHttps ? 443 : 80),
      path: parsed.pathname + parsed.search,
      method: opts.method || 'GET',
      headers: buildSiteHeaders(opts),
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

// 经 HTTP 代理用 CONNECT 建立隧道后再请求；只在隧道建立失败时才回退直连，
// 隧道内的 HTTP 5xx 是站点真实响应，照常返回给上层处理。
function proxyRequest(targetUrl, opts, proxy) {
  opts = opts || {};
  const parsed = new URL(targetUrl);
  const isHttps = parsed.protocol === 'https:';
  const port = parsed.port || (isHttps ? 443 : 80);
  const authority = `${parsed.hostname}:${port}`;

  return new Promise((resolve, reject) => {
    let settled = false;
    const fail = (err) => {
      if (settled) return;
      settled = true;
      reject(err);
    };

    const connectReq = http.request({
      host: proxy.host,
      port: proxy.port,
      method: 'CONNECT',
      path: authority,
      headers: { Host: authority },
      timeout: REQUEST_TIMEOUT,
    });

    connectReq.on('connect', (r, socket) => {
      if (r.statusCode !== 200) {
        socket.destroy();
        return fail(new Error(`代理 CONNECT 返回 ${r.statusCode}`));
      }
      const lib = isHttps ? https : http;
      const req = lib.request({
        hostname: parsed.hostname,
        port,
        path: parsed.pathname + parsed.search,
        method: opts.method || 'GET',
        headers: buildSiteHeaders(opts),
        socket,
        agent: false,
        servername: isHttps ? parsed.hostname : undefined,
        timeout: REQUEST_TIMEOUT,
      }, (r2) => {
        const chunks = [];
        r2.on('data', (c) => chunks.push(c));
        r2.on('end', () => {
          settled = true;
          resolve({ statusCode: r2.statusCode, headers: r2.headers, body: Buffer.concat(chunks) });
        });
      });
      req.on('error', fail);
      req.on('timeout', () => req.destroy(new Error('Request timeout')));
      if (opts.body) req.write(opts.body);
      req.end();
    });

    connectReq.on('error', fail);
    connectReq.on('timeout', () => connectReq.destroy(new Error('代理连接超时')));
    connectReq.end();
  });
}

async function siteRequest(targetUrl, opts) {
  if (settings.useProxy === false) return directRequest(targetUrl, opts);
  const proxies = await getSiteProxies();
  for (const proxy of proxies) {
    try {
      return await proxyRequest(targetUrl, opts, proxy);
    } catch (e) {
      console.log(`[proxy] ${proxy.host}:${proxy.port} 请求失败（${e.message}），尝试下一个出口`);
    }
  }
  return directRequest(targetUrl, opts);
}

const coverJobs = new Map();

function findExistingCover(dir) {
  try {
    const entries = fs.readdirSync(dir, { withFileTypes: true });
    for (const entry of entries) {
      if (!entry.isFile() || !/^(cover|folder)\.(jpe?g|png|webp|gif)$/i.test(entry.name)) continue;
      const full = path.join(dir, entry.name);
      try {
        if (fs.statSync(full).size > 0) return full;
      } catch (_) {}
    }
  } catch (_) {}
  return '';
}

async function ensureAlbumCover(cover, destDir) {
  if (!cover) return '';
  const existing = findExistingCover(destDir);
  if (existing) return existing;
  const key = path.resolve(destDir);
  if (coverJobs.has(key)) return coverJobs.get(key);
  const job = (async () => {
    const parsed = new URL(String(cover), SITE + '/');
    if (parsed.origin !== SITE) throw new Error('封面地址不在源站范围内');
    const r = await siteRequest(parsed.href);
    if (r.statusCode !== 200) throw new Error(`封面请求返回 ${r.statusCode}`);
    if (!r.body || !r.body.length) throw new Error('封面内容为空');
    if (r.body.length > 15 * 1024 * 1024) throw new Error('封面文件过大');
    const mime = String(r.headers['content-type'] || '').split(';')[0].toLowerCase();
    if (mime && !mime.startsWith('image/')) throw new Error('封面响应不是图片');
    const urlExt = path.extname(parsed.pathname).toLowerCase();
    const allowedExts = ['.jpg', '.jpeg', '.png', '.webp', '.gif'];
    const ext = mime.includes('png') ? '.png'
      : mime.includes('webp') ? '.webp'
        : mime.includes('gif') ? '.gif'
          : (mime.includes('jpeg') || mime.includes('jpg')) ? '.jpg'
            : (allowedExts.includes(urlExt) ? urlExt : '.jpg');
    fs.mkdirSync(destDir, { recursive: true });
    const completed = findExistingCover(destDir);
    if (completed) return completed;
    const target = path.join(destDir, `cover${ext}`);
    const temp = path.join(destDir, `.cover${ext}.part`);
    fs.writeFileSync(temp, r.body);
    try {
      fs.renameSync(temp, target);
    } catch (error) {
      if (fs.existsSync(target) && fs.statSync(target).size === 0) {
        fs.unlinkSync(target);
        fs.renameSync(temp, target);
      } else {
        throw error;
      }
    }
    return target;
  })();
  coverJobs.set(key, job);
  try {
    return await job;
  } finally {
    if (coverJobs.get(key) === job) coverJobs.delete(key);
  }
}

// 5xx 来自 Cloudflare 回源失败。同一时刻不同边缘节点结果可能不同：
// 直连常被调度到 AMS/LAX 并失败，走代理到 NRT 等节点则正常，因此重试有意义。
const SITE_MAX_RETRIES = 3;       // 最多额外重试 3 次
const SITE_RETRY_DELAYS = [800, 2000, 4500];

function isSiteUnavailable(status) {
  return status >= 500 && status <= 599;
}

// 把状态码翻译成用户能看懂的原因
function siteErrorText(status) {
  const map = {
    520: 'Cloudflare 520：源站返回了无法识别的响应',
    521: 'Cloudflare 521：源站拒绝连接',
    522: 'Cloudflare 522：连接源站超时',
    523: 'Cloudflare 523：源站不可达',
    524: 'Cloudflare 524：源站响应超时',
    525: 'Cloudflare 525：TLS 握手失败',
    526: 'Cloudflare 526：证书无效',
    530: 'Cloudflare 530',
    444: 'Cloudflare 444：站点拒绝连接',
  };
  if (map[status]) {
    return `站点暂时无法访问（${map[status]}）。` +
      '若浏览器能正常打开，说明本机直连被 Cloudflare 调度到了故障节点，' +
      '请配置代理后重试（支持 QMTSW_PROXY 或系统代理）';
  }
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

function cdnHeaders(host, extraHeaders) {
  return {
    'Host': host,
    'User-Agent': UA,
    'Referer': SITE + '/',
    'Accept': '*/*',
    'Accept-Encoding': 'identity',
    ...(extraHeaders || {}),
  };
}

function cdnConnect(ip, host, reqPath, method, timeout, extraHeaders, protocol, port) {
  return new Promise((resolve, reject) => {
    const isHttps = protocol !== 'http:';
    const req = (isHttps ? https : http).request({
      hostname: ip,
      port: port || (isHttps ? 443 : 80),
      path: reqPath,
      method: method || 'GET',
      servername: isHttps ? '' : undefined, // HTTPS 不发 SNI，绕开域名阻断
      rejectUnauthorized: isHttps ? false : undefined,
      // 关键：CDN 对 TLS 1.3 连接限速到约 50 KB/s，TLS 1.2 能跑满带宽
      minVersion: isHttps ? 'TLSv1.2' : undefined,
      maxVersion: isHttps ? 'TLSv1.2' : undefined,
      headers: cdnHeaders(host, extraHeaders),
      timeout: timeout || 60000,
    }, (r) => resolve({ req, res: r }));
    req.on('error', reject);
    req.on('timeout', () => req.destroy(new Error('CDN timeout')));
    req.end();
  });
}

// 连接 CDN 节点 IP，不发 SNI，用 Host 头指明域名。
// 依次尝试候选节点，首个成功建立连接的即返回。
async function cdnRequest(audioUrl, method, extraHeaders) {
  let parsed;
  try { parsed = new URL(audioUrl); } catch (e) { throw new Error('Bad audio url'); }
  if (parsed.protocol !== 'http:' && parsed.protocol !== 'https:') throw new Error('Unsupported audio protocol');
  const host = parsed.hostname;
  const reqPath = parsed.pathname + parsed.search;
  const port = Number(parsed.port) || 0;

  let ips = [];
  try {
    ips = await resolveCdnIps(host);
  } catch (_) { /* 解析失败时用种子 IP */ }
  const seeds = NODE_SEEDS[host] || [];
  for (const ip of seeds) if (!ips.includes(ip)) ips.push(ip);
  if (!ips.length) throw new Error(`CDN DNS 解析失败: ${host}`);

  // 优先用上次成功的节点
  const cacheKey = `${parsed.protocol}|${host}|${reqPath}`;
  const cached = speedCache.get(cacheKey);
  const candidates = [];
  if (cached && Date.now() - cached.at < 600000) candidates.push(cached.ip);
  for (const ip of ips) if (!candidates.includes(ip)) candidates.push(ip);

  let lastErr = null;
  for (let round = 0; round < 2; round++) {
    for (const ip of candidates) {
      try {
        const { res } = await cdnConnect(ip, host, reqPath, method, 60000, extraHeaders, parsed.protocol, port);
        // 4xx 属于文件本身的问题，不必再换节点
        if (res.statusCode >= 400 && res.statusCode < 500) {
          speedCache.set(cacheKey, { ip, at: Date.now() });
          return res;
        }
        speedCache.set(cacheKey, { ip, at: Date.now() });
        return res;
      } catch (e) {
        lastErr = e;
        const cachedNode = speedCache.get(cacheKey);
        if (cachedNode && cachedNode.ip === ip) speedCache.delete(cacheKey);
      }
    }
    if (round === 0) await new Promise((resolve) => setTimeout(resolve, 300));
  }
  // 外层下载重试应重新解析 DNS，且不再优先选择本轮失败的节点。
  dnsCache.delete(host);
  speedCache.delete(cacheKey);
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
  const data = parseShowPage(text);
  rememberAlbums([{
    id: String(albumId), title: data.title, cover: data.cover, author: data.author,
    narrator: data.narrator, desc: data.intro, chapterCount: data.chapters.length,
  }]);
  return data;
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
  rememberAlbums(data.items.map((item) => ({ ...item, category: Number(cat) })));

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

const SITE_SEARCH_CACHE_TTL = 6 * 60 * 60 * 1000;
const siteSearchCache = { at: 0, items: [], promise: null };

function parseSiteSearchRss(text) {
  const items = [];
  const readField = (block, tag) => {
    const open = `<${tag}>`;
    const at = block.indexOf(open);
    if (at < 0) return '';
    const start = at + open.length;
    const end = block.indexOf(`</${tag}>`, start);
    if (end < 0) return '';
    let value = block.slice(start, end).trim();
    if (value.startsWith('<![CDATA[') && value.endsWith(']]>')) value = value.slice(9, -3);
    return decodeHtml(value.trim());
  };
  let cursor = 0;
  while (cursor < text.length) {
    const itemAt = text.indexOf('<item>', cursor);
    if (itemAt < 0) break;
    const itemEnd = text.indexOf('</item>', itemAt + 6);
    if (itemEnd < 0) break;
    const block = text.slice(itemAt + 6, itemEnd);
    const link = readField(block, 'link');
    const showAt = link.indexOf('/show/');
    const idStart = showAt + 6;
    const idEnd = showAt < 0 ? -1 : link.indexOf('.html', idStart);
    const id = idEnd > idStart ? link.slice(idStart, idEnd) : '';
    const title = readField(block, 'title');
    if (!id || !/^[0-9]+$/.test(id) || !title) {
      cursor = itemEnd + 7;
      continue;
    }
    items.push({
      id, title,
      author: readField(block, 'author'),
      description: readField(block, 'description'),
      pubDate: readField(block, 'pubDate'),
    });
    cursor = itemEnd + 7;
  }
  return items;
}

async function getSiteSearchIndex() {
  if (siteSearchCache.items.length && Date.now() - siteSearchCache.at < SITE_SEARCH_CACHE_TTL) {
    return siteSearchCache.items;
  }
  if (siteSearchCache.promise) return siteSearchCache.promise;
  const promise = (async () => {
    const { status, text } = await siteGetText(`${SITE}/xml/rss.xml`);
    if (status !== 200) throw new Error(siteErrorText(status));
    const items = parseSiteSearchRss(text);
    if (!items.length) throw new Error('站点专辑索引为空或格式已变化');
    siteSearchCache.items = items;
    siteSearchCache.at = Date.now();
    return items;
  })();
  siteSearchCache.promise = promise;
  try {
    return await promise;
  } finally {
    if (siteSearchCache.promise === promise) siteSearchCache.promise = null;
  }
}

async function searchSiteAlbums(query) {
  const q = String(query || '').trim().toLowerCase();
  if (!q) return { items: [], total: 0, indexed: siteSearchCache.items.length };
  const terms = q.split(/\s+/).filter(Boolean);
  const source = await getSiteSearchIndex();
  const matched = [];
  for (const item of source) {
    const title = item.title.toLowerCase();
    const author = item.author.toLowerCase();
    const description = item.description.toLowerCase();
    const haystack = `${title} ${author} ${description}`;
    if (!terms.every((term) => haystack.includes(term))) continue;
    let score = 0;
    for (const term of terms) {
      if (title === term) score += 100;
      else if (title.startsWith(term)) score += 80;
      else if (title.includes(term)) score += 60;
      else if (author.includes(term)) score += 30;
      else score += 10;
    }
    matched.push({ item, score });
  }
  matched.sort((a, b) => b.score - a.score);
  const items = matched.slice(0, 60).map(({ item }) => {
    const cached = albumIndex.get(item.id);
    return {
      id: item.id, title: item.title, author: item.author, pubDate: item.pubDate,
      cover: cached && cached.cover ? cached.cover : '',
      category: cached ? cached.category : null,
    };
  });
  return { items, total: matched.length, indexed: source.length };
}

const siteCoverJobs = new Map();

async function getSiteAlbumCover(id) {
  const cached = albumIndex.get(id);
  if (cached && cached.cover) return cached.cover;
  if (siteCoverJobs.has(id)) return siteCoverJobs.get(id);
  const job = (async () => {
    const { status, text } = await siteGetText(`${SITE}/show/${id}.html`);
    if (status !== 200) throw new Error(siteErrorText(status));
    const data = parseShowPage(text);
    if (!data.cover) return '';
    rememberAlbums([{
      id, title: data.title, cover: data.cover, author: data.author,
      narrator: data.narrator, desc: data.intro,
    }]);
    return data.cover;
  })();
  siteCoverJobs.set(id, job);
  try {
    return await job;
  } finally {
    if (siteCoverJobs.get(id) === job) siteCoverJobs.delete(id);
  }
}

async function getSiteCovers(ids) {
  const list = [...new Set(String(ids || '').split(',').map((id) => id.replace(/\D/g, '')).filter(Boolean))].slice(0, 60);
  const covers = {};
  let cursor = 0;
  const workers = Array.from({ length: Math.min(6, list.length) }, async () => {
    while (cursor < list.length) {
      const id = list[cursor++];
      try {
        const cover = await getSiteAlbumCover(id);
        if (cover) covers[id] = cover;
      } catch (e) {
        console.log(`[cover] 搜索封面 ${id}: ${e.message}`);
      }
    }
  });
  await Promise.all(workers);
  return covers;
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
const taskByKey = new Map();  // albumId:index:line:destDir -> taskId
let taskSeq = 0;

function taskKey(task) {
  return [task.albumId, task.index, task.line || 0, path.resolve(task.destDir || '')].join(':');
}

function isTaskJobCurrent(task, generation) {
  return task.generation === generation && task.status !== 'cancelled';
}

function normalizeSettings(input) {
  const src = input || {};
  const out = {};
  const concurrency = Number(src.concurrency);
  const speedLimitBps = Number(src.speedLimitBps);
  const maxRetries = Number(src.maxRetries);
  const retryBaseMs = Number(src.retryBaseMs);
  out.concurrency = Number.isFinite(concurrency) ? Math.max(1, Math.min(10, Math.round(concurrency))) : DEFAULT_SETTINGS.concurrency;
  out.speedLimitBps = Number.isFinite(speedLimitBps) ? Math.max(0, Math.min(104857600, Math.round(speedLimitBps))) : 0;
  out.maxRetries = Number.isFinite(maxRetries) ? Math.max(0, Math.min(10, Math.round(maxRetries))) : DEFAULT_SETTINGS.maxRetries;
  out.retryBaseMs = Number.isFinite(retryBaseMs) ? Math.max(100, Math.min(60000, Math.round(retryBaseMs))) : DEFAULT_SETTINGS.retryBaseMs;
  const startAt = src.startAt ? new Date(src.startAt) : null;
  out.startAt = startAt && !isNaN(startAt.getTime()) ? startAt.toISOString() : '';
  out.useProxy = src.useProxy !== false;
  out.proxyAddress = String(src.proxyAddress == null ? DEFAULT_SETTINGS.proxyAddress : src.proxyAddress).trim().slice(0, 255);
  out.downloadRoot = src.downloadRoot ? resolveUserPath(String(src.downloadRoot)) : DEFAULT_SETTINGS.downloadRoot;
  return out;
}

function throttleBytes(bytes) {
  const limit = settings.speedLimitBps;
  if (!limit) return Promise.resolve();
  const now = Date.now();
  const wait = Math.max(0, nextBandwidthAt - now);
  nextBandwidthAt = Math.max(now, nextBandwidthAt) + Math.ceil(bytes * 1000 / limit);
  return wait > 0 ? new Promise((resolve) => setTimeout(resolve, wait)) : Promise.resolve();
}

function schedulePersist() {
  if (persistTimer) return;
  persistTimer = setTimeout(() => {
    persistTimer = null;
    persistState();
  }, 1000);
  if (persistTimer.unref) persistTimer.unref();
}

function persistState() {
  try {
    fs.mkdirSync(DATA_DIR, { recursive: true });
    const taskFields = [
      'id', 'albumId', 'albumTitle', 'index', 'line', 'chapterTitle', 'fileName',
      'destDir', 'baseName', 'status', 'progress', 'received', 'total', 'error',
      'filePath', 'partPath', 'speed', 'createdAt', 'startedAt', 'finishedAt', 'size', 'cover',
    ];
    const snapshot = {
      version: 2,
      settings,
      searchHistory,
      albums: [...albumIndex.values()].slice(-10000),
      tasks: [...tasks.values()].slice(-5000).map((task) => {
        const out = {};
        for (const key of taskFields) out[key] = task[key];
        return out;
      }),
    };
    const tmp = STATE_FILE + '.tmp';
    fs.writeFileSync(tmp, JSON.stringify(snapshot), 'utf8');
    try {
      fs.renameSync(tmp, STATE_FILE);
    } catch (_) {
      fs.copyFileSync(tmp, STATE_FILE);
      fs.unlinkSync(tmp);
    }
  } catch (e) {
    console.error('[state] 保存失败:', e.message);
  }
}

function rememberAlbums(items) {
  for (const item of items || []) {
    if (!item || !item.id) continue;
    const id = String(item.id);
    const previous = albumIndex.get(id) || {};
    albumIndex.set(id, {
      ...previous,
      ...item,
      id,
      title: item.title || previous.title || id,
      indexedAt: Date.now(),
    });
  }
  while (albumIndex.size > 10000) albumIndex.delete(albumIndex.keys().next().value);
  schedulePersist();
}

function loadPersistedState() {
  let data;
  try {
    if (!fs.existsSync(STATE_FILE)) return;
    data = JSON.parse(fs.readFileSync(STATE_FILE, 'utf8'));
  } catch (e) {
    console.error('[state] 读取失败:', e.message);
    return;
  }
  Object.assign(settings, normalizeSettings({ ...DEFAULT_SETTINGS, ...(data.settings || {}) }));
  searchHistory = Array.isArray(data.searchHistory) ? data.searchHistory.slice(0, 20) : [];
  for (const item of data.albums || []) {
    if (item && item.id) albumIndex.set(String(item.id), item);
  }
  for (const raw of data.tasks || []) {
    if (!raw || !Number.isFinite(raw.id)) continue;
    const task = {
      progress: 0, received: 0, total: 0, error: '', filePath: '', speed: 0,
      createdAt: Date.now(), startedAt: 0, finishedAt: 0,
      ...raw,
      generation: 0,
      currentReq: null,
      _activePromise: null,
    };
    if (task.status === 'downloading' || task.status === 'queued') {
      task.status = 'queued';
      task.error = '';
    }
    tasks.set(task.id, task);
    taskSeq = Math.max(taskSeq, task.id);
  }
  for (const task of [...tasks.values()].sort((a, b) => a.id - b.id)) {
    taskByKey.set(taskKey(task), task.id);
  }
  for (const task of tasks.values()) {
    if (task.status === 'queued') requeueTask(task);
  }
}

function newTask(fields) {
  const id = ++taskSeq;
  const task = {
    id, status: 'queued', progress: 0, received: 0, total: 0,
    error: '', filePath: '', speed: 0, createdAt: Date.now(), startedAt: 0, finishedAt: 0,
    generation: 0, currentReq: null, _activePromise: null,
    ...fields,
  };
  tasks.set(id, task);
  taskByKey.set(taskKey(task), id);
  schedulePersist();
  return task;
}

// 单次 /api/tasks 返回的明细条数上限（统计仍按全量计算）
const MAX_TASKS_IN_LIST = 2000;

// 让正在进行的请求可以被“全部停止”打断。
// 必须带 Error 调用 destroy，否则 IncomingMessage 只发 close 不发 error，
// 下载 Promise 永远不会 settle，activeCount 会泄漏导致队列卡死。
function abortTask(task) {
  task.status = 'cancelled';
  task.error = '';
  task.generation = (task.generation || 0) + 1;
  if (task.currentReq) {
    try { task.currentReq.destroy(new Error('任务已停止')); } catch (_) {}
    task.currentReq = null;
  }
  schedulePersist();
}

function markTaskDone(task, filePath, size) {
  task.progress = 100;
  task.status = 'done';
  task.error = '';
  task.filePath = filePath;
  task.received = size;
  task.total = size;
  task.size = size;
  task.speed = 0;
  task.finishedAt = Date.now();
  schedulePersist();
}

function resetPartialError(message) {
  const error = new Error(message);
  error.resetPartial = true;
  return error;
}

async function downloadOnce(task, audioUrl, destDir, fileName, generation) {
  if (!isTaskJobCurrent(task, generation)) return;
  if (!fs.existsSync(destDir)) fs.mkdirSync(destDir, { recursive: true });
  const ext = /\.mp3(\?|$)/i.test(audioUrl) ? '.mp3' : '.m4a';
  const filePath = path.join(destDir, sanitizeName(fileName) + ext);
  const partPath = filePath + '.part';
  task.filePath = filePath;
  task.partPath = partPath;

  if (fs.existsSync(filePath)) {
    const size = fs.statSync(filePath).size;
    if (size > 0) {
      if (fs.existsSync(partPath)) {
        try { fs.unlinkSync(partPath); } catch (_) {}
      }
      markTaskDone(task, filePath, size);
      return;
    }
  }
  if (fs.existsSync(filePath) && fs.statSync(filePath).size === 0) fs.unlinkSync(filePath);

  let resumeFrom = fs.existsSync(partPath) ? fs.statSync(partPath).size : 0;
  const r = await cdnRequest(audioUrl, 'GET', resumeFrom > 0 ? { Range: `bytes=${resumeFrom}-` } : null);
  if (!isTaskJobCurrent(task, generation)) {
    r.resume();
    return;
  }
  task.currentReq = r;
  try {
    if (r.statusCode === 416 && resumeFrom > 0) {
      const match = /bytes \*\/(\d+)/.exec(r.headers['content-range'] || '');
      r.resume();
      if (match && Number(match[1]) === resumeFrom) {
        fs.renameSync(partPath, filePath);
        markTaskDone(task, filePath, resumeFrom);
        return;
      }
    }

    if (![200, 206].includes(r.statusCode)) {
      r.resume();
      const body = await new Promise((resolve) => {
        let buf = '';
        r.on('data', (c) => { if (buf.length < 500) buf += c.toString('utf8'); });
        r.on('end', () => resolve(buf));
        r.on('error', () => resolve(buf));
        const timer = setTimeout(() => resolve(buf), 3000);
        if (timer.unref) timer.unref();
      });
      if (r.statusCode === 404) {
        if (/NoSuchKey|The specified key does not exist/i.test(body)) {
          throw new Error('该集在源站缺失（CDN 无此文件）');
        }
        throw new Error('CDN 返回 404');
      }
      if (r.statusCode === 403) throw new Error('CDN 返回 403（拒绝访问）');
      throw new Error(`CDN 返回 ${r.statusCode}`);
    }

    let append = false;
    let total = parseInt(r.headers['content-length'] || '0', 10);
    if (resumeFrom > 0 && r.statusCode === 206) {
      const range = /^bytes (\d+)-(\d+)\/(\d+|\*)$/.exec(r.headers['content-range'] || '');
      if (!range || Number(range[1]) !== resumeFrom) {
        r.resume();
        throw resetPartialError('CDN 返回了不匹配的续传范围，将重新下载');
      }
      append = true;
      total = range[3] === '*' ? resumeFrom + total : Number(range[3]);
    } else {
      if (r.statusCode !== 200) {
        r.resume();
        throw resetPartialError('CDN 未按预期响应，将重新下载');
      }
      resumeFrom = 0;
    }

    task.total = total;
    task.status = 'downloading';
    task.startedAt = task.startedAt || Date.now();
    task.received = resumeFrom;
    task.progress = total ? Math.min(99, Math.round(resumeFrom / total * 100)) : 0;
    task.error = '';
    schedulePersist();

    const remaining = Math.max(0, total - resumeFrom);
    const free = getFreeSpaceBytes(destDir);
    if (free != null && remaining > 0 && free < remaining) {
      r.resume();
      throw new Error(`磁盘空间不足（可用 ${(free / 1048576).toFixed(0)} MB，需要 ${(remaining / 1048576).toFixed(0)} MB）`);
    }

    const hash = crypto.createHash('md5');
    let lastTick = Date.now();
    let lastBytes = resumeFrom;
    const meter = new Transform({
      transform(chunk, _encoding, callback) {
        if (!isTaskJobCurrent(task, generation)) return callback(new Error('任务已停止'));
        throttleBytes(chunk.length).then(() => {
          if (!isTaskJobCurrent(task, generation)) return callback(new Error('任务已停止'));
          task.received += chunk.length;
          if (!append) hash.update(chunk);
          if (total) task.progress = Math.min(99, Math.round(task.received / total * 100));
          const now = Date.now();
          if (now - lastTick >= 500) {
            task.speed = Math.round((task.received - lastBytes) / ((now - lastTick) / 1000));
            lastTick = now;
            lastBytes = task.received;
            schedulePersist();
          }
          callback(null, chunk);
        }).catch(callback);
      },
    });
    const ws = fs.createWriteStream(partPath, { flags: append ? 'a' : 'w' });
    await pipelineAsync(r, meter, ws);
    if (!isTaskJobCurrent(task, generation)) return;
    if (total > 0 && task.received !== total) {
      throw resetPartialError(`文件长度校验失败（${task.received}/${total}），将重新下载`);
    }
    const expectedMd5 = String(r.headers['x-cos-meta-md5'] || '').trim();
    if (!append && /^[a-f0-9]{32}$/i.test(expectedMd5)) {
      const actualMd5 = hash.digest('hex');
      if (actualMd5.toLowerCase() !== expectedMd5.toLowerCase()) {
        throw resetPartialError('文件 MD5 校验失败，将重新下载');
      }
    }
    fs.renameSync(partPath, filePath);
    markTaskDone(task, filePath, task.received);
  } finally {
    if (task.currentReq === r) task.currentReq = null;
  }
}

async function runDownload(task, audioUrl, destDir, fileName, generation) {
  let lastErr = null;
  for (let attempt = 0; attempt <= settings.maxRetries; attempt++) {
    if (!isTaskJobCurrent(task, generation)) return;
    try {
      await downloadOnce(task, audioUrl, destDir, fileName, generation);
      return;
    } catch (e) {
      lastErr = e;
      if (!isTaskJobCurrent(task, generation)) return;
      if (e.resetPartial && task.partPath) {
        try { fs.unlinkSync(task.partPath); } catch (_) {}
      }
      if (/源站缺失|403|磁盘空间/.test(e.message)) break;
      if (attempt < settings.maxRetries) {
        task.status = 'queued';
        task.error = `重试中 (${attempt + 1}/${settings.maxRetries})`;
        schedulePersist();
        await new Promise((resolve) => setTimeout(resolve, settings.retryBaseMs * Math.pow(2, attempt)));
      }
    }
  }
  if (!isTaskJobCurrent(task, generation)) return;
  task.status = 'error';
  task.error = lastErr ? lastErr.message : 'unknown error';
  task.finishedAt = Date.now();
  schedulePersist();
}

// 下载队列：并发数与计划开始时间均可配置
let activeCount = 0;
const queue = [];
let queueTimer = null;
let queueTimerAt = 0;

function enqueue(job) { queue.push(job); pumpQueue(); }

async function pumpQueue() {
  const startAt = settings.startAt ? new Date(settings.startAt).getTime() : 0;
  const wait = startAt ? startAt - Date.now() : 0;
  if (wait > 0) {
    const target = Date.now() + wait;
    if (queueTimer && queueTimerAt !== target) {
      clearTimeout(queueTimer);
      queueTimer = null;
      queueTimerAt = 0;
    }
    if (!queueTimer) {
      queueTimerAt = target;
      queueTimer = setTimeout(() => { queueTimer = null; queueTimerAt = 0; pumpQueue(); }, Math.min(wait, 2147483647));
      if (queueTimer.unref) queueTimer.unref();
    }
    return;
  }
  if (queueTimer) {
    clearTimeout(queueTimer);
    queueTimer = null;
    queueTimerAt = 0;
  }
  while (activeCount < settings.concurrency && queue.length) {
    const job = queue.shift();
    activeCount++;
    (async () => {
      try { await job(); } catch (_) { /* task 内部已记录错误 */ }
      finally {
        activeCount--;
        schedulePersist();
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
  const generation = (task.generation || 0) + 1;
  task.generation = generation;
  const job = async () => {
    if (!isTaskJobCurrent(task, generation)) return;
    if (task._activePromise) {
      try { await task._activePromise; } catch (_) {}
    }
    if (!isTaskJobCurrent(task, generation)) return;
    const run = (async () => {
      try {
        if (task.cover) {
          ensureAlbumCover(task.cover, task.destDir).catch((error) => {
            console.log(`[cover] ${task.albumTitle || task.albumId}: ${error.message}`);
          });
        }
        const audioUrl = await resolveEpisodeAudio(task.albumId, task.index, task.line || 0);
        if (!isTaskJobCurrent(task, generation)) return;
        await runDownload(task, audioUrl, task.destDir, task.baseName, generation);
      } catch (e) {
        if (isTaskJobCurrent(task, generation)) {
          task.status = 'error';
          task.error = e.message;
          task.finishedAt = Date.now();
        }
      }
    })();
    task._activePromise = run;
    try {
      await run;
    } finally {
      if (task._activePromise === run) task._activePromise = null;
      schedulePersist();
    }
  };
  enqueue(job);
  schedulePersist();
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

function isPathInside(root, target) {
  const relative = path.relative(path.resolve(root), path.resolve(target));
  return !!relative && relative !== '..' && !relative.startsWith('..' + path.sep) && !path.isAbsolute(relative);
}

function isManagedFile(filePath) {
  const roots = [settings.downloadRoot];
  for (const task of tasks.values()) if (task.destDir) roots.push(task.destDir);
  return roots.some((root) => root && isPathInside(root, filePath));
}

async function scanLibrary(root, query) {
  const items = [];
  const needle = String(query || '').trim().toLowerCase();
  let truncated = false;
  async function walk(dir, depth, inheritedCover) {
    if (items.length >= 5000 || depth > 5) {
      truncated = true;
      return;
    }
    let entries;
    try {
      entries = await fs.promises.readdir(dir, { withFileTypes: true });
    } catch (_) {
      return;
    }
    const coverEntry = entries.find((entry) => entry.isFile() && /^(cover|folder)\.(jpe?g|png|webp|gif)$/i.test(entry.name));
    const currentCover = coverEntry ? path.join(dir, coverEntry.name) : (inheritedCover || '');
    for (const entry of entries) {
      if (entry.name.startsWith('.')) continue;
      const full = path.join(dir, entry.name);
      if (entry.isDirectory()) {
        await walk(full, depth + 1, currentCover);
        continue;
      }
      if (!entry.isFile() || !/\.(m4a|mp3)$/i.test(entry.name)) continue;
      if (needle && !full.toLowerCase().includes(needle)) continue;
      try {
        const stat = await fs.promises.stat(full);
        items.push({
          path: full,
          name: entry.name,
          album: path.basename(path.dirname(full)),
          relativePath: path.relative(root, full),
          cover: currentCover,
          size: stat.size,
          mtime: stat.mtimeMs,
        });
      } catch (_) {}
      if (items.length >= 5000) {
        truncated = true;
        break;
      }
    }
  }
  await walk(root, 0, '');
  items.sort((a, b) => b.mtime - a.mtime);
  return { items, total: items.length, truncated };
}

function execFileText(command, args, options) {
  return new Promise((resolve, reject) => {
    execFile(command, args, { timeout: 15000, windowsHide: true, encoding: 'utf8', ...(options || {}) }, (error, stdout) => {
      if (error) reject(error);
      else resolve(String(stdout || '').trim());
    });
  });
}

async function openFileCrossPlatform(filePath) {
  if (process.platform === 'win32') {
    return runPowerShell(`Start-Process -FilePath '${filePath.replace(/'/g, "''")}'`);
  }
  if (process.platform === 'darwin') return execFileText('open', [filePath]);
  return execFileText('xdg-open', [filePath]);
}

async function revealFileCrossPlatform(filePath) {
  if (process.platform === 'win32') {
    return runPowerShell(`Start-Process explorer.exe -ArgumentList '/select,"${filePath.replace(/'/g, "''")}"'`);
  }
  if (process.platform === 'darwin') return execFileText('open', ['-R', filePath]);
  return execFileText('xdg-open', [path.dirname(filePath)]);
}

async function chooseFolderNonWindows() {
  if (process.platform === 'darwin') {
    try {
      return await execFileText('osascript', ['-e', 'POSIX path of (choose folder with prompt "选择保存目录")']);
    } catch (error) {
      if (/User canceled|用户已取消|(-128)/.test(error.message)) return '';
      throw error;
    }
  }
  try {
    return await execFileText('zenity', ['--file-selection', '--directory', '--title=选择保存目录']);
  } catch (firstError) {
    try {
      return await execFileText('kdialog', ['--getexistingdirectory', os.homedir()]);
    } catch (_) {
      throw new Error('无法打开系统目录选择框，请手动输入路径');
    }
  }
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
    // --- 下载策略与运行状态 ---
    if (p === '/api/settings') {
      if (req.method === 'POST') {
        const body = await readJsonBody(req);
        const previousLimit = settings.speedLimitBps;
        const previousProxyAddress = settings.proxyAddress;
        const previousUseProxy = settings.useProxy;
        Object.assign(settings, normalizeSettings({ ...settings, ...body }));
        if (previousLimit !== settings.speedLimitBps) nextBandwidthAt = 0;
        if (previousProxyAddress !== settings.proxyAddress || previousUseProxy !== settings.useProxy) cachedProxies = undefined;
        schedulePersist();
        pumpQueue();
      }
      return sendJson(res, 200, {
        settings: { ...settings },
        platform: process.platform,
        dataDir: DATA_DIR,
        activeCount,
        queuedCount: queue.length,
      });
    }

    // --- 代理与直连连通性诊断（仅用户主动触发） ---
    if (p === '/api/proxy-test') {
      const proxies = await getSiteProxies();
      async function probe(label, request) {
        const started = Date.now();
        try {
          const response = await request();
          return {
            label, status: response.statusCode, ok: response.statusCode < 500,
            elapsedMs: Date.now() - started,
          };
        } catch (error) {
          return { label, ok: false, error: error.message, elapsedMs: Date.now() - started };
        }
      }
      const jobs = proxies.map((proxy) => () => probe(
        `代理 ${proxy.host}:${proxy.port}`,
        () => proxyRequest(SITE + '/', {}, proxy),
      ));
      jobs.push(() => probe('直连', () => directRequest(SITE + '/', {})));
      const results = [];
      for (const job of jobs) results.push(await job());
      return sendJson(res, 200, { results });
    }

    // --- 全站专辑关键词搜索（RSS 索引，不使用需要验证码的 search.php） ---
    if (p === '/api/site-covers') {
      return sendJson(res, 200, { covers: await getSiteCovers(query.ids) });
    }

    if (p === '/api/site-search') {
      return sendJson(res, 200, await searchSiteAlbums(query.q));
    }

    // --- 本地专辑索引与搜索历史 ---
    if (p === '/api/search') {
      const q = String(query.q || '').trim();
      if (q) {
        searchHistory = [q, ...searchHistory.filter((item) => item !== q)].slice(0, 20);
        schedulePersist();
      }
      const needle = q.toLowerCase();
      const matched = [...albumIndex.values()].filter((item) => {
        if (!needle) return true;
        return [item.id, item.title, item.author, item.narrator, item.desc]
          .some((value) => String(value || '').toLowerCase().includes(needle));
      }).sort((a, b) => (b.indexedAt || 0) - (a.indexedAt || 0));
      return sendJson(res, 200, {
        items: matched.slice(0, 100), total: matched.length,
        indexed: albumIndex.size, history: searchHistory,
      });
    }

    // --- 受管目录内的本地封面 ---
    if (p === '/api/library-cover') {
      const filePath = resolveUserPath(query.path || '');
      if (!filePath || !isManagedFile(filePath) || !/\.(jpe?g|png|webp|gif)$/i.test(filePath)) {
        return sendJson(res, 400, { error: '无效封面路径' });
      }
      if (!fs.existsSync(filePath) || !fs.statSync(filePath).isFile()) {
        return sendJson(res, 404, { error: '封面不存在' });
      }
      const ext = path.extname(filePath).toLowerCase();
      const mime = ext === '.png' ? 'image/png' : ext === '.webp' ? 'image/webp'
        : ext === '.gif' ? 'image/gif' : 'image/jpeg';
      res.writeHead(200, { 'Content-Type': mime, 'Cache-Control': 'private, max-age=3600' });
      return fs.createReadStream(filePath).on('error', () => res.destroy()).pipe(res);
    }

    // --- 本地音频媒体库 ---
    if (p === '/api/library') {
      const root = resolveUserPath(query.path || settings.downloadRoot);
      if (!root || !fs.existsSync(root) || !fs.statSync(root).isDirectory()) {
        return sendJson(res, 400, { error: '媒体库目录不存在' });
      }
      settings.downloadRoot = root;
      schedulePersist();
      const result = await scanLibrary(root, query.q);
      return sendJson(res, 200, { ...result, root });
    }

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
        settings.downloadRoot = savePath;
        const from = query.from != null ? parseInt(query.from, 10) : 0;
        const to = query.to != null ? parseInt(query.to, 10) : album.chapters.length - 1;
        const selected = query.indexes
          ? new Set(String(query.indexes).split(',').map((n) => parseInt(n, 10)).filter(Number.isFinite))
          : null;
        let created = 0;
        for (const ch of album.chapters) {
          if (selected && !selected.has(ch.index)) continue;
          if (ch.index < from || ch.index > to) continue;
          const line = parseInt(ch.line, 10) || 0;
          const key = taskKey({ albumId: id, index: ch.index, line, destDir: dir });
          const existing = taskByKey.get(key);
          const old = existing && tasks.get(existing);
          if (old) {
            if (['queued', 'downloading'].includes(old.status)
              || (old.status === 'done' && old.filePath && fs.existsSync(old.filePath))) continue;
            old.status = 'queued';
            old.error = '';
            old.progress = 0;
            old.received = 0;
            old.speed = 0;
            old.startedAt = 0;
            old.finishedAt = 0;
            old.cover = album.cover || old.cover || '';
            requeueTask(old);
            created++;
            continue;
          }
          const fileName = `${String(ch.index + 1).padStart(4, '0')} ${ch.title}`;
          const task = newTask({
            albumId: id, albumTitle: album.title, index: ch.index,
            chapterTitle: ch.title, fileName,
            line,
            destDir: dir, baseName: fileName, cover: album.cover || '',
          });
          created++;
          requeueTask(task);
        }
        schedulePersist();
        return sendJson(res, 200, { queued: created, albumTitle: album.title, dir });
      }

      // 单集
      const index = parseInt(query.index, 10);
      const line = parseInt(query.line, 10) || 0;
      const chapterTitle = query.title || `第${index + 1}集`;
      if (isNaN(index)) return sendJson(res, 400, { error: '缺少集序号' });
      const albumTitle = query.album || id;
      const dir = path.join(savePath, sanitizeName(albumTitle));
      settings.downloadRoot = savePath;
      const key = taskKey({ albumId: id, index, line, destDir: dir });
      const existingId = taskByKey.get(key);
      const old = existingId && tasks.get(existingId);
      if (old) {
        if (!['queued', 'downloading'].includes(old.status)
          && !(old.status === 'done' && old.filePath && fs.existsSync(old.filePath))) {
          old.status = 'queued';
          old.error = '';
          old.progress = 0;
          old.received = 0;
          old.speed = 0;
          old.startedAt = 0;
          old.finishedAt = 0;
          old.cover = query.cover || old.cover || '';
          requeueTask(old);
        }
        return sendJson(res, 200, { taskId: old.id, reused: true });
      }
      const fileName = `${String(index + 1).padStart(4, '0')} ${chapterTitle}`;
      const task = newTask({
        albumId: id, albumTitle: albumTitle, index,
        chapterTitle, fileName,
        line, destDir: dir, baseName: fileName, cover: query.cover || '',
      });
      requeueTask(task);
      schedulePersist();
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
      t.startedAt = 0;
      t.finishedAt = 0;
      requeueTask(t);
      return sendJson(res, 200, { success: true });
    }

    // --- 清理任务：finished 兼容旧调用；done/error/all 供精确清理 ---
    if (p === '/api/clear-tasks') {
      const scope = String(query.scope || 'finished');
      if (!['finished', 'done', 'error', 'all'].includes(scope)) {
        return sendJson(res, 400, { error: '无效清理范围' });
      }
      const stopped = scope === 'all' ? stopAllTasks() : 0;
      let removed = 0;
      for (const [id, t] of [...tasks]) {
        const matched = scope === 'all'
          || (scope === 'done' && t.status === 'done')
          || (scope === 'error' && t.status === 'error')
          || (scope === 'finished' && t.status !== 'downloading' && t.status !== 'queued');
        if (!matched) continue;
        tasks.delete(id);
        const key = taskKey(t);
        if (taskByKey.get(key) === id) taskByKey.delete(key);
        removed++;
      }
      schedulePersist();
      return sendJson(res, 200, { success: true, removed, stopped });
    }

    // --- 文件系统操作 ---
    // 注意：系统对话框会阻塞到用户选择为止，必须用异步 execFile。
    // 若用 execSync，整个 Node 事件循环会被冻结，页面轮询全部停摆，
    // 看起来就像“点了没反应”。
    if (p === '/api/browse-folder') {
      if (process.platform !== 'win32') {
        const result = await chooseFolderNonWindows();
        return sendJson(res, 200, { path: result || null });
      }
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
      await openFileCrossPlatform(filePath);
      return sendJson(res, 200, { success: true });
    }

    if (p === '/api/reveal-file') {
      const filePath = resolveUserPath(query.path || '');
      if (!filePath || !fs.existsSync(filePath)) return sendJson(res, 404, { error: '文件不存在' });
      await revealFileCrossPlatform(filePath);
      return sendJson(res, 200, { success: true });
    }

    if (p === '/api/delete-file') {
      const filePath = resolveUserPath(query.path || '');
      if (!filePath || !fs.existsSync(filePath)) return sendJson(res, 404, { error: '文件不存在' });
      if (!isManagedFile(filePath)) return sendJson(res, 403, { error: '只能删除下载目录或任务登记目录中的文件' });
      fs.unlinkSync(filePath);
      schedulePersist();
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
    if (process.platform !== 'win32') {
      console.error(`Port ${PORT} is already in use. Set QMTSW_PORT to use another port.`);
      process.exit(1);
    }
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

loadPersistedState();
process.on('SIGINT', () => { persistState(); process.exit(0); });
process.on('SIGTERM', () => { persistState(); process.exit(0); });

server.listen(PORT, '127.0.0.1', () => {
  console.log(`Server running at http://localhost:${PORT}`);
  console.log('Source: https://www.qmtsw.com');
  console.log('Audio CDN access: IP + Host header, SNI disabled');
  getSiteProxies().catch(() => {});
});
