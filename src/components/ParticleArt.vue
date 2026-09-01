<template>
  <div class="particle-art" aria-hidden="true">
    <canvas ref="canvasRef"></canvas>
    <div v-if="label" class="pa-label">{{ label }}</div>
  </div>
</template>

<script setup>
// 像素粒子装饰：离屏绘制图形 → 采样成像素粒子阵列
// 鼠标靠近时粒子散开，移开后弹回原位（参考 deepseek 鲸鱼交互）
import { ref, computed, onMounted, onBeforeUnmount } from 'vue'

const props = defineProps({
  art: { type: String, default: 'jellyfish' }, // 'jellyfish' | 'whale' | 'dandelion'
  sizeScale: { type: Number, default: 1 },     // 整体缩放倍数（首屏大画用）
  caption: { type: String, default: null },    // 自定义标签；传空字符串则隐藏
})

const label = computed(() => {
  if (props.caption !== null) return props.caption
  const map = {
    jellyfish: 'SPECIMEN_01 · JELLYFISH',
    whale: 'SPECIMEN_02 · WHALE',
    dandelion: 'SPECIMEN_03 · DANDELION',
  }
  return map[props.art] || ''
})

const canvasRef = ref(null)
const CW = Math.round(320 * props.sizeScale), CH = Math.round(384 * props.sizeScale)
const SAMPLE = 3                  // 采样步长（像素颗粒感）

let ctx = null
let particles = []
let raf = null
let visible = false
let mouseX = -9999, mouseY = -9999
let t = 0

const PALETTE = ['#818cf8', '#a78bfa', '#c4b5fd', '#93c5fd']

/* ---------- 图形绘制（离屏白色剪影，供采样） ---------- */
function drawJellyfish(g) {
  const cx = 125
  // 伞盖（半圆 + 波浪下缘）
  g.beginPath()
  g.arc(cx, 112, 56, Math.PI, 0)
  g.quadraticCurveTo(cx + 38, 126, cx + 20, 118)
  g.quadraticCurveTo(cx, 132, cx - 20, 118)
  g.quadraticCurveTo(cx - 38, 126, cx - 56, 112)
  g.closePath()
  g.fill()
  // 触手（5 条波浪线）
  g.lineWidth = 6
  g.lineCap = 'round'
  for (let i = 0; i < 5; i++) {
    const x = 83 + i * 21
    g.beginPath()
    g.moveTo(x, 126)
    g.bezierCurveTo(x + 10, 168, x - 12, 205, x + 6, 248)
    g.stroke()
  }
  // 两条短须
  g.lineWidth = 4
  for (let i = 0; i < 2; i++) {
    const x = 103 + i * 42
    g.beginPath()
    g.moveTo(x, 128)
    g.quadraticCurveTo(x - 6, 156, x + 4, 178)
    g.stroke()
  }
}

function drawWhale(g) {
  // 身体
  g.beginPath()
  g.moveTo(28, 168)
  g.bezierCurveTo(55, 108, 140, 92, 196, 128)
  // 尾鳍
  g.bezierCurveTo(216, 114, 228, 98, 244, 90)
  g.bezierCurveTo(234, 114, 234, 130, 246, 152)
  g.bezierCurveTo(230, 148, 216, 140, 200, 144)
  // 腹部回到嘴部
  g.bezierCurveTo(150, 182, 75, 190, 28, 168)
  g.closePath()
  g.fill()
  // 胸鳍
  g.beginPath()
  g.moveTo(102, 162)
  g.quadraticCurveTo(126, 198, 158, 192)
  g.quadraticCurveTo(132, 174, 118, 158)
  g.closePath()
  g.fill()
  // 眼睛（挖空）
  g.globalCompositeOperation = 'destination-out'
  g.beginPath()
  g.arc(62, 150, 5.5, 0, Math.PI * 2)
  g.fill()
  g.globalCompositeOperation = 'source-over'
  // 头顶喷泉
  g.lineWidth = 4
  g.lineCap = 'round'
  const spouts = [
    [96, 96, 84, 62],
    [104, 94, 104, 56],
    [112, 96, 124, 62],
  ]
  spouts.forEach(([x1, y1, x2, y2]) => {
    g.beginPath()
    g.moveTo(x1, y1)
    g.quadraticCurveTo((x1 + x2) / 2, (y1 + y2) / 2 - 8, x2, y2)
    g.stroke()
  })
  // 水珠
  ;[[80, 52], [104, 44], [128, 52]].forEach(([x, y]) => {
    g.beginPath()
    g.arc(x, y, 3.5, 0, Math.PI * 2)
    g.fill()
  })
}

