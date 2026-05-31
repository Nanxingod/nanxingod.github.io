/**
 * Remove redundant PNG/JPG from dist if WebP versions exist
 */
import { readdir, unlink } from 'fs/promises'
import { join, extname } from 'path'
import { existsSync } from 'fs'

const DIST = join(process.cwd(), 'dist')
const dirs = ['gallery', 'images']

async function clean() {
  for (const dir of dirs) {
    const d = join(DIST, dir)
    if (!existsSync(d)) continue
    const files = await readdir(d)
    for (const f of files) {
      // Keep webp, manifest.json, and PNGs that don't have a webp counterpart
      if (f.endsWith('.webp')) continue
      if (f === 'manifest.json') continue
      if (!/\.(png|jpe?g)$/i.test(f)) continue

      const base = f.replace(/\.(png|jpe?g)$/i, '')
      const webp = base + '.webp'
      if (files.includes(webp)) {
        await unlink(join(d, f))
        console.log(`  ✕ removed ${dir}/${f}`)
      }
    }
  }
}

clean().catch(e => console.error('Clean error:', e))
