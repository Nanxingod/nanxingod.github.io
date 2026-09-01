<template>
  <canvas v-if="enabled" ref="canvasRef" class="cc-canvas"></canvas>
</template>

<script setup>
// 蒲公英光标：发光蒲公英花朵跟随鼠标 + 移动洒落飞絮拖尾 + 点击炸絮
import { ref, onMounted, onBeforeUnmount, nextTick } from 'vue'

const enabled = ref(false)
const canvasRef = ref(null)

let ctx = null
let dpr = 1
let W = 0, H = 0
let raf = null
let t = 0

// 鼠标状态
let mx = -100, my = -100     // 真实位置
let fx = -100, fy = -100     // 花朵平滑跟随位置
let visible = false
let hover = false            // 悬停可交互元素
let hoverK = 0               // hover 过渡系数 0~1

// 粒子
const seeds = []             // 飞絮
const rings = []             // 点击淡环
let lastSpawn = 0

const rand = (a, b) => a + Math.random() * (b - a)

// 蒲公英结构：斐波那契球面分布的花丝（真实蒲公英绒球是球面上均匀分布的带冠毛种子）
const FIL_N = 46
const GOLDEN = Math.PI * (3 - Math.sqrt(5))
const FILS = []
for (let i = 0; i < FIL_N; i++) {
  const y = 1 - (2 * i) / (FIL_N - 1)
  const r = Math.sqrt(Math.max(0, 1 - y * y))
  const th = GOLDEN * i
  FILS.push({
    x: Math.cos(th) * r,
    y,
    z: Math.sin(th) * r,
    tuft: rand(0.75, 1.25),
    ph: rand(0, Math.PI * 2),
  })
}

// 冠毛绒点精灵图（预渲染，每帧 drawImage 复用，避免大量渐变创建）
let tuftSprite = null
function makeTuftSprite() {
  const s = document.createElement('canvas')
  s.width = 24
  s.height = 24
  const g = s.getContext('2d')
  const gr = g.createRadialGradient(12, 12, 0, 12, 12, 12)
  gr.addColorStop(0, 'rgba(255,255,255,0.95)')
  gr.addColorStop(0.35, 'rgba(216, 207, 255, 0.7)')
  gr.addColorStop(1, 'rgba(165,180,252,0)')
  g.fillStyle = gr
  g.fillRect(0, 0, 24, 24)
  // 放射状冠毛细丝（蒲公英种子的降落伞结构）
  g.strokeStyle = 'rgba(232, 227, 255, 0.5)'
  g.lineWidth = 0.7
  for (let i = 0; i < 8; i++) {
    const a = (Math.PI * 2 * i) / 8 + 0.3
    g.beginPath()
    g.moveTo(12 + Math.cos(a) * 2, 12 + Math.sin(a) * 2)
    g.lineTo(12 + Math.cos(a) * 9.5, 12 + Math.sin(a) * 9.5)
    g.stroke()
  }
  return s
}

function resize() {
  dpr = Math.min(window.devicePixelRatio || 1, 2)
  W = window.innerWidth
  H = window.innerHeight
  const c = canvasRef.value
  if (!c) return
  c.width = W * dpr
  c.height = H * dpr
  c.style.width = W + 'px'
  c.style.height = H + 'px'
}

/* ---------- 事件 ---------- */
function onMove(e) {
  mx = e.clientX
  my = e.clientY
  visible = true
  // 移动中按时间+速度节流撒飞絮
  const now = performance.now()
  if (now - lastSpawn > 55) {
    lastSpawn = now
    spawnSeed(fx, fy, false)
  }
}

function onDown(e) {
  // 点击炸絮：向四周迸溅 + 一圈淡环
  const n = 13
  for (let i = 0; i < n; i++) {
    const ang = (Math.PI * 2 * i) / n + rand(-0.25, 0.25)
    const spd = rand(1.8, 3.6)
    spawnSeedAt(e.clientX, e.clientY, Math.cos(ang) * spd, Math.sin(ang) * spd - 0.6)
  }
  rings.push({ x: e.clientX, y: e.clientY, r: 4, alpha: 0.55 })
}

function onOver(e) {
  const hit = e.target && e.target.closest
    ? e.target.closest('a, button, input, textarea, select, label, .hh-screenshot, [data-cursor="pointer"]')
    : null
  hover = !!hit
}

