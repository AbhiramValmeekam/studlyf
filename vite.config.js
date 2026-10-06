import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// The frontend talks to the Phase-1 API. In dev we proxy /api → the backend on
// :4000 so requests are same-origin: the HttpOnly session cookie and the
// Origin allow-list "just work" without CORS/SameSite friction.
// /media is proxied for the same reason: uploaded images come back from the API
// as absolute :4000 URLs, but src/lib/api.js normalizes url fields to
// same-origin paths, so the browser then asks *this* origin for /media/… —
// without the proxy that 404s and every uploaded image renders broken.
export default defineConfig({
  plugins: [react()],
  server: {
    port: 5173,
    open: true,
    proxy: {
      '/api': {
        target: 'http://localhost:4000',
        changeOrigin: true,
      },
      '/media': {
        target: 'http://localhost:4000',
        changeOrigin: true,
      },
    },
  },
})
