import tailwindcss from '@tailwindcss/vite';
import react from '@vitejs/plugin-react';
import path from 'path';
import { defineConfig } from 'vite';
import { VitePWA } from 'vite-plugin-pwa';

export default defineConfig(() => {
  return {
    plugins: [
      {
        name: 'disable-vite-client-ws',
        enforce: 'post',
        transform(code, id) {
          if (id.includes('vite/dist/client/client.mjs') || code.includes('WebSocket closed without opened.')) {
            return {
              code: code
                .replace(
                  'const socket = options.createConnection();',
                  'return; const socket = options.createConnection();'
                )
                .replace(
                  'ws.send(JSON.stringify(data));',
                  'ws?.send(JSON.stringify(data));'
                ),
              map: null,
            };
          }
        },
      },
      react(), 
      tailwindcss(),
      VitePWA({
        selfDestroying: true,
        registerType: 'autoUpdate',
        injectRegister: false,
        includeAssets: ['favicon.png', 'apple-touch-icon.png', 'icon.svg', 'nexus-logo.png', 'nexus-logo.jpg'],
        manifest: {
          id: '/',
          name: 'NEXUS Academic Management System',
          short_name: 'NEXUS',
          description: 'NEXUS ระบบบริหารจัดการงานวิชาการและธุรการโรงเรียน สำหรับมือถือและเว็บไซต์',
          theme_color: '#173b75',
          background_color: '#ffffff',
          display: 'standalone',
          orientation: 'portrait-primary',
          start_url: '/',
          scope: '/',
          icons: [
            {
              src: '/pwa-192x192.png',
              sizes: '192x192',
              type: 'image/png',
              purpose: 'any'
            },
            {
              src: '/pwa-512x512.png',
              sizes: '512x512',
              type: 'image/png',
              purpose: 'any'
            },
            {
              src: '/pwa-maskable-512x512.png',
              sizes: '512x512',
              type: 'image/png',
              purpose: 'maskable'
            }
          ]
        },
        devOptions: {
          enabled: false
        }
      })
    ],
    resolve: {
      alias: {
        '@': path.resolve(import.meta.dirname || '.', '.'),
      },
    },
    server: {
      hmr: false,
      watch: null,
    },
  };
});

