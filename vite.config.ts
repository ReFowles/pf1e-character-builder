import { defineConfig } from 'vite';
import { svelte } from '@sveltejs/vite-plugin-svelte';
import tailwindcss from '@tailwindcss/vite';
import { VitePWA } from 'vite-plugin-pwa';

export default defineConfig({
  // dice-box loads its physics worlds with relative dynamic imports; leave it unbundled in dev.
  optimizeDeps: { exclude: ['@3d-dice/dice-box'] },
  plugins: [
    tailwindcss(),
    svelte(),
    VitePWA({
      registerType: 'autoUpdate',
      includeAssets: ['pf-logo.svg', 'favicon.svg'],
      manifest: {
        name: 'PF1e Character Sheet',
        short_name: 'PF1e Sheet',
        description: 'Offline Pathfinder 1st Edition character sheet',
        theme_color: '#7a1f1f',
        background_color: '#f7f1e3',
        display: 'standalone',
        icons: [{ src: 'favicon.svg', sizes: 'any', type: 'image/svg+xml', purpose: 'any' }],
      },
      workbox: {
        globPatterns: ['**/*.{js,css,html,svg,json,txt,woff2,wasm,png,jpg}'],
        maximumFileSizeToCacheInBytes: 10 * 1024 * 1024,
      },
    }),
  ],
});
