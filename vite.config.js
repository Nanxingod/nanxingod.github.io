import { defineConfig } from 'vite'
import vue from '@vitejs/plugin-vue'
import galleryPlugin from './vite-plugin-gallery.js'
import newsPlugin from './vite-plugin-news.js'
import weatherPlugin from './vite-plugin-weather.js'

export default defineConfig({
  plugins: [vue(), galleryPlugin(), newsPlugin(), weatherPlugin()],
})
