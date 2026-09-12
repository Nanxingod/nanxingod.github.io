// shared/weather.js —— 天气纯逻辑（编码映射 / 文案 / 归一化）
//
// 三处共用同一份，保证"线上服务端生成"与"前端兜底直连"结果完全一致：
//   1. server/weather-core.js    → 线上天气接口（Vercel Function）
//   2. vite-plugin-weather.js    → 本地 dev / preview 中间件
//   3. src/utils/weather.js      → 前端（直连 Open-Meteo 兜底 + 展示）
//
// 约束：只放纯函数。不发起网络请求、不读 window / localStorage、不依赖本机时区。

/* ---------- 风力 / 风向 ---------- */
export function windLevel(v) {
  if (v == null) return ''
  if (v < 1) return '无风'
  if (v < 6) return '软风'
  if (v < 12) return '轻风'
  if (v < 20) return '微风'
  if (v < 29) return '和风'
  if (v < 39) return '清风'
  if (v < 50) return '强风'
  if (v < 62) return '疾风'
  if (v < 75) return '大风'
  if (v < 89) return '烈风'
  return '暴风'
}

export function dirText(deg) {
  if (deg == null || isNaN(deg)) return ''
  const dirs = ['北', '东北', '东', '东南', '南', '西南', '西', '西北']
  return dirs[Math.round((deg % 360) / 45) % 8] + '风'
}

/* ---------- WMO weather_code → 中文 / emoji / 场景 ---------- */
export const CODE_MAP = {
  0: ['晴', '☀️', 'clear'], 1: ['晴间多云', '🌤️', 'cloudy'], 2: ['多云', '⛅', 'cloudy'], 3: ['阴', '☁️', 'overcast'],
  45: ['雾', '🌫️', 'fog'], 48: ['雾凇', '🌫️', 'fog'],
  51: ['小毛毛雨', '🌦️', 'rain'], 53: ['毛毛雨', '🌦️', 'rain'], 55: ['毛毛雨', '🌦️', 'rain'],
  56: ['冻毛毛雨', '🌧️', 'rain'], 57: ['强冻毛毛雨', '🌧️', 'rain'],
  61: ['小雨', '🌧️', 'rain'], 63: ['中雨', '🌧️', 'rain'], 65: ['大雨', '🌧️', 'rain'],
  66: ['冻雨', '🌧️', 'rain'], 67: ['强冻雨', '🌧️', 'rain'],
  71: ['小雪', '🌨️', 'snow'], 73: ['中雪', '🌨️', 'snow'], 75: ['大雪', '🌨️', 'snow'], 77: ['雪粒', '🌨️', 'snow'],
  80: ['阵雨', '🌦️', 'rain'], 81: ['阵雨', '🌦️', 'rain'], 82: ['强阵雨', '⛈️', 'rain'],
  85: ['阵雪', '🌨️', 'snow'], 86: ['强阵雪', '🌨️', 'snow'],
  95: ['雷阵雨', '⛈️', 'thunder'], 96: ['雷阵雨伴冰雹', '🧊', 'hail'], 99: ['强雷暴伴冰雹', '🧊', 'hail'],
}

export function resolveScene(code, isDay) {
  const base = (CODE_MAP[code] || ['', '', 'cloudy'])[2]
  if (isDay) return base
  if (base === 'clear') return 'clear-night'
  if (['cloudy', 'overcast', 'rain', 'fog', 'thunder', 'hail'].includes(base)) return base + '-night'
  return base
}

/* ---------- 穿衣建议（按日期稳定轮换，同一日期全站同一句话） ---------- */
export const RAIN_CODES = [51, 53, 55, 56, 57, 61, 63, 65, 66, 67, 80, 81, 82, 95, 96, 99]

