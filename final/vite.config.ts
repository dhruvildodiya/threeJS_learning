import { defineConfig } from 'vite';
import glsl from 'vite-plugin-glsl';
import { fileURLToPath, URL } from 'node:url';

export default defineConfig({
  plugins: [glsl()],
  resolve: {
    alias: {
      '@': fileURLToPath(new URL('./src', import.meta.url)),
    },
  },
  server: {
    host: true,
    port: 5180,
    open: false,
    allowedHosts: [
      '.ngrok-free.dev',
      '.ngrok-free.app',
    ],
  },
});
