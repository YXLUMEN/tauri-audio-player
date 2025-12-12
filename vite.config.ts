import {defineConfig} from 'vite';

// @ts-expect-error process is a Node.js global
const env = process.env;

export default defineConfig({
    clearScreen: false,
    server: {
        watch: {
            ignored: ['**/src-tauri/**'],
        }
    },
    envPrefix: ['VITE_', 'TAURI_ENV_*'],
    build: {
        // Tauri 在 Windows 上使用 Chromium，在 macOS 和 Linux 上使用 WebKit
        target:
            env.TAURI_ENV_PLATFORM === 'windows'
                ? 'chrome105'
                : 'safari13',
        // 在 debug 构建中不使用 minify
        minify: !env.TAURI_ENV_DEBUG ? 'terser' : false,
        // 在 debug 构建中生成 sourcemap
        sourcemap: !!env.TAURI_ENV_DEBUG,
        terserOptions: {
            compress: {
                drop_console: true,
                drop_debugger: true,
                ecma: 2020
            }
        },
    },
    plugins: [
        {
            name: 'inject-debug-script',
            apply: 'serve',
            transformIndexHtml(html) {
                const tag = '<script src="debug/dev_toolkit.ts"></script>';
                return html.replace('</head>', `  ${tag}\n</head>`);
            },
        },
    ],
});