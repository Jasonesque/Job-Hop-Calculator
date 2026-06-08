import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// https://vite.dev/config/
export default defineConfig({
  base: "/Job-Hop-Calculator/", // Set base path for GitHub Pages
  plugins: [react()],
  server: {
    host: true, // Listen on all network addresses, including LAN and public
    port: 5173,
  }
})
