// api/news.js —— 今日资讯接口（Vercel Serverless Function）
//
// GET /api/news           → 当天资讯（按日缓存，命中即返回，0 积分消耗）
// GET /api/news?force=1   → 强制重新生成（消耗一次 Tavily + DeepSeek，10 分钟内节流）
//
// ── 为什么"全站每天只烧一次额度"能成立 ──────────────────────────────
// 这份响应带 `s-maxage=距北京时间次日 0 点的秒数`，会被 Vercel Edge Network 缓存。
// 关键性质：**命中边缘缓存的请求根本不会执行这个 Function**，
// 所以无论 100 个人还是 10000 个人访问，后台都只跑一次 Tavily + DeepSeek。
// 缓存在跨日那一刻自然失效 → 新的一天第一次请求才重新生成，无需任何定时任务。
//
// 三层兜底（从近到远）：
//   1) 浏览器 localStorage 按日缓存（src/utils/news.js）——同一浏览器一天只请求一次
//   2) Vercel Edge Network（s-maxage）——全部访客共享
//   3) Function 实例内存 dayCache（server/news-core.js）——同实例热启动直接命中
//
// Key 通过环境变量注入，绝不写进代码：
//   Vercel 项目 → Settings → Environment Variables → 添加
//     TAVILY_API_KEY / DEEPSEEK_API_KEY
// 本地开发时读项目根目录的 .env.local（vite-plugin-news.js 负责加载）。
//
// 逻辑本体在 ../server/news-core.js，本地 dev 中间件复用同一份，保证行为一致。

import {
  fetchNews, todayLocalISO, readDayCache, writeDayCache,
  sortByQuota, secondsToBeijingMidnight,
} from '../server/news-core.js'
import { applyCors, forceAllowed } from '../server/cors.js'

// Tavily 4 路并发 + DeepSeek 提炼，正常 15–30s，给足超时余量
export const config = { maxDuration: 60 }

// 手点"刷新"的最小间隔：防止连点把额度烧光（同一份"今天"没必要重新生成两次）
const FORCE_MIN_INTERVAL = 10 * 60 * 1000

export default async function handler(req, res) {
  // 允许 GitHub Pages 等静态站点跨域借用这份边缘缓存（只读数据 + force 白名单）
  applyCors(req, res)
  if (req.method === 'OPTIONS') {
    res.status(204).end()
    return
  }

  const url = new URL(req.url, `http://${req.headers.host || 'localhost'}`)
  // 强制刷新会真实消耗额度：只认自家站点发起的请求
  const force = url.searchParams.get('force') === '1' && forceAllowed(req)
  const dateStr = todayLocalISO()

  // 边缘缓存到期时间 = 北京时间次日 0 点，正好覆盖"今天"剩余的时间
  const dayTtl = secondsToBeijingMidnight()

  const send = (payload, cacheSeconds) => {
    res.setHeader('Content-Type', 'application/json; charset=utf-8')
    res.setHeader('Cache-Control', cacheSeconds
      ? `public, max-age=60, s-maxage=${cacheSeconds}`
      : 'no-store')
    res.status(200).end(JSON.stringify(payload))
  }

  // 按日缓存：当天已生成过就直接返回，不再调用外部 API
  const cached = readDayCache(dateStr)
  if (cached) {
    const tooSoon = force && cached.generatedAt
      && Date.now() - cached.generatedAt < FORCE_MIN_INTERVAL
    // 非强制 → 回缓存；强制但距上次生成不足 10 分钟 → 也回缓存（节流）
    if (!force || tooSoon) {
      send({
        ...cached,
        items: sortByQuota(cached.items),
        cached: true,
        ...(tooSoon ? { throttled: true } : {}),
      }, dayTtl)
      return
    }
  }

  try {
    const data = await fetchNews(dateStr)
    const payload = { ...data, query_date: data.query_date || dateStr }
    if (data.source !== 'no-keys') writeDayCache(dateStr, payload)

    const items = sortByQuota(payload.items)
    console.log(`[api/news] source=${data.source} items=${items.length}${force ? ' (forced)' : ''}`)
    // 强制刷新不回边缘缓存（no-store），让下一次自然请求继续走当天那份
    send({ ...payload, items }, force ? 0 : dayTtl)
  } catch (e) {
    console.error('[api/news] failed:', e.message)
    res.setHeader('Content-Type', 'application/json; charset=utf-8')
    res.setHeader('Cache-Control', 'no-store')
    res.status(500).end(JSON.stringify({ error: e.message, source: 'server-error' }))
  }
}
