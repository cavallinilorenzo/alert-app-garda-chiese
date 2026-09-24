import createClient from 'openapi-fetch'
import type { components, paths } from './schema'

// Client tipizzato sul contratto. schema.d.ts si rigenera con `npm run gen:api`.
export const api = createClient<paths>({ baseUrl: '/api' })

export type { components, paths }
