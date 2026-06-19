// @ts-ignore
import {defineConfig} from "vite";

// @ts-expect-error process is a nodejs global
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
            }
            : undefined,
        watch: {
            ignored: ["**/src-tauri/**"],
        },
    },
    build: {
        terserOptions: {
            compress: {
                drop_console: true,
                drop_debugger: true,
                ecma: 2025
            }
        },
    },
    plugins: [
        {
            name: 'inject-debug-script',
            apply: 'serve',
            transformIndexHtml(html: string) {
                const tag = '<script src="debug/dev_toolkit.ts"></script>';
                return html.replace('</head>', `  ${tag}\n</head>`);
            },
        },
    ],
});
