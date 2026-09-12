import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

export default defineConfig({
  plugins: [react()],
  // Relative base so the build also works from a subpath (GitHub Pages).
  base: './',
  build: { outDir: 'dist', target: 'es2020' }
});
