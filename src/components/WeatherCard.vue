<template>
  <div class="wc" :class="{ loading: !weather && !error }">
    <!-- 天气场景背景（随实况切换，WebP ~10–150KB） -->
    <div class="wc-bg" :style="bg ? { backgroundImage: `url(${bg})` } : {}"></div>
    <div class="wc-veil"></div>

    <div class="wc-inner">
      <!-- 顶部：城市 + 日期 + 刷新 -->
      <header class="wc-head">
        <div class="wc-city-wrap">
          <button class="wc-city" @click.stop="pickerOpen = !pickerOpen">
            <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
              <path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z"/><circle cx="12" cy="10" r="3"/>
            </svg>
            <span>{{ city.name }}</span>
            <svg class="wc-chev" :class="{ up: pickerOpen }" width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5">
              <polyline points="6 9 12 15 18 9"/>
            </svg>
          </button>
          <transition name="pop">
            <div v-if="pickerOpen" class="wc-menu">
              <button v-for="c in CITIES" :key="c.name" :class="{ on: c.name === city.name }" @click.stop="selectCity(c)">{{ c.name }}</button>
            </div>
          </transition>
        </div>

        <div class="wc-head-right">
          <span class="wc-date">{{ dateLabel }}</span>
          <button class="wc-refresh" :class="{ spinning: refreshing }" @click="load(true)" title="刷新天气">
            <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
              <path d="M21 12a9 9 0 1 1-2.64-6.36"/><polyline points="21 3 21 9 15 9"/>
            </svg>
          </button>
        </div>
      </header>

      <!-- 失败态 -->
      <div v-if="error" class="wc-error">
        <div class="e-ic">📡</div>
        <div class="e-tx">{{ error }}</div>
        <button class="e-btn" @click="load(true)">重试</button>
      </div>

      <template v-else>
        <!-- 实况：一行装下 图标 / 温度 / 天气描述 / 空气质量 -->
        <div class="wc-hero">
          <div class="wc-emoji">{{ weather?.emoji || '⛅' }}</div>
          <div class="wc-temp-wrap">
            <div class="wc-temp">{{ weather ? weather.temp : '--' }}<span class="deg">°</span></div>
            <div class="wc-cond">
              <span class="cond-tx">{{ weather ? weather.text : '获取中…' }}</span>
              <span v-if="weather" class="cond-wind">{{ weather.windLvl }}</span>
            </div>
          </div>
          <div class="wc-hero-meta">
            <div v-if="weather?.air?.aqi != null" class="wc-aqi-pill" :style="{ '--c': weather.air.level.color }">
              <span class="dot"></span>空气{{ weather.air.level.text }} {{ weather.air.aqi }}
            </div>
            <div v-if="weather" class="wc-range">
              最高 {{ weather.high }}° · 最低 {{ weather.low }}° · 体感 {{ weather.feels }}°
            </div>
          </div>
        </div>

        <!-- 24 小时：一条曲线 + 每 2 小时一个标注。
             曲线横轴与下方标注列共用「12 等分」的坐标系，所以文字永远不会被挤小。 -->
        <section class="wc-block">
          <div class="wc-sec-label">
            未来 24 小时
            <!-- 悬停读数直接放在标题行：曲线容器是横向滚动区，浮层贴上去会被裁掉 -->
            <span v-if="hoverTip" class="wc-live">
              {{ hoverTip.label }} {{ hoverTip.emoji }} <b>{{ hoverTip.temp }}°</b>
              <i v-if="hoverTip.pop >= 30">💧{{ hoverTip.pop }}%</i>
            </span>
            <span v-else-if="maxPop >= 30" class="wc-pop-note">💧 最高降水概率 {{ maxPop }}%</span>
          </div>

          <div class="wc-hourly" @mouseleave="hoverIdx = null">
            <div class="wc-hourly-inner">
              <!-- 天气图标行 -->
              <div class="wc-h-emoji">
                <span v-for="(p, i) in slots" :key="'e' + i">{{ p ? p.emoji : '·' }}</span>
              </div>

              <!-- 温度曲线：SVG 横向拉伸铺满（preserveAspectRatio=none），
                   因为 SVG 的 x 与标注列中心同为 (i+0.5)/12，两者始终严格对齐。 -->
              <div class="wc-h-chart" @mousemove="onMove">
                <svg class="wc-svg" :viewBox="`0 0 ${CW} ${CH}`" preserveAspectRatio="none" aria-hidden="true">
                  <defs>
                    <linearGradient id="wcArea" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="0%" stop-color="rgba(165,180,252,0.5)" />
                      <stop offset="100%" stop-color="rgba(129,140,248,0)" />
                    </linearGradient>
                  </defs>
                  <line class="wc-grid" x1="0" :y1="CH * 0.52" :x2="CW" :y2="CH * 0.52" />
                  <path v-if="chart.area" class="wc-area" :d="chart.area" fill="url(#wcArea)" />
                  <path v-if="chart.line" class="wc-line" :d="chart.line" />
                  <circle v-for="(d, i) in chart.dots" :key="'c' + i" class="wc-dot" :cx="d.x" :cy="d.y" r="3.2" />
                </svg>

                <!-- 悬停指示：只画一条竖向参考线（浮层会被滚动容器裁掉，读数放在标题行） -->
                <div v-if="hoverIdx != null" class="wc-guide" :style="{ left: guidePct }"></div>
              </div>

              <!-- 时间 + 温度标注（每格固定 1/12 宽，因此字号稳定） -->
              <div class="wc-h-labels">
                <div v-for="(p, i) in slots" :key="'l' + i" class="wc-hl" :class="{ on: hoverIdx === i }">
                  <span class="hl-t">{{ p ? p.label : '--' }}</span>
                  <span class="hl-v">{{ p ? p.temp + '°' : '--' }}</span>
                </div>
              </div>
            </div>
          </div>
        </section>

        <!-- 未来 7 天：横向 7 列，附温度区间条 -->
        <section class="wc-block">
          <div class="wc-sec-label">未来 7 天</div>
          <div class="wc-daily">
            <template v-if="weather">
              <div v-for="(d, i) in dailyWithBar" :key="i" class="wc-d" :class="{ today: d.isToday }">
                <div class="d-wk">{{ d.wk }}</div>
                <div class="d-e">{{ d.emoji }}</div>
                <div class="d-temp">{{ d.high }}°<em>{{ d.low }}°</em></div>
                <div class="d-bar"><span class="d-fill" :style="{ marginLeft: d.left + '%', width: d.width + '%' }"></span></div>
                <div class="d-pop">{{ d.pop >= 30 ? '💧' + d.pop + '%' : '' }}</div>
              </div>
            </template>
          </div>
        </section>

        <!-- 指标 + 穿衣建议 -->
        <div v-if="weather" class="wc-foot">
          <div class="wc-metrics">
            <div class="wc-m"><span class="ml">湿度</span><span class="mv">{{ weather.humidity }}%</span></div>
            <div class="wc-m"><span class="ml">风</span><span class="mv">{{ weather.windDir || '—' }} {{ weather.wind }}<em>km/h</em></span></div>
            <div class="wc-m"><span class="ml">紫外线</span><span class="mv">{{ weather.uv ?? '—' }}<em v-if="weather.uv != null">{{ uvText }}</em></span></div>
            <div class="wc-m"><span class="ml">日出 / 日落</span><span class="mv">{{ weather.sunrise }} / {{ weather.sunset }}</span></div>
          </div>
          <div class="wc-cloth">
            <span class="c-ic">{{ cloth.emoji }}</span>
            <span class="c-tx">{{ cloth.tip }}</span>
          </div>
        </div>
      </template>
    </div>
  </div>
