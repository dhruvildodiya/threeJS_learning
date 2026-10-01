import { defineConfig } from 'vite';

export default defineConfig({
  server: {
    host: true,
    port: 5176,
    allowedHosts: [
      '.ngrok-free.dev',
      '.ngrok-free.app'
    ]
  }
});
