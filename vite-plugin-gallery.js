/**
 * Vite Plugin: Gallery API
 *
 * 在 dev server 上暴露 API，直接操作 public/gallery/ 文件系统：
 *   POST   /api/gallery/upload   — 上传图片 + 更新 manifest
 *   DELETE /api/gallery/image     — 删除图片 + 更新 manifest
 *   PUT    /api/gallery/image     — 编辑图片元数据
 *   GET    /api/gallery/manifest  — 获取当前 manifest
 *   DELETE /api/gallery/category  — 删除分类 + 其下所有图片
 *   POST   /api/gallery/category  — 添加分类
 */

import { readFile, writeFile, unlink, mkdir, readdir } from 'fs/promises'
import { join, extname } from 'path'
import { existsSync } from 'fs'

const GALLERY_DIR = 'public/gallery'
const MANIFEST_FILE = 'manifest.json'

function getManifestPath(root) {
  return join(root, GALLERY_DIR, MANIFEST_FILE)
}

function getGalleryDir(root) {
  return join(root, GALLERY_DIR)
}

async function loadManifest(root) {
  const p = getManifestPath(root)
  if (!existsSync(p)) {
    const initial = { categories: ['风景', '人物', '动漫'], images: [] }
    await mkdir(getGalleryDir(root), { recursive: true })
    await writeFile(p, JSON.stringify(initial, null, 2))
    return initial
  }
  return JSON.parse(await readFile(p, 'utf-8'))
}

async function saveManifest(root, data) {
  await writeFile(getManifestPath(root), JSON.stringify(data, null, 2))
}

function sendJSON(res, data, status = 200) {
  res.statusCode = status
  res.setHeader('Content-Type', 'application/json')
  res.end(JSON.stringify(data))
}

function readBody(req) {
  return new Promise((resolve, reject) => {
    const chunks = []
    req.on('data', c => chunks.push(c))
    req.on('end', () => resolve(Buffer.concat(chunks)))
    req.on('error', reject)
  })
}

