/**
 * apply-export.js — 自动合并 gallery-export.zip 到 public/gallery/
 *
 * 用法：
 *   node scripts/apply-export.js gallery-export.zip
 *
 * 功能：
 *   - 新增图片到 public/gallery/
 *   - 更新 manifest.json（合并新旧记录）
 *   - 不删除已有图片
 *   - 打印变更摘要
 */

const fs = require('fs')
const path = require('path')
const AdmZip = require('adm-zip')

const PUBLIC_DIR = path.join(__dirname, '..', 'public', 'gallery')

// 读取 zip 文件路径
const zipPath = process.argv[2]
if (!zipPath) {
  console.error('用法: node scripts/apply-export.js <gallery-export.zip>')
  process.exit(1)
}

if (!fs.existsSync(zipPath)) {
  console.error(`文件不存在: ${zipPath}`)
  process.exit(1)
}

// 确保目录存在
fs.mkdirSync(PUBLIC_DIR, { recursive: true })

// 读取现有 manifest
let existingManifest = { categories: ['风景', '人物', '动漫'], images: [] }
const manifestPath = path.join(PUBLIC_DIR, 'manifest.json')
if (fs.existsSync(manifestPath)) {
  try {
    existingManifest = JSON.parse(fs.readFileSync(manifestPath, 'utf-8'))
  } catch (e) {
    console.warn('现有 manifest.json 解析失败，将重新生成')
  }
}

// 解压 zip
const zip = new AdmZip(zipPath)
const entries = zip.getEntries()

let newManifest = null
let addedImages = 0
let updatedImages = 0
const existingIdMap = new Map(existingManifest.images.map(img => [img.id, img]))

console.log('\n📦 处理 gallery-export.zip ...')

for (const entry of entries) {
  if (entry.isDirectory) continue

  if (entry.entryName === 'gallery/manifest.json') {
    newManifest = JSON.parse(entry.getData().toString('utf-8'))
    continue
  }

  // 提取图片文件
  const filename = path.basename(entry.entryName)
  const destPath = path.join(PUBLIC_DIR, filename)

  if (fs.existsSync(destPath)) {
    console.log(`  ⏭  跳过（已存在）: ${filename}`)
  } else {
    entry.extract(PUBLIC_DIR, false)  // false = don't maintain folder structure
    console.log(`  ✅ 新增: ${filename}`)
    addedImages++
  }
}

// 合并 manifest
if (newManifest) {
  for (const img of newManifest.images) {
    if (existingIdMap.has(img.id)) {
      existingIdMap.set(img.id, img)  // 更新
      updatedImages++
    } else {
      existingIdMap.set(img.id, img)  // 新增
    }
  }

  const merged = {
    categories: newManifest.categories || existingManifest.categories,
    images: [...existingIdMap.values()],
  }

  fs.writeFileSync(manifestPath, JSON.stringify(merged, null, 2), 'utf-8')
} else {
  console.warn('⚠️  zip 中未找到 manifest.json')
}

// 统计
const finalManifest = JSON.parse(fs.readFileSync(manifestPath, 'utf-8'))
const categoryCounts = {}
finalManifest.images.forEach(img => {
  categoryCounts[img.category] = (categoryCounts[img.category] || 0) + 1
})

console.log('\n📊 汇总:')
console.log(`  新图片: ${addedImages}`)
console.log(`  更新记录: ${updatedImages}`)
console.log(`  总图片数: ${finalManifest.images.length}`)
console.log(`  分类分布: ${JSON.stringify(categoryCounts)}`)
console.log(`\n✨ 完成！现在可以 npm run build → npx vercel --prod 部署了\n`)

// 清理 zip 文件
fs.unlinkSync(zipPath)
console.log(`🗑️  已清理: ${path.basename(zipPath)}`)