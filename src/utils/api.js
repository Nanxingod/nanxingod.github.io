// api.js —— 自有接口的地址解析与统一取数
//
// 背景：项目有两份部署
//   • Vercel（nanxgodqaq.vercel.app）——带 Serverless Functions + 边缘缓存，功能完整
//   • GitHub Pages（nanxingod.github.io）——纯静态托管，没有 /api/*
//
// 为了让静态站也蹭上"全站共享缓存"，这里给出候选接口：
//   1) 同源 /api/*          —— Vercel 部署、本地 dev（vite 插件接管）走这条
//   2) Vercel 部署的 /api/* —— 纯静态托管时跨域借用它的边缘缓存
//      命中边缘缓存的请求不会执行 Function，所以静态站访客再多，
//      后端也只是一天生成一次资讯、30 分钟生成一次天气。
//
// 两个接口都是公开只读数据（不含 Key、不含用户信息），服务端也配了 CORS；
// `?force=1` 另有来源白名单兜底（见 server/cors.js）。
//
// ⚠️ 远端链路不是一定通：vercel.app 在部分网络下会连不上（本机实测 10s 连接失败）。
//    所以远端候选带两点节制：
//      • 单次超时更短（远端 8s，同源 90s）
//      • 失败后记进 localStorage，6 小时内不再尝试，避免每次访问都白等一次超时
//
// 另外"同源到底有没有 /api"也记一笔：GitHub Pages 每次访问都先探一次同源，
// 会白挨一个 404（控制台一行红字 + 一次往返）。探明没有之后就不再探，
// 直接走远端；万一以后绑了自定义域名且后端也在，探到过一次成功就会记住优先用同源。

export const REMOTE_ORIGIN = 'https://nanxgodqaq.vercel.app'

const REMOTE_KEY = 'nx.apiRemote'
const SAME_KEY = 'nx.apiSame'
const REMOTE_COOLDOWN = 6 * 3600 * 1000

function hostname() {
  try { return location.hostname || '' } catch (e) { return '' }
}

// 同源有没有 /api/*？本机 dev 与 Vercel 部署有；其余（GitHub Pages 等）没有
export function hasOwnApi() {
  const h = hostname()
  if (!h) return true
  if (/(^|\.)vercel\.app$/i.test(h)) return true
  if (/^(localhost|127\.0\.0\.1|\[::1\])$/i.test(h)) return true
  return false
}

function remoteCoolingDown() {
  try {
    const v = JSON.parse(localStorage.getItem(REMOTE_KEY) || 'null')
    if (v && v.ok === false && Date.now() - v.ts < REMOTE_COOLDOWN) return true
  } catch (e) { /* noop */ }
  return false
}

export function markRemote(ok) {
  try { localStorage.setItem(REMOTE_KEY, JSON.stringify({ ok: !!ok, ts: Date.now() })) } catch (e) { /* noop */ }
}

// '1' = 有 / '0' = 没有 / null = 还没探过
function sameApiState() {
  try { return localStorage.getItem(SAME_KEY) } catch (e) { return null }
}
function markSameApi(ok) {
  try { localStorage.setItem(SAME_KEY, ok ? '1' : '0') } catch (e) { /* noop */ }
}

function candidateList(path, qs) {
  const suffix = qs ? '?' + qs : ''
  const own = { url: import.meta.env.BASE_URL + path + suffix, remote: false }
  const remote = { url: REMOTE_ORIGIN + '/' + path + suffix, remote: true }

  if (hasOwnApi()) return [own]

  const list = []
  const known = sameApiState()
  // 确认过没有 /api → 连探都不探；没探过（或探到过）→ 同源优先
  if (known !== '0') list.push(own)
  if (!remoteCoolingDown()) list.push(remote)
  // 兜底：冷却中又确认没有同源接口时，至少还得留一条链路，否则调用方拿到 undefined
  if (!list.length) list.push(remote)
  return list
}

/* 依次尝试候选接口，返回解析好的 JSON。
   全部失败时抛出【同源那一次】的错误 —— 它是判断"这个站点到底有没有 /api"的依据：
   status 404 / 0 → 纯静态托管；status 5xx → 接口本身故障。
   另外在错误上补一个 noOwnApi 标记：这个宿主本来就没有自建接口（GitHub Pages 这类），
   便于调用方区分"我没接口"和"接口坏了"。 */
export async function fetchApiJson(path, qs = '', opts = {}) {
  const ownTimeout = opts.ownTimeout || 15000
  const remoteTimeout = opts.remoteTimeout || 8000
  const errs = []
  let ownErr = null

  for (const c of candidateList(path, qs)) {
    const ctl = new AbortController()
    const tid = setTimeout(() => ctl.abort(), c.remote ? remoteTimeout : ownTimeout)
    try {
      const res = await fetch(c.url, { signal: ctl.signal })
      if (!res.ok) {
        const e = new Error('HTTP ' + res.status)
        e.status = res.status
        throw e
      }
      // 静态服务器对未知路径可能回退成 index.html（200 + HTML），
      // 所以手动解析，把"不是 JSON"也标成 0，便于统一识别"这个站点没有 /api"。
      const text = await res.text()
      let data
      try {
        data = JSON.parse(text)
      } catch (e) {
        const err = new Error('bad-payload')
        err.status = 0
        throw err
      }
      if (c.remote) markRemote(true)
      else markSameApi(true)
      return data
    } catch (e) {
      if (c.remote) {
        markRemote(false)
      } else {
        // 404 / 非 JSON → 这个宿主确实没有自建接口，记下来别再探；5xx 只是临时故障，不记
        if (e.status === 404 || e.status === 0) markSameApi(false)
        ownErr = e
      }
      errs.push(e)
    } finally {
      clearTimeout(tid)
    }
  }

  const err = ownErr || errs[0]
  if (!hasOwnApi()) err.noOwnApi = true
  throw err
}
