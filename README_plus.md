# 南星宇个人主页 — 代码框架详解

> 面向初学者的完整技术文档。读完你会明白：这个网站是怎么跑起来的、每个文件干了什么、那些看起来很炫的效果是怎么实现的。

---

## 目录

- [1. 项目概览](#1-项目概览)
- [2. 前后端职责划分](#2-前后端职责划分)
- [3. 你会遇到的技术概念（先扫盲）](#3-你会遇到的技术概念先扫盲)
- [4. 项目启动流程：从输入 URL 到看见页面](#4-项目启动流程从输入-url-到看见页面)
- [5. 文件逐一详解](#5-文件逐一详解)
  - [5.1 入口文件](#51-入口文件)
  - [5.2 构建配置](#52-构建配置)
  - [5.3 App.vue — 项目的大脑](#53-appvue--项目的大脑)
  - [5.4 全局样式 style.css](#54-全局样式-stylecss)
  - [5.5 背景动画组件（三层 Canvas）](#55-背景动画组件三层-canvas)
  - [5.6 Hero 区域小组件](#56-hero-区域小组件)
  - [5.7 图集组件](#57-图集组件)
  - [5.8 自定义 Vite 插件（图集后端）](#58-自定义-vite-插件图集后端)
  - [5.9 脚本工具](#59-脚本工具)
- [6. 完整数据流：一张图看清楚](#6-完整数据流一张图看清楚)
- [7. 总结](#7-总结)

---

## 1. 项目概览

你的个人主页是一个**纯前端应用**，可以理解为：一堆 HTML + CSS + JavaScript 文件打包在一起，浏览器打开就能跑。

| 维度 | 说明 |
|------|------|
| 是什么 | 个人主页 / 在线简历网站 |
| 前端框架 | Vue 3（JavaScript 框架，帮助你组织页面结构） |
| 构建工具 | Vite 8（把代码打包成浏览器能高效加载的格式） |
| 部署平台 | Vercel（自动从 GitHub 拉取代码并发布到公网） |
| 外部库 | 只用了 2 个：`vue` 核心框架 + `typeit` 打字机动画 |
| 页面数量 | **单页面**，通过点击导航滚动到不同区域（不是跳转多个页面） |
| 有无后端 | **没有传统后端服务器**。但在开发阶段通过 Vite 插件模拟了后端 API |

一句话总结：**Vue 3 + Vite 构建的单页面个人主页，部署在 Vercel 上。**

---

## 2. 前后端职责划分

### 什么是"前端"和"后端"？

- **前端**：你在浏览器里看到的一切——页面布局、颜色、动画、按钮点击
- **后端**：运行在服务器上的程序——存数据、处理请求、返回结果

### 你这个项目里的前后端

```
┌─────────────────────────────────────────────┐
│  前端（浏览器里跑的）                          │
│                                              │
│  index.html        ← 浏览器打开的入口文件      │
│  src/main.js       ← JavaScript 启动代码      │
│  src/App.vue       ← 主页面（包含所有区块）     │
│  src/components/   ← 10 个复用组件            │
│  src/style.css     ← 全局样式                 │
│                                              │
│  前端职责：                                    │
│  ✅ 显示页面内容（文字、图片、按钮）             │
│  ✅ 处理用户交互（点击、滚动、拖拽）             │
│  ✅ 播放动画（星星、流星、粒子）                │
│  ✅ 播放音乐                                   │
│  ✅ 管理图集（浏览、上传、编辑、删除）           │
└─────────────────────────────────────────────┘
                        ↕ （仅在本地开发时有后端）
┌─────────────────────────────────────────────┐
│  后端（开发阶段的后端，生产环境不存在）          │
│                                              │
│  vite-plugin-gallery.js  ← 自定义 Vite 插件  │
│                                              │
│  后端职责（仅本地开发时）：                      │
│  ✅ 接收图片上传（POST /api/gallery/upload）   │
│  ✅ 删除图片（DELETE /api/gallery/image）      │
│  ✅ 编辑图片信息（PUT /api/gallery/image）     │
│  ✅ 管理分类（POST/DELETE /api/gallery/category）│
│  ✅ 拖拽排序（PUT /api/gallery/reorder）       │
│  ✅ 返回图集数据（GET /api/gallery/manifest）  │
└─────────────────────────────────────────────┘
```

> **关键理解**：生产环境（Vercel 部署后）没有后端 API。图片数据直接从 `public/gallery/manifest.json` 这个 JSON 文件读取。访客只能看、下载，不能编辑。

---

## 3. 你会遇到的技术概念（先扫盲）

在看具体代码之前，先搞清楚这些词是干什么的。

### 3.1 Canvas 2D

**一句话**：Canvas 就是浏览器提供的一张大白纸，你可以用 JavaScript 在上面画任何东西——圆形、线段、渐变、文字。

你的项目里用了 3 个 Canvas，叠在一起：

```
┌──────────────────────┐
│  页面内容层（z=1）     │  ← 你的文字、按钮、图片
├──────────────────────┤
│  AmbientParticles     │  ← 60 个发光的浮动粒子（z=0）
│  Canvas 层            │
├──────────────────────┤
│  ShootingStars        │  ← 80 颗星星 + 流星（z=0）
│  Canvas 层            │
├──────────────────────┤
│  TechCoil             │  ← 3 条椭圆轨道 + 12 个粒子（z=0）
│  Canvas 层（仅首页）   │
└──────────────────────┘
```

所有 Canvas 都设置了 `pointer-events: none`，意味着**鼠标不会点到它们**——点击会穿透到下面的按钮。

### 3.2 CSS Transition vs CSS Animation

- **Transition（过渡）**：从状态 A → 状态 B 的变化。比如鼠标移上去背景色从灰变蓝，这是个 transition。
- **Animation（动画）**：持续播放的循环动作。比如 CD 封面一直转圈、星星一直闪烁。

```css
/* Transition：鼠标悬停时在 0.3 秒内慢慢变 */
.nav-link:hover {
  color: white;           /* 原始：灰色 → 目标：白色 */
  transition: color 0.3s; /* 0.3秒内完成这个变化 */
}

/* Animation：不停闪烁 */
@keyframes twBlink {
  0%, 100% { opacity: 1; }  /* 完全不透明 */
  50% { opacity: 0; }       /* 完全透明 */
}
.cursor { animation: twBlink 1s infinite; }
/* 1s = 一个周期，infinite = 无限循环 */
```

### 3.3 Hash 锚点 + scrollIntoView

**Hash 锚点**：URL 中 `#` 后面的部分。比如 `https://xxx.com/#about`，`#about` 就是锚点。

你的网站不是多个 HTML 页面，而是**4 个区块在同一个页面**，通过滚动切换：

```
┌─────────────┐
│ 导航栏        │  ← 点击"关于" → 触发 scrollTo('about')
│ 首页 图集 作品 关于 │
└─────────────┘      │
       │             ▼ 浏览器平滑滚动到
       │        <section id="about">  ← 这就是锚点目标
       │
       └── 本质是：
          1. 找到 id="about" 的元素
          2. 调用 .scrollIntoView({ behavior: 'smooth' })
          3. 浏览器自动平滑滚动过去
```

Vue 中的实现（在 App.vue 里）：

```javascript
// scrollTo 函数
function scrollTo(id) {
  const el = document.getElementById(id)   // 找到目标元素
  if (el) el.scrollIntoView({ behavior: 'smooth' })  // 平滑滚动过去
}
```

### 3.4 Props 向下传，Emit 向上传

Vue 组件之间的通信规则：

```
         App.vue (父组件)
        /    |    \        \
   子组件A  子组件B  子组件C  子组件D

数据流向：
App.vue → 子组件：通过 props（属性）传递
           例：<Child message="hello" />
子组件 → App.vue：通过 emit（事件）通知
           例：子组件里 $emit('click', data)
```

你的项目里，所有数据（导航项、技能列表、项目信息）都在 App.vue 里定义，然后通过 props 传给子组件。子组件如果需要通知父组件（比如"用户点击了图集的查看全部"），就 emit 一个事件。

### 3.5 Teleport（传送门）

正常情况，组件渲染出来的 HTML 会放在组件自己的位置。但有些东西需要"跳出"来——比如灯箱（全屏黑色遮罩），它应该盖住整个页面。

```html
<!-- Teleport 把这段 HTML 直接放到 <body> 底下 -->
<Teleport to="body">
  <div class="lightbox" v-if="lightboxImage">
    <!-- 全屏遮罩 + 大图 -->
  </div>
</Teleport>
```

Teleport 之后，灯箱 DOM 结构变成：
```html
<body>
  <div id="app">...</div>
  <div class="lightbox">...</div>  ← 被传送到 body 下
</body>
```

### 3.6 IntersectionObserver（滚动检测）

浏览器提供的 API，能告诉你"某个元素有没有出现在屏幕里"。

```javascript
// 当 .reveal 元素出现在屏幕中时，给它加上 .revealed 类名
const observer = new IntersectionObserver((entries) => {
  entries.forEach(entry => {
    if (entry.isIntersecting)          // 出现在屏幕里了
      entry.target.classList.add('revealed')  // 加动画
  })
})
observer.observe(document.querySelector('.reveal'))
```

CSS 里配合：
```css
.reveal {
  opacity: 0;                         /* 初始隐藏 */
  transform: translateY(30px);        /* 往下偏移 30px */
  transition: all 0.6s ease;          /* 0.6秒内恢复 */
}
.revealed {
  opacity: 1;                         /* 变成可见 */
  transform: translateY(0);           /* 回原位 */
}
```

效果：页面往下滑动时，元素一个个"浮"出来。

### 3.7 requestAnimationFrame（动画循环）

Canvas 动画的核心。它让浏览器在每次**屏幕刷新前**执行你的绘制函数（通常是每秒 60 次）。

```javascript
function animate() {
  ctx.clearRect(0, 0, w, h)  // 清空画布
  drawStars()                 // 画星星
  drawMeteors()               // 画流星
  requestAnimationFrame(animate)  // 请求下一帧再画一次 → 形成循环
}
animate()  // 开始循环
```

### 3.8 Glassmorphism（毛玻璃效果）

就是你网站里那些半透明、后面能隐约看到背景的卡片。核心就一行 CSS：

```css
.glass-card {
  background: rgba(255, 255, 255, 0.04);   /* 半透明背景 */
  backdrop-filter: blur(16px);              /* 模糊后面的内容 */
  border: 1px solid rgba(255, 255, 255, 0.06); /* 细边框 */
}
```

---

## 4. 项目启动流程：从输入 URL 到看见页面

详细的端到端流程：

```
浏览器请求 https://your-site.vercel.app
  │
  ▼
Vercel 服务器返回 dist/index.html
  │
  ▼
浏览器解析 index.html：
  1. 读到 <div id="app"></div>  ← Vue 的挂载点，目前是空的
  2. 读到 <script type="module" src="/src/main.js"></script>
  3. 下载并执行 main.js
  │
  ▼
main.js 做了三件事：
  1. import { createApp } from 'vue'       ← 加载 Vue 框架
  2. import App from './App.vue'           ← 加载主组件
  3. import './style.css'                  ← 加载全局样式
  4. createApp(App).mount('#app')          ← 把 App 挂到 #app 上
  │
  ▼
Vue 渲染 App.vue：
  1. 创建导航栏（固定顶部）
  2. 启动三个 Canvas 动画（流星、粒子、轨道）
  3. 渲染 4 个区块（Hero、Gallery、Projects、About）
  4. 挂载 10 个子组件（时钟、播放器、搜索等）
  │
  ▼
页面显示
  │
  ▼
用户交互：
  - 移动鼠标 → 光晕跟随（时钟组件）
  - 悬停卡片 → 3D 倾斜
  - 滚动页面 → 导航高亮切换 + 元素渐显
  - 点击导航 → 平滑滚动到对应区块
  - 点击图片 → 灯箱放大
```

---

## 5. 文件逐一详解

### 5.1 入口文件

#### `index.html`

```html
<!doctype html>
<html lang="zh-CN">
  <head>
    <meta charset="UTF-8" />
    <link rel="icon" type="image/svg+xml" href="/favicon.svg" />
    <meta name="viewport" content="width=device-width, initial-scale=1.0" />
    <meta name="description" content="南星宇的个人主页" />
    <title>南星宇 | 个人主页</title>
  </head>
  <body>
    <div id="app"></div>                              <!-- Vue 挂载点 -->
    <script type="module" src="/src/main.js"></script> <!-- 入口 JS -->
  </body>
</html>
```

**职责**：
- 设置页面标题、描述、关键词（搜索引擎会读取这些）
- `<div id="app">` 是 Vue 的挂载点（Vue 会接管这个 div）
- 引入 `main.js`，一切从这里开始

#### `src/main.js`

```javascript
import { createApp } from 'vue'
import App from './App.vue'
import './style.css'

const app = createApp(App)
app.mount('#app')
```

**职责**：
- 创建 Vue 应用实例
- 把 App 组件渲染到 `#app` 上
- 引入全局样式

---

### 5.2 构建配置

#### `package.json`

```json
{
  "scripts": {
    "dev": "node scripts/optimize-images.js && vite",        // 开发模式
    "build": "node scripts/optimize-images.js && vite build", // 生产构建
    "preview": "vite preview",                                // 预览构建结果
    "optimize": "node scripts/optimize-images.js"             // 单独运行图片优化
  },
  "dependencies": {
    "typeit": "^8.8.7",    // 打字机动画效果
    "vue": "^3.5.34"       // Vue 框架
  },
  "devDependencies": {
    "@vitejs/plugin-vue": "^6.0.6",  // Vite 的 Vue 编译插件
    "sharp": "^0.34.5",              // 图片格式转换（PNG→WebP）
    "vite": "^8.0.12"                // 构建工具
  }
}
```

**关键设计**：每次 `dev` 或 `build` 前，都会**先运行图片优化脚本**，确保所有图片都是 WebP 格式。

#### `vite.config.js`

```javascript
import { defineConfig } from 'vite'
import vue from '@vitejs/plugin-vue'
import galleryPlugin from './vite-plugin-gallery.js'

export default defineConfig({
  plugins: [vue(), galleryPlugin()],
})
```

**职责**：告诉 Vite 使用两个插件：
1. `@vitejs/plugin-vue`：编译 `.vue` 文件为浏览器能懂的 JS
2. `galleryPlugin`：你的自建插件，在开发环境提供图集管理 API

#### `vercel.json`

```json
{
  "buildCommand": "npm run build",
  "outputDirectory": "dist",
  "framework": "vite"
}
```

**职责**：告诉 Vercel 怎么部署——运行 `npm run build`，把 `dist/` 目录发到 CDN。

---

### 5.3 App.vue — 项目的大脑

`src/App.vue` 是这个项目的核心文件（~430 行）。一个 `.vue` 文件分三部分：

```
<template>   ← HTML 模板：页面长什么样
<script>     ← JavaScript 逻辑：数据 + 行为
<style>      ← CSS：组件自己的样式
```

**App.vue 的职责**：

| 职责 | 具体内容 |
|------|----------|
| 页面布局 | 导航栏 + 4 个 section（hero/gallery/projects/about）+ 页脚 |
| 数据定义 | 导航项、技能列表、项目信息 — 全部写死在组件里 |
| 导航逻辑 | `scrollTo()` 实现锚点跳转，`handleScroll()` 监听滚动高亮导航 |
| 滚动动画 | `IntersectionObserver` 检测元素可见 → 添加渐显动画 |
| 3D 倾斜 | `setup3dTilt()` 监听鼠标位置 → 计算旋转角度 |
| 子组件管理 | 引入 10 个子组件，通过 `<ShootingStars />` 等标签使用 |

**`<script setup>` 里的关键代码逐行解释**：

```javascript
// 1. 导入 Vue 的功能函数
import { ref, onMounted, onUnmounted } from 'vue'
// ref: 创建响应式变量（值变了页面自动更新）
// onMounted: 组件挂载完成后执行（类似"页面加载完毕"）
// onUnmounted: 组件销毁前执行（清理定时器、事件监听等）

// 2. 导入子组件
import ShootingStars from './components/ShootingStars.vue'
// ... 共 10 个

// 3. 响应式数据定义
const scrolled = ref(false)          // 是否已滚动（控制导航栏毛玻璃效果）
const activeSection = ref('hero')    // 当前在哪个区块（控制导航高亮）

// 4. 导航项数据
const navItems = [
  { id: 'hero', label: '首页' },
  { id: 'gallery', label: '图集' },
  { id: 'projects', label: '作品' },
  { id: 'about', label: '关于' },
]

// 5. 技能列表和项目数据（硬编码在组件里）
const javaSkills = ['Java SE', 'Spring Boot', ...]
const aiSkills = ['Spring AI', 'MCP 协议', ...]
const otherProjects = [{ name: '...', icon: '🔬', ... }, ...]

// 6. 核心函数：平滑滚动
function scrollTo(id) {
  const el = document.getElementById(id)   // 拿到目标元素
  if (el) el.scrollIntoView({ behavior: 'smooth' })
}

// 7. 核心函数：滚动时更新导航高亮
function handleScroll() {
  scrolled.value = window.scrollY > 60          // 滚超过 60px → 导航加毛玻璃
  const scrollPos = window.scrollY + 200         // 当前位置 + 200px 偏移
  const sections = navItems.map(item =>
    document.getElementById(item.id))
  for (let i = sections.length - 1; i >= 0; i--) {
    // 从下往上找第一个在屏幕里的 section
    if (sections[i] && sections[i].offsetTop <= scrollPos) {
      activeSection.value = navItems[i].id       // 设置当前高亮项
      break
    }
  }
}

// 8. 核心函数：3D 倾斜卡片
function setup3dTilt() {
  document.querySelectorAll('.tilt-card').forEach(card => {
    card.addEventListener('mousemove', (e) => {
      // 计算鼠标在卡片内的相对位置
      const rect = card.getBoundingClientRect()
      const x = e.clientX - rect.left       // 鼠标距卡片左边多远
      const y = e.clientY - rect.top        // 鼠标距卡片顶部多远
      const centerX = rect.width / 2        // 卡片中心 X
      const centerY = rect.height / 2       // 卡片中心 Y
      // 根据鼠标偏离中心的距离，计算倾斜角度
      const rotateX = (y - centerY) / centerY * -8   // 上下倾斜 ±8°
      const rotateY = (x - centerX) / centerX * 8    // 左右倾斜 ±8°
      card.style.transform =
        `perspective(1000px) rotateX(${rotateX}deg) rotateY(${rotateY}deg) scale3d(1.02,1.02,1.02)`
    })
    card.addEventListener('mouseleave', () => {
      card.style.transform = 'perspective(1000px) rotateX(0) rotateY(0) scale3d(1,1,1)'
    })
  })
}

// 9. 生命周期：页面加载完毕后执行
onMounted(() => {
  window.addEventListener('scroll', handleScroll)  // 监听滚动事件
  setTimeout(() => {
    setupReveal()    // 初始化滚动揭示动画
    setup3dTilt()    // 初始化 3D 倾斜
  }, 300)            // 等 300ms 确保 DOM 渲染完毕
})

// 10. 组件销毁时清理
onUnmounted(() => {
  window.removeEventListener('scroll', handleScroll)  // 移除事件监听
})
```

---

### 5.4 全局样式 style.css

`src/style.css`（~1160 行）定义了整个网站的视觉风格。

**核心设计系统（CSS Variables）**：

```css
:root {
  --bg: #080812;                          /* 页面背景深色 */
  --surface: rgba(255, 255, 255, 0.04);   /* 卡片半透明背景 */
  --border: rgba(255, 255, 255, 0.06);    /* 细边框 */
  --text: #f1f1f1;                        /* 主文字颜色 */
  --text-secondary: rgba(255, 255, 255, 0.65);  /* 次要文字 */
  --text-muted: rgba(255, 255, 255, 0.38);      /* 弱化文字 */
  --accent: #6366f1;                      /* 主题色（靛蓝） */
  --green: #10b981;                       /* 绿色（AI标签） */
  --purple: #a78bfa;                      /* 紫色（工具标签） */
  --orange: #f59e0b;                      /* 橙色 */
}
```

使用方式：
```css
.my-button {
  color: var(--accent);          /* 直接用变量 */
  background: var(--surface);
}
/* 如果以后想换主题色，只改 :root 里一行就行 */
```

**背景壁纸**（通过 `body::before` 伪元素）：

```css
body::before {
  content: '';
  position: fixed;                           /* 固定在屏幕，不随滚动 */
  inset: 0;                                  /* 铺满整个屏幕 */
  z-index: -1;                               /* 在所有内容后面 */
  background: url('/bg-wallpaper.png') center/cover no-repeat;
  opacity: 0.6;                              /* 60% 透明度 */
}
```

**毛玻璃卡片**（`.glass-card`）：

```css
.glass-card {
  background: rgba(255, 255, 255, 0.04);     /* 几乎透明的白色 */
  backdrop-filter: blur(16px);               /* 模糊后面内容 = 毛玻璃 */
  border: 1px solid rgba(255, 255, 255, 0.06);
  border-radius: 16px;
}
```

**滚动揭示动画**（`.reveal` → `.revealed`）：

```css
.reveal {
  opacity: 0;                        /* 先隐藏 */
  transform: translateY(30px);       /* 往下偏移 30px */
  transition: all 0.6s ease;         /* 0.6秒过渡 */
}

.revealed {
  opacity: 1;                        /* 显示 */
  transform: translateY(0);          /* 回原位 */
}
/* 配合 App.vue 里的 IntersectionObserver 使用 */
```

**响应式断点**：

```css
@media (max-width: 768px) { /* 平板 */ }
@media (max-width: 480px) { /* 手机 */ }
```

---

### 5.5 背景动画组件（三层 Canvas）

#### 第一层：ShootingStars.vue（流星 + 闪烁星星）

**文件**：`src/components/ShootingStars.vue`（~155 行）

**做什么**：在屏幕最底层画 80 颗闪烁的星星 + 若干颗流星（随窗口大小自适应数量）。

**核心实现**：

```javascript
// 星星类：位置随机 + 透明度正弦波闪烁
class Star {
  constructor(w, h) {
    this.x = Math.random() * w           // 随机 X
    this.y = Math.random() * h           // 随机 Y
    this.r = Math.random() * 1.5 + 0.5   // 随机半径 0.5-2px
    this.twinkleSpeed = 0.005~0.025       // 随机闪烁速度
    this.phase = Math.random() * PI * 2   // 随机初始相位
  }
  draw(ctx, time) {
    // 用 sin 函数让透明度上下波动 → 闪烁效果
    const alpha = alpha * (0.6 + 0.4 * Math.sin(time * speed + phase))
    ctx.fillStyle = `rgba(255, 255, 255, ${alpha})`
    ctx.arc(x, y, r, 0, PI * 2)
    ctx.fill()
  }
}

// 流星类：从右上方飞向左下方，带渐变色尾巴
class Meteor {
  constructor(w, h) {
    this.angle = PI/4            // 45° 角飞行
    this.speed = 3~7             // 飞行速度
    this.length = 60~140         // 尾巴长度
    this.alpha = 0.4~1.0         // 亮度
    this.hue = 30% 概率蓝色      // 30% 的流星是蓝色调
  }
  draw(ctx) {
    // 创建线性渐变：从头部（亮）到尾部（透明）
    const gradient = ctx.createLinearGradient(headX, headY, tailX, tailY)
    gradient.addColorStop(0, `rgba(255, 255, 255, ${alpha})`)    // 头部
    gradient.addColorStop(1, 'rgba(255, 255, 255, 0)')           // 尾部消失
    // 画一条线作为流星
    ctx.strokeStyle = gradient
    ctx.lineTo(tailX, tailY)
    ctx.stroke()
  }
  update(w, h) {
    x += speed * cos(angle)      // 向右下飞
    y += speed * sin(angle)
    alpha -= 0.008~0.023          // 逐渐变暗
    if (alpha <= 0) reset()      // 飞完了重新生成
  }
}

// 主循环
function animate() {
  ctx.clearRect(0, 0, w, h)      // 清空画布
  stars.forEach(s => s.draw(ctx, time))   // 画所有星星
  meteors.forEach(m => { m.draw(ctx); m.update() })  // 画+更新流星
  requestAnimationFrame(animate)  // 下一帧继续
}
```

**CSS 设置**：
```css
.stars-canvas {
  position: fixed;       /* 固定在屏幕上 */
  top: 0; left: 0;
  width: 100%; height: 100%;
  z-index: 0;           /* 最底层 */
  pointer-events: none; /* 鼠标点不到 */
}
```

#### 第二层：AmbientParticles.vue（浮动粒子）

**文件**：`src/components/AmbientParticles.vue`（~94 行）

**做什么**：60 个带光晕的粒子缓慢飘浮，营造星空氛围。

**核心实现**：

```javascript
// 60 个粒子，每个有随机位置、速度和脉冲相位
const PARTICLE_COUNT = 60

particles.push({
  x: random, y: random,
  radius: 0.5~2,
  speedX: -0.075~0.075,       // 水平慢速漂移
  speedY: -0.1~0.05,           // 微微向上偏
  opacity: 0.1~0.5,           // 初始透明度
  pulseOffset: 0~2PI,         // 脉冲动画初始相位
  pulseSpeed: 0.005~0.015,    // 脉冲速度
})

function draw() {
  ctx.clearRect(0, 0, w, h)

  particles.forEach(p => {
    // 更新位置
    p.x += p.speedX
    p.y += p.speedY

    // 脉冲呼吸效果：用 sin 让透明度上下波动
    p.opacity = 0.1 + Math.sin(Date.now() * p.pulseSpeed + p.pulseOffset) * 0.15 + 0.15

    // 超出屏幕就回绕到另一边
    if (p.x < -10) p.x = canvas.width + 10
    if (p.y > canvas.height + 10) p.y = -10

    // 画两层：外层光晕（径向渐变） + 内层核心
    const gradient = ctx.createRadialGradient(x, y, 0, x, y, r * 2.5)
    gradient.addColorStop(0, `rgba(199, 210, 254, ${opacity * 0.6})`)   // 中心亮
    gradient.addColorStop(1, 'rgba(129, 140, 248, 0)')                  // 边缘消失
    ctx.fillStyle = gradient
    ctx.arc(x, y, r * 2.5, 0, PI * 2)
    ctx.fill()

    // 核心小白点
    ctx.fillStyle = `rgba(255, 255, 255, ${opacity * 0.6})`
    ctx.arc(x, y, r, 0, PI * 2)
    ctx.fill()
  })
  requestAnimationFrame(draw)
}
```

#### 第三层：TechCoil.vue（椭圆轨道科技感）

**文件**：`src/components/TechCoil.vue`（~169 行）

**做什么**：只在 Hero 区域显示。3 条椭圆轨道上各跑着粒子，不同轨道间粒子距离近时会连线。

**核心实现**：

```javascript
// 3 条轨道，颜色、大小、方向都不同
const orbits = [
  { rx: 0.22, ry: 0.30, speed: 0.3,  points: 3, color: 'rgba(99,102,241,0.5)'  },  // 靛蓝
  { rx: 0.28, ry: 0.38, speed: -0.25, points: 4, color: 'rgba(139,92,246,0.4)' },  // 紫色（反向转）
  { rx: 0.18, ry: 0.24, speed: 0.35,  points: 5, color: 'rgba(59,130,246,0.35)' }, // 蓝色（最快）
]

// 每条轨道 3-5 个粒子，总共 12 个
// 粒子绕椭圆运动：x = cx + cos(angle) * rx, y = cy + sin(angle) * ry

function draw() {
  ctx.clearRect(0, 0, w, h)

  // 1. 画轨道环（很淡的椭圆线）
  ctx.ellipse(cx, cy, rx, ry, 0, 0, PI * 2)
  ctx.strokeStyle = 'rgba(99,102,241,0.05)'   // 非常淡
  ctx.stroke()

  // 2. 不同轨道间距离近的粒子连线
  for (每个粒子对) {
    if (不在同一轨道 && 距离 < 画布宽度 * 0.5) {
      ctx.lineTo(粒子2)
      ctx.strokeStyle = '#6366f1'
      ctx.lineWidth = 0.5
      ctx.stroke()
    }
  }

  // 3. 画粒子（带尾迹拖影 + 径向光晕 + 白色核心）
  // 尾迹：记录最近 40 帧的位置，依次画出淡化的线段
  // 光晕：createRadialGradient 从粒子中心向外渐变
}
```

---

### 5.6 Hero 区域小组件

#### Typewriter.vue（语录打字机）

**文件**：`src/components/Typewriter.vue`（~107 行）

**做什么**：循环展示 5 条中英文语录，打字 + 删除 + 停顿的节奏。

**实现**：直接使用第三方库 `typeit`，配置参数即可：

```javascript
new TypeIt(textRef.value, {
  strings: [
    '在代码的世界里，构建无限可能。',
    'Every line of code tells a story.',
    '探索 LLM 与 AI Agent 的前沿。',
    '热爱技术，享受创造的过程。',
    '用音乐与代码，连接世界。',
  ],
  speed: 80,              // 打字速度 80ms/字
  deleteSpeed: 40,        // 删除速度 40ms/字（比打字快一倍）
  loop: true,             // 无限循环
  nextStringDelay: 2500,  // 每条显示 2.5 秒再删除
  startDelay: 800,        // 页面加载后等 0.8 秒开始
}).go()
```

**样式**：紫色引号包住文字，闪烁光标。

#### DigitalClock.vue（数字时钟）

**文件**：`src/components/DigitalClock.vue`（~224 行）

**做什么**：显示 12 小时制数字时钟 + 日期 + 星期，带磁吸光晕效果。

**核心实现**：

```javascript
// 1. 基础功能：每 1 秒更新一次时间
function updateTime() {
  const now = new Date()
  hours.value = pad(now.getHours() % 12 || 12)   // 转为 12 小时制
  minutes.value = pad(now.getMinutes())
  seconds.value = pad(now.getSeconds())
  period.value = now.getHours() >= 12 ? 'PM' : 'AM'
  weekday.value = ['星期日', '星期一', ...][now.getDay()]
  dateDisplay.value = `${now.getFullYear()} 年 ${now.getMonth() + 1} 月 ${now.getDate()} 日`
}
setInterval(updateTime, 1000)  // 每 1000ms 执行一次

// 2. 磁吸光晕效果
function onMouseMove(e) {
  const rect = panelRef.value.getBoundingClientRect()
  // 计算鼠标在面板内的百分比位置
  const x = ((e.clientX - rect.left) / rect.width) * 100
  const y = ((e.clientY - rect.top) / rect.height) * 100
  // 移动光晕到鼠标位置
  glowStyle.left = x + '%'
  glowStyle.top = y + '%'
  glowStyle.opacity = 1
}
function onMouseLeave() {
  glowStyle.opacity = 0   // 鼠标离开时光晕消失
}
```

光晕的 CSS 实现：
```css
.clock-glow {
  position: absolute;
  width: 80px; height: 80px;
  border-radius: 50%;
  background: radial-gradient(circle,
    rgba(99, 102, 241, 0.15) 0%,    /* 中心 15% 靛蓝 */
    transparent 70%                   /* 边缘完全透明 */
  );
  transform: translate(-50%, -50%);  /* 居中定位 */
  pointer-events: none;              /* 不阻挡鼠标 */
  transition: opacity 0.5s ease;
}
```

#### SearchBar.vue（小猫搜索框）

**文件**：`src/components/SearchBar.vue`（~218 行）

**做什么**：Bing 搜索入口，带小猫 SVG 装饰 + 草地动画。

**核心实现**：

```javascript
function search() {
  const q = query.value.trim()
  if (!q) return
  // 在新标签页打开 Bing 搜索
  window.open(`https://cn.bing.com/search?q=${encodeURIComponent(q)}`, '_blank')
  query.value = ''               // 清空输入
  inputRef.value?.blur()         // 失焦
}
```

**小猫 SVG**：用纯 SVG 画了猫的身体、头、耳朵（带紫色内耳）、发光的眼睛、鼻子、4 根胡须、卷曲的尾巴、爪子。

**草地动画**：30 根草叶（用 JavaScript 动态生成 SVG path），CSS 动画 `@keyframes grassSway` 让它们在悬停时左右摇摆。

```javascript
function grassPath(i) {
  const x = i * 7 - 2 + (i % 5) * 2   // 水平位置（交错排列）
  const h = 3 + (i % 3) * 3              // 高度 3-9px（三种高度随机）
  const lean = (i % 3 === 0) ? -1.5 : (i % 3 === 1) ? 0 : 1.5  // 倾斜方向
  return `M${x},16 Q${x + lean},${16 - h} ${x + lean},${16 - h - 2}`
  //      起点    控制点（贝塞尔曲线）    终点
}
```

#### MiniPlayer.vue（音乐播放器）

**文件**：`src/components/MiniPlayer.vue`（~490 行）

**做什么**：完整的音乐播放器，10 首轻音乐。

**核心实现**：

```javascript
// 10 首歌的歌单
const playlist = [
  { title: '清晨微风', artist: '轻音乐', src: '/music/track1.mp3' },
  // ... 共 10 首
]

// 播放/暂停
function togglePlay() {
  if (playing.value) audio.pause()
  else audio.play()
  playing.value = !playing.value
}

// 切歌
function nextTrack() {
  currentIndex.value = (currentIndex.value + 1) % playlist.length  // 到最后一首回到第一首
  playTrack(currentIndex.value)
}

// 进度条点击跳转
function seek(e) {
  const rect = e.target.getBoundingClientRect()
  const pct = (e.clientX - rect.left) / rect.width    // 点击位置百分比
  audio.currentTime = pct * duration.value              // 设置音频到对应位置
}

// 计算进度百分比（用于进度条宽度）
const progress = computed(() => {
  return (currentTime.value / duration.value) * 100
})
```

**CD 封面旋转效果**（纯 CSS）：
```css
.mp-art.spinning .mp-art-img {
  animation: coverSpin 8s linear infinite;
  /* 8 秒转一圈，匀速，无限循环 */
}
@keyframes coverSpin {
  from { transform: rotate(0deg); }
  to   { transform: rotate(360deg); }
}
```

---

### 5.7 图集组件

#### HeroGallery.vue（首页图集展示）

**文件**：`src/components/HeroGallery.vue`（~465 行）

**做什么**：首页 Hero 区域的图集预览。两种显示模式：
- **`card` 模式**：分类标签过滤 + 3 列网格，用于 Hero 右下
- **`masonry` 模式**：CSS Columns 瀑布流布局，用于 Hero 下半区

**瀑布流实现原理**：
```css
.hg-masonry {
  column-count: 3;        /* 分成 3 列，浏览器自动排 */
  column-gap: 12px;       /* 列间距 */
}
.hg-masonry-item {
  break-inside: avoid;    /* 每张图片保持完整，不被截断 */
}
```
这样图片就会像 Pinterest 一样自动排列，高度不同的图片凑在一起。

**手机壁纸成对展示**：遍历图片时如果连续两张都是"手机壁纸"分类，就并排显示。

```javascript
const displayImages = computed(() => {
  if (img.category === '手机壁纸' && nextImg?.category === '手机壁纸') {
    result.push({ type: 'pair', left: img, right: nextImg })  // 并排
    i += 2
  } else {
    result.push({ type: 'single', img })  // 单独
    i++
  }
})
```

**数据来源**：从 `public/gallery/manifest.json` 获取图片列表。

#### ImageGallery.vue（完整图集管理）

**文件**：`src/components/ImageGallery.vue`（~593 行）

**做什么**：独立的图集页面，完整 CRUD。这是最复杂的组件。

**管理员检测（核心区分逻辑）**：

```javascript
const isOwner = computed(() => {
  return ['localhost', '127.0.0.1'].includes(window.location.hostname) ||
         window.location.hostname.startsWith('192.168.')
})
// 如果 hostname 是 localhost → 本地开发 → 管理员
// 如果 hostname 是 xxx.vercel.app → 线上 → 访客（只读）
```

**数据加载双重策略**：
```javascript
async function loadManifest() {
  try {
    // 优先尝试 API（仅本地 Vite dev server 有）
    const res = await fetch('/api/gallery/manifest')
    // ...
  } catch {
    // API 不可用（生产环境），回退到静态 JSON
    const res = await fetch('/gallery/manifest.json')
    // ...
  }
}
```

**分页实现**：
```javascript
const ITEMS_PER_PAGE = 12   // 每页 12 张
const currentPage = ref(1)
const totalPages = computed(() =>
  Math.max(1, Math.ceil(filteredImages.value.length / ITEMS_PER_PAGE))
)
const paginatedImages = computed(() => {
  const start = (currentPage.value - 1) * ITEMS_PER_PAGE
  return filteredImages.value.slice(start, start + ITEMS_PER_PAGE)
})
```

**拖拽排序**（HTML5 Drag & Drop API）：
```javascript
function onDragStart(e, index, type) {
  dragInfo.value = { index, type }      // 记录拖拽源
}
function onDrop(e, targetIndex, type) {
  // 本地快速重排（先让 UI 立即响应）
  const [item] = arr.splice(fromIndex, 1)
  arr.splice(targetIndex, 0, item)
  // 向服务器发送 API 保存顺序（异步，失败不影响 UI）
  fetch('/api/gallery/reorder', {
    method: 'PUT',
    body: JSON.stringify({ type, fromIndex, toIndex, category })
  })
}
```

---

### 5.8 自定义 Vite 插件（图集后端）

**文件**：`vite-plugin-gallery.js`（~284 行）

这是项目的**技术核心**。它通过在 Vite 开发服务器上挂载中间件，实现了图集管理的后端 API。

```javascript
export default function galleryPlugin() {
  return {
    name: 'gallery-api',
    configureServer(server) {
      // 在 Vite 的 HTTP 服务器上添加中间件
      server.middlewares.use('/api/gallery', async (req, res, next) => {
        // 设置允许跨域访问
        res.setHeader('Access-Control-Allow-Origin', '*')

        // 路由分发：根据请求方法和路径
        const pathname = url.pathname.replace('/api/gallery', '')

        if (req.method === 'GET' && pathname === '/manifest') {
          // GET /api/gallery/manifest → 返回 manifest.json 内容
          const manifest = await loadManifest(root)
          return sendJSON(res, manifest)
        }

        if (req.method === 'POST' && pathname === '/upload') {
          // POST /api/gallery/upload → 接收 multipart 表单数据
          // 1. 解析上传的文件
          // 2. 保存到 public/gallery/
          // 3. 用 sharp 生成 WebP + 缩略图
          // 4. 更新 manifest.json
        }

        // DELETE、PUT 同理...
      })
    }
  }
}
```

**上传时自动生成 WebP**：
```javascript
// 保存原图后立即转换
await sharp(destPath)
  .resize(1920, undefined, { withoutEnlargement: true })  // 宽度最多 1920px
  .webp({ quality: 85 })                                    // WebP 品质 85%
  .toFile(webpPath)

await sharp(destPath)
  .resize(500, undefined, { withoutEnlargement: true })   // 缩略图 500px
  .webp({ quality: 75 })                                    // 品质 75%
  .toFile(thumbPath)
```

**manifest.json 的数据结构**：
```json
{
  "categories": ["风景", "手机壁纸", "动漫", "人物"],
  "images": [
    {
      "id": "img_1717000000000_abc123",
      "name": "夕阳下的山水",
      "category": "风景",
      "description": "桂林漓江",
      "src": "img_1717000000000_abc123.png",
      "size": 2048576,
      "createdAt": "2026-05-30T12:00:00.000Z"
    }
  ]
}
```

---

### 5.9 脚本工具

#### `scripts/optimize-images.js`

每次 `npm run dev` 或 `npm run build` 之前自动运行。

**做什么**：
1. 遍历 `public/gallery/` 和 `public/images/` 里的 PNG/JPG
2. 跳过已经有 WebP 版本且版本更新的图片
3. 用 sharp 生成 1920px WebP（品质85%）+ 500px 缩略图（品质75%）
4. 打印优化结果（原图大小 → WebP 大小 → 缩略图大小）

**为什么每次构建前都跑**：确保新增的图片一定被优化，已优化的不会重复处理（通过时间戳判断）。

#### `scripts/clean-dist.js`

构建完成后运行，清理 `dist/` 中的冗余 PNG/JPG（如果对应 WebP 已存在则删除原图），减小部署包体积。

#### `srcipts/apply-export.js`

用于合并图集导出包到 `public/gallery/`。解压 zip，合并 manifest 记录。

---

## 6. 完整数据流：一张图看清楚

```
                    浏览器加载
                        │
              index.html (入口)
                        │
              src/main.js (启动 Vue)
                        │
             ┌──────────┴──────────┐
             │                     │
        src/App.vue          src/style.css
        (页面主控)            (全局样式)
             │
    ┌────────┼────────┬────────┬─────────────┐
    │        │        │        │             │
 背景层   Hero区   图集区    作品区        关于区
    │        │        │        │             │
 Shooting   │   ImageGallery   模板内实现   模板内实现
 Stars      │   (CRUD完整)     (写死在       (写死在
    │       │        │        App.vue)     App.vue)
 Ambient   MiniPlayer│
 Particles  │       HeroGallery
    │    DigitalClock
 TechCoil  Typewriter
(仅Hero)   SearchBar

数据流向：
  App.vue (所有数据源) → props → 子组件
  子组件 emit → App.vue 响应

API 调用（仅 dev）：
  ImageGallery.vue → fetch('/api/gallery/...') → vite-plugin-gallery.js → public/gallery/

静态数据（生产）：
  ImageGallery.vue / HeroGallery.vue → fetch('/gallery/manifest.json') → 静态 JSON
```

---

## 7. 总结

| 方面 | 设计决策 | 为什么这样选 |
|------|----------|------------|
| 框架 | Vue 3 | 组件化开发，适合单页应用 |
| 无 Router | hash 锚点 | 只有 4 个区块，不需要路由库 |
| 无 Pinia | props/emit | 数据简单，不需要状态管理 |
| 构建 | Vite 8 | 开发热更新快，构建产物小 |
| 样式 | 纯 CSS Variables | 没有 UI 库依赖，所有样式可控 |
| 背景 | Canvas 2D × 3 | 用代码画动画，比 GIF/视频轻量 |
| 图片 | WebP + 缩略图 | 加载速度提升 3-5 倍 |
| 部署 | Vercel | 免费，自动部署，全球 CDN |
| 后端 | Vite 插件（仅 dev） | 不需要真实后端，零运维成本 |

**文件职责速查表**：

| 文件 | 职责 | 关键技术 |
|------|------|----------|
| `index.html` | 浏览器入口 | SEO meta 标签 |
| `src/main.js` | Vue 启动 | createApp + mount |
| `src/App.vue` | 页面主控 | scrollIntoView, IntersectionObserver, 3D tilt |
| `src/style.css` | 全局样式 | CSS Variables, Glassmorphism, 响应式 |
| `ShootingStars.vue` | 星星+流星 | Canvas 2D, requestAnimationFrame, sin 闪烁 |
| `AmbientParticles.vue` | 浮动粒子 | Canvas 2D, 径向渐变, 脉冲呼吸 |
| `TechCoil.vue` | 轨道科技感 | Canvas 2D, 椭圆运动, 粒子连线 |
| `Typewriter.vue` | 语录打字 | typeit 库 |
| `DigitalClock.vue` | 数字时钟 | setInterval, mousemove 光晕跟踪 |
| `SearchBar.vue` | 搜索框 | SVG 手绘, CSS @keyframes 摇摆 |
| `MiniPlayer.vue` | 音乐播放 | HTML5 Audio API, CSS 旋转动画 |
| `HeroGallery.vue` | 首页图集 | CSS columns 瀑布流, Teleport 灯箱 |
| `ImageGallery.vue` | 图集管理 | CRUD, 分页, HTML5 拖拽排序, 双重数据源 |
| `vite-plugin-gallery.js` | 图集后端 | Vite 中间件, sharp, multipart 解析 |
| `optimize-images.js` | 图片优化 | sharp: PNG → WebP + 缩略图 |
| `vercel.json` | 部署配置 | npm run build → dist/ |
