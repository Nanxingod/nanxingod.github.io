<template>
  <div class="mini-player glass-card">
    <div class="mp-main-row">
      <div class="mp-art" :class="{ spinning: playing }">
        <img src="/images/avatar-placeholder.png" alt="cover" class="mp-art-img" />
      </div>
      <div class="mp-info">
        <div class="mp-title">{{ currentTrack.title }}</div>
        <div class="mp-artist">{{ currentTrack.artist }}</div>
      </div>
      <div class="mp-controls">
        <button class="mp-btn" @click="prevTrack" title="上一首">
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polygon points="19 20 9 12 19 4 19 20"/><line x1="5" y1="19" x2="5" y2="5"/></svg>
        </button>
        <button class="mp-btn mp-btn-play" @click="togglePlay" :title="playing ? '暂停' : '播放'">
          <svg v-if="!playing" width="18" height="18" viewBox="0 0 24 24" fill="currentColor"><polygon points="5 3 19 12 5 21 5 3"/></svg>
          <svg v-else width="18" height="18" viewBox="0 0 24 24" fill="currentColor"><rect x="6" y="4" width="4" height="16"/><rect x="14" y="4" width="4" height="16"/></svg>
        </button>
        <button class="mp-btn" @click="nextTrack" title="下一首">
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polygon points="5 4 15 12 5 20 5 4"/><line x1="19" y1="5" x2="19" y2="19"/></svg>
        </button>
      </div>
    </div>

    <div class="mp-progress" @click="seek">
      <div class="mp-progress-bar">
        <div class="mp-progress-fill" :style="{ width: progress + '%' }"></div>
        <div class="mp-progress-thumb" :style="{ left: progress + '%' }"></div>
      </div>
      <div class="mp-time">
        <span>{{ formatTime(currentTime) }}</span>
        <span>{{ formatTime(duration) }}</span>
      </div>
    </div>

    <div class="mp-volume">
      <button class="mp-vol-btn" @click="toggleMute" :title="muted ? '取消静音' : '静音'">
        <svg v-if="muted || volume === 0" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polygon points="11 5 6 9 2 9 2 15 6 15 11 19 11 5"/><line x1="23" y1="9" x2="17" y2="15"/><line x1="17" y1="9" x2="23" y2="15"/></svg>
        <svg v-else-if="volume < 0.5" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polygon points="11 5 6 9 2 9 2 15 6 15 11 19 11 5"/><path d="M15.54 8.46a5 5 0 0 1 0 7.07"/></svg>
        <svg v-else width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polygon points="11 5 6 9 2 9 2 15 6 15 11 19 11 5"/><path d="M19.07 4.93a10 10 0 0 1 0 14.14M15.54 8.46a5 5 0 0 1 0 7.07"/></svg>
      </button>
      <input
        type="range"
        class="mp-vol-slider"
        min="0"
        max="1"
        step="0.01"
        :value="muted ? 0 : volume"
        @input="setVolume"
      />
    </div>

    <div class="mp-playlist">
      <div
        v-for="(track, i) in playlist"
        :key="i"
        class="mp-playlist-item"
        :class="{ active: i === currentIndex }"
        @click="playTrack(i)"
      >
        <span class="mp-pl-num">{{ i === currentIndex && playing ? '♪' : i + 1 }}</span>
        <span class="mp-pl-title">{{ track.title }}</span>
      </div>
    </div>

    <audio
      ref="audioRef"
      :src="currentTrack.src"
      @timeupdate="onTimeUpdate"
      @loadedmetadata="onLoaded"
      @ended="nextTrack"
      @error="onError"
      preload="metadata"
    ></audio>
  </div>
</template>

<script setup>
import { ref, reactive, computed } from 'vue'

const audioRef = ref(null)
const playing = ref(false)
const currentTime = ref(0)
const duration = ref(0)
const currentIndex = ref(0)
const loadError = ref(false)
const volume = ref(0.25)
const muted = ref(false)

