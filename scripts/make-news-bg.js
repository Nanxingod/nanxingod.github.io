// make-news-bg.js —— 生成「今日资讯」卡片背景图
//
// 为什么要重做：上一版是拿项目自带的暗调海天图竖裁出来的，那张云层本身就接近灰黑，
// 压上文字后整张卡读起来就是"一块黑"。照片类背景为了文字可读必然要加暗遮罩，
// 结果一定发黑——这是结构性问题。
//
// 所以改成一张**专用的抽象底图**：深靛蓝 → 紫罗兰渐变 + 青/琥珀光晕 + 细线几何 +
// 半调网点，天然就有颜色，不需要靠暗遮罩压出对比度。
//
// 底图由 ImageGen 生成（prompt 见下方 PROMPT，seed 不可控，重跑会得到不同结果）。
// 生成物放在 .tmp-newsbg/（已 gitignore，不进仓），本脚本负责：
//   1) 裁掉右下角的生成水印
//   2) 轻微提饱和，避免又变灰
//   3) 只在最底部烤一层很淡的暗角，给列表末行留可读性
//   4) 输出 WebP（几十 KB）
//
// 用法：
//   node scripts/make-news-bg.js                 # 自动取 .tmp-newsbg/ 里最新的一张
//   node scripts/make-news-bg.js <master.png>    # 指定底图

import sharp from 'sharp'
import { existsSync, mkdirSync, readdirSync, statSync } from 'node:fs'
import { dirname, join } from 'node:path'

const OUT = 'public/images/news-bg.webp'
const MASTER_DIR = '.tmp-newsbg'

// 资讯卡是窄高卡（移动端约 2:5），出图按 820×1120 够用，再大只是浪费流量
const W = 820
const H = 1120

// 生成时用的提示词，重制底图时照抄
const PROMPT = `Abstract premium editorial backdrop for a news digest panel. Deep indigo to violet
diagonal gradient with soft cyan and warm amber light blooms glowing from the upper area.
Faint thin geometric grid lines and subtle halftone dot texture. Gentle bokeh light particles
drifting in the upper third. Smooth natural vertical falloff. Minimal, modern, elegant.
No text, no letters, no numbers, no people, no logos, no watermark. Vertical composition.`

function pickMaster() {
  const arg = process.argv[2]
  if (arg) return arg
  if (!existsSync(MASTER_DIR)) return null
  const files = readdirSync(MASTER_DIR)
    .filter((f) => /\.(png|jpg|jpeg|webp)$/i.test(f))
    .map((f) => join(MASTER_DIR, f))
    .sort((a, b) => statSync(b).mtimeMs - statSync(a).mtimeMs)
  return files[0] || null
}

async function main() {
  const src = pickMaster()
  if (!src) {
    console.log(`[news-bg] 没找到底图。\n\n先用图片生成工具按下面的提示词出一张竖图，存到 ${MASTER_DIR}/ 再重跑：\n\n${PROMPT}\n`)
    return
  }
  if (!existsSync(src)) throw new Error(`底图不存在：${src}`)
  mkdirSync(dirname(OUT), { recursive: true })

  const meta = await sharp(src).metadata()
  console.log(`[news-bg] 底图 ${src}  ${meta.width}x${meta.height}`)

  // 生成图右下角带水印，直接砍掉最底部一条（顺带去掉那截最暗的收边）
  const keepH = Math.round(meta.height * 0.92)

  const base = await sharp(src)
    .extract({ left: 0, top: 0, width: meta.width, height: keepH })
    .resize(W, H, { fit: 'cover', position: 'centre' })
    // 提饱和 + 提亮：底图原本偏灰蓝，直接上屏会被遮罩压成"看着像黑"。
    // 与其靠调遮罩，不如把颜色本身做足——遮罩只能减不能加。
    .modulate({ saturation: 1.3, brightness: 1.06 })
    .toBuffer()

  // 只在底部烤一层淡暗角，外加一层紫罗兰色纱提升色相。
  // 顶部与中部保持本色——暗遮罩交给 CSS 的 .nc-veil 控制，
  // 图片里烤太重就等于又把颜色压没了。
  const scrim = Buffer.from(`<svg width="${W}" height="${H}" xmlns="http://www.w3.org/2000/svg">
    <defs>
      <linearGradient id="g" x1="0" y1="0" x2="0" y2="1">
        <stop offset="0%"   stop-color="#0a0918" stop-opacity="0"/>
        <stop offset="60%"  stop-color="#0a0918" stop-opacity="0.05"/>
        <stop offset="100%" stop-color="#080712" stop-opacity="0.38"/>
      </linearGradient>
      <linearGradient id="v" x1="0" y1="0" x2="1" y2="1">
        <stop offset="0%"   stop-color="#4f46e5" stop-opacity="0.18"/>
        <stop offset="52%"  stop-color="#7c3aed" stop-opacity="0.07"/>
        <stop offset="100%" stop-color="#a21caf" stop-opacity="0.20"/>
      </linearGradient>
      <radialGradient id="w" cx="76%" cy="88%" r="68%">
        <stop offset="0%"   stop-color="#7c3aed" stop-opacity="0.16"/>
        <stop offset="100%" stop-color="#7c3aed" stop-opacity="0"/>
      </radialGradient>
    </defs>
    <rect width="100%" height="100%" fill="url(#v)"/>
    <rect width="100%" height="100%" fill="url(#g)"/>
    <rect width="100%" height="100%" fill="url(#w)"/>
  </svg>`)

  const info = await sharp(base)
    .composite([{ input: scrim, blend: 'over' }])
    .webp({ quality: 76, effort: 6 })
    .toFile(OUT)

  console.log(`[news-bg] ${OUT}  ${W}x${H}  ${(info.size / 1024).toFixed(1)} KB`)
}

main().catch((e) => {
  console.error('[news-bg] failed:', e.message)
  process.exit(1)
})
