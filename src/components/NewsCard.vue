<template>
  <div class="nc">
    <!-- 背景图 + 冷调遮罩（素材见 scripts/make-news-bg.js） -->
    <div class="nc-bg"></div>
    <div class="nc-veil"></div>

    <header class="nc-head">
      <div class="nc-title">
        <span class="nc-ic">📰</span>
        <div class="nc-tt-wrap">
          <h3 class="nc-t">今日资讯</h3>
          <span class="nc-sub">powered by <b>DeepSeek API</b> <i>&amp;</i> <b>Tavily Search</b></span>
        </div>
        <span v-if="dateLabel" class="nc-date">{{ dateLabel }}</span>
      </div>
      <div class="nc-actions">
        <span v-if="updatedAt" class="nc-updated">{{ updatedAt }}</span>
        <button class="nc-refresh" :class="{ spinning: refreshing }" @click="load(true)" title="刷新资讯">
          <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
            <path d="M21 12a9 9 0 1 1-2.64-6.36"/><polyline points="21 3 21 9 15 9"/>
          </svg>
        </button>
      </div>
    </header>

    <!-- 滚动区 -->
    <div ref="scrollRef" class="nc-body">
      <!-- 加载中 -->
      <template v-if="loading">
        <div v-for="i in 5" :key="i" class="nc-sk">
          <div class="sk-line w70"></div>
          <div class="sk-line w95"></div>
          <div class="sk-line w30"></div>
        </div>
      </template>

      <!-- 服务端未配置 Key -->
      <div v-else-if="notConfigured" class="nc-state">
        <div class="st-ic">🔑</div>
        <div class="st-t">资讯服务未配置</div>
        <div class="st-d">在 Vercel 项目里添加 <code>TAVILY_API_KEY</code> 与 <code>DEEPSEEK_API_KEY</code> 两个环境变量后重新部署即可。</div>
      </div>

      <!-- 纯静态托管：没有 /api/news -->
      <div v-else-if="unsupported" class="nc-state">
        <div class="st-ic">🛰️</div>
        <div class="st-t">此站点无法提供资讯</div>
        <div class="st-d">
          资讯由服务端的 <code>/api/news</code> 生成（Tavily 检索 + DeepSeek 提炼），密钥不能放进前端。
          在纯静态站点直连的话，每位访客都会各跑一次检索与提炼，额度消耗成倍放大；
          Vercel 站点带边缘缓存，全站一天只真正生成一次。
        </div>
        <a class="st-btn" href="https://nanxgodqaq.vercel.app/" target="_blank" rel="noopener">前往有缓存的 Vercel 站点 →</a>
      </div>

      <!-- 失败 -->
      <div v-else-if="error" class="nc-state">
        <div class="st-ic">📡</div>
        <div class="st-t">资讯加载失败</div>
        <div class="st-d">{{ error }}</div>
        <button class="st-btn" @click="load(true)">重试</button>
      </div>

      <!-- 列表：左栏 AI，右栏国际政军 / 热点 / 生活 -->
      <template v-else>
        <div class="nc-cols" :class="{ single: columns.length === 1 }">
          <div v-for="(col, ci) in columns" :key="ci" class="nc-col">
            <div v-for="g in col" :key="g.cat" class="nc-group">
              <div class="nc-cat" :class="'cat-' + g.cat">
                <span class="cat-dot"></span>{{ g.label }}
                <span class="cat-n">{{ g.items.length }}</span>
              </div>
              <!-- 单击展开全文，双击打开原文链接（双击的第二下 click 会被定时器吞掉） -->
              <div
                v-for="(it, i) in g.items"
                :key="g.cat + i"
                class="nc-item"
                :class="{ open: isOpen(g.cat, i) }"
                role="button"
                tabindex="0"
                :aria-expanded="isOpen(g.cat, i)"
                :data-url="it.url || ''"
                @click="onItemClick(it, g.cat, i)"
                @dblclick="onItemOpen(it)"
                @keydown.enter.prevent="onItemClick(it, g.cat, i)"
              >
                <div class="nc-tt">{{ it.tt }}</div>
                <div v-if="it.dd" class="nc-dd">{{ it.dd }}</div>
                <div class="nc-meta">
                  <span v-if="it.src" class="nc-src">{{ it.src }}</span>
                  <span v-if="it.date" class="nc-idate">{{ it.date.slice(5) }}</span>
                </div>
              </div>
            </div>
          </div>
        </div>
        <div class="nc-tail">单击展开全文 · 双击打开原文 · 共 {{ items.length }} 条 · 每日 0 点后更新</div>
      </template>
    </div>
  </div>
