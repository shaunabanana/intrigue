import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { defineConfig } from "vite";
import vue from "@vitejs/plugin-vue";

const root = dirname(fileURLToPath(import.meta.url));
const src = resolve(root, "src");

export default defineConfig({
    base: "./",
    plugins: [vue()],
    resolve: {
        alias: {
            "@": src,
        },
        dedupe: ["yjs", "lib0"],
    },
    build: {
        rollupOptions: {
            input: {
                index: resolve(root, "index.html"),
                preferences: resolve(root, "preferences.html"),
            },
        },
    },
});
