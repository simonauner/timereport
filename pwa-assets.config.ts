import {
    defineConfig,
    minimal2023Preset,
} from '@vite-pwa/assets-generator/config';

// public/icon.png fills its own background, so it's used edge to edge and
// the home screens round the corners. Android may cut a maskable icon to a
// circle, so that one is shrunk to keep the card and lever inside it.
export default defineConfig({
    preset: {
        ...minimal2023Preset,
        transparent: { ...minimal2023Preset.transparent, padding: 0 },
        maskable: {
            ...minimal2023Preset.maskable,
            padding: 0.2,
            resizeOptions: { background: '#1a5ff5' },
        },
        apple: { ...minimal2023Preset.apple, padding: 0 },
    },
    images: ['public/icon.png'],
});
