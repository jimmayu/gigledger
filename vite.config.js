import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// Normalize base path similar to server logic
const normalizeBasePath = (raw) => {
  const value = (raw || '').trim();
  if (value === '' || value === '/') return '';
  const withLeadingSlash = value.startsWith('/') ? value : `/${value}`;
  return withLeadingSlash.replace(/\/$/, '');
};

const basePath = normalizeBasePath(process.env.GIGLEDGER_BASE_PATH);

export default defineConfig({
  plugins: [react()],
  base: basePath || '/',
  build: {
    outDir: 'dist'
  }
})
