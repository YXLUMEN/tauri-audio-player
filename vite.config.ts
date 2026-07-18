import {defineConfig} from "vite";
import {publicFileCount} from "./vite-plugin/vite-plugin-file-count";
import InlineEnum from 'unplugin-inline-enum/vite';

// @ts-expect-error process is a node.js global
const host = process.env.TAURI_DEV_HOST;

export default defineConfig({
    clearScreen: false,
    server: {
        port: 1420,
        strictPort: true,
        host: host || false,
        hmr: host
            ? {
                protocol: "ws",
                host,
                port: 1421,
                overlay: false,
            }
            : undefined,
        watch: {
            ignored: ["**/src-tauri/**"],
        },
    },
    build: {
        minify: 'terser',
        terserOptions: {
            compress: {
                drop_console: true,
                drop_debugger: true,
                ecma: 2025
            }
        },
    },
    define: {},
    plugins: [
        publicFileCount({
            dir: 'img/audio/cover',
            defineKey: '__INNER_COVER_COUNT__',
        }),
        InlineEnum()
    ],
});
