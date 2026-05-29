<template>
  <div class="gallery-section">
    <!-- 访客只读提示 -->
    <div class="gallery-mode-bar readonly-bar" v-if="!isOwner">
      <span class="mode-badge">🔒 只读模式</span>
      <span>仅可浏览和下载图片，管理功能仅在本地开发环境可用</span>
    </div>

    <!-- 分类标签 -->
    <div class="gallery-tabs">
      <div v-for="(cat, i) in categories" :key="cat" class="gallery-tab-wrapper"
        :draggable="isOwner"
        @dragstart="onDragStart($event, i, 'category')"
        @dragover.prevent="onDragOver($event, i, 'category')"
        @drop="onDrop($event, i, 'category')"
        @dragend="onDragEnd"
        :class="{ dragging: dragInfo?.index === i && dragInfo?.type === 'category' }">
        <span v-if="isOwner" class="drag-handle" title="拖拽排序">⋮⋮</span>
        <button class="gallery-tab" :class="{ active: activeCategory === cat }" @click="activeCategory = cat">
          {{ cat }}
          <span class="tab-count">{{ countByCategory(cat) }}</span>
        </button>
        <button v-if="isOwner && categories.length > 1"
          class="gallery-tab-delete" title="删除分类" @click="confirmingCategory = cat">
          <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>
        </button>
      </div>
      <button v-if="isOwner && !showAddCategory" class="gallery-tab gallery-tab-add" @click="showAddCategory = true">
        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/></svg>
      </button>
      <div v-if="showAddCategory" class="add-category-form">
        <input v-model="newCategory" placeholder="分类名称" @keyup.enter="addCategory" ref="categoryInput" maxlength="10" />
        <button class="cat-btn cat-btn-confirm" @click="addCategory">✓</button>
        <button class="cat-btn cat-btn-cancel" @click="showAddCategory = false; newCategory = ''">✕</button>
      </div>
    </div>

    <!-- 分类删除确认 -->
    <div v-if="confirmingCategory" class="gallery-mode-bar" style="background:rgba(245,108,108,0.1);border-color:rgba(245,108,108,0.2)">
      <span>确定删除"{{ confirmingCategory }}"分类及其下 {{ countByCategory(confirmingCategory) }} 张图片？</span>
      <button class="export-btn" style="background:rgba(245,108,108,0.15);border-color:#f56c6c;color:#f56c6c" @click="doDeleteCategory">确认删除</button>
      <button class="export-btn" @click="confirmingCategory = null">取消</button>
    </div>

    <!-- 上传区域 -->
    <div v-if="isOwner" class="gallery-upload-zone" @click="triggerUpload" @dragover.prevent @drop.prevent="handleDrop">
      <input type="file" ref="fileInput" accept="image/*" multiple @change="handleFileSelect" style="display:none" />
      <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5">
        <path d="M21 15v4a2 2 0 01-2 2H5a2 2 0 01-2-2v-4"/><polyline points="17 8 12 3 7 8"/><line x1="12" y1="3" x2="12" y2="15"/>
      </svg>
      <span>拖拽图片到此处或点击上传</span>
      <span class="upload-hint">支持 JPG / PNG / WebP · 直接写入 public/gallery/</span>
    </div>

    <!-- 上传进度 -->
    <div v-if="uploading" class="upload-progress">
      <div class="progress-bar"><div class="progress-fill" :style="{ width: uploadProgress + '%' }"></div></div>
      <span>正在上传 {{ uploadProgress }}%</span>
    </div>

    <!-- 图片网格 -->
    <div class="gallery-grid" v-if="filteredImages.length > 0">
      <div v-for="(img, i) in paginatedImages" :key="img.id" class="gallery-card glass-card"
        :draggable="isOwner"
        @dragstart="onDragStart($event, i, 'image')"
        @dragover.prevent="onDragOver($event, i, 'image')"
        @drop="onDrop($event, i, 'image')"
        @dragend="onDragEnd"
        :class="{ dragging: dragInfo?.index === i && dragInfo?.type === 'image' }">
        <div class="gallery-card-img" @click="openLightbox(img)">
          <img :src="img.src" :alt="img.name" loading="lazy" />
          <span v-if="isOwner" class="img-drag-handle" title="拖拽排序" @click.stop>⋮⋮</span>
          <div class="gallery-card-overlay">
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="white" stroke-width="2"><circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/></svg>
          </div>
        </div>
        <div class="gallery-card-info">
          <div v-if="editingId === img.id" class="gallery-edit-form">
            <input v-model="editName" placeholder="图片名称" @keyup.escape="cancelEdit" />
            <textarea v-model="editDesc" placeholder="添加描述..." rows="2" @keyup.escape="cancelEdit"></textarea>
            <div class="edit-actions">
              <button @click="saveEdit(img)" class="btn-save">保存</button>
              <button @click="cancelEdit" class="btn-cancel">取消</button>
            </div>
          </div>
          <div v-else class="gallery-card-text">
            <div class="gallery-card-name">{{ img.name || '未命名' }}</div>
            <div class="gallery-card-desc" v-if="img.description">{{ img.description }}</div>
          </div>
          <div class="gallery-card-actions" v-if="editingId !== img.id && confirmingId !== img.id">
            <button v-if="isOwner" title="编辑" @click="startEdit(img)">
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M11 4H4a2 2 0 00-2 2v14a2 2 0 002 2h14a2 2 0 002-2v-7"/><path d="M18.5 2.5a2.121 2.121 0 013 3L12 15l-4 1 1-4 9.5-9.5z"/></svg>
            </button>
            <button title="下载" @click="downloadImage(img)">
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M21 15v4a2 2 0 01-2 2H5a2 2 0 01-2-2v-4"/><polyline points="7 10 12 15 17 10"/><line x1="12" y1="15" x2="12" y2="3"/></svg>
            </button>
            <button v-if="isOwner" title="删除" @click="confirmingId = img.id" class="btn-delete">
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polyline points="3 6 5 6 21 6"/><path d="M19 6v14a2 2 0 01-2 2H7a2 2 0 01-2-2V6m3 0V4a2 2 0 012-2h4a2 2 0 012 2v2"/></svg>
            </button>
          </div>
          <!-- 删除确认 -->
          <div v-if="confirmingId === img.id" class="gallery-confirm">
            <span>确定删除"{{ img.name }}"？</span>
            <div class="confirm-actions">
              <button @click="doDelete(img)" class="btn-confirm-del">确认删除</button>
              <button @click="confirmingId = null" class="btn-cancel">取消</button>
            </div>
          </div>
        </div>
      </div>
    </div>

    <!-- 分页 -->
    <div v-if="totalPages > 1" class="gallery-pagination">
      <button :disabled="currentPage === 1" @click="currentPage = 1" title="首页">
        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polyline points="11 17 6 12 11 7"/><polyline points="18 17 13 12 18 7"/></svg>
      </button>
      <button :disabled="currentPage === 1" @click="currentPage--" title="上一页">
        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polyline points="15 18 9 12 15 6"/></svg>
      </button>
      <span class="page-info">{{ currentPage }} / {{ totalPages }}</span>
      <button :disabled="currentPage === totalPages" @click="currentPage++" title="下一页">
        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polyline points="9 18 15 12 9 6"/></svg>
      </button>
      <button :disabled="currentPage === totalPages" @click="currentPage = totalPages" title="末页">
        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polyline points="13 17 18 12 13 7"/><polyline points="6 17 11 12 6 7"/></svg>
      </button>
    </div>

    <!-- 空状态 -->
    <div v-if="filteredImages.length === 0 && !uploading" class="gallery-empty glass-card">
      <p>📂 {{ activeCategory }} 分类下还没有图片</p>
      <span v-if="isOwner">拖拽图片到上方虚线框即可添加</span>
      <span v-else>该分类暂无已发布的图片</span>
    </div>

    <!-- 灯箱 -->
    <Teleport to="body">
      <div v-if="lightboxImage" class="lightbox" @click="closeLightbox">
        <button class="lightbox-close" @click="closeLightbox">
          <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>
        </button>
        <div class="lightbox-content" @click.stop>
          <img :src="lightboxImage.src" :alt="lightboxImage.name" />
          <div class="lightbox-info">
            <h3>{{ lightboxImage.name || '未命名' }}</h3>
            <p v-if="lightboxImage.description">{{ lightboxImage.description }}</p>
            <span class="lightbox-meta">{{ lightboxImage.category }} · {{ formatSize(lightboxImage.size) }} · {{ lightboxImage.createdAt?.slice(0, 10) }}</span>
          </div>
        </div>
      </div>
    </Teleport>
  </div>
