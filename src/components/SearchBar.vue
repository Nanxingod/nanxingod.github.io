<template>
  <form class="sb-wrap" @submit.prevent="search">
    <!-- Cat on top -->
    <svg class="sb-cat" viewBox="0 0 80 48" fill="none" xmlns="http://www.w3.org/2000/svg">
      <!-- Body -->
      <ellipse cx="40" cy="32" rx="22" ry="14" fill="#1a1a2e" stroke="rgba(255,255,255,0.15)" stroke-width="1"/>
      <!-- Head -->
      <circle cx="36" cy="18" r="11" fill="#1a1a2e" stroke="rgba(255,255,255,0.15)" stroke-width="1"/>
      <!-- Left ear -->
      <polygon points="27,11 31,1 34,10" fill="#1a1a2e" stroke="rgba(255,255,255,0.12)" stroke-width="0.8"/>
      <!-- Right ear -->
      <polygon points="38,10 41,1 45,11" fill="#1a1a2e" stroke="rgba(255,255,255,0.12)" stroke-width="0.8"/>
      <!-- Inner ears -->
      <polygon points="29,10 31,3 33,10" fill="rgba(167,139,250,0.15)"/>
      <polygon points="39,10 41,3 43,10" fill="rgba(167,139,250,0.15)"/>
      <!-- Eyes -->
      <ellipse cx="32" cy="17" rx="2" ry="2.5" fill="rgba(99,102,241,0.8)"/>
      <ellipse cx="41" cy="17" rx="2" ry="2.5" fill="rgba(99,102,241,0.8)"/>
      <!-- Eye glow -->
      <circle cx="31.5" cy="16.5" r="0.8" fill="rgba(255,255,255,0.6)"/>
      <circle cx="40.5" cy="16.5" r="0.8" fill="rgba(255,255,255,0.6)"/>
      <!-- Nose -->
      <polygon points="35,20 38,20 36.5,22" fill="rgba(255,255,255,0.2)"/>
      <!-- Whiskers -->
      <line x1="26" y1="19" x2="30" y2="20" stroke="rgba(255,255,255,0.1)" stroke-width="0.5"/>
      <line x1="26" y1="21" x2="30" y2="21" stroke="rgba(255,255,255,0.1)" stroke-width="0.5"/>
      <line x1="43" y1="20" x2="47" y2="19" stroke="rgba(255,255,255,0.1)" stroke-width="0.5"/>
      <line x1="43" y1="21" x2="47" y2="21" stroke="rgba(255,255,255,0.1)" stroke-width="0.5"/>
      <!-- Tail -->
      <path d="M62 30 Q 72 28 70 18 Q 68 10 64 14" fill="none" stroke="rgba(255,255,255,0.15)" stroke-width="2.5" stroke-linecap="round"/>
      <!-- Paws -->
      <ellipse cx="29" cy="39" rx="6" ry="2.5" fill="#1a1a2e" stroke="rgba(255,255,255,0.1)" stroke-width="0.6"/>
    </svg>

    <!-- Search box with grass -->
    <div class="sb-box">
      <svg class="sb-icon" width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/></svg>
      <input
        ref="inputRef"
        v-model="query"
        class="sb-input"
        type="text"
        placeholder="搜索网页..."
        @focus="focused = true"
        @blur="focused = false"
      />
      <div v-if="!query" class="sb-hint">
        <kbd>Enter</kbd>
      </div>
      <!-- Grass SVG overlay on bottom edge -->
      <svg class="sb-grass" viewBox="0 0 230 16" preserveAspectRatio="none" fill="none" xmlns="http://www.w3.org/2000/svg">
        <g class="grass-blade" v-for="i in 30" :key="i" :style="{ animationDelay: (i * 0.15) + 's' }">
          <path :d="grassPath(i)" stroke="rgba(134, 239, 172, 0.4)" stroke-width="1" fill="none" stroke-linecap="round"/>
        </g>
      </svg>
    </div>
  </form>
