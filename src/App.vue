<template>
  <div class="app">
    <!-- 流星背景（更淡） -->
    <ShootingStars />

    <!-- 环境浮动粒子 -->
    <AmbientParticles />

    <!-- 导航栏 -->
    <header class="navbar" :class="{ scrolled: scrolled }">
      <div class="nav-inner">
        <a href="#hero" class="nav-brand" @click.prevent="scrollTo('hero')">NX</a>
        <nav>
          <a v-for="item in navItems" :key="item.id"
             :href="'#' + item.id"
             class="nav-link"
             :class="{ active: activeSection === item.id }"
             @click.prevent="scrollTo(item.id)">{{ item.label }}</a>
        </nav>
      </div>
    </header>

    <main class="main-content">
      <!-- ==================== 1. Hero — 2:1:2:1:2 同水平线 ==================== -->
      <section id="hero" class="hero-section">
        <TechCoil />

        <!-- 4段同水平线：MiniPlayer : 标题 : 搜索 : 时钟 -->
        <div class="h-top-bar">
          <div class="h-cell h-mp"><MiniPlayer class="h-player-tiny" /></div>
          <div class="h-cell h-mid">
            <div class="h-title-inline">
              <h1 class="h-name">
                <span class="h-en">Nanxingod</span>
                <span class="h-slash">/</span>
                <span class="h-cn">海蜇</span>
              </h1>
              <div class="h-cta">
                <a href="https://github.com/Nanxingod" target="_blank" class="h-btn h-btn-pri">
                  <svg width="14" height="14" viewBox="0 0 24 24" fill="currentColor"><path d="M12 0C5.37 0 0 5.37 0 12c0 5.3 3.438 9.8 8.205 11.387.6.113.82-.258.82-.577 0-.285-.01-1.04-.015-2.04-3.338.724-4.042-1.61-4.042-1.61-.546-1.387-1.333-1.756-1.333-1.756-1.089-.745.083-.73.083-.73 1.205.085 1.838 1.236 1.838 1.236 1.07 1.835 2.809 1.305 3.495.998.108-.776.418-1.305.762-1.604-2.665-.3-5.466-1.332-5.466-5.93 0-1.31.465-2.38 1.235-3.22-.135-.303-.54-1.523.105-3.176 0 0 1.005-.322 3.3 1.23.96-.267 1.98-.399 3-.405 1.02.006 2.04.138 3 .405 2.28-1.552 3.285-1.23 3.285-1.23.645 1.653.24 2.873.12 3.176.765.84 1.23 1.91 1.23 3.22 0 4.61-2.805 5.625-5.475 5.92.42.36.81 1.096.81 2.22 0 1.606-.015 2.896-.015 3.286 0 .315.21.69.825.57C20.565 21.795 24 17.295 24 12 24 5.37 18.63 0 12 0z"/></svg>
                  GitHub
                </a>
                <a href="#gallery" class="h-btn h-btn-sec" @click.prevent="scrollTo('gallery')">
                  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><rect x="3" y="3" width="18" height="18" rx="2"/><circle cx="8.5" cy="8.5" r="1.5"/><path d="M21 15l-5-5L5 21"/></svg>
                  我的图集
                </a>
              </div>
              <div class="h-typewriter"><Typewriter /></div>
            </div>
          </div>
          <div class="h-cell h-sch"><SearchBar /></div>
          <div class="h-cell h-clk"><DigitalClock /></div>
        </div>

        <!-- 下半区：海蜇2 : 图集4 -->
        <div class="h-body">
          <div class="h-haizhe-col">
            <div class="hh-card">
              <div class="hh-images">
                <img src="/images/haizhe-home.webp" alt="海蜇首页" class="hh-screenshot" />
                <img src="/images/haizhe-lyrics.webp" alt="桌面歌词" class="hh-screenshot" />
              </div>
              <div class="hh-info">
                <div class="hh-title-row">
                  <span class="hh-emoji">🎵</span>
                  <h3>海蜇音乐播放器</h3>
                </div>
                <p class="hh-desc">本地音乐播放器 · Electron + Web · Apple Music 风格 · 桌面歌词</p>
                <div class="hh-tags">
                  <span>FastAPI</span><span>React 19</span><span>Electron</span><span>TypeScript</span>
                </div>
                <a href="https://github.com/Nanxingod/haizhe-music" target="_blank" class="hh-link">
                  <svg width="13" height="13" viewBox="0 0 24 24" fill="currentColor"><path d="M12 0C5.37 0 0 5.37 0 12c0 5.3 3.438 9.8 8.205 11.387.6.113.82-.258.82-.577 0-.285-.01-1.04-.015-2.04-3.338.724-4.042-1.61-4.042-1.61-.546-1.387-1.333-1.756-1.333-1.756-1.089-.745.083-.73.083-.73 1.205.085 1.838 1.236 1.838 1.236 1.07 1.835 2.809 1.305 3.495.998.108-.776.418-1.305.762-1.604-2.665-.3-5.466-1.332-5.466-5.93 0-1.31.465-2.38 1.235-3.22-.135-.303-.54-1.523.105-3.176 0 0 1.005-.322 3.3 1.23.96-.267 1.98-.399 3-.405 1.02.006 2.04.138 3 .405 2.28-1.552 3.285-1.23 3.285-1.23.645 1.653.24 2.873.12 3.176.765.84 1.23 1.91 1.23 3.22 0 4.61-2.805 5.625-5.475 5.92.42.36.81 1.096.81 2.22 0 1.606-.015 2.896-.015 3.286 0 .315.21.69.825.57C20.565 21.795 24 17.295 24 12 24 5.37 18.63 0 12 0z"/></svg>
                  查看源码
                </a>
              </div>
            </div>
          </div>
          <div class="h-gallery-main">
            <HeroGallery variant="masonry" @scrollTo="scrollTo" />
          </div>
        </div>
      </section>

      <!-- ==================== 2. Gallery — 直接展示在主页面 ==================== -->
      <section id="gallery" class="section section-compact">
        <div class="section-label">图集收藏</div>
        <h2 class="section-title">Gallery</h2>
        <ImageGallery />
      </section>

      <!-- ==================== 3. Projects — 紧凑卡片 ==================== -->
      <section id="projects" class="section section-compact">
        <div class="section-label">作品展示</div>
        <h2 class="section-title">Projects</h2>

        <!-- 海蜇音乐 - 紧凑展示 -->
        <div class="project-featured glass-card reveal">
          <div class="project-featured-header">
            <div class="project-featured-info">
              <h3>海蜇音乐播放器</h3>
              <p class="project-featured-desc">本地音乐播放器 · Electron 桌面端 + Web · Apple Music 风格</p>
              <div class="project-featured-tech">
                <span>Python FastAPI</span><span>React 19</span><span>Electron</span><span>TypeScript</span>
              </div>
            </div>
            <div class="project-featured-links">
              <a href="https://github.com/Nanxingod/haizhe-music" target="_blank" class="project-link-btn">
                <svg width="14" height="14" viewBox="0 0 24 24" fill="currentColor"><path d="M12 0C5.37 0 0 5.37 0 12c0 5.3 3.438 9.8 8.205 11.387.6.113.82-.258.82-.577 0-.285-.01-1.04-.015-2.04-3.338.724-4.042-1.61-4.042-1.61-.546-1.387-1.333-1.756-1.333-1.756-1.089-.745.083-.73.083-.73 1.205.085 1.838 1.236 1.838 1.236 1.07 1.835 2.809 1.305 3.495.998.108-.776.418-1.305.762-1.604-2.665-.3-5.466-1.332-5.466-5.93 0-1.31.465-2.38 1.235-3.22-.135-.303-.54-1.523.105-3.176 0 0 1.005-.322 3.3 1.23.96-.267 1.98-.399 3-.405 1.02.006 2.04.138 3 .405 2.28-1.552 3.285-1.23 3.285-1.23.645 1.653.24 2.873.12 3.176.765.84 1.23 1.91 1.23 3.22 0 4.61-2.805 5.625-5.475 5.92.42.36.81 1.096.81 2.22 0 1.606-.015 2.896-.015 3.286 0 .315.21.69.825.57C20.565 21.795 24 17.295 24 12 24 5.37 18.63 0 12 0z"/></svg>
                查看源码
              </a>
            </div>
          </div>
        </div>

        <!-- 其他项目 — 紧凑网格 -->
        <div class="other-projects-header reveal">
          <h3 class="other-projects-title">更多项目</h3>
        </div>
        <div class="projects-grid">
          <div class="project-card glass-card reveal tilt-card" v-for="(proj, i) in otherProjects" :key="i" :style="{ transitionDelay: (i * 0.08) + 's' }">
            <div class="project-card-icon">{{ proj.icon }}</div>
            <h4>{{ proj.name }}</h4>
            <p>{{ proj.desc }}</p>
            <div class="project-card-tech">
              <span v-for="t in proj.tech.slice(0, 4)" :key="t">{{ t }}</span>
              <span v-if="proj.tech.length > 4" class="tech-more">+{{ proj.tech.length - 4 }}</span>
            </div>
          </div>
        </div>
      </section>

      <!-- ==================== 4. Tech + About — 合并到一列 ==================== -->
      <section id="about" class="section section-compact">
        <div class="two-col">
          <!-- 技术栈 -->
          <div class="about-card glass-card reveal">
            <div class="about-icon">🛠️</div>
            <h3>技术栈</h3>
            <div class="tech-compact">
              <div class="tech-group">
                <span class="tech-group-label">后端</span>
                <span v-for="t in javaSkills.slice(0, 5)" :key="t" class="tech-item-sm">{{ t }}</span>
              </div>
              <div class="tech-group">
                <span class="tech-group-label">AI</span>
                <span v-for="t in aiSkills.slice(0, 4)" :key="t" class="tech-item-sm green">{{ t }}</span>
              </div>
              <div class="tech-group">
                <span class="tech-group-label">工具</span>
                <span v-for="t in toolSkills.slice(0, 4)" :key="t" class="tech-item-sm purple">{{ t }}</span>
              </div>
            </div>
          </div>

          <!-- 关于我 -->
          <div class="about-card glass-card reveal">
            <div class="about-icon">💡</div>
            <h3>关于我</h3>
            <div class="about-timeline">
              <div class="timeline-item">
                <span class="tl-date">2024 — 2027</span>
                <span class="tl-title">硕士 · 合肥工业大学</span>
                <span class="tl-desc">通信工程 · LLM & AI Agent</span>
              </div>
              <div class="timeline-item">
                <span class="tl-date">2020 — 2024</span>
                <span class="tl-title">本科 · 合肥工业大学</span>
                <span class="tl-desc">通信工程</span>
              </div>
            </div>
            <p class="about-bio">性格开朗积极，对技术底层原理与系统架构保持好奇心。热爱用代码创造有价值的产品，享受将想法变为现实的整个过程。善于运用 AI 编程工具加速开发，持续探索大模型与智能体技术的前沿应用。</p>
          </div>
        </div>
      </section>

      <!-- Footer -->
      <footer class="footer">
        <div class="footer-inner">
          <div class="footer-brand">
            <span class="footer-logo">NX</span>
            <p>Code with passion. Build with purpose.</p>
          </div>
          <div class="footer-links">
            <a href="https://github.com/Nanxingod" target="_blank">GitHub</a>
            <a href="https://github.com/Nanxingod/haizhe-music" target="_blank">海蜇音乐</a>
          </div>
        </div>
        <p class="copyright">© 2026 Nanxingod. Made with Vue 3 & love.</p>
      </footer>
    </main>
  </div>
