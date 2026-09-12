// vite-plugin-news.js —— 本地开发时把 /api/news 打到和线上同一条逻辑上。
//
// 线上（Vercel）由 api/news.js 这个 Serverless Function 处理；
// 本地 dev / preview 没有 Serverless 运行时，这里用 connect 中间件接管同一路径，
// 复用 server/news-core.js，行为与线上保持一致。
//
// Key 从项目根目录的 .env.local 读取（已 gitignore，不会进仓库）。
// 没配 Key 时接口返回 { source:'no-keys', items:[] }，前端会给出友好提示。
import { readFileSync, existsSync } from 'fs'
import { join, dirname } from 'path'
import { fileURLToPath } from 'url'
import { fetchNews, todayLocalISO, readDayCache, writeDayCache, sortByQuota } from './server/news-core.js'

const ROOT = dirname(fileURLToPath(import.meta.url))

function loadEnv() {
  for (const name of ['.env.local', '.env']) {
    const file = join(ROOT, name)
    if (!existsSync(file)) continue
    try {
      for (const line of readFileSync(file, 'utf8').split(/\r?\n/)) {
        const m = line.match(/^\s*([A-Za-z_][A-Za-z0-9_]*)\s*=\s*(.*?)\s*$/)
        if (!m) continue
        const value = m[2].replace(/^['"]|['"]$/g, '')
        if (!process.env[m[1]]) process.env[m[1]] = value
      }
    } catch (e) { /* noop */ }
  }
}

// 尽早加载：core 在函数调用时读 env，此处提前注入即可生效
loadEnv()

async function handleNews(req, res, next) {
  try {
    const q = (req.url || '').includes('force=1')
    const dateStr = todayLocalISO()

    const reply = (payload, status = 200) => {
      res.statusCode = status
      res.setHeader('Content-Type', 'application/json; charset=utf-8')
      res.setHeader('Cache-Control', 'no-store')
      res.end(JSON.stringify(payload))
    }

    if (!q) {
      const cached = readDayCache(dateStr)
      if (cached) return reply({ ...cached, items: sortByQuota(cached.items), cached: true })
    }

    const data = await fetchNews(dateStr)
    if (data.source !== 'no-keys') writeDayCache(dateStr, data)
    console.log(`[vite-news] source=${data.source} items=${data.items.length}${q ? ' (forced)' : ''}`)
    return reply({ ...data, items: sortByQuota(data.items) })
  } catch (e) {
    console.error('[vite-news] failed:', e.message)
    return reply({ error: e.message, source: 'server-error' }, 500)
  }
}

export default function newsPlugin() {
  return {
    name: 'vite-plugin-news',
    configureServer(server) {
      loadEnv()
      server.middlewares.use('/api/news', handleNews)
    },
    configurePreviewServer(server) {
      loadEnv()
      server.middlewares.use('/api/news', handleNews)
    },
  }
}
