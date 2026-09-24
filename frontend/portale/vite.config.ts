import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import { proxyApi } from 'shared/vite'

// In produzione il Portale operatore vive sotto /portale/, l'App di segnalazione sotto /.
export default defineConfig({
  base: '/portale/',
  plugins: [react()],
  server: { port: 5174, proxy: proxyApi() },
  preview: { port: 4174, proxy: proxyApi() },
})
