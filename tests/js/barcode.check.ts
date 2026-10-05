/**
 * Reads generated barcodes with the scanner's decoder (zxing-wasm, the same
 * reader build and formats as lib/scanner/barcode.worker.ts): the counter
 * pass's Code 39, drawn from lib/code39.ts as TrackingBarcode.vue draws it,
 * and Code 128 and QR codes made with zxing-wasm's writer. Only text that
 * is a tracking number counts. Run it with:
 * node --experimental-strip-types --no-warnings tests/js/barcode.check.ts
 */
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import {
    prepareZXingModule as prepareReader,
    readBarcodes,
} from 'zxing-wasm/reader';
import {
    prepareZXingModule as prepareWriter,
    writeBarcode,
} from 'zxing-wasm/writer';
import { code39Bars } from '../../resources/js/lib/code39.ts';
import {
    formatTrackingNumber,
    normalizeTrackingNumber,
} from '../../resources/js/lib/format.ts';
import { BARCODE_FORMATS } from '../../resources/js/lib/scan.ts';

// The .wasm files from node_modules, as the browser gets them from the build.
const wasm = (file: string) =>
    readFileSync(fileURLToPath(import.meta.resolve(`zxing-wasm/${file}`)));

await prepareReader({
    overrides: { wasmBinary: wasm('reader/zxing_reader.wasm') },
    fireImmediately: true,
});
await prepareWriter({
    overrides: { wasmBinary: wasm('writer/zxing_writer.wasm') },
    fireImmediately: true,
});

type Pixels = { data: Uint8ClampedArray; width: number; height: number };

/**
 * The counter pass's barcode as pixels: ink bars on white, `scale` pixels
 * per unit (a narrow bar is 2 units), with a white margin all round.
 * `blank` whites out a band of units across the whole height, like a tear
 * or a smudge through the bars.
 */
function counterPassBarcode(
    text: string,
    scale: number,
    blank: [number, number] | null = null,
): Pixels {
    const symbol = code39Bars(text);
    const margin = 8;
    const width = Math.ceil(symbol.width * scale) + margin * 2;
    const height = 60 * scale + margin * 2;
    const data = new Uint8ClampedArray(width * height * 4).fill(255);

    for (const bar of symbol.bars) {
        for (let unit = bar.x; unit < bar.x + bar.width; unit++) {
            if (blank && unit >= blank[0] && unit < blank[1]) {
                continue;
            }

            for (let x = unit * scale; x < (unit + 1) * scale; x++) {
                for (let y = margin; y < height - margin; y++) {
                    const offset = (y * width + margin + x) * 4;
                    // Ink #16181D, as on the pass.
                    data[offset] = 0x16;
                    data[offset + 1] = 0x18;
                    data[offset + 2] = 0x1d;
                }
            }
        }
    }

    return { data, width, height };
}

/** What the scanner keeps from an image: tracking numbers only. */
async function scannedNumbers(image: Pixels | Blob): Promise<string[]> {
    const results = await readBarcodes(image, {
        formats: [...BARCODE_FORMATS],
        tryHarder: true,
        maxNumberOfSymbols: 4,
    });

    return results
        .map((result) => normalizeTrackingNumber(result.text))
        .filter((number): number is string => number !== null)
        .map(formatTrackingNumber);
}

async function written(
    text: string,
    format: 'Code128' | 'QRCode',
): Promise<Blob> {
    const { image, error } = await writeBarcode(text, { format, scale: 3 });

    assert.ok(image, error);

    return image;
}

const checks: [string, () => Promise<void>][] = [
    [
        "the counter pass's Code 39 is read",
        async () => {
            for (const number of [
                'KT-7Q4M92XD',
                'KT-00000017',
                'KT-ZZZZZZZZ',
            ]) {
                assert.deepEqual(
                    await scannedNumbers(counterPassBarcode(number, 2)),
                    [number],
                );
            }
        },
    ],
    [
        'it is read with thin bars too, as a camera crop sees it',
        async () => {
            // 1 pixel per unit: narrow bars 2 pixels wide.
            assert.deepEqual(
                await scannedNumbers(counterPassBarcode('KT-C2T220AS', 1)),
                ['KT-C2T220AS'],
            );
        },
    ],
    [
        'Code 128 and QR codes holding a tracking number are read',
        async () => {
            assert.deepEqual(
                await scannedNumbers(await written('KT-7Q4M92XD', 'Code128')),
                ['KT-7Q4M92XD'],
            );
            // Without the dash it is the same number.
            assert.deepEqual(
                await scannedNumbers(await written('KT8ZGW9CZT', 'QRCode')),
                ['KT-8ZGW9CZT'],
            );
        },
    ],
    [
        'other barcodes are read but do not count',
        async () => {
            const results = await readBarcodes(
                await written('ORDER-12345', 'Code128'),
                { formats: [...BARCODE_FORMATS] },
            );

            assert.equal(results[0]?.text, 'ORDER-12345');
            assert.deepEqual(
                await scannedNumbers(await written('ORDER-12345', 'Code128')),
                [],
            );
            assert.deepEqual(
                await scannedNumbers(
                    await written('https://example.com/KT-7Q4M92XD', 'QRCode'),
                ),
                [],
            );
        },
    ],
    [
        'a damaged barcode gives nothing, never a wrong number',
        async () => {
            const symbol = code39Bars('KT-7Q4M92XD');
            const middle = Math.round(symbol.width / 2);

            assert.deepEqual(
                await scannedNumbers(
                    counterPassBarcode('KT-7Q4M92XD', 2, [
                        middle - 20,
                        middle + 20,
                    ]),
                ),
                [],
            );
        },
    ],
];

let failed = 0;

for (const [name, check] of checks) {
    try {
        await check();
        console.log(`  ok  ${name}`);
    } catch (error) {
        failed++;
        console.error(`  FAIL ${name}\n${String(error)}`);
    }
}

if (failed > 0) {
    process.exitCode = 1;
} else {
    console.log(`\nAll ${checks.length} barcode checks passed.`);
}
