<template>
  <div class="mini-player glass-card" :class="{ open }">
    <div class="mp-body">
      <!-- 左：旋转圆盘（正圆黑胶，固定直径） -->
      <div class="mp-art" :class="{ spinning: playing }">
        <img :src="currentTrack.cover || DEFAULT_COVER" alt="cover" class="mp-art-img" />
      </div>

      <!-- 右：标题 / 作者 上下两行，三个按键放在文字与右侧下拉之间 -->
      <div class="mp-right">
        <div class="mp-main-row">
          <div class="mp-info">
            <div class="mp-title" :title="currentTrack.title">{{ currentTrack.title }}</div>
            <div class="mp-artist">{{ currentTrack.artist }}</div>
          </div>
          <div class="mp-controls">
            <button class="mp-btn" @click="prevTrack" title="上一首">
              <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polygon points="19 20 9 12 19 4 19 20" /><line x1="5" y1="19" x2="5" y2="5" /></svg>
            </button>
            <button class="mp-btn mp-btn-play" @click="togglePlay" :title="playing ? '暂停' : '播放'">
              <svg v-if="!playing" width="13" height="13" viewBox="0 0 24 24" fill="currentColor"><polygon points="6 3 20 12 6 21 6 3" /></svg>
              <svg v-else width="13" height="13" viewBox="0 0 24 24" fill="currentColor"><rect x="6" y="4" width="4" height="16" /><rect x="14" y="4" width="4" height="16" /></svg>
            </button>
            <button class="mp-btn" @click="nextTrack" title="下一首">
              <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polygon points="5 4 15 12 5 20 5 4" /><line x1="19" y1="5" x2="19" y2="19" /></svg>
            </button>
          </div>
          <button
            class="mp-fold"
            :class="{ on: open }"
            @click="open = !open"
            :title="open ? '收起列表' : '高级切歌 / 本地上传'"
          >
            <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><polyline points="6 9 12 15 18 9" /></svg>
          </button>
        </div>

        <div class="mp-progress" @click="seek">
          <span class="mp-t">{{ formatTime(currentTime) }}</span>
          <div class="mp-progress-bar">
            <div class="mp-progress-fill" :style="{ width: progress + '%' }"></div>
            <div class="mp-progress-thumb" :style="{ left: progress + '%' }"></div>
          </div>
          <span class="mp-t">{{ formatTime(duration) }}</span>
        </div>

        <div class="mp-volume">
          <button class="mp-vol-btn" @click="toggleMute" :title="muted ? '取消静音' : '静音'">
            <svg v-if="muted || volume === 0" width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polygon points="11 5 6 9 2 9 2 15 6 15 11 19 11 5" /><line x1="23" y1="9" x2="17" y2="15" /><line x1="17" y1="9" x2="23" y2="15" /></svg>
            <svg v-else width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polygon points="11 5 6 9 2 9 2 15 6 15 11 19 11 5" /><path d="M15.54 8.46a5 5 0 0 1 0 7.07" /></svg>
          </button>
          <input type="range" class="mp-vol-slider" min="0" max="1" step="0.01" :value="muted ? 0 : volume" @input="setVolume" />
        </div>
      </div>
    </div>

    <!-- 折叠面板：高级切歌（完整播放列表）+ 本地上传 -->
    <transition name="mp-fold">
      <div v-show="open" class="mp-panel">
        <div class="mp-panel-head">
          <span class="mp-pt">播放列表</span>
          <span class="mp-pn">{{ playlist.length }} 首</span>
          <label class="mp-upload" title="选择本地音乐（只在浏览器里播放，不会上传）">
            <input type="file" accept="audio/*" multiple hidden @change="onFiles" />
            <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" /><polyline points="17 8 12 3 7 8" /><line x1="12" y1="3" x2="12" y2="15" /></svg>
            本地上传
          </label>
        </div>

        <div class="mp-playlist" ref="listRef">
          <div
            v-for="(t, i) in playlist"
            :key="t.id"
            class="mp-playlist-item"
            :class="{ active: i === currentIndex }"
            @click="playTrack(i)"
          >
            <span class="mp-pl-num">{{ i === currentIndex && playing ? '♪' : i + 1 }}</span>
            <span class="mp-pl-title" :title="t.title">{{ t.title }}</span>
            <span v-if="t.local" class="mp-pl-badge">本地</span>
            <button v-if="t.local" class="mp-pl-x" @click.stop="removeLocal(i)" title="移除">×</button>
          </div>
        </div>

        <p class="mp-hint">本地音乐只在浏览器里播放，不会上传到服务器</p>
      </div>
    </transition>

    <audio
      ref="audioRef"
      :src="currentTrack.src"
      @timeupdate="onTimeUpdate"
      @loadedmetadata="onLoaded"
      @ended="nextTrack"
      @error="onError"
      @canplay="onCanPlay"
      preload="metadata"
    ></audio>
  </div>
