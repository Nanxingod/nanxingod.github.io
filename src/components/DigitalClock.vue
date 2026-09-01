<template>
  <div class="clock-panel" ref="panelRef" @mousemove="onMouseMove" @mouseleave="onMouseLeave">
    <div class="clock-glow" :style="glowStyle"></div>

    <!-- 数字管风格：每位数字一个玻璃格 -->
    <div class="clock-time">
      <div class="clk-group">
        <span class="clk-cell" v-for="(d, i) in hourDigits" :key="'h' + i">{{ d }}</span>
      </div>
      <span class="clk-colon">:</span>
      <div class="clk-group">
        <span class="clk-cell" v-for="(d, i) in minDigits" :key="'m' + i">{{ d }}</span>
      </div>
      <span class="clk-colon">:</span>
      <div class="clk-group">
        <span class="clk-cell clk-cell-sec" v-for="(d, i) in secDigits" :key="'s' + i">{{ d }}</span>
      </div>
      <span class="clk-period">{{ period }}</span>
    </div>

    <!-- 秒针进度线：每分钟走满一格 -->
    <div class="clk-sec-line">
      <div class="clk-sec-fill" :style="{ width: secPct + '%' }"></div>
    </div>

    <div class="clock-date-row">
      <span class="clock-weekday">{{ weekday }}</span>
      <span class="clock-dot">·</span>
      <span class="clock-date">{{ dateDisplay }}</span>
    </div>
  </div>
</template>

<script setup>
import { ref, reactive, computed, onMounted, onUnmounted } from 'vue'

const hours = ref('00')
const minutes = ref('00')
const seconds = ref('00')
const period = ref('AM')
const weekday = ref('')
const dateDisplay = ref('')

const panelRef = ref(null)
const glowStyle = reactive({ opacity: 0, left: '50%', top: '50%' })

let timer = null

const hourDigits = computed(() => hours.value.split(''))
const minDigits = computed(() => minutes.value.split(''))
const secDigits = computed(() => seconds.value.split(''))
const secPct = computed(() => (parseInt(seconds.value, 10) / 60) * 100)

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
  padding: 12px 18px 10px;
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

/* 磁吸光斑 */
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
.clock-date-row,
.clk-sec-line {
  position: relative;
  z-index: 1;
}

.clock-time {
  display: flex;
  align-items: center;
  gap: 4px;
}

.clk-group {
  display: flex;
  gap: 3px;
}

/* 数字管玻璃格 */
.clk-cell {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  width: 26px;
  height: 36px;
  border-radius: 6px;
  background: linear-gradient(180deg, rgba(255, 255, 255, 0.09), rgba(255, 255, 255, 0.02));
  border: 1px solid rgba(255, 255, 255, 0.1);
  box-shadow: inset 0 0 8px rgba(99, 102, 241, 0.12), inset 0 1px 0 rgba(255, 255, 255, 0.08);
  font-family: 'SF Mono', 'Cascadia Code', Consolas, monospace;
  font-size: 20px;
  font-weight: 600;
  color: #e0e7ff;
  text-shadow: 0 0 10px rgba(129, 140, 248, 0.6), 0 0 22px rgba(129, 140, 248, 0.3);
  transition: text-shadow 0.4s ease, border-color 0.4s ease;
}

.clock-panel:hover .clk-cell {
  text-shadow: 0 0 14px rgba(165, 180, 252, 0.9), 0 0 30px rgba(129, 140, 248, 0.5);
  border-color: rgba(129, 140, 248, 0.25);
}

.clk-cell-sec {
  background: linear-gradient(180deg, rgba(167, 139, 250, 0.16), rgba(167, 139, 250, 0.04));
  color: #dcd3ff;
  text-shadow: 0 0 10px rgba(167, 139, 250, 0.65), 0 0 22px rgba(167, 139, 250, 0.3);
}

.clk-colon {
  font-family: 'SF Mono', Consolas, monospace;
  font-size: 17px;
  font-weight: 300;
  color: rgba(199, 210, 254, 0.5);
  animation: colonPulse 2s ease-in-out infinite;
  padding: 0 1px;
  transform: translateY(-2px);
}

.clk-period {
  font-size: 9px;
  font-weight: 600;
  color: rgba(199, 210, 254, 0.75);
  letter-spacing: 1.5px;
  margin-left: 4px;
  padding: 3px 6px;
  border-radius: 5px;
  background: rgba(99, 102, 241, 0.12);
  border: 1px solid rgba(99, 102, 241, 0.2);
  align-self: flex-end;
  margin-bottom: 3px;
}

/* 秒针进度线 */
.clk-sec-line {
  width: 100%;
  height: 2px;
  border-radius: 1px;
  background: rgba(255, 255, 255, 0.07);
  margin: 8px 0 7px;
  overflow: hidden;
}

.clk-sec-fill {
  height: 100%;
  background: linear-gradient(90deg, var(--accent), var(--purple));
  border-radius: 1px;
  transition: width 1s linear;
  box-shadow: 0 0 6px rgba(129, 140, 248, 0.6);
}

.clock-date-row {
  display: flex;
  align-items: center;
  gap: 6px;
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
    padding: 9px 12px 8px;
    border-radius: 12px;
  }
  .clk-cell {
    width: 19px;
    height: 27px;
    font-size: 15px;
  }
  .clk-colon {
    font-size: 13px;
  }
  .clk-period {
    font-size: 8px;
    padding: 2px 4px;
  }
  .clock-weekday,
  .clock-date {
    font-size: 10px;
  }
}
</style>