</template>

<script setup>
import { ref, computed, onMounted, onUnmounted } from 'vue'
import { fetchNews, groupByCat } from '../utils/news.js'

const items = ref([])
const loading = ref(true)
const refreshing = ref(false)
const error = ref('')
const notConfigured = ref(false)
const unsupported = ref(false)
const cachedAt = ref(0)
const scrollRef = ref(null)

/* 展开态：单击某条资讯时解除它的行数限制，看完整摘要 */
const expanded = ref(Object.create(null))

function isOpen(cat, i) { return !!expanded.value[cat + '-' + i] }

/* 单击与双击的区分：单击先挂一个定时器，双击的第二下把它清掉、交给 @dblclick。
   230ms 是"双击间隔"的常规上限——再长单击就会显得迟钝，再短双击会被拆成两次展开。 */
let clickTimer = null

function onItemClick(it, cat, i) {
  const key = cat + '-' + i
  if (clickTimer) { clearTimeout(clickTimer); clickTimer = null; return }
  clickTimer = setTimeout(() => {
    clickTimer = null
    expanded.value[key] = !expanded.value[key]
  }, 230)
}

function onItemOpen(it) {
  if (clickTimer) { clearTimeout(clickTimer); clickTimer = null }
  if (it.url) window.open(it.url, '_blank', 'noopener')
}

// 两栏分配：左栏 = AI + 生活，右栏 = 国际政军 + 热点 → 正好各 5 条。
// 按条数配平而不是按"哪边类目重要"，是为了让两栏底边齐平，不至于一栏滚出一大截。
// 某一栏为空时自动变成单栏满宽。
const LEFT_CATS = ['ai', 'life']

// 窄屏（≤720px，与 CSS 断点一致）会折成单栏。此时再按 LEFT_CATS 分栏会把
// "生活"从末尾提到第二组，读起来很跳；所以单栏时直接按类目自然顺序铺开。
const DUAL_MIN = 720
const dual = ref(typeof window !== 'undefined' && window.innerWidth > DUAL_MIN)
function onResize() { dual.value = window.innerWidth > DUAL_MIN }

const columns = computed(() => {
  const gs = groupByCat(items.value)
  if (!dual.value) return [gs]
  const left = gs.filter(g => LEFT_CATS.includes(g.cat))
  const right = gs.filter(g => !LEFT_CATS.includes(g.cat))
  return [left, right].filter(c => c.length)
})

const dateLabel = computed(() => {
  const d = new Date()
  return `${d.getMonth() + 1}月${d.getDate()}日`
})

const updatedAt = computed(() =>
  cachedAt.value ? new Date(cachedAt.value).toTimeString().slice(0, 5) : ''
)

async function load(force = false) {
  if (force) refreshing.value = true
  error.value = ''
  notConfigured.value = false
  unsupported.value = false
  expanded.value = Object.create(null)   // 换一批资讯后，展开态一并清掉
  try {
    const r = await fetchNews({ force })
    if (r.notConfigured) {
      notConfigured.value = true
      items.value = []
    } else if (r.unsupported) {
      unsupported.value = true
      items.value = []
    } else if (r.items.length) {
      items.value = r.items
      cachedAt.value = r.cachedAt || Date.now()
    } else {
      error.value = r.error ? `网络异常（${r.error}）` : '暂无数据'
    }
  } catch (e) {
    error.value = '网络异常，请稍后重试'
  } finally {
    loading.value = false
    refreshing.value = false
  }
}

onMounted(() => {
  load(false)
  window.addEventListener('resize', onResize)
})
onUnmounted(() => window.removeEventListener('resize', onResize))
</script>