export default function galleryPlugin() {
  let root = ''

  return {
    name: 'gallery-api',
    configResolved(config) {
      root = config.root
    },
    configureServer(server) {
      // Ensure directory exists
      server.middlewares.use('/api/gallery', async (req, res, next) => {
        // CORS for dev
        res.setHeader('Access-Control-Allow-Origin', '*')
        res.setHeader('Access-Control-Allow-Methods', 'GET,POST,PUT,DELETE,OPTIONS')
        res.setHeader('Access-Control-Allow-Headers', 'Content-Type')

        if (req.method === 'OPTIONS') {
          res.statusCode = 204
          res.end()
          return
        }

        try {
          await mkdir(getGalleryDir(root), { recursive: true })
        } catch (e) { /* exists */ }

        const url = new URL(req.url, 'http://localhost')
        const pathname = url.pathname.replace('/api/gallery', '')

        try {
          // GET /api/gallery/manifest
          if (req.method === 'GET' && pathname === '/manifest') {
            const manifest = await loadManifest(root)
            return sendJSON(res, manifest)
          }

          // POST /api/gallery/upload — multipart form upload
          if (req.method === 'POST' && pathname === '/upload') {
            const boundary = req.headers['content-type']?.split('boundary=')[1]
            if (!boundary) return sendJSON(res, { error: 'No boundary' }, 400)

            const body = await readBody(req)
            const parts = parseMultipart(body, boundary)

            const category = parts.category || '风景'
            const name = parts.name || '未命名'
            const description = parts.description || ''
            const fileData = parts.file
            const filename = parts.filename || 'image.png'

            if (!fileData) return sendJSON(res, { error: 'No file' }, 400)

            const id = 'img_' + Date.now() + '_' + Math.random().toString(36).substr(2, 6)
            const ext = extname(filename) || '.png'
            const savedName = id + ext
            const destPath = join(getGalleryDir(root), savedName)

            await writeFile(destPath, fileData)

            const manifest = await loadManifest(root)
            if (!manifest.categories.includes(category)) {
              manifest.categories.push(category)
            }
            manifest.images.push({
              id,
              name,
              category,
              description,
              src: savedName,
              size: fileData.length,
              createdAt: new Date().toISOString(),
            })
            await saveManifest(root, manifest)

            return sendJSON(res, { success: true, id, src: '/gallery/' + savedName })
          }

          // DELETE /api/gallery/image?id=xxx
          if (req.method === 'DELETE' && pathname === '/image') {
            const id = url.searchParams.get('id')
            if (!id) return sendJSON(res, { error: 'Missing id' }, 400)

            const manifest = await loadManifest(root)
            const idx = manifest.images.findIndex(img => img.id === id)
            if (idx < 0) return sendJSON(res, { error: 'Not found' }, 404)

            const img = manifest.images[idx]
            const filePath = join(getGalleryDir(root), img.src)
            try { await unlink(filePath) } catch (e) { /* file may not exist */ }

            manifest.images.splice(idx, 1)
            await saveManifest(root, manifest)

            return sendJSON(res, { success: true })
          }

          // PUT /api/gallery/image?id=xxx  body: { name, description, category }
          if (req.method === 'PUT' && pathname === '/image') {
            const id = url.searchParams.get('id')
            if (!id) return sendJSON(res, { error: 'Missing id' }, 400)

            const body = JSON.parse((await readBody(req)).toString())
            const manifest = await loadManifest(root)
            const img = manifest.images.find(img => img.id === id)
            if (!img) return sendJSON(res, { error: 'Not found' }, 404)

            if (body.name !== undefined) img.name = body.name
            if (body.description !== undefined) img.description = body.description
            if (body.category !== undefined) {
              img.category = body.category
              if (!manifest.categories.includes(body.category)) {
                manifest.categories.push(body.category)
              }
            }
            await saveManifest(root, manifest)
            return sendJSON(res, { success: true, image: img })
          }

          // DELETE /api/gallery/category?name=xxx
          if (req.method === 'DELETE' && pathname === '/category') {
            const name = url.searchParams.get('name')
            if (!name) return sendJSON(res, { error: 'Missing name' }, 400)

            const manifest = await loadManifest(root)
            const toDelete = manifest.images.filter(img => img.category === name)
            for (const img of toDelete) {
              const filePath = join(getGalleryDir(root), img.src)
              try { await unlink(filePath) } catch (e) { /* skip */ }
            }
            manifest.images = manifest.images.filter(img => img.category !== name)
            manifest.categories = manifest.categories.filter(c => c !== name)
            await saveManifest(root, manifest)

            return sendJSON(res, { success: true, deleted: toDelete.length })
          }

          // POST /api/gallery/category  body: { name }
          if (req.method === 'POST' && pathname === '/category') {
            const body = JSON.parse((await readBody(req)).toString())
            const name = body.name?.trim()
            if (!name) return sendJSON(res, { error: 'Missing name' }, 400)

            const manifest = await loadManifest(root)
            if (!manifest.categories.includes(name)) {
              manifest.categories.push(name)
              await saveManifest(root, manifest)
            }
            return sendJSON(res, { success: true, categories: manifest.categories })
          }

          // PUT /api/gallery/reorder  body: { type: 'categories'|'images', fromIndex, toIndex, category? }
          if (req.method === 'PUT' && pathname === '/reorder') {
            const body = JSON.parse((await readBody(req)).toString())
            const manifest = await loadManifest(root)
            if (body.type === 'categories') {
              const arr = manifest.categories
              const [item] = arr.splice(body.fromIndex, 1)
              arr.splice(body.toIndex, 0, item)
            } else if (body.type === 'images') {
              const cat = body.category
              const imgList = cat
                ? manifest.images.filter(img => img.category === cat)
                : manifest.images
              const [item] = imgList.splice(body.fromIndex, 1)
              imgList.splice(body.toIndex, 0, item)
              // Rebuild manifest.images: preserve non-category images, insert reordered ones
              if (cat) {
                const others = manifest.images.filter(img => img.category !== cat)
                const firstCatIdx = manifest.images.findIndex(img => img.category === cat)
                const before = others.slice(0, firstCatIdx)
                const after = others.slice(firstCatIdx)
                manifest.images = [...before, ...imgList, ...after]
              } else {
                manifest.images = imgList
              }
            }
            await saveManifest(root, manifest)
            return sendJSON(res, { success: true })
          }

          next()
        } catch (e) {
          console.error('Gallery API error:', e)
          sendJSON(res, { error: e.message }, 500)
        }
      })
    }
  }
}

// Simple multipart parser (no dependency)
function parseMultipart(buffer, boundary) {
  const str = buffer.toString('binary')
  const boundaryMarker = '--' + boundary
  const parts = str.split(boundaryMarker).slice(1, -1)
  const result = {}

  for (const part of parts) {
    const headerEnd = part.indexOf('\r\n\r\n')
    if (headerEnd < 0) continue
    const headerStr = part.slice(0, headerEnd)
    const body = part.slice(headerEnd + 4)
    // Remove trailing \r\n
    const cleanBody = body.replace(/\r\n$/, '')

    const nameMatch = headerStr.match(/name="([^"]+)"/)
    const filenameMatch = headerStr.match(/filename="([^"]+)"/)

    if (filenameMatch) {
      result.file = Buffer.from(cleanBody, 'binary')
      result.filename = filenameMatch[1]
    } else if (nameMatch) {
      result[nameMatch[1]] = Buffer.from(cleanBody, 'binary').toString('utf-8')
    }
  }

  return result
}