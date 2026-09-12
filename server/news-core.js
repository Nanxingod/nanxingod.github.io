// _news-core.js —— 今日资讯生成核心（Tavily 搜索 + DeepSeek 提炼）。
//
// 这份代码同时被两处使用：
//   1. api/news.js            → Vercel Serverless Function（线上生产环境）
//   2. vite-plugin-news.js    → 本地 dev / preview 中间件
// 两边共用同一份逻辑，避免"本地好线上坏"。
//
// Key 来源：process.env.TAVILY_API_KEY / DEEPSEEK_API_KEY
//   - 线上：Vercel 项目 Settings → Environment Variables
//   - 本地：项目根目录 .env.local（已在 .gitignore 中，绝不入库）
// 缺任一 Key 会逐级降级：Tavily+DeepSeek → 纯 Tavily 直出 → 空结果（前端给友好提示）。
//
// 配额（合计 10 条/日，AI 类最重）：
//   AI 大模型 4 / 国际政军 3 / 新闻热点 2 / 生活娱乐 1

const TAVILY_ENDPOINT = 'https://api.tavily.com/search'
const DEEPSEEK_ENDPOINT = 'https://api.deepseek.com/v1/chat/completions'

export const NEWS_QUOTAS = [
  { cat: 'ai',     n: 4, query: 'AI 人工智能 LLM 大模型 最新进展 发布' },
  { cat: 'polmil', n: 3, query: '国际 政治 军事 外交 重大事件' },
  { cat: 'hot',    n: 2, query: '新闻热点 今日 头条 关注' },
  { cat: 'life',   n: 1, query: '生活 娱乐 健康 文化' },
]

// 服务端按"北京时间"切当天。
// 注意：不能用 new Date().getFullYear() 这类本地方法 —— Vercel 的函数跑在 UTC 上，
// 那样会在北京时间 00:00–08:00 之间算成"昨天"，和 s-maxage 的跨日边界错开 8 小时。
// 这里统一显式按 UTC+8 计算，本地（GMT+8）与线上行为一致。
const BJ_OFFSET = 8 * 3600 * 1000

export function todayLocalISO(now = new Date()) {
  const d = new Date(now.getTime() + BJ_OFFSET)
  return d.getUTCFullYear() + '-' +
    String(d.getUTCMonth() + 1).padStart(2, '0') + '-' +
    String(d.getUTCDate()).padStart(2, '0')
}

// 'YYYY-MM-DD' 平移 n 天（同样不依赖本机时区）
export function shiftISODate(iso, days) {
  const [y, m, d] = iso.split('-').map(Number)
  const t = Date.UTC(y, m - 1, d) + days * 86400000
  const x = new Date(t)
  return x.getUTCFullYear() + '-' +
    String(x.getUTCMonth() + 1).padStart(2, '0') + '-' +
    String(x.getUTCDate()).padStart(2, '0')
}

const SYSTEM_PROMPT = [
  '你是资深中文新闻编辑。我会给你 4 批 Tavily 搜索结果（按"AI/政军/热点/生活"四类组织）。',
  '请按以下【严格配额】输出一条 JSON 数组：',
  '  - ai（大模型 / LLM / AI 产品与应用 / 模型发布与评测 / 融资与产业动态）：** 4 条 **，本类最重要，务必优先保证质量与时效',
  '  - polmil（国际政治与军事、外交、重大冲突）：** 3 条 **',
  '  - hot（国内外当日热点、社会关注度高的新闻）：** 2 条 **',
  '  - life（生活 / 娱乐 / 健康 / 文化）：** 1 条 **',
  '总数刚好 10 条；每条必须携带 "cat" 字段，且 cat ∈ {ai, polmil, hot, life}；严格按上面数量输出。',
  '【时效性铁律】',
  '  - 严格只选取过去 24 小时内发布的新闻（昨天到今天）。',
  '  - 若某材料没有 published_date 但明显是数周/数月前的旧闻（与今天 DATE_TODAY 对照），必须舍弃。',
  '  - 若某类配额凑不齐，请把配额让给最重要的"AI"类，绝不允许用过期/无关材料凑数。',
  '【输出要求】',
  '  1) 简体中文；标题 ≤ 28 字，必要时改写以提升事实性与可读性；',
  '  2) 每条一句话摘要 ≤ 60 字，写明 5W 之一（何时何地何人/事件+结论）；',
  '  3) 引用源用最权威的一个，填入 src；选取最贴近事实的原始链接作为 url；',
  '  4) 严禁编造未在材料中出现的人名/数字/链接；',
  '  5) 输出 JSON 数组，每条形如 {"cat":"ai","tt":"…","dd":"…","src":"…","url":"…","date":"YYYY-MM-DD"}，',
  '     前后无 markdown 围栏、注释、前后缀。',
].join('\n')

