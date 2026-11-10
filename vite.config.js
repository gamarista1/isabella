import { defineConfig } from 'vite';

// base './' permite subir dist/ a la raiz de public_html o a una subcarpeta.
// En desarrollo, /api/* se reenvia al servidor PHP local: php -S localhost:8000
export default defineConfig({
  base: './',
  server: {
    proxy: {
      '/api': 'http://localhost:8000',
    },
  },
});
