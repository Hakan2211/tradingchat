import { reactRouter } from '@react-router/dev/vite';
import tailwindcss from '@tailwindcss/vite';
import { defineConfig } from 'vite';
import tsconfigPaths from 'vite-tsconfig-paths';

export default defineConfig(({ isSsrBuild }) => ({
  // build: {
  //   ssr: true,
  //   sourcemap: true,
  //   target: 'es2022',
  //   rollupOptions: {
  //     input: isSsrBuild ? './server/server.ts' : undefined,
  //     external: isSsrBuild ? './index.js' : undefined,
  //   },
  // },

  server: {
    proxy: {
      // Proxy all requests starting with /socket.io to your Express server
      '/socket.io': {
        target: 'http://localhost:3000', // Your Express server's address
        ws: true, // IMPORTANT: enable proxying for WebSockets
      },
      // Proxy API routes to Express server (optional)
      '/api': {
        target: 'http://localhost:3000',
        changeOrigin: true,
      },
    },
  },

  plugins: [tailwindcss(), reactRouter(), tsconfigPaths()],
}));
