import { defineConfig, loadEnv } from 'vite';
import react from '@vitejs/plugin-react';

export default defineConfig(({ command, mode }) => {
  const env = loadEnv(mode, '..', '');
  if (command === 'build' && !env.VITE_PUBLIC_APP_URL?.trim()) {
    throw new Error('VITE_PUBLIC_APP_URL must be set to the public API URL before building.');
  }

  return {
    envDir: '..',
    plugins: [react()],
    server: {
      host: '0.0.0.0',
      port: 5173,
      proxy: {
        '/api': {
          target: 'http://localhost:3000',
          rewrite: (path) => path.replace(/^\/api/, ''),
        },
        '/widget.js': 'http://localhost:3000',
      },
    },
  };
});
