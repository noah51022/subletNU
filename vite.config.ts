import { defineConfig } from "vite";
import react from "@vitejs/plugin-react-swc";
import path from "path";
import { componentTagger } from "lovable-tagger";

// https://vitejs.dev/config/
export default defineConfig(({ mode }) => ({
  base: '/',
  server: {
    host: '0.0.0.0',
    port: 5173,
    strictPort: true,
    headers: {
      'Content-Security-Policy': [
        "default-src 'self'",
        "script-src 'self' 'unsafe-inline' 'unsafe-eval' https://*.googleapis.com https://maps.googleapis.com",
        "style-src 'self' 'unsafe-inline' https://fonts.googleapis.com",
        "img-src 'self' data: blob: https: https://*.googleapis.com https://*.gstatic.com",
        "font-src 'self' https://fonts.gstatic.com",
        "connect-src 'self' https://*.supabase.co wss://*.supabase.co http://localhost:* http://0.0.0.0:* http://127.0.0.1:* http://192.168.*.*:* ws://localhost:* ws://0.0.0.0:* ws://127.0.0.1:* ws://192.168.*.*:* https://*.googleapis.com",
        "frame-src 'self'",
        "media-src 'self'",
      ].join('; '),
    },
    watch: {
      usePolling: true,
    },
    cors: true,
  },
  build: {
    outDir: 'dist',
    assetsDir: 'assets',
    emptyOutDir: true,
    rollupOptions: {
      output: {
        manualChunks: {
          'react-vendor': ['react', 'react-dom', 'react-router-dom'],
        },
        assetFileNames: 'assets/[name].[hash].[ext]'
      }
    }
  },
  plugins: [
    react(),
    mode === 'development' &&
    componentTagger(),
  ].filter(Boolean),
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "./src"),
    },
  },
}));
