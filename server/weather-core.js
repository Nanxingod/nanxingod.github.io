// server/weather-core.js —— 天气上游抓取（Open-Meteo，免费、无需 Key）
//
// 这一层只做一件事：把上游两份数据抓回来 + 归一化，返回前端可直接渲染的结构。
// 被 api/weather.js（线上）与 vite-plugin-weather.js（本地）共用。
//
// 为什么要过服务端而不让浏览器直连？
//   浏览器直连 = 每个访客都打一次 Open-Meteo（N 次/30分钟）。
//   过服务端 + 边缘缓存 = 全部访客共享同一份，原站 30 分钟才被请求一次。
//   Open-Meteo 免费不花钱，但"能少发请求就少发"本身是好习惯，也更快（就近 CDN）。

import { normalizeWeather, clampCoord } from '../shared/weather.js'

const FORECAST_ENDPOINT = 'https://api.open-meteo.com/v1/forecast'
const AIR_ENDPOINT = 'https://air-quality-api.open-meteo.com/v1/air-quality'

async function fetchAirQuality(lat, lon) {
  try {
    const res = await fetch(
      `${AIR_ENDPOINT}?latitude=${lat}&longitude=${lon}`
      + '&current=us_aqi,pm2_5,pm10&timezone=auto'
    )
    if (!res.ok) return null
    const c = (await res.json()).current || {}
    const v = c.us_aqi != null ? Math.round(c.us_aqi) : null
    // aqiLevel 放前端算（展示层），这里只给原始数值
    return {
      aqi: v,
      pm25: c.pm2_5 != null ? Math.round(c.pm2_5) : null,
      pm10: c.pm10 != null ? Math.round(c.pm10) : null,
    }
  } catch (e) {
    return null
  }
}

/**
 * 抓取并归一化天气。
 * @param {number|string} lat
 * @param {number|string} lon
 * @returns {Promise<object>} 前端天气对象（含 hourly / daily / air / cloth）
 */
export async function fetchWeatherUpstream(lat, lon) {
  const c = clampCoord(lat, lon)
  if (!c) throw new Error('bad-coords')

  const url = `${FORECAST_ENDPOINT}?latitude=${c.lat}&longitude=${c.lon}`
    + '&current=temperature_2m,apparent_temperature,relative_humidity_2m,weather_code,wind_speed_10m,wind_direction_10m,uv_index,surface_pressure,is_day'
    + '&hourly=temperature_2m,weather_code,precipitation_probability'
    + '&daily=weather_code,temperature_2m_max,temperature_2m_min,sunrise,sunset,precipitation_probability_max,uv_index_max'
    + '&timezone=auto&forecast_days=7'

  const ctl = new AbortController()
  const tid = setTimeout(() => ctl.abort(), 12000)
  let wres
  try {
    const r = await fetch(url, { signal: ctl.signal })
    if (!r.ok) throw new Error('upstream http ' + r.status)
    wres = await r.json()
  } finally {
    clearTimeout(tid)
  }

  const air = await fetchAirQuality(c.lat, c.lon)
  return { ...normalizeWeather(wres, air), fetchedAt: Date.now() }
}

export { clampCoord }
