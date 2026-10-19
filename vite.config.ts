import path from 'node:path';
import tailwindcss from '@tailwindcss/vite';
import react from '@vitejs/plugin-react';
import { defineConfig } from 'vite';

// GitHub Pages serves project sites from /<repo>; the deploy workflow sets this.
const basePath = process.env.PAGES_BASE_PATH ?? '';

export default defineConfig({
    base: `${basePath}/`,
    plugins: [react(), tailwindcss()],
    resolve: {
        alias: { '@': path.resolve(import.meta.dirname, './src') },
    },
});
