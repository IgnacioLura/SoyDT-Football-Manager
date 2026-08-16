import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// https://vite.dev/config/
export default defineConfig({
  plugins: [react()],
  server: {
    // Phase 0 pipe check: dev server proxies /api/* straight to SoyDT.Api
    // (see soydt/src/SoyDT.Api/Properties/launchSettings.json for the port)
    // so the React app never needs CORS config to talk to it locally.
    proxy: {
      '/api': { target: 'http://localhost:18100', ws: true },
    },
  },
})
