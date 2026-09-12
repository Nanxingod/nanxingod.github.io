// migrate-weather-bg.js —— 迁移天气场景插图，压缩为 WebP。
// 源图是整屏手机壁纸（单张 0.5–3.3MB），这里作为卡片背景使用，宽度压到 1000px 足够。
// 用法：node scripts/migrate-weather-bg.js
import sharp from 'sharp'
import { readdir, mkdir } from 'fs/promises'
import { join, basename } from 'path'
import { existsSync } from 'fs'

const SRC_DIR = process.env.SRC_DIR
const OUT_DIR = join(process.cwd(), 'public', 'images', 'weather')

// 中文文件名 → 天气场景英文名（与 weather.js 的 WEATHER_BG 对应）
const NAME_MAP = {
  '晴天': 'clear',
  '多云': 'cloudy',
  '阴天': 'overcast',
  '雨天': 'rain',
  '雪天': 'snow',
  '雾天': 'fog',
  '雷雨': 'thunder',
  '冰雹': 'hail',
}

const WIDTH = 1000
const QUALITY = 72

async function main() {
  if (!existsSync(SRC_DIR)) {
    console.error('源目录不存在:', SRC_DIR)
    process.exit(1)
  }
  if (!existsSync(OUT_DIR)) await mkdir(OUT_DIR, { recursive: true })

  const files = (await readdir(SRC_DIR)).filter(f => /\.(png|jpe?g)$/i.test(f))
  let total = 0

  for (const file of files) {
    const key = NAME_MAP[basename(file, file.slice(file.lastIndexOf('.')))]
    if (!key) {
      console.warn('跳过（无映射）:', file)
      continue
    }
    const out = join(OUT_DIR, `${key}.webp`)
    const info = await sharp(join(SRC_DIR, file))
      .resize({ width: WIDTH, withoutEnlargement: true })
      .webp({ quality: QUALITY, effort: 5 })
      .toFile(out)
    total += info.size
    console.log(`${file} → weather/${key}.webp  ${(info.size / 1024).toFixed(0)} KB  (${info.width}x${info.height})`)
  }
  console.log(`\n合计 ${(total / 1024 / 1024).toFixed(2)} MB`)
}

main().catch(e => { console.error(e); process.exit(1) })