</template>

<script setup>
import { ref, computed, nextTick, onBeforeUnmount } from 'vue'

const DEFAULT_COVER = '/images/avatar-placeholder.webp'
let uid = 0

const audioRef = ref(null)
const listRef = ref(null)
const playing = ref(false)
const shouldPlay = ref(false)
const currentTime = ref(0)
const duration = ref(0)
const currentIndex = ref(0)
const loadError = ref(false)
const volume = ref(0.25)
const muted = ref(false)
const open = ref(false)

/* 内置歌单：静态资源，随仓库走 */
const BUILTIN = [
  { title: '清晨微风', artist: '轻音乐', src: '/music/track1.mp3' },
  { title: '晨光微醺', artist: '轻电子', src: '/music/track13.mp3' },
  { title: '夜空星辰', artist: '氛围电子', src: '/music/track3.mp3' },
  { title: '夏夜虫鸣', artist: '自然白噪音', src: '/music/track5.mp3' },
  { title: '月光独白', artist: '爵士钢琴', src: '/music/track12.mp3' },
  { title: '海浪轻拍', artist: '环境音', src: '/music/track7.mp3' },
  { title: '咖啡时光', artist: 'Bossa Nova', src: '/music/track8.mp3' },
  { title: '远山淡影', artist: '后摇', src: '/music/track9.mp3' },
  { title: '城市霓虹', artist: 'Lo-Fi', src: '/music/track10.mp3' },
  { title: '星空漫步', artist: '氛围电子', src: '/music/track11.mp3' },
].map(t => ({ ...t, id: ++uid, local: false }))

/* 用户本地文件用 blob: URL 播放——只在内存里，刷新即失效，不落任何服务器 */
const localTracks = ref([])
const playlist = computed(() => [...BUILTIN, ...localTracks.value])

const currentTrack = computed(() => playlist.value[currentIndex.value] || playlist.value[0])

const progress = computed(() => {
  if (duration.value <= 0) return 0
  return (currentTime.value / duration.value) * 100
})

/* ---------- 本地上传 ---------- */
function onFiles(e) {
  const files = [...(e.target.files || [])].filter(f => f.type.startsWith('audio/') || /\.(mp3|flac|m4a|wav|ogg|aac)$/i.test(f.name))
  e.target.value = ''   // 允许重复选同一批文件
  if (!files.length) return

  const startAt = playlist.value.length
  const added = files.map(f => ({
    id: ++uid,
    title: f.name.replace(/\.[^.]+$/, ''),
    artist: '本地音乐',
    src: URL.createObjectURL(f),
    local: true,
  }))
  localTracks.value.push(...added)
  open.value = true

  // 没在放就顺手从第一首新歌开始播；在播就只追加不打断
  if (!playing.value) playTrack(startAt)
  else scrollToActive()
}

function removeLocal(i) {
  const t = playlist.value[i]
  if (!t || !t.local) return
  const wasCurrent = i === currentIndex.value
  localTracks.value = localTracks.value.filter(x => x.id !== t.id)
  URL.revokeObjectURL(t.src)

  if (wasCurrent) {
    playing.value = false
    shouldPlay.value = false
    if (audioRef.value) audioRef.value.pause()
    currentIndex.value = Math.min(i, playlist.value.length - 1)
    currentTime.value = 0
    duration.value = 0
  } else if (i < currentIndex.value) {
    currentIndex.value -= 1
  }
}

onBeforeUnmount(() => {
  localTracks.value.forEach(t => URL.revokeObjectURL(t.src))
})

/* 面板打开时把正在播的那条滚到可见处，方便确认"现在放到哪了" */
function scrollToActive() {
  nextTick(() => {
    const box = listRef.value
    if (!box) return
    const on = box.querySelector('.mp-playlist-item.active')
    if (on) on.scrollIntoView({ block: 'nearest' })
  })
}

