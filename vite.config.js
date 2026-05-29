import { defineConfig } from 'vite'
import vue from '@vitejs/plugin-vue'
import galleryPlugin from './vite-plugin-gallery.js'

export default defineConfig({
  plugins: [vue(), galleryPlugin()],
})