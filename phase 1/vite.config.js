import { defineConfig } from 'vite';

export default defineConfig({
  server: {
    host: true, // Exposes server to network / tunnel
    allowedHosts: [
      'mikki-noncredent-darius.ngrok-free.dev',
      '.ngrok-free.dev',
      '.ngrok.io',
      '.ngrok-free.app'
    ]
  }
});
