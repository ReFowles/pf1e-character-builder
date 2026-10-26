import { defineConfig } from 'vite';
import { svelte } from '@sveltejs/vite-plugin-svelte';
import tailwindcss from '@tailwindcss/vite';
import { VitePWA } from 'vite-plugin-pwa';

export default defineConfig({
  plugins: [
    tailwindcss(),
    svelte(),
    VitePWA({
      registerType: 'autoUpdate',
      includeAssets: ['pf-logo.svg'],
      manifest: {
        name: 'PF1e Character Sheet',
        short_name: 'PF1e Sheet',
        description: 'Offline Pathfinder 1st Edition character sheet',
        theme_color: '#7a1f1f',
        background_color: '#f7f1e3',
        display: 'standalone',
        icons: [{ src: 'pf-logo.svg', sizes: 'any', type: 'image/svg+xml' }],
      },
      workbox: {
        globPatterns: ['**/*.{js,css,html,svg,json,txt,woff2}'],
        maximumFileSizeToCacheInBytes: 10 * 1024 * 1024,
      },
    }),
  ],
});
