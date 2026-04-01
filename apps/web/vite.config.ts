import path from 'path';
import { defineConfig, loadEnv } from 'vite';
import react from '@vitejs/plugin-react';
import { TanStackRouterVite } from '@tanstack/router-plugin/vite';
import tailwindcss from '@tailwindcss/vite';

export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, '.', '');
  return {
    server: {
      port: process.env.PORT ? parseInt(process.env.PORT) : 3000,
      host: '0.0.0.0',
      allowedHosts: true,
      proxy: {
        '/api': {
          target: 'http://localhost:3001',
          changeOrigin: true,
          secure: false,
        }
      },
      watch: {
        ignored: [
          '**/apps/web/functions/**',
          '**/apps/web/oracle-genkit/**',
          '**/apps/web/dataconnect/**',
          '**/node_modules/**',
          '**/.git/**'
        ]
      }
    },
    plugins: [
      TanStackRouterVite({
        routesDirectory: './app/routes',
        generatedRouteTree: './app/routeTree.gen.ts',
      }),
      react(),
      tailwindcss()
    ],
    define: {
      // Intentionally empty to prevent leaking secrets to client
    },
    resolve: {
      alias: {
        '@': path.resolve(__dirname, '.'),
      }
    },
    build: {
      rollupOptions: {
        output: {
          manualChunks: {
            // React core
            'vendor-react': ['react', 'react-dom'],
            // TanStack libraries
            'vendor-tanstack': [
              '@tanstack/react-router',
              '@tanstack/react-query',
            ],
            // Icons (large library)
            'vendor-icons': ['lucide-react'],
          },
        },
      },
      // Increase the warning limit slightly (we're splitting now)
      chunkSizeWarningLimit: 400,
    },
  };
});
