// scripts/verify-cache.mjs —— 校验缓存策略（本地探针，不入仓）
//
// 只做一件事：把线上那两份 Vercel Handler（api/news.js / api/weather.js）
// 用假的 req/res 直接调起来，断言它们吐出的 Cache-Control。
// 本地 vite 中间件是 no-store，验不到这套头，所以必须这样验。

import newsHandler from '../api/news.js'
import weatherHandler from '../api/weather.js'
import {
  todayLocalISO, secondsToBeijingMidnight, writeDayCache, shiftISODate,
} from '../server/news-core.js'

function mockRes() {
  return {
    headers: {},
    statusCode: 0,
    body: '',
    setHeader(k, v) { this.headers[k.toLowerCase()] = v },
    status(c) { this.statusCode = c; return this },
    end(b) { this.body = b || ''; return this },
  }
}
const mockReq = (url, headers = {}) => ({ method: 'GET', url, headers: { host: 'localhost', ...headers } })

let pass = 0, fail = 0
function ok(name, cond, extra = '') {
  if (cond) { pass++; console.log(`  ✓ ${name}${extra ? '  ' + extra : ''}`) }
  else { fail++; console.log(`  ✗ ${name}${extra ? '  ' + extra : ''}`) }
}

console.log('\n[1] 北京时间日历（不依赖服务器时区）')
// 2026-09-11T17:00:00Z = 北京时间 2026-09-12 01:00
ok('17:00Z 属于北京 9-12', todayLocalISO(new Date('2026-09-11T17:00:00Z')) === '2026-09-12',
  todayLocalISO(new Date('2026-09-11T17:00:00Z')))
ok('15:00Z 属于北京 9-11（跨日边界前）', todayLocalISO(new Date('2026-09-11T15:00:00Z')) === '2026-09-11',
  todayLocalISO(new Date('2026-09-11T15:00:00Z')))
ok('跨日边界 16:00Z 翻到 9-12', todayLocalISO(new Date('2026-09-11T16:00:00Z')) === '2026-09-12',
  todayLocalISO(new Date('2026-09-11T16:00:00Z')))
ok('shiftISODate 减一天', shiftISODate('2026-09-12', -1) === '2026-09-11')
ok('shiftISODate 跨月', shiftISODate('2026-10-01', -1) === '2026-09-30')

console.log('\n[2] s-maxage = 距北京次日 0 点的秒数')
const ttl = secondsToBeijingMidnight(new Date('2026-09-11T16:00:00Z'))  // 正好北京 0 点
ok('刚过 0 点 ≈ 86400', ttl === 86400, `ttl=${ttl}`)
const ttl2 = secondsToBeijingMidnight(new Date('2026-09-11T10:00:00Z')) // 北京 18:00
ok('北京 18:00 → 还剩 6 小时', ttl2 === 21600, `ttl=${ttl2}`)
ok('永远 >= 60（避免极小值）', secondsToBeijingMidnight(new Date('2026-09-11T15:59:30Z')) >= 60)

console.log('\n[3] api/news.js 命中当天缓存时的响应头')
const day = todayLocalISO()
writeDayCache(day, { items: [{ cat: 'ai', tt: 'x', dd: '', src: '', url: '', date: day }], source: 'tavily+deepseek', query_date: day })
{
  const res = mockRes()
  await newsHandler(mockReq('/api/news'), res)
  const cc = res.headers['cache-control'] || ''
  ok('HTTP 200', res.statusCode === 200, `status=${res.statusCode}`)
  ok('public + s-maxage', /^public, max-age=\d+, s-maxage=\d+$/.test(cc), cc)
  ok('s-maxage 覆盖到今天结束', Number(cc.match(/s-maxage=(\d+)/)?.[1]) <= 86400)
  ok('无 stale-while-revalidate（避免跨日串味）', !/stale/.test(cc))
  const b = JSON.parse(res.body)
  ok('标记 cached=true', b.cached === true)
  ok('body 未空', b.items.length === 1)
}

console.log('\n[4] api/news.js 手点刷新：10 分钟内节流')
{
  const res = mockRes()
  await newsHandler(mockReq('/api/news?force=1'), res)
  const b = JSON.parse(res.body)
  ok('HTTP 200', res.statusCode === 200)
  ok('throttled=true（没有重复烧额度）', b.throttled === true, JSON.stringify({ throttled: b.throttled }))
  ok('仍然返回边缘可缓存头', /s-maxage=\d+/.test(res.headers['cache-control'] || ''))
}

console.log('\n[5] api/weather.js 响应头（30 分钟共享缓存）')
{
  const res = mockRes()
  await weatherHandler(mockReq('/api/weather?lat=22.5431&lon=114.0579&b=1'), res)
  const cc = res.headers['cache-control'] || ''
  ok('HTTP 200', res.statusCode === 200, `status=${res.statusCode}`)
  ok('s-maxage=1800（30 分钟）', /s-maxage=1800/.test(cc), cc)
  ok('已归一化（含 cloth / hourly / daily）', (() => {
    try {
      const d = JSON.parse(res.body)
      return !!d.cloth && Array.isArray(d.hourly) && Array.isArray(d.daily) && d.hourly.length > 0
    } catch (e) { return false }
  })())
}
{
  const res = mockRes()
  await weatherHandler(mockReq('/api/weather?lat=999&lon=0'), res)
  ok('非法坐标 → 400', res.statusCode === 400, `status=${res.statusCode}`)
}
{
  const res = mockRes()
  await weatherHandler(mockReq('/api/weather?lat=22.5431&lon=114.0579&force=1'), res)
  ok('force=1 → no-store（绕过共享缓存）', res.headers['cache-control'] === 'no-store',
    res.headers['cache-control'])
}

console.log('\n[6] 跨站共享：CORS 头 + force 来源白名单')
// 纯静态托管（GitHub Pages）靠这套头跨域读 Vercel 的边缘缓存。
// 允许读，但 `?force=1` 会真烧额度，所以只认自家站点。
{
  const res = mockRes()
  await weatherHandler(mockReq('/api/weather?lat=22.5431&lon=114.0579&b=1',
    { origin: 'https://nanxingod.github.io' }), res)
  ok('Allow-Origin: *（静态站可直接读）', res.headers['access-control-allow-origin'] === '*')
  ok('暴露 GET/OPTIONS', res.headers['access-control-allow-methods'] === 'GET, OPTIONS')
}
{
  const res = mockRes()
  await weatherHandler({ method: 'OPTIONS', url: '/api/weather', headers: { host: 'localhost' } }, res)
  ok('预检 OPTIONS → 204', res.statusCode === 204, `status=${res.statusCode}`)
}
{
  // 自家站点：force 生效 → 距上次生成不足 10 分钟，被节流
  const res = mockRes()
  await newsHandler(mockReq('/api/news?force=1', { origin: 'https://nanxingod.github.io' }), res)
  ok('自家站点 force=1 → 认（节流）', JSON.parse(res.body).throttled === true)
}
{
  // 陌生来源：force 被忽略，退回当天那份缓存，烧不掉额度
  const res = mockRes()
  await newsHandler(mockReq('/api/news?force=1', { origin: 'https://evil.example.com' }), res)
  const b = JSON.parse(res.body)
  ok('陌生来源 force=1 → 忽略，回缓存', b.cached === true && b.throttled === undefined,
    JSON.stringify({ cached: b.cached, throttled: b.throttled }))
}

console.log(`\n结果：${pass} 通过 / ${fail} 失败\n`)
process.exit(fail ? 1 : 0)
