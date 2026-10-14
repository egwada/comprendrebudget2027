import react from '@vitejs/plugin-react'
import { defineConfig } from 'vite'

// https://vite.dev/config/
export default defineConfig({
  base: process.env.VITE_GITHUB_PAGES === 'true' ? '/comprendrebudget2027/' : '/',
  plugins: [react()],
})
