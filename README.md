# nanxgodqaq.vercel.app

个人主页，基于 Vue 3 + Vite 构建，部署于 Vercel。

## 功能模块

- **音乐播放器** — 嵌入式 MiniPlayer：10 首背景音乐 + 可折叠播放列表，支持**本地上传 mp3**
  （blob URL 播放，只在浏览器内存里，刷新即失效，不落任何服务器）
- **资讯交互** — 单击条目展开全文摘要，双击打开原文链接（`touch-action: manipulation` 防移动端误触缩放）
- **图集** — CSS Columns 瀑布流布局，分类浏览，支持灯箱预览
- **Bing 搜索** — 装饰性搜索框（小猫 + 草地），回车跳转搜索
- **磁吸时钟** — hover 光晕追踪光标，数字发光
- **天气插件** — Open-Meteo 实况天气，场景背景图随天气切换，含 24 小时 / 7 天预报、空气质量与穿衣建议
- **资讯插件** — 每日 10 条精编资讯（Tavily 检索 + DeepSeek 提炼），按 AI / 政军 / 热点 / 生活分类
- **海蜇音乐项目卡** — 展示开源项目截图与链接
- **打字机效果** — 首页打字动画
- **流星背景 + 粒子** — 动态视觉氛围

## 首页布局

首屏按三排铺开，越靠上越是"想让人第一眼看到"的内容：

| 排 | 左 | 右 | 说明 |
|---|---|---|---|
| 1 | MiniPlayer | 标题+打字机 / 搜索框 / 时钟 | 四个模块一行，`justify-content: space-between` |
| 2 | 天气面板（flex 1.2） | 今日资讯·双栏（flex 1.3） | 桌面行高锁 510px，两卡严格等高 |
| 3 | 海蜇音乐卡（2/6） | 图集瀑布流（4/6） | 图集与海蜇同高 |

这么排是为了**首屏一眼看到三排内容**：第 1 排是身份与入口，第 2 排是每天在变的
天气与资讯，第 3 排只露出上半部分，提示"下面还有图"。

第 2 排的行高是**量出来的**，不是拍出来的：`scripts/verify-layout.cjs` 会打印两张卡的
"自然内容高度"（天气 481 / 资讯主体 431），行高取其上限再加一点余量。
所以改了卡内留白后要重新量一遍——`scrollHeight` 在"内容比容器矮"时等于 `clientHeight`，
问不出真实内容高度，必须把子元素高度加起来算（脚本里的 `自然高` 就是干这个的）。

资讯卡内部固定**两栏**（左 AI + 生活、右 政军 + 热点，正好各 5 条），
≤720px 折成单栏并回到类目自然顺序。

## 技术栈

| 层 | 技术 |
|---|---|
| 框架 | Vue 3 (Composition API) |
| 构建 | Vite |
| 部署 | Vercel (自动从 main 分支部署) |
| 样式 | 纯 CSS (CSS Variables, Glassmorphism) |
| 动效 | CSS Animations & Transitions |

## 目录结构（主要部分）

```
api/news.js            资讯接口（Vercel Serverless Function）
api/weather.js         天气接口（Vercel Serverless Function）
server/news-core.js    资讯生成核心（线上 Function 与本地 dev 中间件共用）
server/weather-core.js 天气上游抓取（同上，共用一份）
shared/weather.js      天气纯逻辑：编码映射 / 归一化（服务端与前端兜底共用）
vite-plugin-news.js    本地 dev 接管 /api/news
vite-plugin-weather.js 本地 dev 接管 /api/weather
src/utils/             weather.js / news.js —— 前端数据层
src/components/        WeatherCard.vue / NewsCard.vue —— 首页两个插件
public/images/news-bg.webp  资讯卡背景（由 scripts/make-news-bg.js 生成，见该文件头的说明）
scripts/               图片优化、天气插图迁移、背景图生成、缓存策略校验、布局回归
```

## 两处部署的差异（GitHub Pages vs Vercel）

同一个仓库会同时产出两个站点，但**它们不等价**：