/* ---------- 播放控制 ---------- */
function togglePlay() {
  const audio = audioRef.value
  if (!audio || !audio.src || loadError.value) return
  if (playing.value) {
    audio.pause()
    playing.value = false
  } else {
    shouldPlay.value = true
    audio.play().then(() => { playing.value = true }).catch(() => {
      playing.value = false
      shouldPlay.value = false
    })
  }
}

function playTrack(index) {
  playing.value = false
  currentIndex.value = index
  currentTime.value = 0
  duration.value = 0
  loadError.value = false
  shouldPlay.value = true
  scrollToActive()
  // 交给 @canplay 触发真正的 play()；已就绪就立刻播
  setTimeout(() => {
    const audio = audioRef.value
    if (audio && audio.readyState >= 2) {
      audio.play().then(() => { playing.value = true }).catch(() => { shouldPlay.value = false })
    }
  }, 100)
}

function onCanPlay() {
  if (shouldPlay.value) {
    const audio = audioRef.value
    if (audio) {
      shouldPlay.value = false
      audio.play().then(() => { playing.value = true }).catch(() => {})
    }
  }
}

function prevTrack() {
  const n = playlist.value.length
  playTrack(currentIndex.value <= 0 ? n - 1 : currentIndex.value - 1)
}

function nextTrack() {
  playTrack((currentIndex.value + 1) % playlist.value.length)
}

function onTimeUpdate() {
  if (audioRef.value) currentTime.value = audioRef.value.currentTime
}

function onLoaded() {
  if (audioRef.value) {
    duration.value = audioRef.value.duration || 0
    loadError.value = false
    audioRef.value.volume = volume.value
  }
}

function onError() {
  loadError.value = true
  playing.value = false
}

function seek(e) {
  const audio = audioRef.value
  if (!audio || !duration.value) return
  const rect = e.currentTarget.querySelector('.mp-progress-bar').getBoundingClientRect()
  const pct = (e.clientX - rect.left) / rect.width
  audio.currentTime = pct * duration.value
}

function formatTime(s) {
  if (!s || isNaN(s)) return '0:00'
  const m = Math.floor(s / 60)
  const sec = Math.floor(s % 60)
  return m + ':' + (sec < 10 ? '0' : '') + sec
}

function toggleMute() {
  muted.value = !muted.value
  if (audioRef.value) audioRef.value.volume = muted.value ? 0 : volume.value
}

function setVolume(e) {
  volume.value = parseFloat(e.target.value)
  muted.value = false
  if (audioRef.value) audioRef.value.volume = volume.value
}
</script>

<style scoped>
.mini-player {
  padding: 8px 9px;
  border-radius: 14px;
  display: flex;
  flex-direction: column;
  gap: 5px;
  /* 宽度是量出来的：9+88+11+文字(~56)+12+按键(90)+12+开关(22)+9 ≈ 310，
     取 320 留一点余量。开太大右侧会空出一截，整行看起来就歪了
     （scripts/verify-layout.cjs 的 播放器间距 会打印每段实际间距，改完量一遍）。 */
  width: 320px;
  max-width: 100%;
  user-select: none;
}

/* ---- 主体：左侧正圆黑胶（固定直径），右侧三行控制 ---- */
.mp-body { display: flex; align-items: center; gap: 11px; }

.mp-art {
  width: 88px;
  height: 88px;
  flex-shrink: 0;
  border-radius: 50%;          /* 必须是正圆——上一版 align-self:stretch 把它拉成了圆角矩形 */
  overflow: hidden;
  /* 黑胶唱片：暗底 + 一圈圈刻纹 */
  background: repeating-radial-gradient(circle at 50% 50%, rgba(255,255,255,0.055) 0 1px, rgba(18,18,32,0.95) 1px 3px);
  border: 1px solid rgba(255,255,255,0.1);
  display: flex;
  align-items: center;
  justify-content: center;
  position: relative;
  box-shadow: inset 0 0 12px rgba(0,0,0,0.5), 0 4px 16px rgba(0,0,0,0.35);
}
.mp-art-img {
  width: 72%;          /* 56% 时外圈黑胶太厚，提到 72% 让封面当主角 */
  height: 72%;
  object-fit: cover;
  border-radius: 50%;
  border: 1px solid rgba(255,255,255,0.12);
}
.mp-art::after {
  content: '';
  position: absolute;
  width: 5px;
  height: 5px;
  border-radius: 50%;
  background: rgba(10,10,18,0.95);
  border: 1px solid rgba(255,255,255,0.2);
  left: 50%;
  top: 50%;
  transform: translate(-50%, -50%);
}
.mp-art.spinning .mp-art-img { animation: coverSpin 8s linear infinite; }
@keyframes coverSpin { to { transform: rotate(360deg); } }