/* ---------- 1) Tavily 单类搜索 ---------- */
async function tavilySearch(query, apiKey, opts = {}) {
  // 时间窗也按北京时间算，和 dateStr / s-maxage 跨日边界保持同一套日历
  const today = opts.today || todayLocalISO()
  const yest = shiftISODate(today, -1)
  const resp = await fetch(TAVILY_ENDPOINT, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      api_key: apiKey,
      query,
      topic: 'news',
      search_depth: opts.depth || 'basic',
      max_results: opts.max || 12,
      start_date: yest,
      end_date: today,
      include_answer: false,
      include_raw_content: false,
    }),
  })
  if (!resp.ok) throw new Error('tavily http ' + resp.status)
  const data = await resp.json()
  if (data && data.error) throw new Error('tavily: ' + data.error)
  return (data.results || []).map(r => ({
    title: r.title || '',
    content: r.content || '',
    url: r.url || '',
    published_date: r.published_date || '',
    source: (() => { try { return new URL(r.url).hostname.replace(/^www\./, '') } catch (e) { return '' } })(),
  })).filter(r => r.title && r.url)
}

/* ---------- 2) DeepSeek 提炼（按配额输出 10 条） ---------- */
async function deepseekSummarize(byCat, apiKey, dateStr) {
  // env 在调用时才读：本地 dev 中间件是"先 import 模块、后加载 .env.local"，
  // 顶层读取会拿到 undefined。
  const NEWS_MODEL = process.env.NEWS_MODEL || 'deepseek-v4-flash'
  const NEWS_THINKING = process.env.NEWS_THINKING === '1'   // 默认关思考：v4-flash 思考模式会吃光 token 预算
  const MAX_MATERIAL_CHARS = Number(process.env.NEWS_MATERIAL_CHARS || 16000)
  const PER_CAT_ITEMS = Number(process.env.NEWS_PER_CAT || 8)
  const CONTENT_CLIP = Number(process.env.NEWS_CONTENT_CLIP || 400)

  const slim = {}
  for (const k of Object.keys(byCat)) {
    slim[k] = (byCat[k] || []).slice(0, PER_CAT_ITEMS).map(r => ({
      title: r.title,
      content: String(r.content || '').replace(/\s+/g, ' ').slice(0, CONTENT_CLIP),
      url: r.url,
      source: r.source,
      published_date: r.published_date,
    }))
  }
  const userMsg = '今天四批搜索材料如下（cat 已标）：\n' + JSON.stringify(slim).slice(0, MAX_MATERIAL_CHARS)
  const system = SYSTEM_PROMPT.replace('DATE_TODAY', dateStr || todayLocalISO())

  const buildBody = (withThinking) => {
    const body = {
      model: NEWS_MODEL,
      messages: [
        { role: 'system', content: system },
        { role: 'user', content: userMsg },
      ],
      temperature: 0.2,
      max_tokens: Number(process.env.NEWS_MAX_TOKENS || 4000),
    }
    if (withThinking) body.thinking = { type: NEWS_THINKING ? 'enabled' : 'disabled' }
    return body
  }
  const post = (body) => fetch(DEEPSEEK_ENDPOINT, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', Authorization: 'Bearer ' + apiKey },
    body: JSON.stringify(body),
  })

  let resp = await post(buildBody(true))
  // 老服务端不认 thinking 参数会返回 400 → 去掉该参数重试一次
  if (!resp.ok && resp.status === 400) {
    const probe = await resp.text()
    if (/thinking/i.test(probe)) {
      resp = await post(buildBody(false))
    } else {
      throw new Error('deepseek http ' + resp.status + ' ' + probe.slice(0, 200))
    }
  }
  if (!resp.ok) {
    const errBody = await resp.text()
    throw new Error('deepseek http ' + resp.status + ' ' + errBody.slice(0, 200))
  }
  const data = await resp.json()
  const content = (data.choices?.[0]?.message?.content || '').trim()
  if (!content) return []
  try {
    const cleaned = content.replace(/^```(?:json)?\s*/i, '').replace(/\s*```\s*$/i, '').trim()
    const obj = JSON.parse(cleaned)
    const arr = Array.isArray(obj) ? obj : (obj.items || obj.news || [])
    return arr.map(i => ({
      cat: String(i.cat || '').toLowerCase().trim(),
      tt: String(i.tt || i.title || '').slice(0, 60),
      dd: String(i.dd || i.summary || '').slice(0, 200),
      src: String(i.src || i.source || '').slice(0, 50),
      url: String(i.url || '').slice(0, 500),
      date: String(i.date || i.published_date || '').slice(0, 10),
    })).filter(i => i.tt)
  } catch (e) {
    console.warn('[news] JSON parse failed:', e.message, '| raw:', content.slice(0, 160))
    return []
  }
}

