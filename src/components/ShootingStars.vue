<template>
  <canvas ref="canvasRef" class="stars-canvas"></canvas>
</template>

<script setup>
import { ref, onMounted, onUnmounted } from 'vue'

const canvasRef = ref(null)
let animationId = null
let stars = []
let meteors = []

const STAR_COUNT = 80

function initCanvas() {
  const canvas = canvasRef.value
  if (!canvas) return
  canvas.width = window.innerWidth
  canvas.height = window.innerHeight
}

class Star {
  constructor(w, h) {
    this.x = Math.random() * w
    this.y = Math.random() * h
    this.r = Math.random() * 1.5 + 0.5
    this.twinkleSpeed = Math.random() * 0.02 + 0.005
    this.alpha = Math.random() * 0.7 + 0.3
    this.phase = Math.random() * Math.PI * 2
  }
  draw(ctx, time) {
    const alpha = this.alpha * (0.6 + 0.4 * Math.sin(time * this.twinkleSpeed + this.phase))
    ctx.beginPath()
    ctx.arc(this.x, this.y, this.r, 0, Math.PI * 2)
    ctx.fillStyle = `rgba(255, 255, 255, ${alpha})`
    ctx.fill()
  }
}

class Meteor {
  constructor(w, h) {
    this.reset(w, h)
  }
  reset(w, h) {
    // Start from top or right side
    if (Math.random() < 0.7) {
      this.x = Math.random() * w * 0.8
      this.y = Math.random() * h * 0.15
    } else {
      this.x = w * 0.7 + Math.random() * w * 0.3
      this.y = Math.random() * h * 0.3
    }
    this.length = Math.random() * 80 + 60
    this.speed = Math.random() * 4 + 3
    this.angle = Math.PI / 4 + (Math.random() - 0.5) * 0.3
    this.vx = Math.cos(this.angle) * this.speed
    this.vy = Math.sin(this.angle) * this.speed
    this.alpha = Math.random() * 0.6 + 0.4
    this.decay = Math.random() * 0.015 + 0.008
    this.hue = Math.random() < 0.3 ? 200 + Math.random() * 40 : 0 // Some blue-ish, some white
  }
  draw(ctx) {
    const tailX = this.x - Math.cos(this.angle) * this.length
    const tailY = this.y - Math.sin(this.angle) * this.length

    const gradient = ctx.createLinearGradient(this.x, this.y, tailX, tailY)
    if (this.hue > 0) {
      gradient.addColorStop(0, `hsla(${this.hue}, 80%, 80%, ${this.alpha})`)
      gradient.addColorStop(1, `hsla(${this.hue}, 80%, 80%, 0)`)
    } else {
      gradient.addColorStop(0, `rgba(255, 255, 255, ${this.alpha})`)
      gradient.addColorStop(1, 'rgba(255, 255, 255, 0)')
    }

    ctx.beginPath()
    ctx.moveTo(this.x, this.y)
    ctx.lineTo(tailX, tailY)
    ctx.strokeStyle = gradient
    ctx.lineWidth = 1.5
    ctx.stroke()

    // Head glow
    ctx.beginPath()
    ctx.arc(this.x, this.y, 2, 0, Math.PI * 2)
    ctx.fillStyle = `rgba(255, 255, 255, ${this.alpha * 1.2})`
    ctx.fill()
  }
  update(w, h) {
    this.x += this.vx
    this.y += this.vy
    this.alpha -= this.decay
    if (this.alpha <= 0 || this.x > w + 100 || this.y > h + 100) {
      this.reset(w, h)
    }
  }
}

let time = 0

function animate() {
  const canvas = canvasRef.value
  if (!canvas) return
  const ctx = canvas.getContext('2d')
  const w = canvas.width
  const h = canvas.height

  ctx.clearRect(0, 0, w, h)
  time++

  // Draw stars
  for (const star of stars) {
    star.draw(ctx, time)
  }

  // Draw meteors
  for (const meteor of meteors) {
    meteor.draw(ctx)
    meteor.update(w, h)
  }

  animationId = requestAnimationFrame(animate)
}

function handleResize() {
  const canvas = canvasRef.value
  if (!canvas) return
  canvas.width = window.innerWidth
  canvas.height = window.innerHeight
}

onMounted(() => {
  initCanvas()
  const w = window.innerWidth
  const h = window.innerHeight

  // Create stars
  for (let i = 0; i < STAR_COUNT; i++) {
    stars.push(new Star(w, h))
  }

  // Create meteors (fewer, but active)
  const meteorCount = Math.max(3, Math.floor(w / 400))
  for (let i = 0; i < meteorCount; i++) {
    meteors.push(new Meteor(w, h))
  }

  animate()
  window.addEventListener('resize', handleResize)
})

onUnmounted(() => {
  if (animationId) cancelAnimationFrame(animationId)
  window.removeEventListener('resize', handleResize)
})
</script>

<style scoped>
.stars-canvas {
  position: fixed;
  top: 0;
  left: 0;
  width: 100%;
  height: 100%;
  z-index: 0;
  pointer-events: none;
}
</style>