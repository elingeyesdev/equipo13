import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// https://vite.dev/config/
export default defineConfig({
  plugins: [react()],
  server: {
    host: true,
    // Permite que el ml_service (red Docker) sirva la página de muestra de
    // scraping vía http://frontend:5173/...  El check de host de Vite
    // (solo en dev) rechazaría el Host "frontend" sin esto.
    allowedHosts: ['frontend', 'localhost'],
  },
})
