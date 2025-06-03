import { defineConfig } from 'vite';

export default defineConfig({
 base: '/mapbox-tracking/',
  optimizeDeps: {
    include: ['@shoelace-style/shoelace'],
  },
});