<style scoped>
.nc {
  position: relative;
  display: flex;
  flex-direction: column;
  height: 100%;
  min-height: 320px;
  border-radius: 18px;
  overflow: hidden;
  border: 1px solid rgba(255, 255, 255, 0.08);
  /* 底色是有颜色的渐变：即便背景图没加载出来，也绝不至于是一块黑 */
  background: linear-gradient(150deg, #2b2560 0%, #1a1940 46%, #2e1f52 100%);
  backdrop-filter: blur(18px);
  -webkit-backdrop-filter: blur(18px);
  transition: transform 0.4s cubic-bezier(0.23, 1, 0.32, 1), box-shadow 0.4s ease, border-color 0.4s ease;
}
.nc:hover {
  transform: translateY(-3px);
  border-color: rgba(129, 140, 248, 0.28);
  box-shadow: 0 16px 44px rgba(0, 0, 0, 0.42), 0 0 30px rgba(99, 102, 241, 0.1);
}

/* 背景图层：暗调云海，缓慢推近增强纵深 */
.nc-bg {
  position: absolute;
  inset: 0;
  background: url('/images/news-bg.webp') center 34% / cover no-repeat;
  transform: scale(1.04);
  transition: transform 0.9s cubic-bezier(0.23, 1, 0.32, 1);
}
.nc:hover .nc-bg { transform: scale(1.09); }
/* 遮罩：上一版压得只剩黑，底部完全没有颜色。现在底图本身够彩，
   遮罩只需负责拉开"文字 vs 背景"的对比——顶部基本放行，向下逐级加深给列表兜底。 */
.nc-veil {
  position: absolute;
  inset: 0;
  background:
    linear-gradient(
      180deg,
      rgba(9, 8, 26, 0.16) 0%,
      rgba(8, 7, 22, 0.34) 42%,
      rgba(6, 5, 16, 0.70) 100%
    ),
    radial-gradient(130% 55% at 8% 0%, rgba(99, 102, 241, 0.20), transparent 74%);
}

/* 底部渐隐：暗示列表可继续滚动 */
.nc::after {
  content: '';
  position: absolute;
  left: 0;
  right: 0;
  bottom: 0;
  height: 46px;
  background: linear-gradient(to top, rgba(6, 5, 16, 0.96) 12%, rgba(6, 5, 16, 0));
  pointer-events: none;
  z-index: 3;
}

/* ---- 头部 ---- */
.nc-head {
  position: relative;
  z-index: 2;
  flex: 0 0 auto;
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 10px;
  padding: 13px 15px 10px;
  border-bottom: 1px solid rgba(255, 255, 255, 0.07);
  background: linear-gradient(180deg, rgba(255, 255, 255, 0.05), transparent);
}
.nc-title { display: flex; align-items: center; gap: 9px; min-width: 0; }
.nc-ic {
  display: grid;
  place-items: center;
  width: 26px;
  height: 26px;
  flex: 0 0 auto;
  border-radius: 9px;
  font-size: 13px;
  background: linear-gradient(135deg, rgba(99, 102, 241, 0.35), rgba(124, 58, 237, 0.2));
  border: 1px solid rgba(129, 140, 248, 0.26);
  box-shadow: 0 2px 10px rgba(99, 102, 241, 0.16);
}
.nc-tt-wrap { display: flex; flex-direction: column; gap: 1px; min-width: 0; }
.nc-t {
  font-size: 14.5px;
  font-weight: 700;
  color: var(--text);
  letter-spacing: 0.3px;
  line-height: 1.25;
  text-shadow: 0 1px 10px rgba(0, 0, 0, 0.55);
}
/* 署名行：字号最小、字距略散，让"数据来源"退到标题之后 */
.nc-sub {
  font-size: 9px;
  line-height: 1.3;
  letter-spacing: 0.4px;
  color: rgba(255, 255, 255, 0.5);
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
  text-shadow: 0 1px 6px rgba(0, 0, 0, 0.6);
}
.nc-sub b { font-weight: 600; color: rgba(199, 210, 254, 0.9); }
.nc-sub i { font-style: normal; color: rgba(255, 255, 255, 0.28); margin: 0 1px; }
.nc-date {
  flex: 0 0 auto;
  font-size: 10.5px;
  color: rgba(255, 255, 255, 0.6);
  padding: 1px 7px;
  border-radius: 999px;
  background: rgba(255, 255, 255, 0.07);
  border: 1px solid rgba(255, 255, 255, 0.08);
}
.nc-actions { display: flex; align-items: center; gap: 8px; flex: 0 0 auto; }
.nc-updated { font-size: 10.5px; color: var(--text-muted); font-variant-numeric: tabular-nums; }
.nc-refresh {
  display: grid;
  place-items: center;
  width: 26px;
  height: 26px;
  border-radius: 50%;
  background: rgba(255, 255, 255, 0.06);
  border: 1px solid rgba(255, 255, 255, 0.1);
  color: var(--text-secondary);
  cursor: pointer;
  transition: all 0.22s ease;
}
.nc-refresh:hover { background: rgba(255, 255, 255, 0.14); color: var(--text); border-color: rgba(255, 255, 255, 0.2); }
.nc-refresh.spinning svg { animation: nc-spin 0.9s linear infinite; }
@keyframes nc-spin { to { transform: rotate(360deg); } }

/* ---- 滚动区 ---- */
.nc-body {
  position: relative;
  z-index: 2;
  flex: 1;
  min-height: 0;
  display: flex;
  flex-direction: column;
  overflow-y: auto;
  padding: 10px 12px 12px;
  scrollbar-width: thin;
  scrollbar-color: rgba(255, 255, 255, 0.16) transparent;
}
.nc-body::-webkit-scrollbar { width: 6px; }
.nc-body::-webkit-scrollbar-thumb {
  background: rgba(255, 255, 255, 0.14);
  border-radius: 999px;
}
.nc-body::-webkit-scrollbar-thumb:hover { background: rgba(255, 255, 255, 0.26); }

/* ---- 分组 ---- */
/* 双栏：左 AI、右 政军+热点+生活。中间用一条虚线分隔，视觉上像一张报头 */
.nc-cols {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 0 16px;
}
.nc-cols.single { grid-template-columns: 1fr; }
.nc-col { min-width: 0; }
.nc-col + .nc-col {
  border-left: 1px dashed rgba(255, 255, 255, 0.1);
  padding-left: 16px;
}
.nc-group + .nc-group { margin-top: 9px; }
.nc-cat {
  display: flex;
  align-items: center;
  gap: 6px;
  font-size: 11px;
  letter-spacing: 0.9px;
  font-weight: 600;
  margin: 0 0 4px;
  padding-bottom: 3px;
  border-bottom: 1px dashed rgba(255, 255, 255, 0.09);
  color: var(--text-muted);
}
.cat-n {
  margin-left: auto;
  font-size: 9.5px;
  font-weight: 500;
  letter-spacing: 0;
  color: rgba(255, 255, 255, 0.3);
  padding: 0 5px;
  border-radius: 999px;
  background: rgba(255, 255, 255, 0.05);
}
.cat-dot { width: 6px; height: 6px; border-radius: 50%; background: currentColor; box-shadow: 0 0 8px currentColor; }
.cat-ai { color: #a5b4fc; }
.cat-polmil { color: #7dd3fc; }
.cat-hot { color: #fbbf24; }
.cat-life { color: #6ee7b7; }

/* ---- 单条 ---- */
/* 单击展开全文 / 双击打开原文。touch-action 防止移动端把双击当成双击缩放 */
.nc-item {
  display: block;
  padding: 5px 8px 6px;
  border-radius: 10px;
  border-left: 2px solid transparent;
  cursor: pointer;
  touch-action: manipulation;
  transition: background 0.2s ease, border-color 0.2s ease, transform 0.2s ease;
}
.nc-item:focus-visible {
  outline: 1px solid rgba(129, 140, 248, 0.55);
  outline-offset: 1px;
}
.nc-item:hover {
  background: rgba(255, 255, 255, 0.06);
  border-left-color: var(--accent);
  transform: translateX(2px);
}
/* 展开态：解除行数限制，摘要给足对比度；来源胶囊也不再截断 */
.nc-item.open .nc-dd {
  display: block;
  -webkit-line-clamp: unset;
  line-clamp: unset;
  color: rgba(255, 255, 255, 0.72);
}
.nc-item.open .nc-src { max-width: none; }
.nc-tt {
  font-size: 12.5px;
  font-weight: 500;
  color: rgba(255, 255, 255, 0.95);
  line-height: 1.4;
  margin-bottom: 2px;
  text-shadow: 0 1px 7px rgba(0, 0, 0, 0.5);
}
.nc-dd {
  font-size: 10.5px;
  color: rgba(255, 255, 255, 0.6);
  line-height: 1.55;
  text-shadow: 0 1px 5px rgba(0, 0, 0, 0.4);
  display: -webkit-box;
  -webkit-line-clamp: 2;
  line-clamp: 2;
  -webkit-box-orient: vertical;
  overflow: hidden;
}
/* 双栏时两栏摘要统一收成一行：一是省高度好把卡片压矮，
   二是两栏条目数配平（各 5 条）后本来就需要一致的节奏。 */
.nc-cols:not(.single) .nc-dd {
  -webkit-line-clamp: 1;
  line-clamp: 1;
}
.nc-meta { display: flex; align-items: center; gap: 6px; margin-top: 3px; }
.nc-src {
  font-size: 9.5px;
  color: rgba(255, 255, 255, 0.42);
  padding: 0 6px;
  border-radius: 999px;
  background: rgba(255, 255, 255, 0.05);
  max-width: 130px;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}
.nc-idate { font-size: 9.5px; color: rgba(255, 255, 255, 0.32); font-variant-numeric: tabular-nums; }

.nc-tail {
  margin-top: auto;
  text-align: center;
  font-size: 10px;
  color: rgba(255, 255, 255, 0.26);
  padding: 6px 0 2px;
  letter-spacing: 0.5px;
}

/* ---- 骨架 ---- */
.nc-sk { padding: 9px 10px; }
.sk-line {
  height: 9px;
  border-radius: 4px;
  background: linear-gradient(90deg, rgba(255, 255, 255, 0.05), rgba(255, 255, 255, 0.11), rgba(255, 255, 255, 0.05));
  background-size: 200% 100%;
  animation: sk-shimmer 1.5s ease-in-out infinite;
  margin-bottom: 7px;
}
.sk-line:last-child { margin-bottom: 0; }
.w70 { width: 70%; }
.w95 { width: 95%; }
.w30 { width: 30%; }
@keyframes sk-shimmer {
  0% { background-position: 200% 0; }
  100% { background-position: -200% 0; }
}

/* ---- 状态 ---- */
.nc-state {
  flex: 1;
  justify-content: center;
  padding: 32px 20px;
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 9px;
  text-align: center;
}
.st-ic { font-size: 28px; opacity: 0.65; }
.st-t { font-size: 13px; color: var(--text-secondary); font-weight: 500; }
.st-d { font-size: 11px; color: var(--text-muted); line-height: 1.7; max-width: 300px; }
.st-d code {
  font-family: ui-monospace, 'SFMono-Regular', Consolas, monospace;
  font-size: 10px;
  padding: 1px 5px;
  border-radius: 4px;
  background: rgba(255, 255, 255, 0.08);
  color: #c7d2fe;
}
.st-btn {
  display: inline-block;
  margin-top: 4px;
  padding: 5px 16px;
  border-radius: 999px;
  border: 1px solid rgba(255, 255, 255, 0.14);
  background: rgba(255, 255, 255, 0.06);
  color: var(--text);
  font-size: 12px;
  text-decoration: none;
  cursor: pointer;
  transition: all 0.2s ease;
}
.st-btn:hover { background: rgba(255, 255, 255, 0.14); }

/* ---- 窄屏 ---- */
@media (max-width: 1024px) {
  /* 单列后条目变高、宽度变窄，再套一个内部滚动条就成了"滚动里套滚动"，
     体验很差。这里改成自然高度：卡片铺开多少就多少，由页面统一滚动。 */
  .nc { height: auto; min-height: 0; }
  .nc-body { overflow-y: visible; }
  .nc::after { display: none; }
}

@media (max-width: 720px) {
  /* 单栏：两栏在这个宽度下每栏只剩 150px 左右，反而比单栏更难读 */
  .nc-cols { grid-template-columns: 1fr; gap: 0; }
  .nc-col + .nc-col {
    border-left: none;
    padding-left: 0;
    margin-top: 14px;
    padding-top: 14px;
    border-top: 1px dashed rgba(255, 255, 255, 0.1);
  }
  .nc-cols:not(.single) .nc-col + .nc-col .nc-dd { -webkit-line-clamp: 2; line-clamp: 2; }
}

@media (max-width: 520px) {
  .nc-head { padding: 14px 13px 12px; }
  /* 宽度不够时，让日期胶囊和更新时间先让位，保证署名行完整不被截断 */
  .nc-date, .nc-updated { display: none; }
  .nc-sub { font-size: 8.5px; letter-spacing: 0.2px; }
}
</style>
