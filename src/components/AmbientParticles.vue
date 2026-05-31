<template>
  <canvas ref="canvasRef" class="ambient-particles"></canvas>
</template>

<script setup>
import { ref, onMounted, onUnmounted } from 'vue'

const canvasRef = ref(null)
let animationId = null
let particles = []
const PARTICLE_COUNT = 60

onMounted(() => {
  const canvas = canvasRef.value
  if (!canvas) return
  const ctx = canvas.getContext('2d')

  const resize = () => {
    canvas.width = window.innerWidth
    canvas.height = window.innerHeight
  }
  resize()
  window.addEventListener('resize', resize)

  // Initialize particles
  for (let i = 0; i < PARTICLE_COUNT; i++) {
    particles.push({
      x: Math.random() * canvas.width,
      y: Math.random() * canvas.height,
      radius: Math.random() * 1.5 + 0.5,
      speedX: (Math.random() - 0.5) * 0.15,
      speedY: (Math.random() - 0.5) * 0.1 - 0.05, // slight upward drift
      opacity: Math.random() * 0.4 + 0.1,
      pulseOffset: Math.random() * Math.PI * 2,
      pulseSpeed: 0.005 + Math.random() * 0.01,
    })
  }

  function draw() {
    ctx.clearRect(0, 0, canvas.width, canvas.height)

    particles.forEach(p => {
      // Update position
      p.x += p.speedX
      p.y += p.speedY
      p.opacity = 0.1 + Math.sin(Date.now() * p.pulseSpeed + p.pulseOffset) * 0.15 + 0.15

      // Wrap around edges
      if (p.x < -10) p.x = canvas.width + 10
      if (p.x > canvas.width + 10) p.x = -10
      if (p.y < -10) p.y = canvas.height + 10
      if (p.y > canvas.height + 10) p.y = -10

      // Draw particle with glow
      ctx.beginPath()
      ctx.arc(p.x, p.y, p.radius * 2.5, 0, Math.PI * 2)
      const gradient = ctx.createRadialGradient(p.x, p.y, 0, p.x, p.y, p.radius * 2.5)
      gradient.addColorStop(0, `rgba(199, 210, 254, ${p.opacity * 0.6})`)
      gradient.addColorStop(0.5, `rgba(129, 140, 248, ${p.opacity * 0.2})`)
      gradient.addColorStop(1, 'rgba(129, 140, 248, 0)')
      ctx.fillStyle = gradient
      ctx.fill()

      // Draw core
      ctx.beginPath()
      ctx.arc(p.x, p.y, p.radius, 0, Math.PI * 2)
      ctx.fillStyle = `rgba(255, 255, 255, ${p.opacity * 0.6})`
      ctx.fill()
    })

    animationId = requestAnimationFrame(draw)
  }

  draw()

  onUnmounted(() => {
    window.removeEventListener('resize', resize)
    if (animationId) cancelAnimationFrame(animationId)
  })
})
</script>

<style scoped>
.ambient-particles {
  position: fixed;
  top: 0;
  left: 0;
  width: 100%;
  height: 100%;
  pointer-events: none;
  z-index: 0;
}
</style>
