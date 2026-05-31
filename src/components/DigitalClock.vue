<template>
  <div class="clock-panel" ref="panelRef" @mousemove="onMouseMove" @mouseleave="onMouseLeave">
    <div class="clock-glow" :style="glowStyle"></div>
    <div class="clock-time">
      <span class="time-digit">{{ hours }}</span>
      <span class="time-colon">:</span>
      <span class="time-digit">{{ minutes }}</span>
      <span class="time-colon">:</span>
      <span class="time-digit">{{ seconds }}</span>
      <span class="time-period">{{ period }}</span>
    </div>
    <div class="clock-date-row">
      <span class="clock-weekday">{{ weekday }}</span>
      <span class="clock-dot">·</span>
      <span class="clock-date">{{ dateDisplay }}</span>
    </div>
  </div>
</template>

<script setup>
import { ref, reactive, onMounted, onUnmounted } from 'vue'

const hours = ref('00')
const minutes = ref('00')
const seconds = ref('00')
const period = ref('AM')
const weekday = ref('')
const dateDisplay = ref('')

const panelRef = ref(null)
const glowStyle = reactive({ opacity: 0, left: '50%', top: '50%' })

let timer = null

function pad(n) {
  return n < 10 ? '0' + n : '' + n
}

function updateTime() {
  const now = new Date()
  const h = now.getHours()
  hours.value = pad(h % 12 || 12)
  minutes.value = pad(now.getMinutes())
  seconds.value = pad(now.getSeconds())
  period.value = h >= 12 ? 'PM' : 'AM'

  const weekdays = ['星期日', '星期一', '星期二', '星期三', '星期四', '星期五', '星期六']
  weekday.value = weekdays[now.getDay()]
  dateDisplay.value = `${now.getFullYear()} 年 ${now.getMonth() + 1} 月 ${now.getDate()} 日`
}

function onMouseMove(e) {
  if (!panelRef.value) return
  const rect = panelRef.value.getBoundingClientRect()
  const x = ((e.clientX - rect.left) / rect.width) * 100
  const y = ((e.clientY - rect.top) / rect.height) * 100
  glowStyle.left = x + '%'
  glowStyle.top = y + '%'
  glowStyle.opacity = 1
}

function onMouseLeave() {
  glowStyle.opacity = 0
}

onMounted(() => {
  updateTime()
  timer = setInterval(updateTime, 1000)
})

onUnmounted(() => {
  clearInterval(timer)
})
</script>

<style scoped>
.clock-panel {
  display: inline-flex;
  flex-direction: column;
  align-items: center;
  padding: 10px 18px;
  background: rgba(255, 255, 255, 0.04);
  border: 1px solid rgba(255, 255, 255, 0.08);
  border-radius: 14px;
  backdrop-filter: blur(16px);
  -webkit-backdrop-filter: blur(16px);
  box-shadow: 0 2px 12px rgba(0, 0, 0, 0.2);
  transition: transform 0.5s cubic-bezier(0.23, 1, 0.32, 1),
              border-color 0.4s ease,
              box-shadow 0.4s ease;
  user-select: none;
  position: relative;
  overflow: hidden;
}

.clock-panel:hover {
  transform: scale(1.04);
  border-color: rgba(129, 140, 248, 0.3);
  box-shadow: 0 6px 28px rgba(0, 0, 0, 0.35), 0 0 50px rgba(99, 102, 241, 0.1);
}

/* Magnetic glow dot that follows cursor */
.clock-glow {
  position: absolute;
  width: 80px;
  height: 80px;
  border-radius: 50%;
  background: radial-gradient(circle, rgba(99, 102, 241, 0.15) 0%, transparent 70%);
  transform: translate(-50%, -50%);
  pointer-events: none;
  transition: opacity 0.5s ease;
  z-index: 0;
}

.clock-time,
.clock-date-row {
  position: relative;
  z-index: 1;
}

.clock-time {
  display: flex;
  align-items: baseline;
  gap: 2px;
}

.time-digit {
  font-family: 'SF Pro Display', 'Inter', -apple-system, sans-serif;
  font-size: 26px;
  font-weight: 300;
  letter-spacing: 1px;
  background: linear-gradient(180deg, #f0f0ff 0%, #c7d2fe 50%, #818cf8 100%);
  -webkit-background-clip: text;
  -webkit-text-fill-color: transparent;
  background-clip: text;
  filter: drop-shadow(0 0 12px rgba(129, 140, 248, 0.25));
  line-height: 1;
  min-width: 0.9em;
  text-align: center;
  transition: filter 0.4s ease;
}

.clock-panel:hover .time-digit {
  filter: drop-shadow(0 0 18px rgba(129, 140, 248, 0.4));
}

.time-colon {
  font-family: 'SF Pro Display', 'Inter', -apple-system, sans-serif;
  font-size: 20px;
  font-weight: 200;
  color: rgba(199, 210, 254, 0.45);
  animation: colonPulse 2s ease-in-out infinite;
  line-height: 1;
  padding: 0 1px;
}

.time-period {
  font-family: 'SF Pro Display', 'Inter', -apple-system, sans-serif;
  font-size: 10px;
  font-weight: 400;
  color: rgba(255, 255, 255, 0.4);
  letter-spacing: 2px;
  text-transform: uppercase;
  margin-left: 6px;
  align-self: flex-end;
  padding-bottom: 2px;
}

.clock-date-row {
  display: flex;
  align-items: center;
  gap: 6px;
  margin-top: 6px;
  padding-top: 6px;
  border-top: 1px solid rgba(255, 255, 255, 0.06);
  width: 100%;
  justify-content: center;
}

.clock-weekday {
  font-size: 11px;
  font-weight: 500;
  color: rgba(167, 139, 250, 0.7);
  letter-spacing: 1px;
}

.clock-dot {
  color: rgba(255, 255, 255, 0.12);
  font-size: 10px;
}

.clock-date {
  font-size: 11px;
  font-weight: 300;
  color: rgba(255, 255, 255, 0.45);
  letter-spacing: 0.5px;
}

@keyframes colonPulse {
  0%, 100% { opacity: 0.4; }
  50% { opacity: 1; }
}

@media (max-width: 768px) {
  .clock-panel {
    padding: 8px 14px;
    border-radius: 12px;
  }
  .time-digit {
    font-size: 18px;
  }
  .time-colon {
    font-size: 15px;
  }
  .time-period {
    font-size: 9px;
  }
  .clock-weekday,
  .clock-date {
    font-size: 10px;
  }
}
</style>