</template>

<script setup>
import { ref, onMounted, onUnmounted } from 'vue'
import ShootingStars from './components/ShootingStars.vue'
import AmbientParticles from './components/AmbientParticles.vue'
import ImageGallery from './components/ImageGallery.vue'
import DigitalClock from './components/DigitalClock.vue'
import TechCoil from './components/TechCoil.vue'
import Typewriter from './components/Typewriter.vue'
import MiniPlayer from './components/MiniPlayer.vue'
import HeroGallery from './components/HeroGallery.vue'
import SearchBar from './components/SearchBar.vue'

const scrolled = ref(false)
const activeSection = ref('hero')

const navItems = [
  { id: 'hero', label: '首页' },
  { id: 'gallery', label: '图集' },
  { id: 'projects', label: '作品' },
  { id: 'about', label: '关于' },
]

const javaSkills = [
  'Java SE', 'Spring Boot', 'Spring Cloud', 'SSM',
  'MySQL', 'Redis', 'RabbitMQ', 'Elasticsearch',
  'Linux', 'Docker', 'Git'
]

const aiSkills = [
  'Spring AI', 'MCP 协议', 'RAG',
  '多智能体架构', 'LangChain4j',
  '大模型微调', 'AI 编程助手'
]

const toolSkills = [
  'IntelliJ IDEA', 'VS Code', 'Claude Code',
  'GitHub Copilot', 'Postman', 'Docker Compose'
]

