# nanxgodqaq.vercel.app

个人主页，基于 Vue 3 + Vite 构建，部署于 Vercel。

## 功能模块

- **音乐播放器** — 嵌入式 MiniPlayer，10 首背景音乐，圆形旋转头像，音量可调
- **图集** — CSS Columns 瀑布流布局，分类浏览，支持灯箱预览
- **Bing 搜索** — 装饰性搜索框（小猫 + 草地），回车跳转搜索
- **磁吸时钟** — hover 光晕追踪光标，数字发光
- **海蜇音乐项目卡** — 展示开源项目截图与链接
- **打字机效果** — 首页打字动画
- **流星背景 + 粒子** — 动态视觉氛围

## 技术栈

| 层 | 技术 |
|---|---|
| 框架 | Vue 3 (Composition API) |
| 构建 | Vite |
| 部署 | Vercel (自动从 main 分支部署) |
| 样式 | 纯 CSS (CSS Variables, Glassmorphism) |
| 动效 | CSS Animations & Transitions |

## 本地运行

```bash
npm install
npm run dev
```

## 部署

推送 `main` 分支即可自动触发 Vercel 部署。

```bash
git add .
git commit -m "update"
git push origin main
```