</template>

<script setup>
import { ref } from 'vue'

const query = ref('')
const focused = ref(false)
const inputRef = ref(null)

function search() {
  const q = query.value.trim()
  if (!q) return
  window.open(`https://cn.bing.com/search?q=${encodeURIComponent(q)}`, '_blank')
  query.value = ''
  inputRef.value?.blur()
}

function grassPath(i) {
  const x = i * 7 - 2 + (i % 5) * 2
  const h = 3 + (i % 3) * 3  // max ~9px tall
  const lean = (i % 3 === 0) ? -1.5 : (i % 3 === 1) ? 0 : 1.5
  return `M${x},16 Q${x + lean},${16 - h} ${x + lean},${16 - h - 2}`
}
</script>

<style scoped>
.sb-wrap {
  position: relative;
  width: 100%;
  max-width: 300px;
  margin-top: -6px;
  display: flex;
  flex-direction: column;
  align-items: center;
}

/* Cat SVG */
.sb-cat {
  width: 64px;
  height: 38px;
  margin-bottom: -6px;
  position: relative;
  z-index: 2;
  filter: drop-shadow(0 2px 4px rgba(0,0,0,0.3));
  transition: transform 0.3s ease;
}

.sb-wrap:hover .sb-cat {
  transform: translateY(-2px);
}

/* Search box */
.sb-box {
  position: relative;
  display: flex;
  align-items: center;
  padding: 10px 14px;
  border-radius: 12px;
  background: rgba(255,255,255,0.06);
  border: 1px solid rgba(255,255,255,0.1);
  backdrop-filter: blur(14px);
  -webkit-backdrop-filter: blur(14px);
  transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);
  gap: 8px;
  width: 100%;
  overflow: hidden;
}

.sb-box:focus-within {
  border-color: rgba(134, 239, 172, 0.3);
  background: rgba(255,255,255,0.09);
  box-shadow: 0 0 20px rgba(134, 239, 172, 0.06);
}

.sb-icon {
  flex-shrink: 0;
  color: rgba(255,255,255,0.3);
  transition: color 0.3s ease;
}

.sb-box:focus-within .sb-icon {
  color: rgba(134, 239, 172, 0.6);
}

.sb-input {
  flex: 1;
  min-width: 0;
  background: none;
  border: none;
  outline: none;
  font-size: 14px;
  font-family: inherit;
  color: var(--text);
  letter-spacing: 0.3px;
  position: relative;
  z-index: 1;
}

.sb-input::placeholder {
  color: rgba(255,255,255,0.25);
}

.sb-hint {
  flex-shrink: 0;
  opacity: 0.4;
  transition: opacity 0.2s;
  position: relative;
  z-index: 1;
}

.sb-box:focus-within .sb-hint {
  opacity: 0.15;
}

.sb-hint kbd {
  font-size: 10px;
  padding: 2px 6px;
  border-radius: 4px;
  background: rgba(255,255,255,0.08);
  border: 1px solid rgba(255,255,255,0.1);
  color: rgba(255,255,255,0.4);
  font-family: inherit;
}

/* Grass decoration — bottom edge only */
.sb-grass {
  position: absolute;
  bottom: 0;
  left: 0;
  width: 100%;
  height: 50%;
  pointer-events: none;
  opacity: 0.5;
  transition: opacity 0.3s ease;
  overflow: hidden;
}

.sb-box:focus-within .sb-grass {
  opacity: 0.7;
}

.grass-blade path {
  transition: stroke 0.3s;
}

.sb-box:focus-within .grass-blade path {
  stroke: rgba(134, 239, 172, 0.7);
}

/* Sway animation on hover */
.sb-wrap:hover .grass-blade path {
  animation: grassSway 1.5s ease-in-out infinite;
}

@keyframes grassSway {
  0%, 100% { transform: translateX(0); }
  25% { transform: translateX(1px); }
  75% { transform: translateX(-1px); }
}
</style>