/* ---------- 3) 兜底：Tavily 直出 ---------- */
function fallbackFromTavily(byCat) {
  const out = []
  for (const { cat, n } of NEWS_QUOTAS) {
    const mats = byCat[cat] || []
    for (let i = 0; i < Math.min(n, mats.length); i++) {
      const r = mats[i]
      out.push({
        cat,
        tt: r.title,
        dd: (r.content || '').replace(/\s+/g, ' ').slice(0, 110),
        src: r.source,
        url: r.url,
        date: r.published_date || '',
      })
    }
  }
  return out
}

/* ---------- 主流程 ---------- */
export async function fetchNews(dateStr) {
  const TAVILY_KEY = process.env.TAVILY_API_KEY || ''
  const DEEPSEEK_KEY = process.env.DEEPSEEK_API_KEY || ''
  dateStr = dateStr || todayLocalISO()

  if (!TAVILY_KEY) {
    return { items: [], source: 'no-keys', warning: 'TAVILY_API_KEY not set' }
  }
  // 4 个方向并行搜（串行会叠加 4 次 RTT）
  const byCat = {}
  await Promise.all(NEWS_QUOTAS.map(async (slot) => {
    try {
      byCat[slot.cat] = await tavilySearch(`${dateStr} ${slot.query}`, TAVILY_KEY, { max: 10, today: dateStr })
    } catch (e) {
      console.warn(`[news] tavily ${slot.cat} failed:`, e.message)
      byCat[slot.cat] = []
    }
  }))
  for (const slot of NEWS_QUOTAS) if (!byCat[slot.cat]) byCat[slot.cat] = []

  if (DEEPSEEK_KEY) {
    try {
      const items = await deepseekSummarize(byCat, DEEPSEEK_KEY, dateStr)
      if (items.length) return { items, source: 'tavily+deepseek', query_date: dateStr }
    } catch (e) {
      console.warn('[news] deepseek failed, fallback to tavily:', e.message)
    }
  }
  return { items: fallbackFromTavily(byCat), source: 'tavily-fallback', query_date: dateStr }
}

export function sortByQuota(items) {
  const order = { ai: 0, polmil: 1, hot: 2, life: 3 }
  return items.slice().sort((a, b) => (order[a.cat] ?? 99) - (order[b.cat] ?? 99))
}

/* ---------- 按日缓存：函数实例内存版 ----------
   注意：函数实例内存【不是】全局共享的（实例会冷启/轮换），它只是第二道保险；
   真正的"全站每天只生成一次"靠 api/news.js 的 s-maxage 边缘缓存（见那里的注释）。
   客户端另有 localStorage 按日缓存兜底。 */
const dayCache = new Map()
export function readDayCache(dateStr) { return dayCache.get(dateStr) || null }
export function writeDayCache(dateStr, data) {
  dayCache.set(dateStr, { ...data, generatedAt: Date.now() })
}

/* ---------- 距"北京时间次日 0 点"还有多少秒 ----------
   用作资讯响应的 s-maxage：缓存正好在跨日那一刻失效，
   于是"一天一份、全站共享"不需要任何定时任务也能成立；
   旧内容不会跨日残留，新一天第一次请求才会重新生成。 */
export function secondsToBeijingMidnight(now = new Date()) {
  const BJ = 8 * 3600 * 1000
  const DAY = 86400 * 1000
  const t = now.getTime() + BJ              // 把北京时间"平移"成 UTC 来看日历
  const nextMidnight = (Math.floor(t / DAY) + 1) * DAY
  return Math.max(60, Math.round((nextMidnight - t) / 1000))
}
