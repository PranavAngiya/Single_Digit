import { defineConfig, loadEnv } from 'vite'
import react from '@vitejs/plugin-react'

export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, process.cwd(), '')
  const apiTarget = env.VITE_API_BASE || 'http://localhost:8000'

  return {
    plugins: [react()],
    optimizeDeps: {
      exclude: ['old'],
    },
    server: {
      port: 5173,
      watch: {
        ignored: ['**/old/**'],
      },
      proxy: {
        '/api': {
          target: apiTarget,
          changeOrigin: true,
        },
      },
    },
  }
})
