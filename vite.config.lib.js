import { defineConfig } from 'vite';
import vue from '@vitejs/plugin-vue';
import { resolve } from 'path';
import dts from 'vite-plugin-dts';

export default defineConfig({
  plugins: [
    vue(),
    dts({
      insertTypesEntry: true,
    }),
  ],
  build: {
    lib: {
      entry: resolve(__dirname, 'src/index.js'),
      name: 'VueProteinNetworkVisualizer',
      fileName: (format) => `vue-protein-network-visualizer.${format}.js`,
    },
    rollupOptions: {
      external: ['vue', 'd3'],
      output: {
        globals: {
          vue: 'Vue',
          d3: 'd3',
        },
      },
    },
  },
});