</template>

<script setup>
import { ref, computed, onMounted, onUnmounted } from 'vue'
import {
  fetchWeather, pickWeatherBg, CITIES, loadCity, saveCity,
  suggestClothing, clothingEmoji, uvLevel,
} from '../utils/weather.js'

// 曲线坐标系：宽 1200 只是为了让 x 有个整数刻度，渲染时会被横向拉伸到卡片宽度；
// 高 100 与 CSS 里的 chart 高度互相独立（preserveAspectRatio="none"）。
// 标注列与曲线点共用同一套刻度：x_i = (i + 0.5) / N * CW，N = 当前槽位数，
// 所以两者永远严格对齐，字号也不会因为列变多而被挤小。
const CW = 1200
const CH = 100
const r1 = n => Math.round(n * 10) / 10

const city = ref(loadCity())
const weather = ref(null)
const loading = ref(true)
const refreshing = ref(false)
const error = ref('')
const pickerOpen = ref(false)

const bg = computed(() => weather.value?.scene ? pickWeatherBg(weather.value.scene) : '')
const uvText = computed(() => uvLevel(weather.value?.uv))
// 穿衣建议由服务端算好放进 payload（同一日期全站同一句）；
// 本地老缓存里没有 cloth 字段时，退回本地推算，避免升级瞬间出现空文案。
const cloth = computed(() => {
  const w = weather.value
  if (!w) return { emoji: '👕', tip: '' }
  return w.cloth || { emoji: clothingEmoji(w.feels, w.code), tip: suggestClothing(w.feels, w.code) }
})