| | Vercel (`nanxgodqaq.vercel.app`) | GitHub Pages (`nanxingod.github.io`) |
|---|---|---|
| 构建方式 | Vercel 服务器 `npm run build` | GitHub Actions 跑 `npm run build` 上传 `dist/` |
| 静态资源 | ✅ 同一份 | ✅ 同一份 |
| 自有 `/api/news`、`/api/weather` | ✅ Serverless Function | ❌ 没有 `/api` |
| 边缘缓存 / Cron | ✅ | ❌ |
| 密钥 | 存在 Vercel 环境变量里 | 无处安放（纯静态，不能进前端） |
| 资讯卡 | 正常 | **跨域借 Vercel 的边缘缓存**，一样是每天一份、全站共享 |
| 天气卡 | 走自有接口 + 全站共享缓存 | 同上；两条链路都不通时才回退浏览器直连 Open-Meteo |

也就是说：**Vercel 是完整版，GitHub Pages 是"静态前端 + 借用 Vercel 的后端"**。
缓存只发生在 Vercel 的边缘节点和浏览器里，GitHub 仓库本身不存任何运行时数据。

### 静态站怎么蹭到共享缓存

纯静态托管没有 `/api`，但这两个接口返回的都是公开只读数据（不含 Key、不含用户信息），
所以直接开放了 CORS 让静态站跨域读，见 `server/cors.js`：

- `Access-Control-Allow-Origin: *`，且**不按 Origin 切分缓存**（否则 CDN 会按来源各存一份，白白多跑 Function）
- 但 `?force=1` 会真的烧 Tavily + DeepSeek 额度，所以它单做来源白名单：
  只有自家站点（`*.github.io` / `*.vercel.app` / 本机）发起的强制刷新才认

前端侧的地址解析在 `src/utils/api.js`，候选链为"同源 → Vercel 部署"，并带两点节制：

- 同源确认过 404 之后就不再探（`nx.apiSame`），省掉每次访问的一个白挨的 404
- 远端连不上会记进 `nx.apiRemote`，6 小时内不再尝试，避免每次访问都白等一次超时

两条链路都不通时：天气回退浏览器直连 Open-Meteo（仍可用）；
资讯展示"此站点无法提供资讯"并引导去 Vercel 站点（密钥不能进前端，静态站无法自行生成）。

## 天气与资讯的缓存策略

这两个插件都会访问外部服务，所以"多个访客访问会不会重复消耗"是设计时最先要解决的问题。
结论：**资讯全站每天最多真正生成一次，天气全站每 30 分钟最多真正抓取一次**，与访客数量无关。

### 为什么能共享

关键性质：**命中 Vercel Edge Network 缓存的请求根本不会执行 Serverless Function**。
所以 1000 个访客和 1 个访客，后台的消耗是一样的。

| 层 | 位置 | 作用 |
|---|---|---|
| 1 | 浏览器 localStorage | 同一浏览器一天（资讯）/ 30 分钟（天气）只发一次请求 |
| 2 | Vercel Edge Network | 全部访客共享同一份响应（`s-maxage`） |
| 3 | Function 实例内存 | 缓存未命中时的兜底，同实例热启动直接返回 |

### 资讯：按"北京时间跨日"对齐

`api/news.js` 返回的 `Cache-Control` 是
`public, max-age=60, s-maxage=<距北京时间次日 0 点的秒数>`。

- 缓存在跨日那一刻自然失效 → 新的一天第一次请求才重新生成，**不需要任何定时任务**
- 刻意**不加** `stale-while-revalidate`：它会把昨天的内容先发给用户再后台更新，
  对"每日资讯"这种内容会串味
- 客户端另有一道保护：`query_date` 与当天不符时自动补一次强制请求

`vercel.json` 里配了一个每日 Cron（`0 23 * * *` UTC = 北京 07:00–07:59）
提前预热，避免当天第一个访客等 20 秒。免费版 Hobby 支持每天一次，精度 ±59 分钟。

手点"刷新"走 `?force=1`，有 **10 分钟节流**：连点不会重复烧额度。

### 天气：30 分钟桶

