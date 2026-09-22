// api/geocode.js —— 城市搜索接口（Vercel Serverless Function）
//
// GET /api/geocode?q=<城市名>&n=<条数>  → 归一化后的候选城市列表（边缘缓存 7 天，全站共享）
//
// 为什么可以缓存 7 天：
//   地名是静态数据，不会像天气/资讯那样过期。查询词 → 经纬度这个映射
//   几年都不会变，所以给很长的 s-maxage，命中边缘缓存时不执行 Function，
//   于是"搜索"这件事的成本几乎恒定，与访客数和搜索次数都无关。
//
// 注意：这里【不提供】 force=1。
//   天气需要强制刷新（数据会变）；地名不需要，加了只会给"绕过缓存"留口子。
//
// 缓存键里放的是 URL 上的 q，所以：
//   · 同一个查询词的所有访客共用一份
//   · 不同查询词各占一份（理论上键很多，但 7 天内同一个词重复出现仍然命中）

import { searchCities } from '../server/geocode-core.js'
import { applyCors } from '../server/cors.js'

export const config = { maxDuration: 15 }

const SEVEN_DAYS = 604800

export default async function handler(req, res) {
  // 静态托管（GitHub Pages）可以跨域读这份缓存：命中边缘缓存时不执行 Function
  applyCors(req, res)
  if (req.method === 'OPTIONS') {
    res.status(204).end()
    return
  }

  const url = new URL(req.url, `http://${req.headers.host || 'localhost'}`)
  const q = url.searchParams.get('q') || ''
  const n = url.searchParams.get('n') || ''

  const fail = (status, message) => {
    res.setHeader('Content-Type', 'application/json; charset=utf-8')
    res.setHeader('Cache-Control', 'no-store')
    res.status(status).end(JSON.stringify({ error: message }))
  }

  try {
    const data = await searchCities(q, n)
    res.setHeader('Content-Type', 'application/json; charset=utf-8')
    // 空查询也回 200（results: []），让前端逻辑简单：只判断 results 长度
    res.setHeader('Cache-Control', `public, max-age=${SEVEN_DAYS}, s-maxage=${SEVEN_DAYS}`)
    res.status(200).end(JSON.stringify(data))
  } catch (e) {
    console.error('[api/geocode] failed:', e.message)
    return fail(502, e.message)
  }
}