const playlist = [
  { title: '清晨微风', artist: '轻音乐', src: '/music/track1.mp3' },
  { title: '午后暖阳', artist: '治愈系', src: '/music/track2.mp3' },
  { title: '夜空星辰', artist: '氛围电子', src: '/music/track3.mp3' },
  { title: '樱花飘落', artist: '和风', src: '/music/track4.mp3' },
  { title: '夏夜虫鸣', artist: '自然白噪音', src: '/music/track5.mp3' },
  { title: '雨巷漫步', artist: '爵士钢琴', src: '/music/track6.mp3' },
  { title: '海浪轻拍', artist: '环境音', src: '/music/track7.mp3' },
  { title: '咖啡时光', artist: 'Bossa Nova', src: '/music/track8.mp3' },
  { title: '远山淡影', artist: '后摇', src: '/music/track9.mp3' },
  { title: '城市霓虹', artist: 'Lo-Fi', src: '/music/track10.mp3' },
]

const currentTrack = computed(() => playlist[currentIndex.value] || playlist[0])

const progress = computed(() => {
  if (duration.value <= 0) return 0
  return (currentTime.value / duration.value) * 100
})

function togglePlay() {
  const audio = audioRef.value
  if (!audio || !audio.src || loadError.value) return
  if (playing.value) {
    audio.pause()
  } else {
    audio.play().catch(() => {})
  }
  playing.value = !playing.value
}

function playTrack(index) {
  playing.value = false
  currentIndex.value = index
  currentTime.value = 0
  duration.value = 0
  loadError.value = false
  // auto-play after src change
  setTimeout(() => {
    const audio = audioRef.value
    if (audio) {
      audio.load()
      audio.play().then(() => { playing.value = true }).catch(() => {})
    }
  }, 100)
}

function prevTrack() {
  const idx = currentIndex.value <= 0 ? playlist.length - 1 : currentIndex.value - 1
  playTrack(idx)
}

function nextTrack() {
  const idx = (currentIndex.value + 1) % playlist.length
  playTrack(idx)
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
  if (audioRef.value) {
    audioRef.value.volume = muted.value ? 0 : volume.value
  }
}

function setVolume(e) {
  volume.value = parseFloat(e.target.value)
  muted.value = false
  if (audioRef.value) {
    audioRef.value.volume = volume.value
  }
}
</script>

<style scoped>
.mini-player {
  padding: 14px 16px;
  border-radius: 16px;
  display: flex;
  flex-direction: column;
  gap: 10px;
  width: 280px;
  max-width: 100%;
  user-select: none;
}

.mp-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
}

.mp-label {
  font-size: 11px;
  text-transform: uppercase;
  letter-spacing: 2px;
  color: var(--purple);
  font-weight: 600;
}

.mp-track-num {
  font-size: 10px;
  color: var(--text-muted);
}

.mp-main-row {
  display: flex;
  align-items: center;
  gap: 10px;
}

.mp-art {
  width: 52px;
  height: 52px;
  border-radius: 50%;
  overflow: hidden;
  flex-shrink: 0;
  background: linear-gradient(135deg, rgba(99,102,241,0.2), rgba(167,139,250,0.2));
  border: 1px solid rgba(255,255,255,0.08);
  display: flex;
  align-items: center;
  justify-content: center;
}

.mp-art-img {
  width: 100%;
  height: 100%;
  object-fit: cover;
  border-radius: 50%;
}

.mp-art.spinning .mp-art-img {
  animation: coverSpin 8s linear infinite;
}

@keyframes coverSpin {
  from { transform: rotate(0deg); }
  to { transform: rotate(360deg); }
}

.mp-art-inner {
  font-size: 20px;
  opacity: 0.8;
  animation: artFloat 3s ease-in-out infinite;
}

@keyframes artFloat {
  0%, 100% { transform: translateY(0); }
  50% { transform: translateY(-2px); }
}

.mp-info {
  flex: 1;
  min-width: 0;
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
  font-size: 11px;
  color: var(--text-muted);
  margin-top: 2px;
}

.mp-progress {
  cursor: pointer;
  padding: 4px 0;
}