const otherProjects = [
  {
    name: '社交媒体信息挖掘与生成系统',
    icon: '🔬',
    desc: '深度参与中科院计算所牵头的国家级重点项目。设计 GNN-Transformer 链路预测算法，搭建多智能体社交贴文生成模块。',
    tech: ['GNN', 'Transformer', 'Python', 'PyTorch', '多智能体', '数据挖掘'],
  },
  {
    name: '分布式在线教育平台',
    icon: '📚',
    desc: '基于 Spring Cloud 微服务架构，涵盖课程管理、媒资管理、选课下单、认证授权等核心模块。',
    tech: ['Spring Boot', 'Spring Cloud', 'Nacos', 'Redis', 'RabbitMQ', 'Elasticsearch'],
  },
  {
    name: 'AI 对话平台',
    icon: '🤖',
    desc: '基于 Spring AI 搭建的智能对话应用，集成会话记忆、工具调用、角色扮演及 RAG 文档阅读功能。',
    tech: ['Spring AI', 'RAG', 'LangChain4j', 'PDF 解析'],
  },
]

function scrollTo(id) {
  const el = document.getElementById(id)
  if (el) el.scrollIntoView({ behavior: 'smooth' })
}

function handleScroll() {
  scrolled.value = window.scrollY > 60
  const scrollPos = window.scrollY + 200
  const sections = navItems.map(item => document.getElementById(item.id))
  for (let i = sections.length - 1; i >= 0; i--) {
    if (sections[i] && sections[i].offsetTop <= scrollPos) {
      activeSection.value = navItems[i].id
      break
    }
  }
}

