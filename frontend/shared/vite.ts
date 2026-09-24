import type { ProxyOptions } from 'vite'

// Proxy di sviluppo per /api: stessa origine anche in locale, niente CORS.
// Si sceglie con la variabile API, per esempio `API=backend npm run dev:portale`:
//   mock    (default) Prism su :4010, lanciato con `npm run mock`
//   backend Django in locale su :8000 (`uv run python manage.py runserver`)
//   un URL  qualsiasi altro backend, per esempio https://garda-chiese.simonetrentin.me
export function proxyApi(): Record<string, ProxyOptions> {
  const api = process.env.API ?? 'mock'

  if (api === 'mock') {
    // Prism espone i path del contratto senza il prefisso /api dei servers.
    return {
      '/api': {
        target: 'http://localhost:4010',
        rewrite: (path) => path.replace(/^\/api/, ''),
      },
    }
  }

  // Anche /media: le foto arrivano come percorsi relativi, in produzione le serve nginx.
  const target = api === 'backend' ? 'http://localhost:8000' : api
  return { '/api': { target, changeOrigin: true }, '/media': { target, changeOrigin: true } }
}
