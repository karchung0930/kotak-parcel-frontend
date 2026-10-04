/**
 * A dependency-free self-check for resources/js/lib/rateImport.ts. Column
 * letters must match the backend's (App\Support\RateSheets\Cells::column()),
 * as the problems found in a file name their column by letter. Run it with:
 * node --experimental-strip-types --no-warnings tests/js/rateImport.check.ts
 */
import assert from 'node:assert/strict';
import {
    columnLetter,
    fileProblem,
    formatFileSize,
    importStep,
    routeKey,
    routeOf,
    routeOptions,
} from '../../resources/js/lib/rateImport.ts';

const checks: [string, () => void][] = [
    [
        'column letters as in a spreadsheet',
        () => {
            assert.deepEqual([0, 1, 25, 26, 51, 52, 256].map(columnLetter), [
                'A',
                'B',
                'Z',
                'AA',
                'AZ',
                'BA',
                'IW',
            ]);
        },
    ],
    [
        'route keys and options',
        () => {
            assert.equal(
                routeKey('sabah-labuan', 'sarawak'),
                'sabah-labuan>sarawak',
            );
            assert.deepEqual(routeOf('sabah-labuan>sarawak'), {
                origin: 'sabah-labuan',
                destination: 'sarawak',
            });
            assert.deepEqual(routeOf(''), { origin: null, destination: null });

            const zones = [
                { code: 'west', name: 'West' },
                { code: 'east', name: 'East' },
            ];

            assert.deepEqual(
                routeOptions(zones, (from, to) => `${from.name} to ${to.name}`),
                [
                    { value: 'west>west', label: 'West to West' },
                    { value: 'west>east', label: 'West to East' },
                    { value: 'east>west', label: 'East to West' },
                    { value: 'east>east', label: 'East to East' },
                ],
            );
        },
    ],
    [
        'the step an import is at',
        () => {
            // Uploaded, the file is being read for its columns.
            assert.equal(importStep('uploaded', false), 'columns');
            assert.equal(importStep('parsing', false), 'columns');
            assert.equal(importStep('needs_mapping', true), 'columns');
            assert.equal(importStep('validating', true), 'rows');
            // A file that could not be read is back at the upload.
            assert.equal(importStep('failed', false), 'upload');
            assert.equal(importStep('failed', true), 'rows');
            assert.equal(importStep('ready', true), 'draft');
            assert.equal(importStep('applied', true), 'draft');
        },
    ],
    [
        'file sizes',
        () => {
            assert.equal(formatFileSize(820), '820 B');
            assert.equal(formatFileSize(14 * 1024), '14 KB');
            assert.equal(formatFileSize(1.25 * 1024 * 1024), '1.3 MB');
            assert.equal(formatFileSize(5120 * 1024), '5 MB');
        },
    ],
    [
        'files refused before they are sent',
        () => {
            assert.equal(
                fileProblem({ name: 'Rates 2027.XLSX', size: 1024 }, 5120),
                null,
            );
            assert.equal(
                fileProblem({ name: 'rates.csv', size: 5120 * 1024 }, 5120),
                null,
            );
            assert.equal(
                fileProblem({ name: 'rates.csv', size: 5120 * 1024 + 1 }, 5120),
                'The file is over 5 MB. Remove what is not prices, or split it.',
            );
            assert.equal(
                fileProblem({ name: 'rates.xls', size: 1024 }, 5120),
                'Choose an Excel (.xlsx) or CSV file. Older .xls files need saving as .xlsx first.',
            );
            assert.notEqual(fileProblem({ name: 'xlsx', size: 1 }, 5120), null);
        },
    ],
];

let failed = 0;

for (const [name, check] of checks) {
    try {
        check();
        console.log(`  ok  ${name}`);
    } catch (error) {
        failed++;
        console.error(`  FAIL ${name}\n${String(error)}`);
    }
}

if (failed > 0) {
    process.exitCode = 1;
} else {
    console.log(`\nAll ${checks.length} rate import checks passed.`);
}
