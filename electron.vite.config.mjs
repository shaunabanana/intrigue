import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { defineConfig } from 'electron-vite';
import vue from '@vitejs/plugin-vue';

const root = dirname(fileURLToPath(import.meta.url));
const src = resolve(root, 'src');

export default defineConfig({
    main: {
        resolve: {
            alias: {
                '@': src,
            },
        },
        build: {
            rollupOptions: {
                input: resolve(src, 'background.js'),
            },
        },
    },
    preload: {
        build: {
            rollupOptions: {
                input: resolve(src, 'preload.js'),
            },
        },
    },
    renderer: {
        root,
        base: './',
        plugins: [vue()],
        resolve: {
            alias: {
                '@': src,
            },
        },
        build: {
            rollupOptions: {
                input: resolve(root, 'index.html'),
            },
        },
    },
});
