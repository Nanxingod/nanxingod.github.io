// src/utils/geocode.js —— 城市搜索数据层（本地优先 + 接口兜底）+ 最近使用
//
// 搜索策略：
//   1) 先在本地库匹配（毫秒级、零网络）——绝大多数查询在这里就结束了
//   2) 本地结果不足时才请求 /api/geocode（服务端代理 + 7 天边缘缓存）
//   3) 接口失败/超时 → 静默降级为"只有本地结果"，不让用户看到报错
//
// 为什么不让每次输入都打接口：
//   接口虽然免费，但每次都要等一次网络往返（300–800ms），手感明显变钝；
//   而且内置库已经覆盖了常用城市，为冷门城市付这个延迟不划算。
//
// 最近使用写在 localStorage，纯本地，不上传。

import { matchLocal, CITIES } from './cities.js'
import { fetchApiJson } from './api.js'

/* ---------- 合并：本地 + 接口，去重后按"本地优先、人口降序"排 ----------
   去重键用【中文国名】而不是 countryCode：
   本地库只在 country==='中国' 时填了 CN，国际城市的 countryCode 是空字符串，
   而接口返回的是 FR / JP 这类两位码。用 countryCode 会让"本地巴黎"和
   "接口巴黎"算成两个不同条目，列表里出现重复的同一座城市。 */
export function keyOf(c) {
  const region = (c.admin1 || '').trim()
  const nation = (c.country || '').trim() || (c.countryCode || '').trim()
  return `${c.name}|${region}|${nation}`
}

export function merge(localList, remoteList, limit) {
  const seen = new Set()
  const out = []

  // 本地结果先放（更可信：坐标是精选过的市中心，且零延迟）
  for (const c of localList) {
    const k = keyOf(c)
    if (seen.has(k)) continue
    seen.add(k)
    out.push(c)
  }

  // 接口结果补充，但标记来源，便于 UI 上区分（也不需要特殊处理，只是语义清晰）
  for (const c of remoteList) {
    const k = keyOf(c)
    if (seen.has(k)) continue
    seen.add(k)
    out.push({ ...c, source: 'remote' })
  }

  return out.slice(0, limit)
}

/* ---------- 接口搜索（带缓存记忆，同一关键词短时间内不重复问） ---------- */
const REMOTE_TTL = 10 * 60 * 1000        // 同一个词 10 分钟内不重复请求
const remoteMemo = new Map()             // kw -> { ts, results }

function memoGet(kw) {
  const hit = remoteMemo.get(kw)
  if (hit && Date.now() - hit.ts < REMOTE_TTL) return hit.results
  return null
}

function memoSet(kw, results) {
  // 简单容量控制：超过 60 个词就清掉最旧的一半
  if (remoteMemo.size > 60) {
    const sorted = [...remoteMemo.entries()].sort((a, b) => a[1].ts - b[1].ts)
    for (let i = 0; i < 30; i++) remoteMemo.delete(sorted[i][0])
  }
  remoteMemo.set(kw, { ts: Date.now(), results })
}

/**
 * 本地即时匹配（同步，零网络）。
 * 调用方应【先】用它把结果渲染出来，再决定要不要走网络——
 * 这样用户敲下第一个字就看到结果，不用干等接口。
 */
export function localSearch(kw, limit = 12) {
  return matchLocal(kw, limit)
}

export async function searchRemote(kw, limit) {
  const memo = memoGet(kw)
  if (memo) return memo

  try {
    const qs = `q=${encodeURIComponent(kw)}&n=${limit}`
    const d = await fetchApiJson('api/geocode', qs, { ownTimeout: 8000, remoteTimeout: 6000 })
    const list = Array.isArray(d?.results) ? d.results : []
    memoSet(kw, list)
    return list
  } catch (e) {
    // 接口不可用（静态站无 /api、网络故障等）→ 记住空结果，避免每次输入都重试
    memoSet(kw, [])
    return []
  }
}

/**
 * 一次性搜索（本地 + 接口）。
 * 组件里更推荐用「两段式」：先 localSearch 立即渲染，再 searchRemote 补充，
 * 这样本地有答案时是毫秒级的，不会被网络拖慢。
 *
 * @param {string} kw 关键词
 * @param {object} opts { limit, withRemote }
 * @returns {Promise<City[]>}
 */
export async function searchCity(kw, opts = {}) {
  const limit = opts.limit || 12
  const q = String(kw || '').trim()
  if (!q) return []

  const local = matchLocal(q, limit)
  if (!opts.withRemote || local.length >= 5) return local.slice(0, limit)

  const remote = await searchRemote(q, limit)
  return merge(local, remote, limit)
}

/* ---------- 最近使用（localStorage，LRU，最多 8 个） ---------- */
const RECENT_KEY = 'nx.wxRecentCities'
const RECENT_MAX = 8

export function loadRecent() {
  try {
    const arr = JSON.parse(localStorage.getItem(RECENT_KEY) || '[]')
    if (!Array.isArray(arr)) return []
    // 过滤掉结构不完整的脏数据
    return arr
      .filter(c => c && typeof c.name === 'string' && Number.isFinite(c.lat) && Number.isFinite(c.lon))
      .slice(0, RECENT_MAX)
  } catch (e) {
    return []
  }
}

export function saveRecent(city) {
  if (!city || !city.name) return
  try {
    const k = keyOf(city)
    const next = [city, ...loadRecent().filter(c => keyOf(c) !== k)].slice(0, RECENT_MAX)
    localStorage.setItem(RECENT_KEY, JSON.stringify(next))
  } catch (e) { /* 隐私模式下 localStorage 可能不可写，忽略即可 */ }
}

/** 城市是否已在内置库里（用于 UI 上是否显示"常用"标记） */
export function isBuiltin(city) {
  return CITIES.some(c => keyOf(c) === keyOf(city))
}

export { CITIES }
