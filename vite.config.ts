import { readdir, readFile, writeFile } from 'node:fs/promises';
import path from 'node:path';
import { promisify } from 'node:util';
import { gzip } from 'node:zlib';
import inertia from '@inertiajs/vite';
import { wayfinder } from '@laravel/vite-plugin-wayfinder';
import tailwindcss from '@tailwindcss/vite';
import vue from '@vitejs/plugin-vue';
import laravel from 'laravel-vite-plugin';
import { bunny } from 'laravel-vite-plugin/fonts';
import { loadEnv } from 'vite';
import type { Plugin } from 'vite';
import { defineConfig, lazyPlugins } from 'vite-plus';

/*
 * The Laravel backend lives in its own repository, checked out next to this
 * one (../kotak-parcel-backend). Set KOTAK_BACKEND_PATH in .env when it lives
 * elsewhere. The build writes into the backend's public/build, and Wayfinder
 * asks the backend for its routes.
 */
const backend = path
    .relative(
        process.cwd(),
        path.resolve(
            loadEnv('', process.cwd(), 'KOTAK_').KOTAK_BACKEND_PATH ??
                '../kotak-parcel-backend',
        ),
    )
    .replaceAll('\\', '/');

const compress = promisify(gzip);

/**
 * Writes a gzip copy (name.gz) next to every built asset over 1 KB, once,
 * at build time. nginx sends those copies as they are (gzip_static in the
 * backend's deploy/nginx.conf) instead of compressing on each request,
 * which for the camera scanner's 25 MB WebAssembly runtime would cost
 * about a second of CPU every time.
 */
function gzipAssets(): Plugin {
    let assets = '';

    return {
        name: 'kotak:gzip-assets',
        apply: 'build',
        configResolved(config) {
            assets = path.resolve(
                config.root,
                config.build.outDir,
                config.build.assetsDir,
            );
        },
        async closeBundle() {
            const files = (await readdir(assets)).filter(
                (file) => !file.endsWith('.gz'),
            );

            await Promise.all(
                files.map(async (file) => {
                    const source = path.join(assets, file);
                    const data = await readFile(source);

                    if (data.length > 1024) {
                        await writeFile(
                            `${source}.gz`,
                            await compress(data, { level: 9 }),
                        );
                    }
                }),
            );
        },
    };
}

export default defineConfig({
    plugins: lazyPlugins(() => [
        laravel({
            input: ['resources/css/app.css', 'resources/js/app.ts'],
            publicDirectory: `${backend}/public`,
            refresh: [
                `${backend}/routes/**`,
                `${backend}/resources/views/**`,
                `${backend}/app/**/Http/**/*.php`,
            ],
            fonts: [
                // Brand type: Plus Jakarta Sans for text and headings,
                // JetBrains Mono for tracking numbers, times and amounts.
                bunny('Plus Jakarta Sans', {
                    weights: [400, 500, 600, 700, 800],
                    preload: [
                        { weight: 400 },
                        { weight: 700 },
                        { weight: 800 },
                    ],
                    optimizedFallbacks: false,
                }),
                bunny('JetBrains Mono', {
                    weights: [500, 600, 700],
                    preload: false,
                    optimizedFallbacks: false,
                }),
            ],
        }),
        inertia(),
        tailwindcss(),
        vue({
            template: {
                transformAssetUrls: {
                    base: null,
                    includeAbsolute: false,
                },
            },
        }),
        wayfinder({
            formVariants: true,
            command: `php ${backend}/artisan wayfinder:generate`,
            path: 'resources/js',
            patterns: [
                `${backend}/routes/**/*.php`,
                `${backend}/app/**/Http/**/*.php`,
            ],
        }),
        gzipAssets(),
    ]),
    resolve: {
        alias: [
            // The camera scanner runs PaddleOCR.js in its worker, which
            // brings its own OpenCV.js; the copy its main entry imports is
            // never used on the page (see lib/scanner/opencvInWorker.ts).
            {
                find: /^@techstark\/opencv-js$/,
                replacement: path.resolve(
                    'resources/js/lib/scanner/opencvInWorker.ts',
                ),
            },
        ],
    },
    // The barcode reader's worker is an ES module, like PaddleOCR.js's.
    worker: {
        format: 'es',
    },
    build: {
        // The output folder is in the backend repository, outside this
        // project, so Vite would otherwise leave old builds behind.
        emptyOutDir: true,
    },
    lint: {
        ignorePatterns: [
            'node_modules/**',
            'resources/js/actions/**',
            'resources/js/components/ui/*',
            'resources/js/routes/**',
            'resources/js/wayfinder/**',
        ],
        options: {
            denyWarnings: true,
            typeAware: true,
        },
    },
    fmt: {
        printWidth: 80,
        tabWidth: 4,
        singleQuote: true,
        semi: true,
        singleAttributePerLine: false,
        htmlWhitespaceSensitivity: 'css',
        ignorePatterns: ['.github/**', 'resources/js/components/ui/*'],
        sortTailwindcss: {
            functions: ['clsx', 'cn', 'cva'],
            stylesheet: 'resources/css/app.css',
        },
    },
});
