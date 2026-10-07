import react from '@vitejs/plugin-react'
import { defineConfig } from 'vite'

// https://vite.dev/config/
export default defineConfig({
  plugins: [react()],
  // Rutas relativas: GitHub Pages sirve la app en /<repo>/, no en la raíz
  base: './',
})
