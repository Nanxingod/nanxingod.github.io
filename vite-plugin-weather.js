// vite-plugin-weather.js —— 本地开发时把 /api/weather 打到和线上同一条逻辑上。
//
// 线上由 api/weather.js（Vercel Function）处理；本地没有 Serverless 运行时，
// 这里用 connect 中间件接管同一路径，复用 server/weather-core.js。
// 本地不做边缘缓存（每个请求都要能看到最新结果，方便调试）。
import { fetchWeatherUpstream } from './server/weather-core.js'
import { clampCoord } from './shared/weather.js'

async function handleWeather(req, res) {
  const url = new URL(req.url || '/', 'http://localhost')
  const coord = clampCoord(url.searchParams.get('lat'), url.searchParams.get('lon'))

  const reply = (payload, status = 200) => {
    res.statusCode = status
    res.setHeader('Content-Type', 'application/json; charset=utf-8')
    res.setHeader('Cache-Control', 'no-store')
    res.end(JSON.stringify(payload))
  }

  if (!coord) return reply({ error: 'bad-coords' }, 400)

  try {
    const data = await fetchWeatherUpstream(coord.lat, coord.lon)
    console.log(`[vite-weather] ${coord.lat},${coord.lon} → ${data.text} ${data.temp}°`)
    return reply(data)
  } catch (e) {
    console.error('[vite-weather] failed:', e.message)
    return reply({ error: e.message }, 502)
  }
}

export default function weatherPlugin() {
  return {
    name: 'vite-plugin-weather',
    configureServer(server) {
      server.middlewares.use('/api/weather', handleWeather)
    },
    configurePreviewServer(server) {
      server.middlewares.use('/api/weather', handleWeather)
    },
  }
}