const dateLabel = computed(() => {
  const d = new Date()
  const wk = ['周日', '周一', '周二', '周三', '周四', '周五', '周六'][d.getDay()]
  return `${d.getMonth() + 1}月${d.getDate()}日 ${wk}`
})

// 24 小时抽稀：桌面每 2 小时一个点（12 格），窄屏每 4 小时一个点（6 格）——
// 窄屏卡片只有 300 多像素宽，12 格必然要横向滚动或把字挤小。
const narrow = ref(typeof window !== 'undefined' && window.innerWidth <= 640)
function onResize() { narrow.value = window.innerWidth <= 640 }

const step = computed(() => (narrow.value ? 4 : 2))
const slotCount = computed(() => 24 / step.value)

const slots = computed(() => {
  const hs = weather.value?.hourly || []
  const out = []
  for (let i = 0; i < slotCount.value; i++) out.push(hs[i * step.value] || null)
  return out
})

const maxPop = computed(() => {
  const ps = slots.value.filter(Boolean).map(p => p.pop || 0)
  return ps.length ? Math.max(...ps) : 0
})

// 曲线路径：Catmull-Rom 转三次贝塞尔，得到平滑折线 + 面积填充
const chart = computed(() => {
  const list = slots.value
  const temps = list.filter(Boolean).map(p => p.temp)
  if (temps.length < 2) return { line: '', area: '', dots: [] }

  let lo = Math.min(...temps)
  let hi = Math.max(...temps)
  if (hi - lo < 4) { const m = (hi + lo) / 2; lo = m - 2; hi = m + 2 }

  const TOP = 14
  const BOT = 86
  const yOf = t => BOT - ((t - lo) / (hi - lo)) * (BOT - TOP)
  // 万一个别槽位缺数据，用邻近值补齐，保证点数恒为 12、与标注列一一对应
  const valAt = i => {
    const p = list[i]
      || list.slice(0, i).reverse().find(Boolean)
      || list.slice(i).find(Boolean)
    return p ? p.temp : (lo + hi) / 2
  }

  const N = list.length
  const dots = list.map((p, i) => ({ x: r1(((i + 0.5) / N) * CW), y: r1(yOf(valAt(i))), src: p }))

  const T = 1 / 6
  let d = `M${dots[0].x},${dots[0].y}`
  for (let i = 0; i < dots.length - 1; i++) {
    const p0 = dots[i - 1] || dots[i]
    const p1 = dots[i]
    const p2 = dots[i + 1]
    const p3 = dots[i + 2] || p2
    const c1x = r1(p1.x + (p2.x - p0.x) * T)
    const c1y = r1(p1.y + (p2.y - p0.y) * T)
    const c2x = r1(p2.x - (p3.x - p1.x) * T)
    const c2y = r1(p2.y - (p3.y - p1.y) * T)
    d += `C${c1x},${c1y} ${c2x},${c2y} ${p2.x},${p2.y}`
  }
  const first = dots[0]
  const last = dots[dots.length - 1]
  return { line: d, area: `${d}L${last.x},${CH}L${first.x},${CH}Z`, dots }
})

// 7 天温度区间条：以整周最低/最高为基准，条越靠右越暖、越长温差越大
const dailyWithBar = computed(() => {
  const list = weather.value?.daily || []
  if (!list.length) return []
  const hi = Math.max(...list.map(d => d.high))
  const lo = Math.min(...list.map(d => d.low))
  const span = Math.max(1, hi - lo)
  return list.map(d => ({
    ...d,
    left: ((d.low - lo) / span) * 100,
    width: Math.max(10, ((d.high - d.low) / span) * 100),
  }))
})

