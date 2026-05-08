// This tells Vite: "Using React. Handle .jsx files for me."
// Without this, Vite wouldn't know what to do with JSX syntax.

import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

export default defineConfig({
  plugins: [react()],
})