function onLeave() { visible = false }

/* ---------- 飞絮 ---------- */
function spawnSeed(x, y, burst) {
  spawnSeedAt(x, y, rand(-0.5, 0.5), rand(-0.9, -0.2))
}

function spawnSeedAt(x, y, vx, vy) {
  if (seeds.length > 80) seeds.shift()
  seeds.push({
    x, y, vx, vy,
    rot: rand(0, Math.PI * 2),
    vr: rand(-0.03, 0.03),
    size: rand(0.65, 1.05),
    life: 1,
    decay: rand(0.006, 0.011),
    sway: rand(0, Math.PI * 2),
  })
}

/* ---------- 绘制 ---------- */
// 单颗蒲公英种子（冠毛伞 + 短柄）
function drawSeed(s) {
  const a = s.life
  ctx.save()
  ctx.translate(s.x, s.y)
  ctx.rotate(s.rot)
  const L = 6.5 * s.size
  // 短柄
  ctx.strokeStyle = `rgba(196, 181, 253, ${a * 0.55})`
  ctx.lineWidth = 0.8
  ctx.beginPath()
  ctx.moveTo(0, 0)
  ctx.lineTo(0, L * 0.8)
  ctx.stroke()
  // 冠毛：上半圆放射细丝，末端带小点
  const N = 7
  for (let i = 0; i < N; i++) {
    const ang = -Math.PI / 2 + ((i / (N - 1)) - 0.5) * Math.PI * 1.15
    const ex = Math.cos(ang) * L
    const ey = Math.sin(ang) * L
    ctx.strokeStyle = `rgba(165, 180, 252, ${a * 0.75})`
    ctx.lineWidth = 0.7
    ctx.beginPath()
    ctx.moveTo(0, 0)
    ctx.lineTo(ex, ey)
    ctx.stroke()
    ctx.fillStyle = `rgba(221, 214, 254, ${a * 0.9})`
    ctx.beginPath()
    ctx.arc(ex, ey, 0.9 * s.size, 0, Math.PI * 2)
    ctx.fill()
  }
  ctx.restore()
}

// 蒲公英花朵（光标本体）：球面花丝绒球 + 绿色花茎拟态，深度分层明暗，微风轻摆不旋转
function drawFlower() {
  const k = hoverK
  const R = 8.6 + k * 2.4   // 绒球本体略微收小，配合花茎拟态（冠毛绒点用预渲染精灵图）
  // 微风摇曳：慢速、极小幅度（不是旋转）
  const sway = Math.sin(t * 0.0007) * 0.028
  // 固定视角倾斜，露出球体立体感；前后两层花丝明暗区分
  const tiltX = 0.5
  const cosX = Math.cos(tiltX), sinX = Math.sin(tiltX)
  const cosY = Math.cos(sway), sinY = Math.sin(sway)
  const breath = 1 + 0.015 * Math.sin(t * 0.0016)

  ctx.save()
  ctx.translate(fx, fy)

  // 球面点旋转投影，按深度从后往前绘制（画家算法）
  const pts = []
  for (const f of FILS) {
    const y1 = f.y * cosX - f.z * sinX
    const z1 = f.y * sinX + f.z * cosX
    const x2 = f.x * cosY + z1 * sinY
    const z2 = -f.x * sinY + z1 * cosY
    pts.push({ f, px: x2, py: y1, d: z2 })
  }
  pts.sort((a, b) => a.d - b.d)

  const coreR = 1.3 + k * 0.35

  // —— 绿色花茎：从花托斜向右下，随微风一起摆动（先画茎再画花，花在前）——
  ctx.strokeStyle = 'rgba(134, 209, 150, 0.8)'
  ctx.lineWidth = 1.2
  ctx.beginPath()
  ctx.moveTo(0, coreR * 0.5)
  ctx.quadraticCurveTo(5.5, 8.5, 8.5, 16)
  ctx.stroke()
  // 茎上一片小叶（斜向上）
  ctx.fillStyle = 'rgba(134, 209, 150, 0.5)'
  ctx.save()
  ctx.translate(4.6, 8.2)
  ctx.rotate(-0.7)
  ctx.beginPath()
  ctx.ellipse(0, 0, 3.4, 1.3, 0, 0, Math.PI * 2)
  ctx.fill()
  ctx.restore()
  for (const p of pts) {
    const depth = (p.d + 1) / 2   // 0=最后 1=最前
    const len = R * breath * (0.96 + 0.04 * Math.sin(t * 0.002 + p.f.ph))
    const ex = p.px * len
    const ey = p.py * len
    // 花丝：后面的暗而细，前面的亮而粗，形成球体体积感
    ctx.strokeStyle = `rgba(198, 190, 255, ${0.26 + depth * 0.62})`
    ctx.lineWidth = 0.45 + depth * 0.35
    ctx.beginPath()
    ctx.moveTo(p.px * coreR, p.py * coreR)
    ctx.lineTo(ex, ey)
    ctx.stroke()
    // 末端冠毛绒点（尺寸与亮度随深度变化）
    const ts = (3.2 + depth * 2.8) * p.f.tuft * (1 + k * 0.25)
    ctx.globalAlpha = 0.32 + depth * 0.68
    ctx.drawImage(tuftSprite, ex - ts / 2, ey - ts / 2, ts, ts)
    ctx.globalAlpha = 1
  }

  // 中心花托：小而实，不喧宾夺主
  ctx.fillStyle = 'rgba(228, 224, 255, 0.9)'
  ctx.shadowColor = 'rgba(129, 140, 248, 0.55)'
  ctx.shadowBlur = 5
  ctx.beginPath()
  ctx.arc(0, 0, coreR, 0, Math.PI * 2)
  ctx.fill()
  ctx.shadowBlur = 0
  ctx.restore()
}

