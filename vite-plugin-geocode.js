// vite-plugin-geocode.js —— 本地开发时把 /api/geocode 打到和线上同一条逻辑上。
//
// 线上由 api/geocode.js（Vercel Function）处理；本地没有 Serverless 运行时，
// 这里用 connect 中间件接管同一路径，复用 server/geocode-core.js。
// 本地不做缓存（每次都回源，方便调试排序与去重逻辑）。
import { searchCities } from './server/geocode-core.js'

async function handleGeocode(req, res) {
  const url = new URL(req.url || '/', 'http://localhost')
  const q = url.searchParams.get('q') || ''
  const n = url.searchParams.get('n') || ''

  const reply = (payload, status = 200) => {
    res.statusCode = status
    res.setHeader('Content-Type', 'application/json; charset=utf-8')
    // 本地刻意 no-store：改排序/去重逻辑后要立刻看到效果，别被浏览器缓存挡住
    res.setHeader('Cache-Control', 'no-store')
    res.end(JSON.stringify(payload))
  }

  try {
    const data = await searchCities(q, n)
    console.log(`[vite-geocode] "${data.query}" → ${data.results.length} 条`)
    return reply(data)
  } catch (e) {
    console.error('[vite-geocode] failed:', e.message)
    return reply({ error: e.message }, 502)
  }
}

export default function geocodePlugin() {
  return {
    name: 'vite-plugin-geocode',
    configureServer(server) {
      server.middlewares.use('/api/geocode', handleGeocode)
    },
    configurePreviewServer(server) {
      server.middlewares.use('/api/geocode', handleGeocode)
    },
  }
}
