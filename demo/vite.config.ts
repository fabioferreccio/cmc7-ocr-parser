import { defineConfig } from 'vite';
import mkcert from 'vite-plugin-mkcert'
import path from 'path';

export default defineConfig({
  server: {
    https: true,
    allowedHosts: true,
    host: true,
    fs: {
      allow: ['..'], // Allow access to /src from /demo
    },
  },
  plugins: [mkcert()]
});