const CLOTH_BUCKETS = [
  { max: 0, tips: [
    '羽绒服、厚毛衣、保暖内衣，手脚末端最怕冷，记得戴好手套',
    '三件套保命：羽绒服 + 毛衣 + 围巾，暖宝宝贴腰腹更踏实',
    '零下天气走分层穿法，内层排汗、中层保暖、外层防风',
  ]},
  { max: 5, tips: [
    '厚外套配毛衣，脖子是漏风口，围巾安排上',
    '出门裹严实点，帽子围巾别省，进屋再脱',
    '五度上下，秋裤是该穿了，暖从脚底起',
  ]},
  { max: 10, tips: [
    '外套或风衣搭件针织衫，早晚温差大别硬扛',
    '薄毛衣加长裤刚好，风一吹就懂外套的重要',
    '十度出头，洋葱穿法最稳：里薄外厚随手脱',
  ]},
  { max: 15, tips: [
    '夹克或薄毛衣，清晨傍晚加件外套',
    '长袖打底最舒服，热了卷袖口、冷了拉拉链',
    '十五度体感刚好，一件卫衣能扛一整天',
  ]},
  { max: 20, tips: [
    '长袖衬衫或薄外套，体感最舒适的区域',
    '单穿长袖就够，怕凉的带件开衫',
    '二十度左右，穿得刚刚好反而最显精神',
  ]},
  { max: 25, tips: [
    '短袖或薄长裤，通风透气最要紧',
    '棉麻材质舒服，出汗也不贴身',
    '二十五度，怎么清爽怎么来',
  ]},
  { max: 30, tips: [
    '短袖短裤走起，防晒和补水一起抓',
    '薄款透气最重要，颜色浅一点更凉快',
    '三十度以下，短打舒适，记得躲正午的太阳',
  ]},
  { max: 999, tips: [
    '透气浅色衣物，避免暴晒、多补水',
    '高温天，帽子墨镜防晒霜一个都不能少',
    '浅色棉麻加大量饮水，正午尽量待在阴凉处',
    '热到冒烟，随身带水，每小时喝几口最稳',
  ]},
]

// seed：用日期（月/日）做种子，同一天全站同一句，跨天自动换
export function suggestClothing(feels, code, seed = 0) {
  const rain = RAIN_CODES.includes(code)
  const bucket = CLOTH_BUCKETS.find(b => feels < b.max) || CLOTH_BUCKETS[CLOTH_BUCKETS.length - 1]
  let s = bucket.tips[seed % bucket.tips.length]
  if (rain) {
    const rainTips = [
      '；今天有雨，出门带伞比带钱重要',
      '；雨具随身，鞋子选防水的更省心',
      '；记得带伞，午后雷阵雨说下就下',
    ]
    s += rainTips[(seed + 7) % rainTips.length]
  }
  return s
}

export function clothingEmoji(feels, code) {
  const rain = RAIN_CODES.includes(code)
  if (feels < 5) return rain ? '🧥☂️' : '🧣'
  if (feels < 15) return rain ? '🧥☂️' : '🧥'
  if (feels < 22) return rain ? '🧥☂️' : '👕'
  if (feels < 28) return rain ? '☂️' : '👕'
  return rain ? '☂️🧴' : '🩳🧴'
}

/* ---------- 空气质量 / 紫外线 ---------- */
export function aqiLevel(v) {
  if (v == null) return { text: '暂无', color: '#9aa3ab' }
  if (v <= 50) return { text: '优', color: '#2F8F5B' }
  if (v <= 100) return { text: '良', color: '#C9A227' }
  if (v <= 150) return { text: '轻度污染', color: '#E08214' }
  if (v <= 200) return { text: '中度污染', color: '#C0392B' }
  if (v <= 300) return { text: '重度污染', color: '#8E44AD' }
  return { text: '严重污染', color: '#7B241C' }
}

export function uvLevel(v) {
  if (v == null) return ''
  if (v <= 2) return '弱'
  if (v <= 5) return '中等'
  if (v <= 7) return '强'
  if (v <= 10) return '很强'
  return '极强'
}

/* ---------- 坐标归一：缓存键稳定性 + 防成任意坐标的开放代理 ---------- */
export function roundCoord(v) {
  const n = Number(v)
  if (!Number.isFinite(n)) return null
  return Math.round(n * 1000) / 1000
}

export function clampCoord(lat, lon) {
  const la = Number(lat)
  const lo = Number(lon)
  if (!Number.isFinite(la) || !Number.isFinite(lo)) return null
  if (la < -90 || la > 90 || lo < -180 || lo > 180) return null
  return { lat: roundCoord(la), lon: roundCoord(lo) }
}