function frame() {
  t += 16
  ctx.setTransform(dpr, 0, 0, dpr, 0, 0)
  ctx.clearRect(0, 0, W, H)

  // 花朵平滑跟随
  fx += (mx - fx) * 0.38
  fy += (my - fy) * 0.38
  hoverK += ((hover ? 1 : 0) - hoverK) * 0.12

  // 飞絮物理 + 绘制
  for (let i = seeds.length - 1; i >= 0; i--) {
    const s = seeds[i]
    s.sway += 0.05
    s.vx += Math.sin(s.sway) * 0.012          // 微风摆动
    s.vy -= 0.006                             // 轻微上浮
    s.vx *= 0.985
    s.vy *= 0.985
    s.x += s.vx
    s.y += s.vy
    s.rot += s.vr
    s.life -= s.decay
    if (s.life <= 0) { seeds.splice(i, 1); continue }
    drawSeed(s)
  }

  // 点击淡环
  for (let i = rings.length - 1; i >= 0; i--) {
    const r = rings[i]
    r.r += 2.4
    r.alpha -= 0.018
    if (r.alpha <= 0) { rings.splice(i, 1); continue }
    ctx.strokeStyle = `rgba(165, 180, 252, ${r.alpha})`
    ctx.lineWidth = 1
    ctx.beginPath()
    ctx.arc(r.x, r.y, r.r, 0, Math.PI * 2)
    ctx.stroke()
  }

  if (visible) drawFlower()

  raf = requestAnimationFrame(frame)
}

onMounted(() => {
  if (!window.matchMedia('(pointer: fine)').matches) return
  enabled.value = true
  document.documentElement.classList.add('has-custom-cursor')

  nextTick(() => {
    ctx = canvasRef.value.getContext('2d')
    tuftSprite = makeTuftSprite()
    resize()
    window.addEventListener('resize', resize)
    window.addEventListener('mousemove', onMove, { passive: true })
    window.addEventListener('mousedown', onDown)
    window.addEventListener('mouseover', onOver, { passive: true })
    document.documentElement.addEventListener('mouseleave', onLeave)
    raf = requestAnimationFrame(frame)
  })
})

onBeforeUnmount(() => {
  document.documentElement.classList.remove('has-custom-cursor')
  window.removeEventListener('resize', resize)
  window.removeEventListener('mousemove', onMove)
  window.removeEventListener('mousedown', onDown)
  window.removeEventListener('mouseover', onOver)
  document.documentElement.removeEventListener('mouseleave', onLeave)
  if (raf) cancelAnimationFrame(raf)
})
</script>

<style>
/* 全局：启用自定义光标时隐藏原生光标 */
html.has-custom-cursor,
html.has-custom-cursor * {
  cursor: none !important;
}

.cc-canvas {
  position: fixed;
  inset: 0;
  pointer-events: none;
  z-index: 10001;
}
</style>
