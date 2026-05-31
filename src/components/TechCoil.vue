<template>
  <canvas ref="canvasRef" class="tech-coil"></canvas>
</template>

<script setup>
import { ref, onMounted, onUnmounted } from 'vue'

const canvasRef = ref(null)
let animationId = null

onMounted(() => {
  const canvas = canvasRef.value
  if (!canvas) return
  const ctx = canvas.getContext('2d')

  const resize = () => {
    canvas.width = canvas.parentElement.offsetWidth
    canvas.height = canvas.parentElement.offsetHeight
  }
  resize()
  window.addEventListener('resize', resize)

  // 轨道参数
  const orbits = [
    { cx: 0.5, cy: 0.5, rx: 0.22, ry: 0.30, speed: 0.3, points: 3, color: 'rgba(99,102,241,0.5)' },
    { cx: 0.5, cy: 0.5, rx: 0.28, ry: 0.38, speed: -0.25, points: 4, color: 'rgba(139,92,246,0.4)' },
    { cx: 0.5, cy: 0.5, rx: 0.18, ry: 0.24, speed: 0.35, points: 5, color: 'rgba(59,130,246,0.35)' },
  ]

  // 粒子
  const particles = []
  orbits.forEach((orbit, oi) => {
    for (let i = 0; i < orbit.points; i++) {
      particles.push({
        orbit: oi,
        angle: (Math.PI * 2 / orbit.points) * i + Math.random() * 0.5,
        size: 2 + Math.random() * 2,
        alpha: 0.5 + Math.random() * 0.5,
      })
    }
  })

  // 轨迹尾迹
  const trailLength = 40
  const trails = particles.map(() => [])

  function draw() {
    const w = canvas.width
    const h = canvas.height
    ctx.clearRect(0, 0, w, h)

    // 绘制轨道环
    orbits.forEach(orbit => {
      const cx = orbit.cx * w
      const cy = orbit.cy * h
      const rx = orbit.rx * w
      const ry = orbit.ry * h

      ctx.save()
      ctx.beginPath()
      ctx.ellipse(cx, cy, rx, ry, 0, 0, Math.PI * 2)
      ctx.strokeStyle = orbit.color.replace('0.5', '0.08').replace('0.4', '0.06').replace('0.35', '0.05')
      ctx.lineWidth = 1
      ctx.stroke()
      ctx.restore()
    })

    // 绘制连接线（轨道间粒子连线）
    ctx.save()
    ctx.globalAlpha = 0.08
    for (let i = 0; i < particles.length; i++) {
      const orbitI = orbits[particles[i].orbit]
      const px1 = orbitI.cx * w + Math.cos(particles[i].angle) * orbitI.rx * w
      const py1 = orbitI.cy * h + Math.sin(particles[i].angle) * orbitI.ry * h

      for (let j = i + 1; j < particles.length; j++) {
        if (particles[i].orbit === particles[j].orbit) continue
        const orbitJ = orbits[particles[j].orbit]
        const px2 = orbitJ.cx * w + Math.cos(particles[j].angle) * orbitJ.rx * w
        const py2 = orbitJ.cy * h + Math.sin(particles[j].angle) * orbitJ.ry * h

        const dx = px1 - px2
        const dy = py1 - py2
        const dist = Math.sqrt(dx * dx + dy * dy)

        if (dist < w * 0.5) {
          ctx.beginPath()
          ctx.moveTo(px1, py1)
          ctx.lineTo(px2, py2)
          ctx.strokeStyle = '#6366f1'
          ctx.lineWidth = 0.5
          ctx.stroke()
        }
      }
    }
    ctx.restore()

    // 更新和绘制粒子 + 尾迹
    particles.forEach((p, idx) => {
      const orbit = orbits[p.orbit]
      p.angle += orbit.speed * 0.003

      const cx = orbit.cx * w
      const cy = orbit.cy * h
      const px = cx + Math.cos(p.angle) * orbit.rx * w
      const py = cy + Math.sin(p.angle) * orbit.ry * h

      // 尾迹
      trails[idx].push({ x: px, y: py, life: 1 })
      if (trails[idx].length > trailLength) trails[idx].shift()

      // 绘制尾迹
      for (let t = 1; t < trails[idx].length; t++) {
        const prev = trails[idx][t - 1]
        const curr = trails[idx][t]
        const alpha = t / trails[idx].length * 0.3
        ctx.beginPath()
        ctx.moveTo(prev.x, prev.y)
        ctx.lineTo(curr.x, curr.y)
        ctx.strokeStyle = orbit.color.replace(/[\d.]+\)$/, alpha + ')')
        ctx.lineWidth = 1
        ctx.stroke()
      }

      // 绘制粒子光晕
      const gradient = ctx.createRadialGradient(px, py, 0, px, py, p.size * 3)
      gradient.addColorStop(0, orbit.color)
      gradient.addColorStop(1, 'transparent')
      ctx.beginPath()
      ctx.arc(px, py, p.size * 3, 0, Math.PI * 2)
      ctx.fillStyle = gradient
      ctx.fill()

      // 绘制粒子核心
      ctx.beginPath()
      ctx.arc(px, py, p.size, 0, Math.PI * 2)
      ctx.fillStyle = '#c7d2fe'
      ctx.fill()
      ctx.shadowColor = orbit.color
      ctx.shadowBlur = 8
      ctx.fill()
      ctx.shadowBlur = 0
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
.tech-coil {
  position: absolute;
  top: 0;
  left: 0;
  width: 100%;
  height: 100%;
  pointer-events: none;
  z-index: 0;
  opacity: 0.7;
}
</style>
