import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'
import { openclawApiPlugin } from './src/server/api'

export default defineConfig({
  plugins: [react(), tailwindcss(), openclawApiPlugin()],
})
