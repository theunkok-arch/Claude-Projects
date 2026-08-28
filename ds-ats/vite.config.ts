import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'

export default defineConfig({
  plugins: [react(), tailwindcss()],
  server: {
    // `netlify dev` draait de functions op 8888; los `vite dev` proxyt ernaartoe.
    proxy: { '/api': 'http://localhost:8888' },
  },
})