.mp-right {
  flex: 1;
  min-width: 0;
  display: flex;
  flex-direction: column;
  gap: 7px;
}

/* 标题 / 作者 上下两行；右侧依次是三个播放键与列表开关 */
.mp-main-row { display: flex; align-items: center; gap: 12px; }
/* 不用 flex:1 —— 之前那样会把按键推到最右，标题和按键之间空出一大块。
   现在三段（文字/按键/下拉）等距 12px，紧跟圆盘排布。 */
.mp-info {
  flex: 0 1 auto;
  min-width: 0;
  display: flex;
  flex-direction: column;
  gap: 2px;
}
.mp-title {
  font-size: 13px;
  font-weight: 600;
  color: var(--text);
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}
.mp-artist {
  font-size: 10px;
  color: var(--text-muted);
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

/* 切歌 + 暂停：夹在文字与右侧列表开关之间 */
.mp-controls { display: flex; align-items: center; gap: 6px; flex-shrink: 0; }
.mp-btn {
  width: 24px;
  height: 24px;
  border-radius: 50%;
  border: 1px solid rgba(255,255,255,0.08);
  background: rgba(255,255,255,0.03);
  color: var(--text-secondary);
  cursor: pointer;
  display: flex;
  align-items: center;
  justify-content: center;
  transition: all 0.2s;
}
.mp-btn:hover { background: rgba(255,255,255,0.08); color: var(--text); border-color: rgba(255,255,255,0.15); }
.mp-btn-play {
  width: 30px;
  height: 30px;
  background: linear-gradient(135deg, var(--accent), #7c3aed);
  border: none;
  color: white;
  box-shadow: 0 3px 12px rgba(99,102,241,0.3);
}
.mp-btn-play:hover {
  background: linear-gradient(135deg, #7c3aed, var(--accent));
  box-shadow: 0 5px 18px rgba(99,102,241,0.45);
  color: white;
}

.mp-fold {
  width: 22px;
  height: 22px;
  flex-shrink: 0;
  border-radius: 50%;
  border: 1px solid rgba(255,255,255,0.08);
  background: rgba(255,255,255,0.03);
  color: var(--text-muted);
  cursor: pointer;
  display: flex;
  align-items: center;
  justify-content: center;
  transition: all 0.2s;
}
.mp-fold:hover { background: rgba(255,255,255,0.08); color: var(--text); }
.mp-fold svg { transition: transform 0.25s ease; }
.mp-fold.on svg { transform: rotate(180deg); }

/* 进度：时间两端，条在中间 */
.mp-progress { display: flex; align-items: center; gap: 5px; cursor: pointer; padding: 2px 0; }
.mp-t {
  font-size: 8.5px;
  color: var(--text-muted);
  font-variant-numeric: tabular-nums;
  flex-shrink: 0;
}
.mp-progress-bar {
  flex: 1;
  min-width: 0;
  height: 3px;
  background: rgba(255,255,255,0.1);
  border-radius: 2px;
  position: relative;
}
.mp-progress-fill {
  height: 100%;
  background: linear-gradient(90deg, var(--accent), var(--purple));
  border-radius: 2px;
}
.mp-progress-thumb {
  position: absolute;
  top: 50%;
  transform: translate(-50%, -50%);
  width: 7px;
  height: 7px;
  border-radius: 50%;
  background: white;
  opacity: 0;
  transition: opacity 0.15s;
  box-shadow: 0 0 6px rgba(255,255,255,0.4);
}
.mini-player:hover .mp-progress-thumb { opacity: 1; }

/* 音量：显性常驻 */
.mp-volume { display: flex; align-items: center; gap: 5px; }
.mp-vol-btn {
  width: 20px;
  height: 20px;
  border-radius: 50%;
  border: 1px solid rgba(255,255,255,0.08);
  background: rgba(255,255,255,0.03);
  color: var(--text-secondary);
  cursor: pointer;
  display: flex;
  align-items: center;
  justify-content: center;
  flex-shrink: 0;
  transition: all 0.2s;
}
.mp-vol-btn:hover { background: rgba(255,255,255,0.08); color: var(--text); }
.mp-vol-slider {
  -webkit-appearance: none;
  appearance: none;
  flex: 1;
  min-width: 0;
  height: 3px;
  border-radius: 2px;
  background: rgba(255,255,255,0.12);
  outline: none;
  cursor: pointer;
}
.mp-vol-slider::-webkit-slider-thumb {
  -webkit-appearance: none;
  width: 10px;
  height: 10px;
  border-radius: 50%;
  background: var(--accent);
  cursor: pointer;
  box-shadow: 0 0 6px rgba(99,102,241,0.3);
}
.mp-vol-slider::-moz-range-thumb {
  width: 10px;
  height: 10px;
  border-radius: 50%;
  background: var(--accent);
  border: none;
  cursor: pointer;
}

/* ---- 折叠面板：高级切歌 ---- */
.mp-panel {
  border-top: 1px solid rgba(255,255,255,0.06);
  padding-top: 6px;
  display: flex;
  flex-direction: column;
  gap: 6px;
}
.mp-fold-enter-active, .mp-fold-leave-active { transition: opacity 0.18s ease, transform 0.18s ease; }
.mp-fold-enter-from, .mp-fold-leave-to { opacity: 0; transform: translateY(-4px); }

.mp-panel-head { display: flex; align-items: center; gap: 7px; }
.mp-pt {
  font-size: 9.5px;
  letter-spacing: 1.5px;
  text-transform: uppercase;
  color: var(--purple);
  font-weight: 600;
}
.mp-pn { font-size: 9.5px; color: var(--text-muted); font-variant-numeric: tabular-nums; }
.mp-upload {
  margin-left: auto;
  display: inline-flex;
  align-items: center;
  gap: 4px;
  padding: 3px 9px;
  border-radius: 999px;
  font-size: 10px;
  color: var(--text-secondary);
  background: rgba(255,255,255,0.05);
  border: 1px solid rgba(255,255,255,0.1);
  cursor: pointer;
  transition: all 0.2s;
  white-space: nowrap;
}
.mp-upload:hover { background: rgba(129,140,248,0.16); border-color: rgba(129,140,248,0.32); color: var(--text); }

.mp-playlist {
  display: flex;
  flex-direction: column;
  gap: 1px;
  max-height: 148px;
  overflow-y: auto;
  scrollbar-width: thin;
  scrollbar-color: rgba(255,255,255,0.14) transparent;
}
.mp-playlist::-webkit-scrollbar { width: 3px; }
.mp-playlist::-webkit-scrollbar-thumb { background: rgba(255,255,255,0.1); border-radius: 2px; }

.mp-playlist-item {
  display: flex;
  align-items: center;
  gap: 6px;
  padding: 4px 6px;
  border-radius: 6px;
  cursor: pointer;
  transition: background 0.15s, color 0.15s;
  font-size: 10.5px;
  color: var(--text-muted);
}
.mp-playlist-item:hover { background: rgba(255,255,255,0.05); color: var(--text-secondary); }
.mp-playlist-item.active { color: var(--accent); background: rgba(99,102,241,0.1); }
.mp-pl-num { width: 14px; text-align: center; font-size: 9.5px; flex-shrink: 0; }
.mp-pl-title { flex: 1; min-width: 0; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
.mp-pl-badge { flex-shrink: 0; font-size: 8px; color: rgba(110,231,183,0.75); }
.mp-pl-x {
  flex-shrink: 0;
  width: 15px;
  height: 15px;
  border: none;
  border-radius: 50%;
  background: transparent;
  color: var(--text-muted);
  font-size: 12px;
  line-height: 1;
  cursor: pointer;
  display: flex;
  align-items: center;
  justify-content: center;
  transition: all 0.15s;
}
.mp-pl-x:hover { background: rgba(248,113,113,0.18); color: #fca5a5; }

.mp-hint {
  margin: 0;
  font-size: 8.5px;
  color: rgba(255,255,255,0.24);
  text-align: center;
  letter-spacing: 0.3px;
}

@media (max-width: 768px) {
  .mini-player { width: 100%; padding: 9px 10px; gap: 6px; }
  .mp-art { width: 74px; height: 74px; }
  .mp-title { font-size: 12px; }
  .mp-btn { width: 22px; height: 22px; }
  .mp-btn-play { width: 27px; height: 27px; }
  .mp-fold { width: 20px; height: 20px; }
  /* 窄屏：标题/作者独占一行，按键与开关落到第二行（硬塞一行只会把文字截成"de…"） */
  .mp-main-row { flex-wrap: wrap; row-gap: 8px; }
  .mp-info { flex: 1 0 100%; }
  .mp-controls { gap: 6px; }
  .mp-fold { margin-left: 12px; }
}
</style>