</template>

<script setup>
import { ref, computed, onMounted, nextTick, watch } from 'vue'

const isOwner = computed(() => ['localhost', '127.0.0.1'].includes(window.location.hostname) || window.location.hostname.startsWith('192.168.'))

// --- State ---
const categories = ref(['风景', '人物', '动漫'])
const images = ref([])
const activeCategory = ref('风景')
const uploading = ref(false)
const uploadProgress = ref(0)
const lightboxImage = ref(null)
const editingId = ref(null)
const confirmingId = ref(null)
const confirmingCategory = ref(null)
const editName = ref('')
const editDesc = ref('')
const showAddCategory = ref(false)
const newCategory = ref('')
const fileInput = ref(null)
const categoryInput = ref(null)

const filteredImages = computed(() => images.value.filter(img => img.category === activeCategory.value))

const ITEMS_PER_PAGE = 12
const currentPage = ref(1)
const totalPages = computed(() => Math.max(1, Math.ceil(filteredImages.value.length / ITEMS_PER_PAGE)))
const paginatedImages = computed(() => {
  const start = (currentPage.value - 1) * ITEMS_PER_PAGE
  return filteredImages.value.slice(start, start + ITEMS_PER_PAGE)
})

function countByCategory(cat) {
  return images.value.filter(img => img.category === cat).length
}

