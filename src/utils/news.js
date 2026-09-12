// news.js —— 今日资讯数据层
//
// 服务端放在 /api/news（线上是 Vercel Function，本地 dev 由 vite 插件接管），
// Tavily 搜索 + DeepSeek 提炼，一天生成一次，客户端按日缓存，刷新不再重复消耗。
// 直连第三方 API 会让 Key 暴露在公开仓库里，所以这里全部经由自己的接口。
//
// 静态托管（GitHub Pages）没有 /api/*，会自动改调 Vercel 部署的同名接口，
// 借它的边缘缓存——见 utils/api.js 的说明。

import { fetchApiJson } from './api.js'

const PATH = 'api/news'
const CACHE_KEY = 'nx.news'
const CACHE_V = 1          // 缓存结构版本：改了字段就 +1，旧缓存自动失效
const TIMEOUT = 90000      // 同源首次生成约 15–30s，给足余量
const REMOTE_TIMEOUT = 12000   // 远端（静态站借 Vercel 缓存）只给 12s，超了就降级

export const CAT_LABEL = {
  ai: 'AI · 大模型',
  polmil: '国际 · 政军',
  hot: '热点',
  life: '生活',
}

export const CAT_ORDER = ['ai', 'polmil', 'hot', 'life']

function todayISO() {
  const d = new Date()
  return d.getFullYear() + '-' + String(d.getMonth() + 1).padStart(2, '0') + '-' + String(d.getDate()).padStart(2, '0')
}

function readCache() {
  try {
    const v = JSON.parse(localStorage.getItem(CACHE_KEY) || 'null')
    if (v && v.date === todayISO() && v.v === CACHE_V && Array.isArray(v.items) && v.items.length) return v
  } catch (e) { /* noop */ }
  return null
}

function writeCache(items, source) {
  try {
    localStorage.setItem(CACHE_KEY, JSON.stringify({ v: CACHE_V, date: todayISO(), ts: Date.now(), source, items }))
  } catch (e) { /* noop */ }
}

// 并发合并：同一时刻只发一个请求，避免"组件加载"与"点刷新"各发一次
let inflight = null

// 同源没有 /api/news 时会自动改调 Vercel 部署（借它的边缘缓存），见 api.js
function request(forceFlag) {
  return fetchApiJson(PATH, forceFlag ? 'force=1' : '', {
    ownTimeout: TIMEOUT,
    remoteTimeout: REMOTE_TIMEOUT,
  })
}

export async function fetchNews({ force = false } = {}) {
  if (!force) {
    const hit = readCache()
    if (hit) return { items: hit.items, cached: true, cachedAt: hit.ts }
  }
  if (inflight) return inflight

  inflight = (async () => {
    try {
      let data = await request(force)

      // 跨日脏数据保护：边缘缓存理论上在跨日那一刻失效，
      // 但万一 CDN 多留了一会儿旧副本，这里比对日期后再补一次强制请求。
      const today = todayISO()
      if (data && data.query_date && data.query_date !== today) {
        data = await request(true)
      }

      const items = Array.isArray(data.items) ? data.items : []
      if (items.length) {
        writeCache(items, data.source || 'proxy')
        return {
          items,
          cached: !!data.cached,
          throttled: !!data.throttled,
          source: data.source,
          cachedAt: Date.now(),
        }
      }
      // 服务端没配 Key：给出可读原因，前端展示配置提示
      if (data.source === 'no-keys') {
        return { items: [], cached: false, notConfigured: true }
      }
      throw new Error('empty')
    } catch (e) {
      // 降级：拿本地缓存兜底（可能是昨天拉到的，标注一下即可）
      const cached = readCache()
      if (cached) return { items: cached.items, cached: true, degraded: true, cachedAt: cached.ts }
      // 404 / 非 JSON / 宿主本就没有自建接口 → 这个站点提供不了资讯
      // （GitHub Pages、vite preview 都是纯静态；远端 Vercel 也不通时落到这里）
      if (e.status === 404 || e.status === 0 || e.noOwnApi) {
        return { items: [], cached: false, unsupported: true }
      }
      return { items: [], cached: false, error: e.message }
    } finally {
      inflight = null
    }
  })()

  return inflight
}

export function groupByCat(items) {
  const map = {}
  for (const it of items) {
    const key = CAT_ORDER.includes(it.cat) ? it.cat : 'hot'
    ;(map[key] || (map[key] = [])).push(it)
  }
  return CAT_ORDER.filter(k => map[k] && map[k].length).map(k => ({ cat: k, label: CAT_LABEL[k], items: map[k] }))
}

export function clearNewsCache() {
  try { localStorage.removeItem(CACHE_KEY) } catch (e) { /* noop */ }
}
