import { defineConfig } from 'vite';

export default defineConfig({
  server: {
    host: true,
    port: 5177,
    allowedHosts: [
      '.ngrok-free.dev',
      '.ngrok-free.app'
    ]
  }
});