function drawDandelion(g) {
  // 花头：放射花丝 + 末端绒点（采样后变成像素绒球）
  const hx = 122, hy = 92, R = 66
  g.lineWidth = 2.6
  g.lineCap = 'round'
  const N = 30
  for (let i = 0; i < N; i++) {
    const a = (Math.PI * 2 * i) / N + (i % 2) * 0.1
    const len = R * (0.82 + (i % 3) * 0.09)
    const ex = hx + Math.cos(a) * len
    const ey = hy + Math.sin(a) * len
    g.beginPath()
    g.moveTo(hx + Math.cos(a) * 8, hy + Math.sin(a) * 8)
    g.lineTo(ex, ey)
    g.stroke()
    // 末端绒点
    g.beginPath()
    g.arc(ex, ey, 3.6, 0, Math.PI * 2)
    g.fill()
  }
  // 内层短丝补蓬松感
  g.lineWidth = 1.8
  for (let i = 0; i < 16; i++) {
    const a = (Math.PI * 2 * i) / 16 + 0.2
    g.beginPath()
    g.moveTo(hx + Math.cos(a) * 6, hy + Math.sin(a) * 6)
    g.lineTo(hx + Math.cos(a) * (R * 0.45), hy + Math.sin(a) * (R * 0.45))
    g.stroke()
  }
  // 花心小圆（种子着生处）
  g.beginPath()
  g.arc(hx, hy, 7, 0, Math.PI * 2)
  g.fill()
  // 花茎：微微弯曲向下，带两片小叶（蒲公英标志的锯齿叶简化版）
  g.lineWidth = 5
  g.beginPath()
  g.moveTo(hx, hy + 10)
  g.bezierCurveTo(hx + 8, 160, hx - 6, 220, hx + 4, 288)
  g.stroke()
  g.lineWidth = 3.5
  g.beginPath()
  g.moveTo(hx + 2, 178)
  g.quadraticCurveTo(hx + 34, 164, hx + 46, 138)
  g.stroke()
  g.beginPath()
  g.moveTo(hx - 1, 214)
  g.quadraticCurveTo(hx - 34, 202, hx - 44, 178)
  g.stroke()
}

/* ---------- 采样成粒子 ---------- */
function buildParticles() {
  const off = document.createElement('canvas')
  off.width = CW
  off.height = CH
  const g = off.getContext('2d')
  g.fillStyle = '#fff'
  g.strokeStyle = '#fff'
  const s = 1.28 * props.sizeScale   // 图形缩放系数（250×300 → 画布）
  g.translate((CW - 250 * s) / 2, (CH - 300 * s) / 2)
  g.scale(s, s)
  if (props.art === 'jellyfish') drawJellyfish(g)
  else if (props.art === 'dandelion') drawDandelion(g)
  else drawWhale(g)

  const data = g.getImageData(0, 0, CW, CH).data
  particles = []
  for (let y = 0; y < CH; y += SAMPLE) {
    for (let x = 0; x < CW; x += SAMPLE) {
      const alpha = data[(y * CW + x) * 4 + 3]
      if (alpha > 120) {
        particles.push({
          hx: x, hy: y,                 // home
          x: x + (Math.random() - 0.5) * 60,  // 入场时从散乱收回
          y: y + (Math.random() - 0.5) * 60,
          vx: 0, vy: 0,
          color: PALETTE[(Math.random() * PALETTE.length) | 0],
          phase: Math.random() * Math.PI * 2,
        })
      }
    }
  }
}

/* ---------- 主循环 ---------- */
function frame() {
  t += 16
  if (visible && ctx) {
    ctx.clearRect(0, 0, CW, CH)
    const rect = canvasRef.value.getBoundingClientRect()
    const lx = mouseX - rect.left
    const ly = mouseY - rect.top
    const R = 44, R2 = R * R

    for (const p of particles) {
      // 鼠标斥力（小范围、轻力度，避免波动过大）
      const dx = p.x - lx
      const dy = p.y - ly
      const d2 = dx * dx + dy * dy
      if (d2 < R2 && d2 > 0.01) {
        const d = Math.sqrt(d2)
        const f = ((R - d) / R) * 1.15
        p.vx += (dx / d) * f
        p.vy += (dy / d) * f
      }
      // 弹簧回位 + 阻尼（稍强的回位感，更稳重）
      p.vx += (p.hx - p.x) * 0.075
      p.vy += (p.hy - p.y) * 0.075
      p.vx *= 0.8
      p.vy *= 0.8
      p.x += p.vx
      p.y += p.vy
      // 像素点 + 呼吸微光
      const tw = 0.72 + 0.28 * Math.sin(t * 0.002 + p.phase)
      ctx.globalAlpha = tw
      ctx.fillStyle = p.color
      ctx.fillRect(p.x - 1.1, p.y - 1.1, 2.2, 2.2)
    }
    ctx.globalAlpha = 1
  }
  raf = requestAnimationFrame(frame)
}

function onMouseMove(e) {
  mouseX = e.clientX
  mouseY = e.clientY
}

onMounted(() => {
  const c = canvasRef.value
  const dpr = Math.min(window.devicePixelRatio || 1, 2)
  c.width = CW * dpr
  c.height = CH * dpr
  c.style.width = CW + 'px'
  c.style.height = CH + 'px'
  ctx = c.getContext('2d')
  ctx.setTransform(dpr, 0, 0, dpr, 0, 0)
  buildParticles()

  window.addEventListener('mousemove', onMouseMove, { passive: true })

  // 视口外暂停渲染
  const io = new IntersectionObserver((entries) => {
    entries.forEach(en => { visible = en.isIntersecting })
  }, { threshold: 0.05 })
  io.observe(c)

  raf = requestAnimationFrame(frame)
  onBeforeUnmount(() => {
    io.disconnect()
    window.removeEventListener('mousemove', onMouseMove)
    if (raf) cancelAnimationFrame(raf)
  })
})
</script>

<style scoped>
.particle-art {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 10px;
  pointer-events: none;
  user-select: none;
}

.particle-art canvas {
  display: block;
}

.pa-label {
  font-family: 'SF Mono', 'Cascadia Code', Consolas, monospace;
  font-size: 9px;
  letter-spacing: 2.5px;
  color: rgba(165, 180, 252, 0.45);
  text-transform: uppercase;
}
</style>
