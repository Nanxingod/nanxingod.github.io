// api/weather.js —— 天气接口（Vercel Serverless Function）
//
// GET /api/weather?lat=&lon=&b=<30分钟桶>   → 归一化后的天气（边缘缓存 30 分钟，全站共享）
// GET /api/weather?lat=&lon=&force=1        → 绕过缓存重新抓（用户手点刷新时用）
//
// 缓存分层（从近到远）：
//   1) 浏览器 localStorage  30 分钟 TTL，按城市区分（src/utils/weather.js）
//   2) Vercel Edge Network  s-maxage=1800，全部访客共享同一份
//   3) Vercel Function      只有缓存未命中时才会真正执行
//
// 关键点：命中边缘缓存的请求【不会】触发 Function 调用，
//         所以"1000 个访客"和"1 个访客"对上游的压力是一样的。

import { fetchWeatherUpstream, clampCoord } from '../server/weather-core.js'
import { bucket30 } from '../shared/weather.js'
import { applyCors, forceAllowed } from '../server/cors.js'

export const config = { maxDuration: 20 }

export default async function handler(req, res) {
  // 静态托管（GitHub Pages）可以跨域读这份缓存：命中边缘缓存时不执行 Function
  applyCors(req, res)
  if (req.method === 'OPTIONS') {
    res.status(204).end()
    return
  }

  const url = new URL(req.url, `http://${req.headers.host || 'localhost'}`)
  const coord = clampCoord(url.searchParams.get('lat'), url.searchParams.get('lon'))
  const force = url.searchParams.get('force') === '1' && forceAllowed(req)

  const fail = (status, message) => {
    res.setHeader('Content-Type', 'application/json; charset=utf-8')
    res.setHeader('Cache-Control', 'no-store')
    res.status(status).end(JSON.stringify({ error: message }))
  }

  if (!coord) return fail(400, 'bad-coords')

  try {
    const data = await fetchWeatherUpstream(coord.lat, coord.lon)
    res.setHeader('Content-Type', 'application/json; charset=utf-8')
    res.setHeader('Cache-Control', force
      ? 'no-store'
      : 'public, max-age=300, s-maxage=1800, stale-while-revalidate=600')
    res.setHeader('X-Wx-Bucket', String(bucket30()))
    res.status(200).end(JSON.stringify(data))
  } catch (e) {
    console.error('[api/weather] failed:', e.message)
    return fail(502, e.message)
  }
}
