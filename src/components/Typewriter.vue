<template>
  <div class="typewriter-wrap">
    <span class="tw-quote">"</span>
    <span ref="textRef" class="tw-text"></span>
    <span class="tw-quote">"</span>
  </div>
</template>

<script setup>
import { ref, onMounted } from 'vue'
import TypeIt from 'typeit'

const textRef = ref(null)

const strings = [
  '在代码的世界里，构建无限可能。',
  'Every line of code tells a story.',
  '探索 LLM 与 AI Agent 的前沿。',
  '热爱技术，享受创造的过程。',
  '用音乐与代码，连接世界。',
]

onMounted(() => {
  new TypeIt(textRef.value, {
    strings: strings,
    speed: 80,
    deleteSpeed: 40,
    lifeLike: true,
    cursor: true,
    cursorChar: '<span class="tw-cursor">|</span>',
    breakLines: false,
    loop: true,
    nextStringDelay: 2500,
    startDelay: 800,
  }).go()
})
</script>

<style scoped>
.typewriter-wrap {
  text-align: center;
  min-height: 36px;
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 4px;
}

.tw-quote {
  font-size: 20px;
  color: rgba(167, 139, 250, 0.5);
  font-weight: 300;
  font-style: italic;
  font-family: 'Georgia', 'Times New Roman', serif;
}

.tw-text {
  font-size: 16px;
  font-weight: 300;
  color: rgba(255, 255, 255, 0.7);
  letter-spacing: 1px;
  font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', 'PingFang SC', sans-serif;
  text-shadow: 0 0 20px rgba(99, 102, 241, 0.2);
}

/* TypeIt cursor override */
:deep(.tw-cursor) {
  display: inline-block;
  font-size: 18px;
  color: rgba(129, 140, 248, 0.7);
  font-weight: 200;
  animation: twBlink 1s step-end infinite;
}

:deep(.ti-cursor) {
  display: inline-block;
  font-size: 20px;
  color: rgba(129, 140, 248, 0.7);
  font-weight: 200;
  margin-left: 2px;
  animation: twBlink 1s step-end infinite;
}

@keyframes twBlink {
  0%, 100% { opacity: 1; }
  50% { opacity: 0; }
}

@media (max-width: 768px) {
  .tw-quote {
    font-size: 16px;
  }
  .tw-text {
    font-size: 14px;
  }
}

@media (max-width: 480px) {
  .tw-quote {
    font-size: 14px;
  }
  .tw-text {
    font-size: 12px;
  }
}
</style>
