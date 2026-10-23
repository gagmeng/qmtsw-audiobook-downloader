# 全民听书网下载器（Web 版）

参照 `China-Engineering-Standard-Downloader/web-downloader` 的框架与 UI 设计实现，用于浏览并下载 [全民听书网](https://www.qmtsw.com) 的有声书音频。

## 启动

双击 `start.bat`，或：

```bash
node server.js
```

macOS / Linux 可运行 `sh start.sh`（或 `npm run start:posix`）。可通过
`QMTSW_PORT` 修改端口，`QMTSW_DATA_DIR` 修改任务与索引的持久化目录，
POSIX 启动时可用 `QMTSW_NO_BROWSER=1` 禁止自动打开浏览器。

浏览器打开 http://localhost:3211

无需 `npm install`，没有第三方依赖。

### 站点访问代理

Node 的 `http`/`https` 不读取 `HTTP(S)_PROXY`，也不读 Windows 系统代理，因此本服务自行处理代理。设置页可开关代理并编辑首选地址（默认 `127.0.0.1:7890`）；`QMTSW_PROXY` 设为 `none` / `off` / `direct` 时会强制直连。候选优先级为：

1. 设置页保存的代理地址
2. 环境变量 `QMTSW_PROXY`
3. 环境变量 `HTTPS_PROXY` / `HTTP_PROXY`
4. Windows 注册表里的系统代理（含 `分号分隔的 http=…;https=…` 形式）

代理只用于站点页面请求；音频 CDN 仍按 IP + `Host` 头直连，不受代理影响。若代理连不上，会自动回退直连。

之所以需要代理：部分网络直连 `www.qmtsw.com` 时，Cloudflare 会把请求调度到 AMS/LAX 等海外节点，而这些节点回源失败返回 520；经代理落到 NRT 等节点则正常。浏览器能打开、本程序却报 520，就是这个原因。

## 功能

- **分类浏览**：24 个分类（玄幻、言情、都市、评书、相声小品…），支持翻页与跳页，每页条数可选（10/20/40/80/120，默认 20，一行 5 个共 4 行）
- **专辑直达**：输入专辑 ID（如 `21170`）或完整链接，也可用 `?album=21170` 直接打开
- **专辑详情**：封面、作者、播音、状态、简介、完整章节列表
- **单集下载**：章节列表逐集下载，实时显示进度
- **整本下载**：一键下载全部章节，或指定集数范围（从第 X 集到第 Y 集）
- **下载管理**：任务队列（3 路并发）、进度条、速度、单个/全部重试、全部停止、打开文件 / 定位文件夹
- **收藏**：收藏专辑，随时回来下载
- **设置**：保存路径、刷新间隔、主题、语言
- **可靠续传**：任务与配置持久化，`.part` 断点续传，长度 / MD5 校验后原子改名，下载时自动保存专辑封面
- **批量章节**：复选、全选、反选、仅选未完成，支持失败 / 源站缺失清单导出
- **收藏更新**：手动或定时检查新章节，可自动下载新增部分
- **本地媒体库**：按专辑卡片展示封面与章节，支持搜索、打开、定位或在受管目录内删除
- **本地搜索**：搜索浏览 / 打开过的专辑索引与搜索历史
- **下载策略**：可调并发、总限速、重试次数与退避、计划开始时间，支持代理开关、地址配置与诊断
- **跨平台**：Windows / macOS / Linux 的目录选择、打开文件与定位适配
- **五套主题**：浅色 / 深色 / 海洋蓝 / 玫瑰金 / 森林绿
- **中英双语**

## 技术要点

站点页面本身可直连访问，真正的难点在音频 CDN：

1. **SNI 阻断**：`xmcdn.com` 域名在 TLS 握手阶段被重置。解法是连节点 IP、`servername: ''` 置空 SNI、用 `Host` 头指明域名。
2. **TLS 1.3 限速**：CDN 对 TLS 1.3 连接限速到约 50 KB/s，强制 `TLSv1.2` 后可达 9 MB/s 以上。
3. **地址解析**：每集播放页 `<script>` 里的 `now` 变量即音频直链，两种形态并存（`fdfs.xmcdn.com/groupNN/...` 与 `aod.cos.tx.xmcdn.com/storages/...`），部分旧页面还是 URL 编码串，需要先解码。

下载全程在服务端完成，浏览器只轮询任务状态，因此不受 CORS 限制。

## API

| 接口 | 说明 |
|---|---|
| `GET /api/categories` | 分类列表 |
| `GET /api/category?cat=1&page=1&perPage=20` | 分类分页（`perPage` 为每页条数，默认 20，范围 5–200） |
| `GET /api/album?id=21170` | 专辑详情与章节 |
| `GET /api/resolve?id=21170&index=1` | 解析单集音频直链 |
| `GET /api/download?id=21170&index=1&title=...&album=...&path=...` | 下载单集 |
| `GET /api/download?id=21170&mode=album&from=0&to=10&path=...` | 整本 / 范围下载 |
| `GET /api/tasks` | 任务列表与统计（明细最多 2000 条，统计按全量计算） |
| `GET /api/cancel?id=1` | 取消单个任务（排队中或下载中） |
| `GET /api/stop-all` | 停止全部任务并清空队列 |
| `GET /api/retry?id=1` | 重试单个失败/取消的任务 |
| `GET /api/retry-all` | 重试全部失败/取消的任务（跳过源站缺失的集） |
| `GET /api/clear-tasks` | 清理已完成 / 失败任务 |
| `GET /api/browse-folder` | 打开系统文件夹选择框 |
| `GET /api/disk-space?path=...` | 磁盘剩余空间 |
| `GET /api/open-file?path=...` | 用默认程序打开文件 |
| `GET /api/reveal-file?path=...` | 在资源管理器中定位文件 |
| `GET /api/delete-file?path=...` | 删除文件 |
| `GET /api/cover?url=...` | 封面代理 |
| `GET /api/library-cover?path=...` | 读取受管目录内的本地专辑封面 |
| `GET/POST /api/settings` | 读取 / 保存下载策略与下载根目录 |
| `GET /api/proxy-test` | 主动测试各代理出口与直连 |
| `GET /api/search?q=...` | 搜索本地专辑索引与历史 |
| `GET /api/library?path=...&q=...` | 扫描并筛选本地音频媒体库 |

## 已知限制

- 站点在线搜索（`/search.php`）需要验证码，因此未直接接入；本地搜索只覆盖已浏览 / 打开的专辑索引。
- 部分集数在 CDN 源头就不存在（`21170` 前 40 集中有 20 集如此，且集中在连续区间），不是抓取方式的问题。这类任务标记为「该集在源站缺失（CDN 无此文件）」，不重试，「全部重试」时也会跳过。详细排查过程见 `../全民听书网.md`。
- 页面编码历史上从 GBK 变为 UTF-8，当前站点已是 UTF-8。
- 站点经过 Cloudflare，某些边缘节点（如 AMS/LAX）回源失败会返回 520/521/522。服务端会自动重试 3 次（800/2000/4500ms）；若仍失败，请确认代理配置——直连失败而浏览器正常，几乎都是这个原因。

## 目录结构

```
qmtsw-audiobook-downloader/
├── server.js          # HTTP 服务、站点解析、CDN 下载、任务队列
├── package.json
├── start.bat
├── start.sh
└── public/
    ├── index.html     # 界面结构
    ├── styles.css     # 主题与样式
    ├── app.js         # 前端逻辑
    └── favicon.svg
```