// --- API helpers ---
const API = import.meta.env.BASE_URL + 'api/gallery'

async function loadManifest() {
  // 优先尝试 API（仅 localhost dev server 可用）
  try {
    const res = await fetch(API + '/manifest')
    if (!res.ok) throw new Error('API not available')
    const data = await res.json()
    categories.value = data.categories || ['风景', '人物', '动漫']
    images.value = (data.images || []).map(img => ({
      ...img,
      src: import.meta.env.BASE_URL + 'gallery/' + img.src,
    }))
    if (categories.value.length > 0 && !categories.value.includes(activeCategory.value)) {
      activeCategory.value = categories.value[0]
    }
    return
  } catch (e) {
    // API 不可用（生产环境），回退到静态 manifest.json
  }

  try {
    const res = await fetch(import.meta.env.BASE_URL + 'gallery/manifest.json')
    if (res.ok) {
      const data = await res.json()
      categories.value = data.categories || ['风景', '人物', '动漫']
      images.value = (data.images || []).map(img => ({
        ...img,
        src: import.meta.env.BASE_URL + 'gallery/' + img.src,
      }))
      if (categories.value.length > 0 && !categories.value.includes(activeCategory.value)) {
        activeCategory.value = categories.value[0]
      }
    }
  } catch (e2) {
    // 连静态 manifest 也没有，保持初始状态
  }
}

// --- Upload ---
function triggerUpload() { fileInput.value?.click() }
function handleFileSelect(e) {
  if (e.target.files.length > 0) processFiles(e.target.files)
  e.target.value = ''
}
function handleDrop(e) {
  if (e.dataTransfer.files.length > 0) processFiles(e.dataTransfer.files)
}

async function processFiles(files) {
  const imageFiles = Array.from(files).filter(f => f.type.startsWith('image/'))
  if (!imageFiles.length) return
  uploading.value = true
  let done = 0
  for (const file of imageFiles) {
    try {
      const form = new FormData()
      form.append('file', file, file.name)
      form.append('category', activeCategory.value)
      form.append('name', file.name.replace(/\.[^.]+$/, ''))

      const res = await fetch(API + '/upload', { method: 'POST', body: form })
      if (!res.ok) throw new Error((await res.json()).error || 'Upload failed')
      done++
      uploadProgress.value = Math.round((done / imageFiles.length) * 100)
    } catch (e) { console.error('Upload error:', e) }
  }
  uploading.value = false
  uploadProgress.value = 0
  await loadManifest()
}

