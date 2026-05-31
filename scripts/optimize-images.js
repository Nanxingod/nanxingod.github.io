/**
 * Image optimization script
 * - Converts gallery/images to WebP (80% quality)
 * - Generates thumbnails (400px, 70% quality)
 * - Updates manifest.json with thumbnail paths
 */
import sharp from 'sharp'
import { readFile, writeFile, readdir, mkdir, stat } from 'fs/promises'
import { join, extname, basename } from 'path'
import { existsSync } from 'fs'

const PUBLIC = join(process.cwd(), 'public')
const GALLERY = join(PUBLIC, 'gallery')
const IMAGES = join(PUBLIC, 'images')
const MUSIC_IMAGES = join(PUBLIC, 'music-images')
const MANIFEST = join(GALLERY, 'manifest.json')

const WEBP_QUALITY = 85
const THUMB_QUALITY = 75
const THUMB_WIDTH = 500
const FULL_WIDTH = 1920

async function optimizeDir(dir, { skipManifest = true } = {}) {
  if (!existsSync(dir)) return

  const files = await readdir(dir)
  const imageFiles = files.filter(f => /\.(png|jpe?g)$/i.test(f) && !f.includes('.webp') && !f.includes('-thumb.'))

  for (const file of imageFiles) {
    const srcPath = join(dir, file)
    const name = basename(file, extname(file))
    const webpPath = join(dir, name + '.webp')
    const thumbPath = join(dir, name + '-thumb.webp')

    // Check if optimized versions already exist and are newer
    const srcStat = await stat(srcPath)
    if (existsSync(webpPath) && existsSync(thumbPath)) {
      const webpStat = await stat(webpPath)
      if (webpStat.mtime > srcStat.mtime) {
        continue // Already optimized
      }
    }

    try {
      // WebP full-size
      await sharp(srcPath)
        .resize(FULL_WIDTH, undefined, { withoutEnlargement: true })
        .webp({ quality: WEBP_QUALITY })
        .toFile(webpPath)

      // WebP thumbnail
      await sharp(srcPath)
        .resize(THUMB_WIDTH, undefined, { withoutEnlargement: true })
        .webp({ quality: THUMB_QUALITY })
        .toFile(thumbPath)

      const origSize = (srcStat.size / 1024 / 1024).toFixed(1)
      const webpSize = ((await stat(webpPath)).size / 1024 / 1024).toFixed(1)
      const thumbSize = ((await stat(thumbPath)).size / 1024 / 1024).toFixed(1)
      console.log(`  ✓ ${file}: ${origSize}MB → ${webpSize}MB (webp) + ${thumbSize}MB (thumb)`)
    } catch (e) {
      console.error(`  ✗ ${file}: ${e.message}`)
    }
  }
}

async function main() {
  console.log('Optimizing gallery images...')
  await optimizeDir(GALLERY, { skipManifest: false })
  console.log('Optimizing static images...')
  await optimizeDir(IMAGES)
  if (existsSync(MUSIC_IMAGES)) {
    console.log('Optimizing music images...')
    await optimizeDir(MUSIC_IMAGES)
  }
  console.log('Done!')
}

main().catch(e => {
  console.error('Error:', e)
  process.exit(1)
})
