import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import basicSsl from '@vitejs/plugin-basic-ssl'
import { proxyApi } from 'shared/vite'

// HTTPS anche in sviluppo: su iPhone microfono, fotocamera e GPS vogliono un'origine sicura.
export default defineConfig({
  plugins: [react(), basicSsl()],
  server: { proxy: proxyApi() },
  preview: { proxy: proxyApi() },
})