/* ---------- 30 分钟桶：所有用户在同一个 30 分钟窗口内共用同一份缓存 ---------- */
export const BUCKET_MS = 30 * 60 * 1000

export function bucket30(now = Date.now()) {
  return Math.floor(now / BUCKET_MS)
}

/* ---------- 原始响应 → 前端可直接渲染的结构 ----------
   "现在"这个基准点取自上游返回的 current.time（当地时区），
   而不是本机 / 服务器的 Date —— 否则服务器跑在 UTC 上会把小时序列整体错位。 */
export function normalizeWeather(wres, air) {
  const cur = wres.current || {}
  const dailyRaw = wres.daily || {}
  const hourlyRaw = wres.hourly || {}
  const code = cur.weather_code
  const [text, emoji] = CODE_MAP[code] || ['未知', '🌡️', 'cloudy']
  const isDay = cur.is_day === 1

  const curTime = String(cur.time || '')
  const anchor = curTime.slice(0, 13) + ':00'     // 'YYYY-MM-DDTHH:00'，上游当地时区
  const todayStr = curTime.slice(0, 10)
  const seed = Number(todayStr.slice(8, 10)) || 0

  // 24 小时：从"当前小时"起，找第一个 >= anchor 的时刻
  const h = hourlyRaw
  const times = h.time || []
  let start = times.indexOf(anchor)
  if (start < 0) {
    start = times.findIndex(t => t >= anchor)
    if (start < 0) start = 0
  }
  const hourly = []
  for (let i = start; i < Math.min(start + 24, times.length); i++) {
    const t = (times[i] || '').split('T')[1] || ''
    const [, hemoji] = CODE_MAP[h.weather_code?.[i]] || ['', '🌡️']
    hourly.push({
      label: i === start ? '现在' : t.slice(0, 5),
      temp: Math.round(h.temperature_2m?.[i] ?? 0),
      emoji: hemoji,
      pop: h.precipitation_probability?.[i] ?? 0,
    })
  }

  // 7 天
  const wk = ['日', '一', '二', '三', '四', '五', '六']
  const daily = (dailyRaw.time || []).map((d, i) => {
    const [, demoji] = CODE_MAP[dailyRaw.weather_code?.[i]] || ['', '🌡️']
    const dt = new Date(d + 'T00:00:00')
    const isToday = d === todayStr
    return {
      date: d,
      isToday,
      wk: isToday ? '今天' : '周' + wk[dt.getDay()],
      emoji: demoji,
      high: Math.round(dailyRaw.temperature_2m_max?.[i] ?? 0),
      low: Math.round(dailyRaw.temperature_2m_min?.[i] ?? 0),
      pop: dailyRaw.precipitation_probability_max?.[i] ?? 0,
    }
  })

  const feels = Math.round(cur.apparent_temperature ?? 0)

  return {
    temp: Math.round(cur.temperature_2m ?? 0),
    feels,
    humidity: Math.round(cur.relative_humidity_2m ?? 0),
    code,
    uv: cur.uv_index != null ? Math.round(cur.uv_index) : null,
    wind: Math.round(cur.wind_speed_10m ?? 0),
    windDir: dirText(cur.wind_direction_10m),
    windLvl: windLevel(cur.wind_speed_10m),
    pressure: cur.surface_pressure != null ? Math.round(cur.surface_pressure) : null,
    text, emoji, isDay,
    scene: resolveScene(code, isDay),
    high: Math.round(dailyRaw.temperature_2m_max?.[0] ?? 0),
    low: Math.round(dailyRaw.temperature_2m_min?.[0] ?? 0),
    sunrise: String(dailyRaw.sunrise?.[0] || '').split('T')[1]?.slice(0, 5) || '',
    sunset: String(dailyRaw.sunset?.[0] || '').split('T')[1]?.slice(0, 5) || '',
    cloth: { emoji: clothingEmoji(feels, code), tip: suggestClothing(feels, code, seed) },
    obsTime: curTime || '',
    hourly, daily,
    // level 也在这里补：保证"服务端生成"与"前端兜底直连"两条路径的展示完全一致
    air: air ? { ...air, level: aqiLevel(air.aqi) } : null,
  }
}