// --- Lightbox ---
function openLightbox(img) { lightboxImage.value = img; document.body.style.overflow = 'hidden' }
function closeLightbox() { lightboxImage.value = null; document.body.style.overflow = '' }

// --- Edit ---
function startEdit(img) {
  editingId.value = img.id
  editName.value = img.name
  editDesc.value = img.description || ''
}
function cancelEdit() { editingId.value = null; editName.value = ''; editDesc.value = '' }

async function saveEdit(img) {
  try {
    const res = await fetch(`${API}/image?id=${img.id}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ name: editName.value || '未命名', description: editDesc.value }),
    })
    if (!res.ok) throw new Error((await res.json()).error)
    await loadManifest()
    cancelEdit()
  } catch (e) { alert('保存失败：' + e.message) }
}

// --- Delete ---
async function doDelete(img) {
  confirmingId.value = null
  try {
    await fetch(`${API}/image?id=${img.id}`, { method: 'DELETE' })
    await loadManifest()
  } catch (e) { alert('删除失败：' + e.message) }
}

function downloadImage(img) {
  const a = document.createElement('a')
  a.href = img.src
  const ext = (img.src.split('.').pop() || 'jpg').split('?')[0]
  a.download = (img.name || 'image') + '.' + ext
  a.click()
}

// --- Categories ---
async function addCategory() {
  const name = newCategory.value.trim()
  if (!name) return
  try {
    await fetch(API + '/category', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ name }),
    })
    newCategory.value = ''
    showAddCategory.value = false
    activeCategory.value = name
    await loadManifest()
  } catch (e) { /* fallback: add locally */ categories.value.push(name); activeCategory.value = name }
}

async function doDeleteCategory() {
  const cat = confirmingCategory.value
  confirmingCategory.value = null
  try {
    await fetch(`${API}/category?name=${encodeURIComponent(cat)}`, { method: 'DELETE' })
    await loadManifest()
  } catch (e) { alert('删除失败：' + e.message) }
}

function formatSize(bytes) {
  if (!bytes) return '0 B'
  const u = ['B', 'KB', 'MB', 'GB']
  let i = 0, s = bytes
  while (s >= 1024 && i < u.length - 1) { s /= 1024; i++ }
  return s.toFixed(i > 0 ? 1 : 0) + ' ' + u[i]
}

// --- Drag & Drop ---
const dragInfo = ref(null) // { index, type: 'category'|'image' }

function onDragStart(e, index, type) {
  dragInfo.value = { index, type }
  e.dataTransfer.effectAllowed = 'move'
  e.dataTransfer.setData('text/plain', `${type}:${index}`)
}

function onDragOver(e, index, type) {
  if (!dragInfo.value || dragInfo.value.type !== type) return
  e.dataTransfer.dropEffect = 'move'
}

async function onDrop(e, targetIndex, type) {
  if (!dragInfo.value || dragInfo.value.type !== type) return
  const fromIndex = dragInfo.value.index
  if (fromIndex === targetIndex) return

  if (type === 'category') {
    // Local reorder
    const arr = categories.value
    const [item] = arr.splice(fromIndex, 1)
    arr.splice(targetIndex, 0, item)
  } else if (type === 'image') {
    // Local reorder within current page
    const catImgs = images.value.filter(img => img.category === activeCategory.value)
    const start = (currentPage.value - 1) * ITEMS_PER_PAGE
    const globalFrom = start + fromIndex
    const globalTo = start + targetIndex
    const [item] = catImgs.splice(globalFrom, 1)
    catImgs.splice(globalTo, 0, item)
    // Rebuild images
    const others = images.value.filter(img => img.category !== activeCategory.value)
    const firstIdx = images.value.findIndex(img => img.category === activeCategory.value)
    images.value = [...others.slice(0, firstIdx), ...catImgs, ...others.slice(firstIdx)]
  }

  // Save to server
  try {
    await fetch(import.meta.env.BASE_URL + 'api/gallery/reorder', {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        type: type === 'category' ? 'categories' : 'images',
        fromIndex: type === 'category' ? fromIndex : (currentPage.value - 1) * ITEMS_PER_PAGE + fromIndex,
        toIndex: type === 'category' ? targetIndex : (currentPage.value - 1) * ITEMS_PER_PAGE + targetIndex,
        category: type === 'image' ? activeCategory.value : undefined,
      }),
    })
  } catch (e) { /* non-critical */ }

  dragInfo.value = null
}

function onDragEnd() {
  dragInfo.value = null
}

function handleKeydown(e) {
  if (e.key === 'Escape') {
    if (lightboxImage.value) closeLightbox()
    if (editingId.value) cancelEdit()
    if (confirmingId.value) confirmingId.value = null
    if (confirmingCategory.value) confirmingCategory.value = null
  }
}

watch(activeCategory, () => { currentPage.value = 1 })
watch(showAddCategory, async (val) => {
  if (val) { await nextTick(); categoryInput.value?.focus() }
})

onMounted(async () => {
  await loadManifest()
  window.addEventListener('keydown', handleKeydown)
})
</script>

<style scoped>
.gallery-mode-bar {
  display: flex; align-items: center; gap: 12px; padding: 12px 20px;
  border-radius: 14px; margin-bottom: 20px; font-size: 13px;
  color: var(--text-secondary); flex-wrap: wrap;
  background: rgba(245, 158, 11, 0.1); border: 1px solid rgba(245, 158, 11, 0.2);
}
.gallery-mode-bar.readonly-bar {
  background: rgba(99, 102, 241, 0.08); border: 1px solid rgba(99, 102, 241, 0.15);
}
.mode-badge { font-weight: 600; color: var(--orange); flex-shrink: 0; }
.export-btn {
  margin-left: auto; padding: 7px 16px; border-radius: 10px;
  border: 1px solid var(--orange); background: rgba(245, 158, 11, 0.15);
  color: var(--orange); font-size: 13px; cursor: pointer;
  display: flex; align-items: center; gap: 6px; font-family: inherit; font-weight: 500;
  transition: all 0.2s; flex-shrink: 0;
}
.export-btn:hover { background: rgba(245, 158, 11, 0.25); }

/* Tabs */
.gallery-tabs { display: flex; gap: 8px; margin-bottom: 24px; flex-wrap: wrap; align-items: center; }
.gallery-tab {
  padding: 8px 20px; border-radius: 12px; border: 1px solid var(--border);
  background: var(--surface); color: var(--text-secondary); font-size: 14px;
  cursor: pointer; transition: all 0.2s; font-family: inherit;
  display: flex; align-items: center; gap: 6px;
}
.tab-count { font-size: 11px; padding: 1px 7px; border-radius: 10px; background: rgba(255,255,255,0.08); color: var(--text-muted); font-weight: 400; }
.gallery-tab-wrapper { display: flex; align-items: center; gap: 2px; }
.gallery-tab-wrapper.dragging { opacity: 0.4; }
.gallery-tab-delete {
  width: 20px; height: 20px; border-radius: 50%; border: none; background: transparent;
  color: var(--text-muted); cursor: pointer; opacity: 0; transition: all 0.2s; flex-shrink: 0;
  display: flex; align-items: center; justify-content: center;
}
.gallery-tab-wrapper:hover .gallery-tab-delete { opacity: 1; }
.gallery-tab-delete:hover { background: rgba(245,108,108,0.2); color: #f56c6c; }

.drag-handle {
  cursor: grab; color: var(--text-muted); font-size: 12px;
  padding: 0 2px; user-select: none; letter-spacing: -2px;
}
.drag-handle:active { cursor: grabbing; }
.gallery-tab:hover { background: var(--surface-hover); color: var(--text); }
.gallery-tab.active {
  background: rgba(99,102,241,0.15); border-color: var(--accent);
  color: var(--accent); font-weight: 600;
}
.gallery-tab-add {
  width: 36px; height: 36px; padding: 0; display: flex; align-items: center;
  justify-content: center; border-radius: 50%; border-style: dashed;
}
.add-category-form { display: flex; gap: 6px; align-items: center; }
.add-category-form input {
  width: 100px; padding: 7px 12px; border-radius: 10px; border: 1px solid var(--border-hover);
  background: var(--surface); color: var(--text); font-size: 13px; outline: none; font-family: inherit;
}
.add-category-form input:focus { border-color: var(--accent); }
.cat-btn {
  width: 30px; height: 30px; border-radius: 8px; border: 1px solid var(--border);
  cursor: pointer; font-size: 13px; background: var(--surface); color: var(--text-secondary);
  display: flex; align-items: center; justify-content: center;
}
.cat-btn-confirm:hover { background: rgba(16,185,129,0.15); color: var(--green); border-color: var(--green); }
.cat-btn-cancel:hover { background: rgba(245,108,108,0.15); color: #f56c6c; border-color: #f56c6c; }

/* Upload */
.gallery-upload-zone {
  border: 2px dashed var(--border); border-radius: 16px; padding: 32px;
  text-align: center; cursor: pointer; transition: all 0.3s;
  display: flex; flex-direction: column; align-items: center; gap: 10px;
  color: var(--text-muted); margin-bottom: 28px; background: rgba(255,255,255,0.01);
}
.gallery-upload-zone:hover { border-color: var(--border-hover); background: rgba(255,255,255,0.03); color: var(--text-secondary); }
.upload-hint { font-size: 12px; opacity: 0.6; }
.upload-progress { margin-bottom: 24px; display: flex; align-items: center; gap: 12px; font-size: 13px; color: var(--text-muted); }
.progress-bar { flex: 1; height: 4px; border-radius: 2px; background: var(--border); overflow: hidden; }
.progress-fill { height: 100%; background: var(--accent); border-radius: 2px; transition: width 0.3s; }

/* Grid */
.gallery-grid { display: grid; grid-template-columns: repeat(auto-fill, minmax(260px, 1fr)); gap: 16px; }

/* Pagination */
.gallery-pagination {
  display: flex; align-items: center; justify-content: center; gap: 8px;
  margin-top: 32px; margin-bottom: 16px;
}
.gallery-pagination button {
  width: 36px; height: 36px; border-radius: 10px;
  border: 1px solid var(--border); background: var(--surface);
  color: var(--text-secondary); cursor: pointer;
  display: flex; align-items: center; justify-content: center;
  transition: all 0.2s; font-family: inherit;
}
.gallery-pagination button:hover:not(:disabled) {
  background: var(--surface-hover); color: var(--text); border-color: var(--border-hover);
}
.gallery-pagination button:disabled { opacity: 0.3; cursor: not-allowed; }
.page-info { font-size: 14px; color: var(--text-secondary); padding: 0 8px; min-width: 80px; text-align: center; }
.gallery-card { border-radius: 16px; overflow: hidden; transition: all 0.3s ease; }
.gallery-card.dragging { opacity: 0.4; transform: scale(0.95); }
.gallery-card:hover { transform: translateY(-4px); box-shadow: 0 12px 40px rgba(0,0,0,0.3); }
.gallery-card-img { position: relative; aspect-ratio: 4/3; overflow: hidden; cursor: pointer; background: rgba(0,0,0,0.2); }
.gallery-card-img img { width: 100%; height: 100%; object-fit: cover; transition: transform 0.4s ease; }
.gallery-card:hover .gallery-card-img img { transform: scale(1.06); }
.gallery-card-overlay { position: absolute; inset: 0; background: rgba(0,0,0,0.3); display: flex; align-items: center; justify-content: center; opacity: 0; transition: opacity 0.3s; pointer-events: none; }
.gallery-card:hover .gallery-card-overlay { opacity: 1; }

.img-drag-handle {
  position: absolute; top: 6px; left: 6px; color: white;
  font-size: 13px; cursor: grab; opacity: 0; transition: opacity 0.2s;
  background: rgba(0,0,0,0.4); border-radius: 4px; padding: 2px 3px;
  line-height: 1; pointer-events: auto; z-index: 2;
}
.gallery-card:hover .img-drag-handle { opacity: 1; }
.img-drag-handle:active { cursor: grabbing; }
.gallery-card-info { padding: 12px 16px 14px; }
.gallery-card-text { min-height: 40px; }
.gallery-card-name { font-size: 14px; font-weight: 600; color: var(--text); margin-bottom: 4px; }
.gallery-card-desc { font-size: 12px; color: var(--text-muted); line-height: 1.5; }
.gallery-card-actions { display: flex; gap: 6px; margin-top: 8px; opacity: 0; transition: opacity 0.2s; }
.gallery-card:hover .gallery-card-actions { opacity: 1; }
.gallery-card-actions button {
  width: 28px; height: 28px; border-radius: 8px; border: 1px solid var(--border);
  background: var(--surface); color: var(--text-muted); cursor: pointer;
  display: flex; align-items: center; justify-content: center; transition: all 0.2s;
}
.gallery-card-actions button:hover { background: var(--surface-hover); color: var(--text); }
.gallery-card-actions .btn-delete:hover { background: rgba(245,108,108,0.15); color: #f56c6c; border-color: #f56c6c; }
.gallery-edit-form { display: flex; flex-direction: column; gap: 6px; }
.gallery-edit-form input, .gallery-edit-form textarea {
  width: 100%; padding: 8px 10px; border-radius: 8px; border: 1px solid var(--border-hover);
  background: rgba(0,0,0,0.3); color: var(--text); font-size: 13px; outline: none;
  font-family: inherit; resize: vertical;
}
.gallery-edit-form input:focus, .gallery-edit-form textarea:focus { border-color: var(--accent); }
.edit-actions { display: flex; gap: 8px; }
.btn-save { padding: 5px 16px; border-radius: 8px; border: none; background: var(--accent); color: white; font-size: 12px; cursor: pointer; font-family: inherit; }
.btn-cancel { padding: 5px 16px; border-radius: 8px; border: 1px solid var(--border); background: var(--surface); color: var(--text-secondary); font-size: 12px; cursor: pointer; font-family: inherit; }
.gallery-confirm { padding: 10px 16px 14px; display: flex; flex-direction: column; gap: 8px; }
.gallery-confirm span { font-size: 13px; color: var(--text-secondary); }
.confirm-actions { display: flex; gap: 8px; }
.btn-confirm-del { padding: 5px 14px; border-radius: 8px; border: none; background: #f56c6c; color: white; font-size: 12px; cursor: pointer; font-family: inherit; }
.btn-confirm-del:hover { opacity: 0.85; }
.gallery-empty { padding: 60px; text-align: center; color: var(--text-muted); }
.gallery-empty p { font-size: 16px; margin-bottom: 8px; color: var(--text-secondary); }
.gallery-empty span { font-size: 13px; }

/* Lightbox */
.lightbox { position: fixed; inset: 0; background: rgba(0,0,0,0.92); backdrop-filter: blur(12px); z-index: 1000; display: flex; align-items: center; justify-content: center; padding: 40px; }
.lightbox-close { position: absolute; top: 24px; right: 24px; width: 44px; height: 44px; border-radius: 50%; border: 1px solid rgba(255,255,255,0.15); background: rgba(255,255,255,0.08); color: white; cursor: pointer; display: flex; align-items: center; justify-content: center; transition: all 0.2s; z-index: 10; }
.lightbox-close:hover { background: rgba(255,255,255,0.15); }
.lightbox-content { max-width: 90vw; max-height: 85vh; display: flex; flex-direction: column; align-items: center; gap: 16px; }
.lightbox-content img { max-width: 90vw; max-height: 70vh; border-radius: 12px; box-shadow: 0 24px 80px rgba(0,0,0,0.5); object-fit: contain; }
.lightbox-info { text-align: center; color: var(--text-secondary); }
.lightbox-info h3 { font-size: 18px; color: white; margin-bottom: 6px; }
.lightbox-info p { font-size: 14px; margin-bottom: 8px; max-width: 500px; }
.lightbox-meta { font-size: 12px; color: var(--text-muted); }

@media (max-width: 768px) {
  .gallery-grid { grid-template-columns: repeat(auto-fill, minmax(160px, 1fr)); gap: 10px; }
  .gallery-upload-zone { padding: 24px 16px; }
  .gallery-mode-bar { flex-direction: column; align-items: flex-start; gap: 8px; }
  .export-btn { margin-left: 0; }
  .lightbox { padding: 16px; }
}
</style>