// Intersection Observer for scroll reveal
function setupReveal() {
  const observer = new IntersectionObserver((entries) => {
    entries.forEach(entry => {
      if (entry.isIntersecting) entry.target.classList.add('revealed')
    })
  }, { threshold: 0.1, rootMargin: '0px 0px -50px 0px' })
  document.querySelectorAll('.reveal').forEach(el => observer.observe(el))
}

// 3D 倾斜效果
function setup3dTilt() {
  document.querySelectorAll('.tilt-card').forEach(card => {
    card.addEventListener('mousemove', (e) => {
      const rect = card.getBoundingClientRect()
      const x = e.clientX - rect.left
      const y = e.clientY - rect.top
      const centerX = rect.width / 2
      const centerY = rect.height / 2
      const rotateX = (y - centerY) / centerY * -8
      const rotateY = (x - centerX) / centerX * 8
      card.style.transform = `perspective(1000px) rotateX(${rotateX}deg) rotateY(${rotateY}deg) scale3d(1.02,1.02,1.02)`
    })
    card.addEventListener('mouseleave', () => {
      card.style.transform = 'perspective(1000px) rotateX(0deg) rotateY(0deg) scale3d(1,1,1)'
    })
  })
}

onMounted(() => {
  window.addEventListener('scroll', handleScroll)
  setTimeout(() => {
    setupReveal()
    setup3dTilt()
  }, 300)
})

onUnmounted(() => {
  window.removeEventListener('scroll', handleScroll)
})
</script>
