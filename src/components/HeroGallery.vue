<template>
  <!-- Variant: masonry — waterfall flow with captions -->
  <div v-if="variant === 'masonry'" class="hg-masonry-wrap">
    <div class="hg-masonry">
      <template v-for="(item, idx) in displayImages" :key="idx">
        <!-- Phone wallpaper pair: side by side -->
        <div v-if="item.type === 'pair'" class="hg-masonry-pair">
          <div class="hg-masonry-item" @click="openLightbox(item.left)">
            <img :src="item.left.src" :alt="item.left.name" loading="lazy" />
            <div class="hg-caption">
              <span class="hg-cap-cat">{{ item.left.category }}</span>
              <span class="hg-cap-name">{{ item.left.name }}</span>
            </div>
          </div>
          <div class="hg-masonry-item" @click="openLightbox(item.right)">
            <img :src="item.right.src" :alt="item.right.name" loading="lazy" />
            <div class="hg-caption">
              <span class="hg-cap-cat">{{ item.right.category }}</span>
              <span class="hg-cap-name">{{ item.right.name }}</span>
            </div>
          </div>
        </div>
        <!-- Normal single item -->
        <div v-else-if="item.type === 'single'" class="hg-masonry-item" @click="openLightbox(item.img)">
          <img :src="item.img.src" :alt="item.img.name" loading="lazy" />
          <div class="hg-caption">
            <span class="hg-cap-cat">{{ item.img.category || '图集' }}</span>
            <span class="hg-cap-name">{{ item.img.name || '未命名' }}</span>
          </div>
        </div>
        <!-- "查看更多" card inserted in the flow -->
        <a v-else-if="item.type === 'viewMore'" href="#gallery" class="hg-masonry-viewmore" @click.prevent="$emit('scrollTo', 'gallery')">
          <div class="hg-vm-inner">
            <span class="hg-vm-label">查看更多</span>
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M5 12h14"/><polyline points="12 5 19 12 12 19"/></svg>
          </div>
        </a>
      </template>
    </div>
    <div v-if="displayImages.length === 0" class="hg-empty">
      <span>暂无图片</span>
    </div>
  </div>

  <!-- Variant: card — with glass-card wrapper -->
  <div v-else class="hero-gallery glass-card">
    <div class="hg-header">
      <span class="hg-label">图集</span>
      <div class="hg-cats">
        <button
          v-for="cat in categories"
          :key="cat"
          class="hg-cat"
          :class="{ active: activeCategory === cat }"
          @click="activeCategory = cat"
        >{{ cat }}</button>
      </div>
      <a href="#gallery" class="hg-more" @click.prevent="$emit('scrollTo', 'gallery')">
        查看全部
        <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M5 12h14"/><polyline points="12 5 19 12 12 19"/></svg>
      </a>
    </div>

    <div class="hg-grid" v-if="displayImages.length > 0">
      <div
        v-for="img in displayImages"
        :key="img.id"
        class="hg-card tilt-card"
        @click="openLightbox(img)"
      >
        <img :src="img.src" :alt="img.name" loading="lazy" />
        <div class="hg-card-name">{{ img.name || '未命名' }}</div>
      </div>
    </div>

    <div v-else class="hg-empty">
      <span>暂无图片</span>
    </div>
  </div>

  <!-- Lightbox -->
  <Teleport to="body">
    <div v-if="lightboxImg" class="hg-lightbox" @click="lightboxImg = null">
      <button class="hg-lightbox-close" @click="lightboxImg = null">
        <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="white" stroke-width="2"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>
      </button>
      <img :src="lightboxImg.src" :alt="lightboxImg.name" @click.stop />
    </div>
  </Teleport>
</template>

<script setup>
import { ref, computed, onMounted } from 'vue'

const props = defineProps({
  variant: { type: String, default: 'card' }, // 'card' | 'masonry'
})

const emit = defineEmits(['scrollTo'])

const categories = ref(['风景', '手机壁纸', '动漫', '人物'])
const images = ref([])
const activeCategory = ref('风景')
const lightboxImg = ref(null)

