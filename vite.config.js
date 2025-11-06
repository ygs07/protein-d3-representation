// import { defineConfig } from 'vite'
// import vue from '@vitejs/plugin-vue'

// // https://vite.dev/config/
// export default defineConfig({
//   plugins: [vue()],
// })

import { defineConfig } from 'vite'
import vue from '@vitejs/plugin-vue'
import { resolve } from 'path'

export default defineConfig({
  plugins: [vue()],
  build: {
    lib: {
      entry: resolve(__dirname, 'src/index.js'),
      name: 'VueProteinNetworkVisualizer',
      fileName: (format) => `vue-protein-network-visualizer.${format}.js`
    },
    rollupOptions: {
      external: ['vue', 'd3'],
      output: {
        globals: {
          vue: 'Vue',
          d3: 'd3'
        }
      }
    }
  }
})