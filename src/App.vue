<template>
  <div class="app">
    <!-- 流星背景 -->
    <ShootingStars />

    <!-- 背景光晕 -->
    <div class="bg-gradients">
      <div class="gradient gradient-1"></div>
      <div class="gradient gradient-2"></div>
      <div class="gradient gradient-3"></div>
    </div>

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
      <!-- ==================== 1. Hero ==================== -->
      <section id="hero" class="section hero-section">
        <div class="hero-content">
          <div class="hero-badge">NX</div>
          <h1 class="hero-name">
            <span class="hero-line-1">Hello, 我是</span>
            <span class="hero-line-2">Nanxingod<span class="hero-dot">--</span>海蜇</span>
          </h1>
          <p class="hero-tagline">热爱技术 · 享受创造 · 探索 AI 的无限可能</p>
          <p class="hero-sub"> hfut </p>
          <div class="hero-links">
            <a href="https://github.com/Nanxingod" target="_blank" class="hero-btn primary">
              <svg class="icon" viewBox="0 0 24 24" fill="currentColor"><path d="M12 0C5.37 0 0 5.37 0 12c0 5.3 3.438 9.8 8.205 11.387.6.113.82-.258.82-.577 0-.285-.01-1.04-.015-2.04-3.338.724-4.042-1.61-4.042-1.61-.546-1.387-1.333-1.756-1.333-1.756-1.089-.745.083-.73.083-.73 1.205.085 1.838 1.236 1.838 1.236 1.07 1.835 2.809 1.305 3.495.998.108-.776.418-1.305.762-1.604-2.665-.3-5.466-1.332-5.466-5.93 0-1.31.465-2.38 1.235-3.22-.135-.303-.54-1.523.105-3.176 0 0 1.005-.322 3.3 1.23.96-.267 1.98-.399 3-.405 1.02.006 2.04.138 3 .405 2.28-1.552 3.285-1.23 3.285-1.23.645 1.653.24 2.873.12 3.176.765.84 1.23 1.91 1.23 3.22 0 4.61-2.805 5.625-5.475 5.92.42.36.81 1.096.81 2.22 0 1.606-.015 2.896-.015 3.286 0 .315.21.69.825.57C20.565 21.795 24 17.295 24 12 24 5.37 18.63 0 12 0z"/></svg>
              GitHub
            </a>
            <a href="#projects" class="hero-btn secondary" @click.prevent="scrollTo('projects')">
              <svg class="icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><rect x="3" y="3" width="7" height="7" rx="1"/><rect x="14" y="3" width="7" height="7" rx="1"/><rect x="3" y="14" width="7" height="7" rx="1"/><rect x="14" y="14" width="7" height="7" rx="1"/></svg>
              作品集
            </a>
          </div>
        </div>
        <div class="scroll-hint" @click="scrollTo('projects')">
          <span>了解更多</span>
          <svg class="bounce" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M6 9l6 6 6-6"/></svg>
        </div>
      </section>

      <!-- ==================== 2. Projects ==================== -->
      <section id="projects" class="section">
        <div class="section-label">作品展示</div>
        <h2 class="section-title">Projects</h2>

        <!-- 海蜇音乐 - 置顶精选 -->
        <div class="project-featured glass-card reveal">
          <div class="project-featured-header">
            <div class="project-featured-info">
              <div class="project-badge">🎵 精选项目</div>
              <h3>海蜇音乐播放器</h3>
              <p class="project-featured-desc">本地音乐播放器 · Electron 桌面端 + Web 网页端 · Apple Music 风格 · 桌面歌词悬浮窗</p>
              <div class="project-featured-tech">
                <span>Python FastAPI</span><span>React 19</span><span>Electron</span><span>TypeScript</span><span>Tailwind CSS</span>
              </div>
              <div class="project-featured-links">
                <a href="https://github.com/Nanxingod/haizhe-music" target="_blank" class="project-link-btn">
                  <svg width="18" height="18" viewBox="0 0 24 24" fill="currentColor"><path d="M12 0C5.37 0 0 5.37 0 12c0 5.3 3.438 9.8 8.205 11.387.6.113.82-.258.82-.577 0-.285-.01-1.04-.015-2.04-3.338.724-4.042-1.61-4.042-1.61-.546-1.387-1.333-1.756-1.333-1.756-1.089-.745.083-.73.083-.73 1.205.085 1.838 1.236 1.838 1.236 1.07 1.835 2.809 1.305 3.495.998.108-.776.418-1.305.762-1.604-2.665-.3-5.466-1.332-5.466-5.93 0-1.31.465-2.38 1.235-3.22-.135-.303-.54-1.523.105-3.176 0 0 1.005-.322 3.3 1.23.96-.267 1.98-.399 3-.405 1.02.006 2.04.138 3 .405 2.28-1.552 3.285-1.23 3.285-1.23.645 1.653.24 2.873.12 3.176.765.84 1.23 1.91 1.23 3.22 0 4.61-2.805 5.625-5.475 5.92.42.36.81 1.096.81 2.22 0 1.606-.015 2.896-.015 3.286 0 .315.21.69.825.57C20.565 21.795 24 17.295 24 12 24 5.37 18.63 0 12 0z"/></svg>
                  查看源码
                </a>
              </div>
            </div>
          </div>
          <div class="project-screenshots">
            <div class="screenshot-wrapper reveal">
              <img src="/images/haizhe-home.png" alt="海蜇音乐 - 主页" />
              <span class="screenshot-label">🎵 主界面 — 歌曲列表与播放</span>
            </div>
            <div class="screenshot-wrapper reveal">
              <img src="/images/haizhe-lyrics.png" alt="海蜇音乐 - 歌词" />
              <span class="screenshot-label">📝 全屏歌词 & 桌面悬浮窗</span>
            </div>
            <div class="screenshot-wrapper reveal">
              <img src="/images/haizhe-settings.png" alt="海蜇音乐 - 设置" />
              <span class="screenshot-label">⚙️ 设置 — 背景 / 字体 / 悬浮窗</span>
            </div>
          </div>
          <div class="project-features">
            <div class="feature-item reveal">
              <span class="feature-icon">🎵</span>
              <span>MP3 流式播放 · 进度拖拽 · 音量调节/记忆</span>
            </div>
            <div class="feature-item reveal">
              <span class="feature-icon">📝</span>
              <span>LRC 歌词解析 · 全屏滚动高亮 · 点击跳转</span>
            </div>
            <div class="feature-item reveal">
              <span class="feature-icon">🖼️</span>
              <span>ID3 封面提取 · 磁盘缓存 · 内存优化至 300MB</span>
            </div>
            <div class="feature-item reveal">
              <span class="feature-icon">
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#a78bfa" stroke-width="2"><rect x="3" y="3" width="18" height="18" rx="2"/><line x1="3" y1="9" x2="21" y2="9"/><line x1="9" y1="21" x2="9" y2="9"/></svg>
              </span>
              <span>Electron 桌面歌词 · 透明置顶窗口</span>
            </div>
            <div class="feature-item reveal">
              <span class="feature-icon">🎨</span>
              <span>自定义背景/字体/颜色 · 即时生效</span>
            </div>
            <div class="feature-item reveal">
              <span class="feature-icon">📱</span>
              <span>PC + 手机浏览器均可访问</span>
            </div>
          </div>
        </div>

        <!-- 其他项目 -->
        <div class="projects-grid">
          <div class="project-card glass-card reveal" v-for="(proj, i) in otherProjects" :key="i" :style="{ transitionDelay: (i * 0.1) + 's' }">
            <div class="project-card-icon">{{ proj.icon }}</div>
            <h4>{{ proj.name }}</h4>
            <p>{{ proj.desc }}</p>
            <div class="project-card-tech">
              <span v-for="t in proj.tech" :key="t">{{ t }}</span>
            </div>
            <a v-if="proj.link" :href="proj.link" target="_blank" class="project-card-link">
              查看项目 <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M7 17L17 7M17 7H7m10 0v10"/></svg>
            </a>
          </div>
        </div>
      </section>

      <!-- ==================== 3. Gallery ==================== -->
      <section id="gallery" class="section">
        <div class="section-label">图集收藏</div>
        <h2 class="section-title">Gallery</h2>
        <p class="gallery-subtitle">收藏喜欢的图片，支持分类管理、编辑描述</p>
        <ImageGallery />
      </section>

      <!-- ==================== 4. Tech Stack ==================== -->
      <section id="tech" class="section">
        <div class="section-label">技术栈</div>
        <h2 class="section-title">Tech Stack</h2>
        <div class="tech-grid">
          <div class="tech-category glass-card reveal">
            <div class="tech-cat-header">
              <svg class="tech-cat-icon" viewBox="0 0 24 24" fill="none" stroke="#f89820" stroke-width="1.5"><path d="M12 2L2 7l10 5 10-5-10-5z"/><path d="M2 17l10 5 10-5"/><path d="M2 12l10 5 10-5"/></svg>
              <span>Java & 后端</span>
            </div>
            <div class="tech-items">
              <span v-for="t in javaSkills" :key="t" class="tech-item">{{ t }}</span>
            </div>
          </div>
          <div class="tech-category glass-card reveal">
            <div class="tech-cat-header">
              <svg class="tech-cat-icon" viewBox="0 0 24 24" fill="none" stroke="#10b981" stroke-width="1.5"><circle cx="12" cy="12" r="10"/><path d="M8 12l3 3 5-5"/></svg>
              <span>AI & 大模型</span>
            </div>
            <div class="tech-items">
              <span v-for="t in aiSkills" :key="t" class="tech-item green">{{ t }}</span>
            </div>
          </div>
          <div class="tech-category glass-card reveal">
            <div class="tech-cat-header">
              <svg class="tech-cat-icon" viewBox="0 0 24 24" fill="none" stroke="#a78bfa" stroke-width="1.5"><circle cx="12" cy="12" r="3"/><path d="M19.4 15a1.65 1.65 0 00.33 1.82l.06.06a2 2 0 010 2.83 2 2 0 01-2.83 0l-.06-.06a1.65 1.65 0 00-1.82-.33 1.65 1.65 0 00-1 1.51V21a2 2 0 01-4 0v-.09A1.65 1.65 0 009 19.4a1.65 1.65 0 00-1.82.33l-.06.06a2 2 0 01-2.83-2.83l.06-.06A1.65 1.65 0 004.68 15a1.65 1.65 0 00-1.51-1H3a2 2 0 010-4h.09A1.65 1.65 0 004.6 9a1.65 1.65 0 00-.33-1.82l-.06-.06a2 2 0 012.83-2.83l.06.06A1.65 1.65 0 009 4.68a1.65 1.65 0 001-1.51V3a2 2 0 014 0v.09a1.65 1.65 0 001 1.51 1.65 1.65 0 001.82-.33l.06-.06a2 2 0 012.83 2.83l-.06.06A1.65 1.65 0 0019.4 9a1.65 1.65 0 001.51 1H21a2 2 0 010 4h-.09a1.65 1.65 0 00-1.51 1z"/></svg>
              <span>工具链</span>
            </div>
            <div class="tech-items">
              <span v-for="t in toolSkills" :key="t" class="tech-item purple">{{ t }}</span>
            </div>
          </div>
        </div>
      </section>

      <!-- ==================== 5. About (放到后面) ==================== -->
      <section id="about" class="section">
        <div class="section-label">关于我</div>
        <h2 class="section-title">About</h2>
        <div class="about-grid">
          <div class="about-card glass-card reveal">
            <div class="about-icon">🎓</div>
            <h3>教育背景</h3>
            <div class="about-timeline">
              <div class="timeline-item">
                <span class="tl-date">2024 — 2027</span>
                <span class="tl-title">硕士 · 合肥工业大学</span>
                <span class="tl-desc">通信工程 · 大模型与 AI Agent 方向</span>
              </div>
              <div class="timeline-item">
                <span class="tl-date">2020 — 2024</span>
                <span class="tl-title">本科 · 合肥工业大学</span>
                <span class="tl-desc">通信工程</span>
              </div>
            </div>
          </div>
          <div class="about-card glass-card reveal">
            <div class="about-icon">💡</div>
            <h3>关于我</h3>
            <p>性格开朗积极，对技术底层原理与系统架构保持好奇心。热爱用代码创造有价值的产品，从音乐播放器到 AI 应用，享受将想法变为现实的整个过程。善于运用 AI 编程工具加速开发，持续探索大模型与智能体技术的前沿应用。</p>
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
import ImageGallery from './components/ImageGallery.vue'

const scrolled = ref(false)
const activeSection = ref('hero')

const navItems = [
  { id: 'hero', label: '首页' },
  { id: 'projects', label: '作品' },
  { id: 'gallery', label: '图集' },
  { id: 'tech', label: '技术' },
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
    link: null
  },
  {
    name: '分布式在线教育平台',
    icon: '📚',
    desc: '基于 Spring Cloud 微服务架构，涵盖课程管理、媒资管理、选课下单、认证授权等核心模块。',
    tech: ['Spring Boot', 'Spring Cloud', 'Nacos', 'Redis', 'RabbitMQ', 'Elasticsearch'],
    link: null
  },
  {
    name: 'AI 对话平台',
    icon: '🤖',
    desc: '基于 Spring AI 搭建的智能对话应用，集成会话记忆、工具调用、角色扮演及 RAG 文档阅读功能。',
    tech: ['Spring AI', 'RAG', 'LangChain4j', 'PDF 解析'],
    link: null
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

onMounted(() => {
  window.addEventListener('scroll', handleScroll)
  setTimeout(setupReveal, 100)
})

onUnmounted(() => {
  window.removeEventListener('scroll', handleScroll)
})
</script>