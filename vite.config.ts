import { defineConfig } from 'vite';
import { readFileSync } from 'fs';
import { resolve } from 'path';

const pkg = JSON.parse(readFileSync('./package.json', 'utf-8'));

export default defineConfig({
  define: {
    __APP_VERSION__: JSON.stringify(pkg.version)
  },
  root: 'src/frontend',
  build: {
    outDir: '../../dist',
    emptyOutDir: true,
    rollupOptions: {
      input: {
        main: resolve(__dirname, 'src/frontend/index.html'),
        privacy: resolve(__dirname, 'src/frontend/privacy.html'),
        tos: resolve(__dirname, 'src/frontend/tos.html'),
        sw: resolve(__dirname, 'src/frontend/sw.ts')
      },
      output: {
        entryFileNames: (chunkInfo) => {
          // Service worker should be at root without hash
          if (chunkInfo.name === 'sw') {
            return 'sw.js';
          }
          return 'assets/[name]-[hash].js';
        }
      }
    }
  },
  server: {
    port: 3000,
    proxy: {
      '/api': {
        target: 'http://localhost:8787',
        changeOrigin: true
      }
    }
  }
});
