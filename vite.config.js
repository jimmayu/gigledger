import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// https://vitejs.dev/config/
const normalizeBasePath = (raw) => {
  const value = (raw || '').trim()
  if (value === '' || value === '/') return ''
  const withLeadingSlash = value.startsWith('/') ? value : `/${value}`
  return withLeadingSlash.replace(/\/$/, '')
}

export default defineConfig(() => {
  const basePath = normalizeBasePath(process.env.GIGLEDGER_BASE_PATH)
  const viteBase = basePath === '' ? '/' : `${basePath}/`
  const apiProxyPath = `${basePath}/api` // '' => '/api'

  return {
    base: viteBase,
    plugins: [react()],
    server: {
      host: '0.0.0.0',
      proxy: {
        [apiProxyPath]: {
          target: 'http://localhost:3000',
          changeOrigin: true
        }
      }
    },
    build: {
      outDir: 'dist',
      sourcemap: true
    }
  }
})
