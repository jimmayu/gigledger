const { defineConfig } = require('vite')
const react = require('@vitejs/plugin-react')

// Normalize base path similar to server logic
const normalizeBasePath = (raw) => {
  const value = (raw || '').trim();
  if (value === '' || value === '/') return '';
  const withLeadingSlash = value.startsWith('/') ? value : `/${value}`;
  return withLeadingSlash.replace(/\/$/, '');
};

const basePath = normalizeBasePath(process.env.GIGLEDGER_BASE_PATH);

module.exports = defineConfig({
  plugins: [react()],
  base: basePath || '/',
  build: {
    outDir: 'dist'
  }
})
