import path from 'node:path';

import react from '@vitejs/plugin-react';
import { defineConfig } from 'vite';

function vendorChunk(id) {
  if (!id.includes('node_modules')) return undefined;

  if (
    id.includes('/react/')
    || id.includes('/react-dom/')
    || id.includes('/react-router-dom/')
    || id.includes('/scheduler/')
  ) {
    return 'react-vendor';
  }

  if (id.includes('@supabase')) {
    return 'supabase-vendor';
  }

  if (id.includes('@radix-ui') || id.includes('cmdk') || id.includes('vaul')) {
    return 'ui-vendor';
  }

  if (id.includes('recharts') || id.includes('d3-')) {
    return 'charts-vendor';
  }

  if (id.includes('@hello-pangea/dnd')) {
    return 'dnd-vendor';
  }

  return 'vendor';
}

export default defineConfig({
  plugins: [react()],
  resolve: {
    alias: {
      '@': path.resolve(process.cwd(), 'src'),
    },
  },
  build: {
    rollupOptions: {
      output: {
        manualChunks: vendorChunk,
      },
    },
  },
});