/* ---------- 曲线悬停 ---------- */
const hoverIdx = ref(null)

function onMove(e) {
  const rect = e.currentTarget.getBoundingClientRect()
  if (!rect.width) return
  const n = slots.value.length || 1
  const i = Math.floor(((e.clientX - rect.left) / rect.width) * n)
  hoverIdx.value = Math.min(n - 1, Math.max(0, i))
}

const guidePct = computed(() => {
  const n = slots.value.length || 1
  return hoverIdx.value == null ? '0%' : `${(((hoverIdx.value + 0.5) / n) * 100).toFixed(2)}%`
})
const hoverTip = computed(() => (hoverIdx.value == null ? null : slots.value[hoverIdx.value]))

async function load(force = false) {
  if (force) refreshing.value = true
  error.value = ''
  try {
    const data = await fetchWeather(city.value.lat, city.value.lon, { force })
    weather.value = data
  } catch (e) {
    error.value = '天气获取失败，请检查网络后重试'
  } finally {
    loading.value = false
    refreshing.value = false
  }
}

function selectCity(c) {
  city.value = c
  saveCity(c)
  pickerOpen.value = false
  weather.value = null
  loading.value = true
  hoverIdx.value = null
  load(false)
}

function onDocClick() { pickerOpen.value = false }

onMounted(() => {
  load(false)
  document.addEventListener('click', onDocClick)
  window.addEventListener('resize', onResize)
})
onUnmounted(() => {
  document.removeEventListener('click', onDocClick)
  window.removeEventListener('resize', onResize)
})
</script>

<style scoped>
.wc {
  position: relative;
  border-radius: 18px;
  overflow: hidden;
  border: 1px solid rgba(255, 255, 255, 0.08);
  background: rgba(15, 15, 28, 0.6);
  min-height: 320px;
  height: 100%;
  transition: transform 0.4s cubic-bezier(0.23, 1, 0.32, 1), box-shadow 0.4s ease, border-color 0.4s ease;
}
.wc:hover {
  transform: translateY(-3px);
  border-color: rgba(129, 140, 248, 0.28);
  box-shadow: 0 16px 44px rgba(0, 0, 0, 0.42), 0 0 30px rgba(99, 102, 241, 0.1);
}

.wc-bg {
  position: absolute;
  inset: 0;
  background-size: cover;
  background-position: center;
  transform: scale(1.04);
  transition: background-image 0.6s ease, transform 0.8s cubic-bezier(0.23, 1, 0.32, 1);
}
.wc:hover .wc-bg { transform: scale(1.08); }
.wc-veil {
  position: absolute;
  inset: 0;
  background: linear-gradient(180deg, rgba(8, 8, 18, 0.42) 0%, rgba(8, 8, 18, 0.72) 45%, rgba(8, 8, 18, 0.9) 100%);
}
.wc.loading .wc-bg { opacity: 0; }

.wc-inner {
  position: relative;
  z-index: 1;
  padding: 12px 17px 11px;
  display: flex;
  flex-direction: column;
  /* 桌面端卡片被拉到与资讯卡等高，多出来的高度均匀分到各区块之间，
     读起来像"呼吸感"，而不是"内容堆在顶部、下面空一大片"。 */
  justify-content: space-between;
  height: 100%;
  gap: 2px;
  overflow-y: auto;
  scrollbar-width: thin;
  scrollbar-color: rgba(255, 255, 255, 0.16) transparent;
}
.wc-inner::-webkit-scrollbar { width: 6px; }
.wc-inner::-webkit-scrollbar-thumb { background: rgba(255, 255, 255, 0.14); border-radius: 999px; }
/* 内容块不允许被 flex 压缩——否则 7 天那行会被挤扁到看不见温度 */
.wc-inner > * { flex-shrink: 0; }

/* ---- 顶部 ---- */
.wc-head {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 10px;
}
.wc-city-wrap { position: relative; }
.wc-city {
  display: inline-flex;
  align-items: center;
  gap: 5px;
  padding: 3px 9px;
  border-radius: 999px;
  background: rgba(255, 255, 255, 0.1);
  border: 1px solid rgba(255, 255, 255, 0.12);
  backdrop-filter: blur(10px);
  color: var(--text);
  font-size: 12.5px;
  font-weight: 500;
  cursor: pointer;
  transition: all 0.22s ease;
}
.wc-city:hover { background: rgba(255, 255, 255, 0.16); border-color: rgba(255, 255, 255, 0.22); }
.wc-chev { transition: transform 0.25s ease; opacity: 0.7; }
.wc-chev.up { transform: rotate(180deg); }