.mp-progress-bar {
  height: 3px;
  background: rgba(255,255,255,0.1);
  border-radius: 2px;
  position: relative;
  overflow: visible;
}

.mp-progress-fill {
  height: 100%;
  background: linear-gradient(90deg, var(--accent), var(--purple));
  border-radius: 2px;
  transition: width 0.1s linear;
}

.mp-progress-thumb {
  position: absolute;
  top: 50%;
  transform: translate(-50%, -50%);
  width: 8px;
  height: 8px;
  border-radius: 50%;
  background: white;
  opacity: 0;
  transition: opacity 0.15s;
  box-shadow: 0 0 6px rgba(255,255,255,0.4);
}

.mini-player:hover .mp-progress-thumb { opacity: 1; }

.mp-time {
  display: flex;
  justify-content: space-between;
  margin-top: 3px;
  font-size: 9px;
  color: var(--text-muted);
  font-variant-numeric: tabular-nums;
}

.mp-controls {
  display: flex;
  align-items: center;
  gap: 4px;
  flex-shrink: 0;
}

.mp-volume {
  display: flex;
  align-items: center;
  gap: 6px;
  padding: 0 2px;
}

.mp-vol-btn {
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
  flex-shrink: 0;
  transition: all 0.2s;
}

.mp-vol-btn:hover {
  background: rgba(255,255,255,0.08);
  color: var(--text);
}

.mp-vol-slider {
  -webkit-appearance: none;
  appearance: none;
  flex: 1;
  height: 4px;
  border-radius: 2px;
  background: rgba(255,255,255,0.12);
  outline: none;
  cursor: pointer;
}

.mp-vol-slider::-webkit-slider-thumb {
  -webkit-appearance: none;
  width: 12px;
  height: 12px;
  border-radius: 50%;
  background: var(--accent);
  cursor: pointer;
  box-shadow: 0 0 6px rgba(99,102,241,0.3);
}

.mp-vol-slider::-moz-range-thumb {
  width: 12px;
  height: 12px;
  border-radius: 50%;
  background: var(--accent);
  border: none;
  cursor: pointer;
}

.mp-btn {
  width: 30px;
  height: 30px;
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

.mp-btn:hover {
  background: rgba(255,255,255,0.08);
  color: var(--text);
  border-color: rgba(255,255,255,0.15);
}

.mp-btn-play {
  width: 38px;
  height: 38px;
  background: linear-gradient(135deg, var(--accent), #7c3aed);
  border: none;
  color: white;
  box-shadow: 0 4px 16px rgba(99,102,241,0.3);
}

.mp-btn-play:hover {
  background: linear-gradient(135deg, #7c3aed, var(--accent));
  box-shadow: 0 6px 24px rgba(99,102,241,0.45);
  color: white;
}

.mp-playlist {
  display: flex;
  flex-direction: column;
  gap: 2px;
  border-top: 1px solid rgba(255,255,255,0.05);
  padding-top: 6px;
  max-height: 80px;
  overflow-y: auto;
}

.mp-playlist-item {
  display: flex;
  align-items: center;
  gap: 6px;
  padding: 4px 6px;
  border-radius: 6px;
  cursor: pointer;
  transition: all 0.15s;
  font-size: 11px;
  color: var(--text-muted);
}

.mp-playlist-item:hover {
  background: rgba(255,255,255,0.04);
  color: var(--text-secondary);
}

.mp-playlist-item.active {
  color: var(--accent);
  background: rgba(99,102,241,0.08);
}

.mp-pl-num {
  width: 16px;
  text-align: center;
  font-size: 10px;
  flex-shrink: 0;
}

.mp-pl-title {
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

/* scrollbar */
.mp-playlist::-webkit-scrollbar { width: 3px; }
.mp-playlist::-webkit-scrollbar-thumb { background: rgba(255,255,255,0.08); border-radius: 2px; }

@media (max-width: 768px) {
  .mini-player { width: 100%; padding: 12px 14px; gap: 8px; }
  .mp-art { width: 36px; height: 36px; }
  .mp-title { font-size: 12px; }
  .mp-btn-play { width: 34px; height: 34px; }
}
</style>
