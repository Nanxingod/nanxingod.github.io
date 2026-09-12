// cors.js —— 两个接口共用的跨域策略
//
// 为什么需要：GitHub Pages 是纯静态托管，没有 /api/*。但这两个接口返回的都是
// 公开只读数据（不含 Key、不含用户信息），所以允许静态站跨域借用 Vercel 部署的
// 边缘缓存是完全合理的——命中边缘缓存时不会执行 Function，
// 于是静态站也享受"全站一天一份资讯 / 30 分钟一份天气"。
//
// 两点权衡：
//   1) Access-Control-Allow-Origin 固定发 `*`（不加 Vary），
//      避免按 Origin 把 CDN 缓存切碎，白白多跑 Function。
//   2) 但 `?force=1` 会真的烧 Tavily + DeepSeek 额度，所以它单独做来源白名单：
//      只有自家站点（github.io / vercel.app / 本机）发起的强制刷新才认，
//      别的页面顶多能读到当天那份缓存，烧不掉额度。

const ALLOW_ORIGIN = /^https?:\/\/([a-z0-9-]+\.)*(github\.io|vercel\.app|localhost|127\.0\.0\.1)(:\d+)?$/i

export function applyCors(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*')
  res.setHeader('Access-Control-Allow-Methods', 'GET, OPTIONS')
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type')
  res.setHeader('Access-Control-Max-Age', '86400')
}

// 无 Origin（curl、Cron、服务端调用）视为可信；浏览器请求则校验来源
export function forceAllowed(req) {
  const origin = req.headers.origin || ''
  return !origin || ALLOW_ORIGIN.test(origin)
}
