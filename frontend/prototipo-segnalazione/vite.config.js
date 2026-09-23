import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import basicSsl from '@vitejs/plugin-basic-ssl'

// HTTPS con certificato autofirmato: senza, il telefono blocca GPS e microfono.
export default defineConfig({ plugins: [react(), basicSsl()] })