.wc-menu {
  position: absolute;
  top: calc(100% + 7px);
  left: 0;
  z-index: 30;
  display: grid;
  grid-template-columns: repeat(4, 1fr);
  gap: 4px;
  padding: 7px;
  border-radius: 12px;
  background: rgba(18, 18, 32, 0.94);
  border: 1px solid rgba(255, 255, 255, 0.12);
  backdrop-filter: blur(18px);
  box-shadow: 0 12px 32px rgba(0, 0, 0, 0.45);
}
.wc-menu button {
  padding: 5px 9px;
  border-radius: 7px;
  border: none;
  background: transparent;
  color: var(--text-secondary);
  font-size: 12px;
  cursor: pointer;
  white-space: nowrap;
  transition: all 0.18s ease;
}
.wc-menu button:hover { background: rgba(255, 255, 255, 0.1); color: var(--text); }
.wc-menu button.on { background: rgba(99, 102, 241, 0.28); color: #fff; }

.wc-head-right { display: flex; align-items: center; gap: 9px; }
.wc-date { font-size: 11.5px; color: rgba(255, 255, 255, 0.55); letter-spacing: 0.3px; }
.wc-refresh {
  display: grid;
  place-items: center;
  width: 25px;
  height: 25px;
  border-radius: 50%;
  background: rgba(255, 255, 255, 0.1);
  border: 1px solid rgba(255, 255, 255, 0.12);
  color: rgba(255, 255, 255, 0.8);
  cursor: pointer;
  transition: all 0.22s ease;
}
.wc-refresh:hover { background: rgba(255, 255, 255, 0.18); color: #fff; }
.wc-refresh.spinning svg { animation: spin 0.9s linear infinite; }
@keyframes spin { to { transform: rotate(360deg); } }

/* ---- 实况：一行装下，右侧信息靠右对齐，把宽卡的横向空间用掉 ---- */
.wc-hero {
  display: flex;
  align-items: center;
  gap: 13px;
  padding: 4px 2px 2px;
}
.wc-emoji {
  font-size: 38px;
  line-height: 1;
  filter: drop-shadow(0 4px 14px rgba(0, 0, 0, 0.4));
  animation: float 5s ease-in-out infinite;
}
@keyframes float {
  0%, 100% { transform: translateY(0); }
  50% { transform: translateY(-5px); }
}
.wc-temp-wrap { display: flex; flex-direction: column; gap: 3px; min-width: 0; }
.wc-temp {
  font-size: 42px;
  font-weight: 200;
  line-height: 0.95;
  letter-spacing: -2px;
  background: linear-gradient(180deg, #ffffff 0%, #c7d2fe 100%);
  -webkit-background-clip: text;
  background-clip: text;
  -webkit-text-fill-color: transparent;
}
.wc-temp .deg { font-size: 19px; vertical-align: top; letter-spacing: 0; }
.wc-cond { display: flex; align-items: center; gap: 7px; }
.cond-tx { font-size: 13.5px; color: #fff; font-weight: 500; }
.cond-wind {
  font-size: 10px;
  color: rgba(255, 255, 255, 0.6);
  padding: 1px 7px;
  border-radius: 999px;
  background: rgba(255, 255, 255, 0.1);
}

.wc-hero-meta {
  margin-left: auto;
  display: flex;
  flex-direction: column;
  align-items: flex-end;
  gap: 7px;
  text-align: right;
}
.wc-range { font-size: 11px; color: rgba(255, 255, 255, 0.62); white-space: nowrap; }
.wc-aqi-pill {
  display: inline-flex;
  align-items: center;
  gap: 5px;
  padding: 4px 10px;
  border-radius: 999px;
  font-size: 11px;
  color: rgba(255, 255, 255, 0.9);
  background: rgba(255, 255, 255, 0.09);
  border: 1px solid rgba(255, 255, 255, 0.12);
  backdrop-filter: blur(8px);
  white-space: nowrap;
}
.wc-aqi-pill .dot { width: 7px; height: 7px; border-radius: 50%; background: var(--c); box-shadow: 0 0 8px var(--c); }

/* ---- 分区：标题 + 内容成组，留白只落在组与组之间 ---- */
.wc-block { display: flex; flex-direction: column; }
.wc-sec-label {
  display: flex;
  align-items: center;
  gap: 8px;
  font-size: 10.5px;
  letter-spacing: 1.2px;
  color: rgba(255, 255, 255, 0.42);
  text-transform: uppercase;
  margin: 4px 0 4px;
}
.wc-sec-label::after { content: ''; flex: 1; height: 1px; background: linear-gradient(90deg, rgba(255, 255, 255, 0.14), transparent); }
/* 标题行右侧的读数：默认显示"最高降水概率"，悬停时切换成当格详情。
   order: 2 把它排到分隔线之后（分隔线是 ::after，默认 order 0）。 */
.wc-pop-note, .wc-live {
  order: 2;
  font-size: 10px;
  letter-spacing: 0;
  text-transform: none;
  white-space: nowrap;
}
.wc-pop-note { color: #7dd3fc; }
.wc-live { color: rgba(255, 255, 255, 0.72); font-variant-numeric: tabular-nums; }
.wc-live b { font-weight: 600; color: #fff; }
.wc-live i { font-style: normal; color: #7dd3fc; margin-left: 3px; }

/* ---- 24 小时曲线 ---- */
.wc-hourly { overflow-x: auto; scrollbar-width: none; }
.wc-hourly::-webkit-scrollbar { display: none; }
.wc-hourly-inner { width: 100%; }
/* 宽屏保底宽度：12 格至少 46px 一列；窄屏只有 6 格，不需要滚动 */
@media (min-width: 641px) {
  .wc-hourly-inner { min-width: 552px; }
}

.wc-h-emoji { display: flex; }
.wc-h-emoji > span {
  flex: 1 1 0;
  min-width: 0;
  text-align: center;
  font-size: 15px;
  line-height: 1.4;
}

.wc-h-chart {
  position: relative;
  height: 44px;
  margin: 1px 0 2px;
}
.wc-svg { display: block; width: 100%; height: 100%; overflow: visible; }
.wc-grid { stroke: rgba(255, 255, 255, 0.09); stroke-width: 1; stroke-dasharray: 3 5; vector-effect: non-scaling-stroke; }
.wc-area { stroke: none; }
.wc-line {
  fill: none;
  stroke: #c7d2fe;
  stroke-width: 2;
  stroke-linecap: round;
  stroke-linejoin: round;
  vector-effect: non-scaling-stroke;
  filter: drop-shadow(0 2px 6px rgba(99, 102, 241, 0.45));
}
.wc-dot {
  fill: #0d0d1c;
  stroke: #c7d2fe;
  stroke-width: 2;
  vector-effect: non-scaling-stroke;
}

.wc-guide {
  position: absolute;
  top: 0;
  bottom: 0;
  width: 1px;
  background: linear-gradient(180deg, rgba(255, 255, 255, 0.5), rgba(255, 255, 255, 0.08));
  transform: translateX(-50%);
  pointer-events: none;
}

.wc-h-labels { display: flex; }
.wc-hl {
  flex: 1 1 0;
  min-width: 0;
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 1px;
  padding: 2px 0 0;
  border-radius: 7px;
  transition: background 0.2s ease;
}
.wc-hl.on { background: rgba(255, 255, 255, 0.09); }
.hl-t { font-size: 10px; color: rgba(255, 255, 255, 0.5); }
.wc-hl.on .hl-t { color: rgba(255, 255, 255, 0.85); }
.hl-v { font-size: 12.5px; font-weight: 500; color: rgba(255, 255, 255, 0.92); font-variant-numeric: tabular-nums; }

/* ---- 7 天 ---- */
.wc-daily {
  display: grid;
  grid-template-columns: repeat(7, 1fr);
  gap: 4px;
}
.wc-d {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 2px;
  padding: 4px 2px 3px;
  border-radius: 10px;
  border: 1px solid transparent;
  transition: all 0.22s ease;
}
.wc-d:hover { background: rgba(255, 255, 255, 0.08); transform: translateY(-2px); }
.wc-d.today {
  background: rgba(99, 102, 241, 0.18);
  border-color: rgba(129, 140, 248, 0.3);
}
.d-wk { font-size: 10.5px; color: rgba(255, 255, 255, 0.6); }
.wc-d.today .d-wk { color: #fff; font-weight: 600; }
.d-e { font-size: 17px; line-height: 1.15; }
.d-temp {
  font-size: 12px;
  color: #fff;
  font-weight: 500;
  font-variant-numeric: tabular-nums;
  display: flex;
  gap: 3px;
}
.d-temp em { font-style: normal; font-weight: 400; color: rgba(255, 255, 255, 0.5); }
/* 温度区间条：整周最低→最高为满刻度 */
.d-bar {
  width: 78%;
  height: 3px;
  border-radius: 999px;
  background: rgba(255, 255, 255, 0.12);
  overflow: hidden;
}
.d-fill {
  display: block;
  height: 100%;
  border-radius: 999px;
  background: linear-gradient(90deg, #7dd3fc, #fbbf24 60%, #fb923c);
}
.d-pop { font-size: 9.5px; color: transparent; min-height: 11px; }
.wc-d .d-pop:not(:empty) { color: #7dd3fc; }

/* ---- 底部 ---- */
/* 注意：这里不能用 margin-top:auto —— 父级用 space-between 分配富余高度，
   auto margin 会把留白全部吞掉，区块就被挤在两头了。 */
.wc-foot { padding-top: 6px; }
.wc-metrics {
  display: grid;
  grid-template-columns: repeat(4, 1fr);
  gap: 6px;
  padding: 8px 12px;
  border-radius: 11px;
  background: rgba(255, 255, 255, 0.06);
  border: 1px solid rgba(255, 255, 255, 0.07);
}
.wc-m { display: flex; flex-direction: column; gap: 2px; min-width: 0; }
.ml { font-size: 10px; color: rgba(255, 255, 255, 0.45); }
.mv { font-size: 12.5px; color: rgba(255, 255, 255, 0.92); font-weight: 500; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
.mv em { font-style: normal; font-size: 10px; color: rgba(255, 255, 255, 0.5); margin-left: 3px; }

.wc-cloth {
  display: flex;
  align-items: center;
  gap: 9px;
  margin-top: 6px;
  padding: 7px 12px;
  border-radius: 11px;
  background: linear-gradient(90deg, rgba(99, 102, 241, 0.16), rgba(99, 102, 241, 0.04));
  border: 1px solid rgba(129, 140, 248, 0.16);
}
.c-ic { font-size: 15px; line-height: 1.4; flex: 0 0 auto; }
.c-tx { font-size: 11.5px; color: rgba(255, 255, 255, 0.82); line-height: 1.5; }

/* ---- 失败态 ---- */
.wc-error {
  flex: 1;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  gap: 9px;
  color: var(--text-secondary);
}
.e-ic { font-size: 30px; opacity: 0.7; }
.e-tx { font-size: 12.5px; }
.e-btn {
  padding: 5px 16px;
  border-radius: 999px;
  border: 1px solid rgba(255, 255, 255, 0.16);
  background: rgba(255, 255, 255, 0.08);
  color: var(--text);
  font-size: 12px;
  cursor: pointer;
  transition: all 0.2s ease;
}
.e-btn:hover { background: rgba(255, 255, 255, 0.16); }

/* ---- 转场 ---- */
.pop-enter-active, .pop-leave-active { transition: opacity 0.18s ease, transform 0.18s ease; }
.pop-enter-from, .pop-leave-to { opacity: 0; transform: translateY(-5px); }

/* ---- 响应式 ---- */
@media (max-width: 1024px) {
  /* 窄屏高度释放，内容回到"按需铺开"，不再被 space-between 拉开 */
  .wc-inner { justify-content: flex-start; gap: 4px; }
}
@media (max-width: 640px) {
  .wc-temp { font-size: 40px; }
  .wc-emoji { font-size: 38px; }
  .wc-hero { flex-wrap: wrap; gap: 10px; }
  .wc-hero-meta { margin-left: 0; align-items: flex-start; text-align: left; flex: 1 0 100%; }
  /* 横向拉伸下圆点会被拉成椭圆，窄屏干脆只留曲线 */
  .wc-dot { display: none; }
  .wc-pop-note { display: none; }
  .d-e { font-size: 16px; }
  .d-temp { font-size: 10.5px; gap: 2px; }
  .wc-metrics { grid-template-columns: repeat(2, 1fr); }
}
</style>
