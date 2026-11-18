import { defineConfig } from 'vite';

export default defineConfig({
  server: {
    host: true,
    port: 5174,
    allowedHosts: [
      'mikki-noncredent-darius.ngrok-free.dev',
      '.ngrok-free.dev',
      '.ngrok-free.app'
    ]
  }
});
