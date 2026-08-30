import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'

/**
 * Een leesbaar versiestempel in de bundel.
 *
 * Netlify zet `COMMIT_REF` op de commit die gebouwd wordt; lokaal bestaat die
 * niet en staat er `lokaal`. De datum erbij, want een hash van zeven tekens
 * zegt niemand iets over hoe oud het scherm is dat hij voor zich heeft.
 */
const versie = [
  process.env.COMMIT_REF?.slice(0, 7) ?? 'lokaal',
  new Date().toISOString().slice(0, 16).replace('T', ' '),
].join(' · ')

export default defineConfig({
  plugins: [react(), tailwindcss()],
  define: { __VERSIE__: JSON.stringify(versie) },
  server: {
    // `netlify dev` draait de functions op 8888; los `vite dev` proxyt ernaartoe.
    proxy: { '/api': 'http://localhost:8888' },
  },
})
