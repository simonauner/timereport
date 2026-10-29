import path from 'node:path';
import tailwindcss from '@tailwindcss/vite';
import react from '@vitejs/plugin-react';
import { defineConfig } from 'vite';
import { VitePWA } from 'vite-plugin-pwa';

// GitHub Pages serves project sites from /<repo>; the deploy workflow sets this.
const basePath = process.env.PAGES_BASE_PATH ?? '';

export default defineConfig({
    base: `${basePath}/`,
    plugins: [
        react(),
        tailwindcss(),
        // A web app manifest so the site can be added to the home screen, and
        // a service worker that caches the app so it opens without signal.
        // A new version is fetched in the background and used the next time
        // the app is opened. Sync goes to another origin and is never cached.
        VitePWA({
            registerType: 'autoUpdate',
            includeAssets: ['favicon.ico', 'apple-touch-icon-180x180.png'],
            manifest: {
                name: 'Stämpelklockan',
                short_name: 'Stämpelklockan',
                lang: 'sv',
                display: 'standalone',
                background_color: '#0d2346',
                theme_color: '#ffffff',
                icons: [
                    {
                        src: 'pwa-192x192.png',
                        sizes: '192x192',
                        type: 'image/png',
                    },
                    {
                        src: 'pwa-512x512.png',
                        sizes: '512x512',
                        type: 'image/png',
                    },
                    {
                        src: 'maskable-icon-512x512.png',
                        sizes: '512x512',
                        type: 'image/png',
                        purpose: 'maskable',
                    },
                ],
            },
            workbox: {
                globPatterns: ['**/*.{js,css,html,svg,png,ico,woff2}'],
                // The source of the icons, not used by the app.
                globIgnores: ['icon.png'],
            },
        }),
    ],
    resolve: {
        alias: { '@': path.resolve(import.meta.dirname, './src') },
    },
});
