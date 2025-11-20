import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

// https://vitejs.dev/config/

export default defineConfig({
  plugins: [react()],
  server: {
    host: true,          // listen on all addresses (0.0.0.0)
    port: 5174,
    strictPort: true,
    hmr: false,
    watch: {
      // On Windows polling can cause phantom change events; prefer chokidar native
      usePolling: false,
      awaitWriteFinish: {
        stabilityThreshold: 1200,
        pollInterval: 200
      },
      ignored: [
        '**/node_modules/**',
        '**/.git/**',
        '**/.vite/**',
        '**/dist/**',
        '**/*.log',
        '**/*.md',
        '**/*.sql',
        'supabase/**',
        '**/.DS_Store',
        '**/Thumbs.db',
        '**/~$*'
      ]
    }
  },
  optimizeDeps: {
    exclude: ['lucide-react'],
  },
});
