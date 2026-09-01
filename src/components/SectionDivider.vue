<template>
  <div class="sec-divider" :class="{ 'in-view': inView }" ref="rootRef" aria-hidden="true">
    <span class="sd-line sd-l"></span>
    <span class="sd-star">✦</span>
    <span class="sd-gem">
      <svg viewBox="0 0 24 24" width="18" height="18">
        <path d="M12 0 L14.4 9.6 L24 12 L14.4 14.4 L12 24 L9.6 14.4 L0 12 L9.6 9.6 Z" fill="currentColor"/>
      </svg>
    </span>
    <span class="sd-star sd-star-r">✦</span>
    <span class="sd-line sd-r"></span>
  </div>
</template>

<script setup>
// 区块分隔符：光线自中心展开 + 旋转四芒星宝石 + 闪烁小星
import { ref, onMounted, onBeforeUnmount } from 'vue'

const rootRef = ref(null)
const inView = ref(false)
let io = null

onMounted(() => {
  io = new IntersectionObserver((entries) => {
    entries.forEach(entry => {
      if (entry.isIntersecting) {
        inView.value = true
        io.disconnect()
      }
    })
  }, { threshold: 0.4 })
  if (rootRef.value) io.observe(rootRef.value)
})

onBeforeUnmount(() => {
  if (io) io.disconnect()
})
</script>

<style scoped>
.sec-divider {
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 14px;
  padding: 6px 28px;
  user-select: none;
}

/* 渐变光线：进入视口时自宝石向两侧展开 */
.sd-line {
  height: 1px;
  flex: 1;
  max-width: 300px;
  transform: scaleX(0);
  transition: transform 1.1s cubic-bezier(0.4, 0, 0.2, 1);
}
.sd-l {
  background: linear-gradient(to left, rgba(129, 140, 248, 0.55), rgba(129, 140, 248, 0.12), transparent);
  transform-origin: right center;
}
.sd-r {
  background: linear-gradient(to right, rgba(167, 139, 250, 0.55), rgba(167, 139, 250, 0.12), transparent);
  transform-origin: left center;
}
.in-view .sd-line {
  transform: scaleX(1);
}

/* 中央四芒星宝石 */
.sd-gem {
  color: #a5b4fc;
  display: flex;
  align-items: center;
  justify-content: center;
  opacity: 0;
  transform: scale(0.3) rotate(-90deg);
  transition: opacity 0.8s ease 0.25s, transform 0.8s cubic-bezier(0.34, 1.56, 0.64, 1) 0.25s;
  filter: drop-shadow(0 0 6px rgba(129, 140, 248, 0.8));
}
.sd-gem svg {
  animation: sdSpin 14s linear infinite;
}
.in-view .sd-gem {
  opacity: 1;
  transform: scale(1) rotate(0deg);
  animation: sdPulse 3.2s ease-in-out infinite 1s;
}
@keyframes sdSpin {
  from { transform: rotate(0deg); }
  to { transform: rotate(360deg); }
}
@keyframes sdPulse {
  0%, 100% { filter: drop-shadow(0 0 5px rgba(129, 140, 248, 0.7)); }
  50% { filter: drop-shadow(0 0 12px rgba(167, 139, 250, 0.95)); }
}

/* 两侧闪烁小星 */
.sd-star {
  font-size: 9px;
  color: rgba(167, 139, 250, 0.85);
  opacity: 0;
  transform: scale(0);
  transition: opacity 0.6s ease 0.5s, transform 0.6s cubic-bezier(0.34, 1.56, 0.64, 1) 0.5s;
  text-shadow: 0 0 8px rgba(167, 139, 250, 0.8);
}
.sd-star-r {
  transition-delay: 0.62s;
}
.in-view .sd-star {
  opacity: 1;
  transform: scale(1);
  animation: sdTwinkle 2.6s ease-in-out infinite 1.2s;
}
.in-view .sd-star-r {
  animation-delay: 2s;
}
@keyframes sdTwinkle {
  0%, 100% { opacity: 0.35; transform: scale(0.75); }
  50% { opacity: 1; transform: scale(1.15); }
}

@media (max-width: 768px) {
  .sec-divider {
    gap: 10px;
    padding: 4px 16px;
  }
  .sd-line {
    max-width: 130px;
  }
}
</style>
