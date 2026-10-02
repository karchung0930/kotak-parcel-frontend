import path from 'node:path';
import inertia from '@inertiajs/vite';
import { wayfinder } from '@laravel/vite-plugin-wayfinder';
import tailwindcss from '@tailwindcss/vite';
import vue from '@vitejs/plugin-vue';
import laravel from 'laravel-vite-plugin';
import { bunny } from 'laravel-vite-plugin/fonts';
import { loadEnv } from 'vite';
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
    ]),
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
