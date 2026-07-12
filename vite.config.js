import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// https://vitejs.dev/config/
export default defineConfig({
  plugins: [react()],
  base: '/mywebsite/', // Repository name for GitHub Pages
  server: {
    watch: {
      // Ignore the documents folder to avoid EBUSY locked-file watch errors
      ignored: ['**/documents/**']
    }
  }
})