const displayImages = computed(() => {
  if (images.value.length === 0) return []
  const filtered = images.value.filter(img => img.category !== '爱国')
  if (props.variant === 'masonry') {
    // Pair phone wallpapers horizontally, keep others as-is
    const result = []
    let i = 0
    while (i < filtered.length) {
      const img = filtered[i]
      if (img.category === '手机壁纸' && i + 1 < filtered.length && filtered[i + 1].category === '手机壁纸') {
        result.push({ type: 'pair', left: img, right: filtered[i + 1] })
        i += 2
      } else {
        result.push({ type: 'single', img })
        i++
      }
    }
    // Insert "viewMore" card at position 5
    if (result.length > 5) {
      result.splice(5, 0, { type: 'viewMore' })
    }
    return result.slice(0, 11) // ~10 items + 1 viewMore
  }
  return filtered.filter(img => img.category === activeCategory.value).slice(0, 9)
})

function openLightbox(img) {
  lightboxImg.value = img
}

async function loadImages() {
  try {
    const res = await fetch(import.meta.env.BASE_URL + 'gallery/manifest.json')
    if (res.ok) {
      const data = await res.json()
      // Filter out "爱国" from categories
      categories.value = (data.categories || []).filter(c => c !== '爱国')
      images.value = (data.images || []).map(img => ({
        ...img,
        src: import.meta.env.BASE_URL + 'gallery/' + img.src,
      }))
    }
  } catch (e) {
    // manifest not available, use defaults
  }
}

onMounted(loadImages)
</script>

<style scoped>
/* ============ Card variant ============ */
.hero-gallery {
  padding: 18px 20px;
  border-radius: 18px;
  display: flex;
  flex-direction: column;
  gap: 12px;
  width: 100%;
  flex: 1;
}

.hg-header {
  display: flex;
  align-items: center;
  gap: 10px;
  flex-wrap: wrap;
}

.hg-label {
  font-size: 12px;
  text-transform: uppercase;
  letter-spacing: 2px;
  color: var(--accent);
  font-weight: 600;
  margin-right: 6px;
}

.hg-cats {
  display: flex;
  gap: 2px;
  flex: 1;
}

.hg-cat {
  font-size: 11px;
  padding: 3px 10px;
  border-radius: 8px;
  border: none;
  background: transparent;
  color: var(--text-muted);
  cursor: pointer;
  transition: all 0.15s;
  font-family: inherit;
}

.hg-cat:hover { color: var(--text-secondary); background: rgba(255,255,255,0.04); }
.hg-cat.active {
  color: var(--accent);
  background: rgba(99,102,241,0.12);
  font-weight: 600;
}

.hg-more {
  font-size: 11px;
  color: var(--text-muted);
  display: flex;
  align-items: center;
  gap: 4px;
  transition: color 0.15s;
  flex-shrink: 0;
  padding: 3px 10px;
  border-radius: 8px;
}

.hg-more:hover { color: var(--accent); background: rgba(255,255,255,0.04); }

.hg-grid {
  display: grid;
  grid-template-columns: repeat(3, 1fr);
  gap: 8px;
}

.hg-card {
  border-radius: 10px;
  overflow: hidden;
  cursor: pointer;
  background: rgba(0,0,0,0.2);
  transition: all 0.25s ease;
  position: relative;
}

.hg-card:hover {
  transform: translateY(-2px);
  box-shadow: 0 8px 24px rgba(0,0,0,0.3);
}

.hg-card img {
  width: 100%;
  aspect-ratio: 4/3;
  object-fit: cover;
  display: block;
  transition: transform 0.35s ease;
}

.hg-card:hover img { transform: scale(1.06); }

.hg-card-name {
  position: absolute;
  bottom: 0;
  left: 0;
  right: 0;
  padding: 6px 8px;
  font-size: 10px;
  color: white;
  background: linear-gradient(transparent, rgba(0,0,0,0.7));
  opacity: 0;
  transition: opacity 0.2s;
}

.hg-card:hover .hg-card-name { opacity: 1; }

/* ============ Masonry variant ============ */
.hg-masonry-wrap {
  position: relative;
}

.hg-masonry {
  column-count: 3;
  column-gap: 12px;
}

.hg-masonry-item {
  break-inside: avoid;
  margin-bottom: 12px;
  border-radius: 12px;
  overflow: hidden;
  cursor: pointer;
  transition: transform 0.3s ease, box-shadow 0.3s ease;
  background: rgba(0,0,0,0.15);
  position: relative;
}

