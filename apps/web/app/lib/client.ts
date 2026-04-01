import { hc } from 'hono/client'
import type { AppType } from '@campaign-oracle/api'

const API_URL = import.meta.env.VITE_API_URL || "http://localhost:3001"

// Create the typed Hono RPC client
// The generic parameter ensures proper type inference for all API endpoints
export const client = hc<AppType>(API_URL, {
    fetch: (input: RequestInfo | URL, init?: RequestInit) => fetch(input, {
        ...init,
        credentials: 'include',
    })
})

// Re-export the client type for use in other files if needed
export type Client = typeof client
