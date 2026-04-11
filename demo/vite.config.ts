import { defineConfig } from 'vite';
import path from 'path';

export default defineConfig({
  server: {
    allowedHosts: true,
    host: true,
    fs: {
      allow: ['..'], // Allow access to /src from /demo
    },
  },
});
