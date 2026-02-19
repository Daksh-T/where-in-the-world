import { defineConfig } from 'vite'
import path from 'path'
import { fileURLToPath } from 'url'

const __dirname = path.dirname(fileURLToPath(import.meta.url))

export default defineConfig({
  server: {
    port: 3000,
    open: true
  },
  optimizeDeps: {
    include: ['gsap', 'three']
  },
  resolve: {
    alias: {
      // Stub out three/webgpu — not needed
      'three/webgpu': path.resolve(__dirname, 'src/stubs/three-webgpu-stub.js'),
      'three/tsl':    path.resolve(__dirname, 'src/stubs/three-webgpu-stub.js')
    }
  },
  build: {
    rollupOptions: {
      onwarn(warning, warn) {
        if (warning.code === 'MISSING_EXPORT') return
        warn(warning)
      }
    }
  }
})