前端请求 `/api/weather?lat&lon&b=<30 分钟桶>`，响应带
`public, max-age=300, s-maxage=1800`。

URL 里的 30 分钟桶让缓存键天然对齐时间窗，全部访客共用同一份，
上游 Open-Meteo 每 30 分钟最多被请求一次（该接口本身免费，但少发请求也更省也更快）。

自有接口不可用时，前端会先试跨域的 Vercel 接口（静态站借它的边缘缓存），
两条接口链路都不可用才回退直连 Open-Meteo——这样无论部署在哪，天气都可用。

### 极端情况下会"多跑一两次"

上面说的"一天一次 / 30 分钟一次"是稳态值，不是数学上的严格上限。以下情况会让后台多跑几次，
但都以"次"计，不会随访客数增长：

- **边缘节点是分布式的**：Vercel 的 CDN 缓存按区域（PoP）各存一份。北京时间刚过 0 点、
  缓存刚失效时，国内和海外访客同时进来，就可能各自触发一次生成（最多 = 命中区域数）。
- **同时并发未命中**（缓存击穿）：缓存刚过期的那一瞬间多个请求同时到达，前几个可能都在
  等同一个上游返回；这是数秒级窗口，错过就没事了。
- **Cron 预热只暖了一个区域**：`0 23 * * *` 那次预热落在执行它的区域，其它区域首次访问仍是冷启动。
- **缓存被淘汰**：边缘节点内存吃紧时会 LRU 掉一些副本，命中不到就再生成一次。
- **手点刷新**：`?force=1` 会绕过共享缓存（资讯另有 10 分钟节流防连点）。

所以最坏情况是"一天多跑两三次"或"30 分钟多跑一两次"，
和"每个访客都跑一次"完全不是一个量级。

验证这套契约：`node scripts/verify-cache.mjs`（27 项断言，含 CORS 与 force 来源白名单）

布局回归（三排结构、两卡等高、曲线与标注对齐、无溢出）：

```bash
node scripts/verify-layout.cjs            # 桌面 1600×1100
MOBILE=1 node scripts/verify-layout.cjs   # 移动 390×844
```

它会给 `/api/weather`、`/api/news` 打离线桩（避免本地跑验证时白烧额度），
并用这些开关模拟部署差异：

| 环境变量 | 作用 |
|---|---|
| `HOSTMAP=1` | 把 `nxstatic.test` 解析到本机，模拟"非 Vercel 宿主"（GitHub Pages 就是这类） |
| `STATIC_SIM=1` | 同源 `/api/*` 一律 404，只有跨域到 `vercel.app` 才拿得到数据 |
| `REMOTE_DOWN=1` | 模拟 Vercel 连不上，验证降级 |
| `CLEAR_CACHE=1` | 清空 localStorage（资讯按日缓存会掩盖"无接口"状态页） |
| `NO_NEWS_STUB=1` | 不打资讯桩（保留真实接口行为） |

> Windows 上 Edge 只能从 PowerShell 通道启动，Bash 通道会被拦；
> 日志建议 `Out-File -Encoding utf8` 落盘再看。

## 本地运行

```bash
npm install
npm run dev
```

资讯插件依赖两个密钥（Tavily 检索 + DeepSeek 提炼），放在项目根目录
`.env.local`（已在 `.gitignore` 中，不会进仓库）：

```
TAVILY_API_KEY=xxx
DEEPSEEK_API_KEY=xxx
```

本地开发由 `vite-plugin-news.js` / `vite-plugin-weather.js` 接管
`/api/news` 与 `/api/weather`；线上由 `api/` 下的 Serverless Function 处理，
同一个接口路径、同一份核心逻辑（在 `server/` 里）。

## 部署

推送 `main` 分支即可自动触发 Vercel 部署。

> **首次部署需要在 Vercel 配置环境变量**（Settings → Environment Variables）：
> `TAVILY_API_KEY`、`DEEPSEEK_API_KEY`，配置后重新部署一次即可。
> 未配置时资讯卡片会显示配置提示，天气等其他模块不受影响。

```bash
git add .
git commit -m "update"
git push origin main
```