.hg-masonry-pair {
  break-inside: avoid;
  display: flex;
  gap: 12px;
  margin-bottom: 12px;
}

.hg-masonry-pair .hg-masonry-item {
  flex: 1;
  min-width: 0;
  margin-bottom: 0;
}

/* "查看更多" in-flow card */
.hg-masonry-viewmore {
  break-inside: avoid;
  display: flex;
  align-items: center;
  justify-content: center;
  margin-bottom: 12px;
  border-radius: 12px;
  background: rgba(99, 102, 241, 0.08);
  border: 1px dashed rgba(129, 140, 248, 0.2);
  min-height: 100px;
  cursor: pointer;
  transition: all 0.25s ease;
}

.hg-masonry-viewmore:hover {
  background: rgba(99, 102, 241, 0.14);
  border-color: rgba(129, 140, 248, 0.4);
  box-shadow: 0 4px 20px rgba(99, 102, 241, 0.1);
}

.hg-vm-inner {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 6px;
  color: var(--accent);
}

.hg-vm-label {
  font-size: 12px;
  font-weight: 600;
  letter-spacing: 1px;
}

.hg-vm-inner svg {
  transition: transform 0.25s ease;
}

.hg-masonry-viewmore:hover .hg-vm-inner svg {
  transform: translateX(3px);
}

.hg-masonry-item:hover {
  transform: translateY(-3px) scale(1.02);
  box-shadow: 0 12px 36px rgba(0,0,0,0.4);
}

.hg-masonry-item img {
  width: 100%;
  display: block;
  transition: transform 0.4s ease;
}

.hg-masonry-item:hover img {
  transform: scale(1.05);
}

.hg-caption {
  padding: 8px 10px;
  display: flex;
  align-items: center;
  gap: 6px;
  background: rgba(10, 10, 22, 0.85);
  backdrop-filter: blur(8px);
}

.hg-cap-cat {
  font-size: 9px;
  padding: 1px 6px;
  border-radius: 3px;
  background: rgba(99,102,241,0.15);
  color: var(--accent);
  font-weight: 600;
  flex-shrink: 0;
}

.hg-cap-name {
  font-size: 10px;
  color: var(--text-secondary);
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

/* ============ Shared ============ */
.hg-empty {
  text-align: center;
  padding: 40px 20px;
  color: var(--text-muted);
  font-size: 12px;
}

/* Lightbox */
.hg-lightbox {
  position: fixed;
  inset: 0;
  background: rgba(0,0,0,0.92);
  backdrop-filter: blur(12px);
  z-index: 1001;
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 40px;
}

.hg-lightbox-close {
  position: absolute;
  top: 24px;
  right: 24px;
  width: 40px;
  height: 40px;
  border-radius: 50%;
  border: 1px solid rgba(255,255,255,0.15);
  background: rgba(255,255,255,0.08);
  cursor: pointer;
  display: flex;
  align-items: center;
  justify-content: center;
  transition: all 0.2s;
  z-index: 10;
}

.hg-lightbox-close:hover { background: rgba(255,255,255,0.15); }

.hg-lightbox img {
  max-width: 85vw;
  max-height: 80vh;
  border-radius: 10px;
  box-shadow: 0 20px 60px rgba(0,0,0,0.5);
  object-fit: contain;
}

/* ============ Responsive ============ */
@media (max-width: 1200px) {
  .hg-masonry { column-count: 3; }
}

@media (max-width: 900px) {
  .hg-masonry { column-count: 3; column-gap: 10px; }
  .hg-masonry-item { margin-bottom: 10px; }
}

@media (max-width: 768px) {
  .hero-gallery { padding: 14px 14px; }
  .hg-grid { grid-template-columns: repeat(2, 1fr); gap: 6px; }
  .hg-card img { aspect-ratio: 1/1; }
  .hg-masonry { column-count: 2; column-gap: 8px; }
  .hg-masonry-item { margin-bottom: 8px; }
}

@media (max-width: 480px) {
  .hg-grid { gap: 4px; }
  .hg-masonry { column-count: 2; column-gap: 6px; }
}
</style>
