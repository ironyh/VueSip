import { defineConfig } from 'vite'
import vue from '@vitejs/plugin-vue'
import { resolve } from 'path'

// https://vitejs.dev/config/
export default defineConfig({
  plugins: [vue()],
  build: {
    lib: {
      entry: resolve(__dirname, 'src/index.ts'),
      name: 'DailVue',
      fileName: (format) => `dailvue.${format}.js`
    },
    rollupOptions: {
      external: ['vue', 'sip.js'],
      output: {
        globals: {
          vue: 'Vue',
          'sip.js': 'SIP'
        }
      }
    }
  },
  resolve: {
    alias: {
      '@': resolve(__dirname, 'src')
    }
  }
})
