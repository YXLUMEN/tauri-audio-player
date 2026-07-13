// vite-plugin-file-count.ts
import type {Plugin} from 'vite'
import fs from 'node:fs'
import path from 'node:path'

interface Options {
    dir: string
    defineKey?: string
}

export function publicFileCount(options: Options): Plugin {
    const {dir, defineKey = '__PUBLIC_FILE_COUNT__'} = options

    return {
        name: 'vite-plugin-file-count',
        configResolved(config) {
            const targetPath = path.resolve(config.publicDir, dir);
            let count = 0;
            try {
                const files = fs.readdirSync(targetPath);
                count = files.filter(f => !f.startsWith('.')).length;
            } catch {
                console.warn(`[public-file-count] 目录不存在: ${targetPath}`);
            }

            config.define![defineKey] = JSON.stringify(count)
        },
    }
}