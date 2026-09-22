// weather.js —— 天气数据层
//
// 数据链路（优先自有接口，全站共享缓存）：
//   浏览器 → /api/weather?lat&lon&b=<30分钟桶> → Vercel 边缘缓存(30min) → Open-Meteo
// 静态托管（GitHub Pages）没有 /api/*，会跨域改调 Vercel 部署的同名接口，
// 于是静态站同样吃边缘缓存；见 utils/api.js。
// 最终兜底链路（两条接口都不可用时自动切换）：
//   浏览器 → Open-Meteo 直连
//
// 纯逻辑（编码映射 / 文案 / 归一化）全部在 shared/weather.js，与线上服务端同一份。

import {
  normalizeWeather, clampCoord, roundCoord, bucket30,
  uvLevel, suggestClothing, clothingEmoji, aqiLevel,
} from '../../shared/weather.js'
import { fetchApiJson } from './api.js'
import { HOT_CITIES } from './cities.js'

export { uvLevel, suggestClothing, clothingEmoji, aqiLevel }

/* ---------- 场景 → 卡片背景图（WebP，见 scripts/migrate-weather-bg.js） ---------- */
const BG_BASE = import.meta.env.BASE_URL + 'images/weather/'
export const WEATHER_BG = {
  clear: BG_BASE + 'clear.webp',
  cloudy: BG_BASE + 'cloudy.webp',
  overcast: BG_BASE + 'overcast.webp',
  rain: BG_BASE + 'rain.webp',
  snow: BG_BASE + 'snow.webp',
  fog: BG_BASE + 'fog.webp',
  thunder: BG_BASE + 'thunder.webp',
  hail: BG_BASE + 'hail.webp',
}

export function pickWeatherBg(scene) {
  const base = (scene || '').replace(/-night$/, '')
  return WEATHER_BG[base] || WEATHER_BG.overcast
}

/* ---------- 缓存（30 分钟 TTL，按经纬度区分，跨刷新有效） ---------- */
const CACHE_KEY = 'nx.wxCache'
const TTL = 30 * 60 * 1000

function readCache(lat, lon) {
  try {
    const raw = JSON.parse(localStorage.getItem(CACHE_KEY) || 'null')
    if (raw && raw.lat === lat && raw.lon === lon && Date.now() - raw.ts < TTL) return raw
  } catch (e) { /* noop */ }
  return null
}

function writeCache(lat, lon, data) {
  try {
    localStorage.setItem(CACHE_KEY, JSON.stringify({ lat, lon, ts: Date.now(), data }))
  } catch (e) { /* noop */ }
}

/* ---------- 兜底：浏览器直连 Open-Meteo ---------- */
async function fetchDirect(lat, lon) {
  const url = 'https://api.open-meteo.com/v1/forecast'
    + `?latitude=${lat}&longitude=${lon}`
    + '&current=temperature_2m,apparent_temperature,relative_humidity_2m,weather_code,wind_speed_10m,wind_direction_10m,uv_index,surface_pressure,is_day'
    + '&hourly=temperature_2m,weather_code,precipitation_probability'
    + '&daily=weather_code,temperature_2m_max,temperature_2m_min,sunrise,sunset,precipitation_probability_max,uv_index_max'
    + '&timezone=auto&forecast_days=7'

  const r = await fetch(url)
  if (!r.ok) throw new Error('open-meteo http ' + r.status)
  const wres = await r.json()

  let air = null
  try {
    const ar = await fetch(
      `https://air-quality-api.open-meteo.com/v1/air-quality?latitude=${lat}&longitude=${lon}`
      + '&current=us_aqi,pm2_5,pm10&timezone=auto'
    )
    if (ar.ok) {
      const c = (await ar.json()).current || {}
      air = {
        aqi: c.us_aqi != null ? Math.round(c.us_aqi) : null,
        pm25: c.pm2_5 != null ? Math.round(c.pm2_5) : null,
        pm10: c.pm10 != null ? Math.round(c.pm10) : null,
      }
    }
  } catch (e) { /* 空气质量失败不影响主数据 */ }

  return normalizeWeather(wres, air)
}

/* ---------- 主请求 ---------- */
async function requestWeather(lat, lon, force) {
  const c = clampCoord(lat, lon)
  if (!c) throw new Error('bad-coords')

  const qs = `lat=${c.lat}&lon=${c.lon}&b=${bucket30()}${force ? '&force=1' : ''}`
  try {
    // 同源 /api/weather → 远端 Vercel 的 /api/weather（静态站借边缘缓存）
    const d = await fetchApiJson('api/weather', qs, { ownTimeout: 12000, remoteTimeout: 6000 })
    if (!d || d.error) throw new Error((d && d.error) || 'bad-payload')
    return d
  } catch (e) {
    // 两条接口链路都不可用 → 直连兜底（静态托管 / 接口故障时仍能看到天气）
    return fetchDirect(c.lat, c.lon)
  }
}

export async function fetchWeather(lat, lon, { force = false } = {}) {
  if (!force) {
    const hit = readCache(lat, lon)
    if (hit) return { ...hit.data, cached: true, cachedAt: hit.ts }
  }
  const data = await requestWeather(lat, lon, force)
  writeCache(lat, lon, data)
  return { ...data, cached: false, cachedAt: Date.now() }
}

/* ---------- 城市持久化 ---------- */
const CITY_KEY = 'nx.wxCity'

// 默认城市（深圳，沿用项目原有默认值）；城市库异常时的最后兜底
const DEFAULT_CITY = { name: '深圳', lat: 22.5431, lon: 114.0579, admin1: '广东', country: '中国' }

export function loadCity() {
  try {
    const saved = JSON.parse(localStorage.getItem(CITY_KEY) || 'null')
    if (saved && saved.name && Number.isFinite(saved.lat) && Number.isFinite(saved.lon)) return saved
  } catch (e) { /* noop */ }
  return HOT_CITIES.find(c => c.name === '深圳') || HOT_CITIES[0] || DEFAULT_CITY
}

export function saveCity(city) {
  try { localStorage.setItem(CITY_KEY, JSON.stringify(city)) } catch (e) { /* noop */ }
}

export { roundCoord }
