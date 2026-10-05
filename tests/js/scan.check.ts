/**
 * A dependency-free self-check for the camera scanner's rules: reading a
 * tracking number out of OCR text (lib/format.ts), the two-frame
 * agreement, the steps of a scan, the guide box's crop and the camera
 * errors (lib/scan.ts).
 *
 * fixtures/ocr-readings.json holds what PaddleOCR.js with the PP-OCRv6
 * tiny models read on guide-box crops of Kotak's pass and receipt: the
 * pieces of text with their outlines for single frames, and the text of
 * every frame of a few 8-frame scans, with the number the two-frame rule
 * shows and on which frame. Run it with:
 * node --experimental-strip-types --no-warnings tests/js/scan.check.ts
 */
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import {
    normalizeTrackingNumber,
    readPartialTrackingNumber,
    readTrackingNumber,
} from '../../resources/js/lib/format.ts';
import {
    AGREEMENT,
    AGREEMENT_WINDOW,
    OCR_CROP,
    RETRY_DELAY_MS,
    ReadingTally,
    ScanFlow,
    cameraProblem,
    coverCrop,
    readLines,
} from '../../resources/js/lib/scan.ts';
import type { ReadItem } from '../../resources/js/lib/scan.ts';

const readings = JSON.parse(
    readFileSync(
        new URL('./fixtures/ocr-readings.json', import.meta.url),
        'utf8',
    ),
) as {
    /** One frame: what OCR found, and the number the scanner reads from it. */
    frames: { label: string; items: ReadItem[]; number: string | null }[];
    /** A scan's frames in order, and the reading shown (frame from 0). */
    scans: {
        label: string;
        texts: string[];
        shown: string | null;
        frame: number | null;
    }[];
};

/** A scan with the camera on, as useTrackingScanner drives it. */
function scanning(now?: () => number): ScanFlow {
    const flow = new ScanFlow(now);
    flow.reset();
    flow.cameraStarting();
    flow.cameraOn();

    return flow;
}

/** One OCR'd frame of text, as useTrackingScanner passes it on. */
function readFrame(flow: ScanFlow, text: string): boolean {
    return flow.textRead(
        readTrackingNumber(text),
        readPartialTrackingNumber(text),
    );
}

const checks: [string, () => void][] = [
    [
        'a tracking number is read out of OCR text',
        () => {
            assert.equal(readTrackingNumber('KT-7Q4M92XD'), 'KT-7Q4M92XD');
            assert.equal(readTrackingNumber('KT7Q4M92XD'), 'KT-7Q4M92XD');
            // Lower case and spaces inside the number.
            assert.equal(readTrackingNumber(' kt 7q4m 92xd '), 'KT-7Q4M92XD');
            // The label's other lines around it.
            assert.equal(
                readTrackingNumber('Tracking number\nKT-CCP8WHRP\nPaid'),
                'KT-CCP8WHRP',
            );
            // Any dash after KT.
            assert.equal(readTrackingNumber('KT–7Q4M92XD'), 'KT-7Q4M92XD');
            assert.equal(readTrackingNumber('KT—7Q4M92XD'), 'KT-7Q4M92XD');
        },
    ],
    [
        'letters OCR mixes up become the Crockford characters',
        () => {
            // O → 0, I and L → 1, U → V (none of O, I, L, U are used).
            assert.equal(readTrackingNumber('KT-O1LIABCD'), 'KT-0111ABCD');
            assert.equal(readTrackingNumber('KT-7Q4M92XU'), 'KT-7Q4M92XV');
            assert.equal(readTrackingNumber('kt-oo7q4m9u'), 'KT-007Q4M9V');
        },
    ],
    [
        'only a whole number on one line counts',
        () => {
            assert.equal(readTrackingNumber('KT-8ZGW9C2'), null);
            assert.equal(readTrackingNumber('Tracking number'), null);
            assert.equal(readTrackingNumber('7Q4M92XD'), null);
            assert.equal(readTrackingNumber(''), null);
            assert.equal(readTrackingNumber(null), null);
            // Two lines are never joined into one number.
            assert.equal(readTrackingNumber('KT-7Q4M\n92XD'), null);
            // With more characters after it, the first 8 count.
            assert.equal(readTrackingNumber('KT-V7ZSRAJT3'), 'KT-V7ZSRAJT');
            // The first number on the label wins.
            assert.equal(
                readTrackingNumber('KT-AAAAAAAA\nKT-BBBBBBBB'),
                'KT-AAAAAAAA',
            );
        },
    ],
    [
        'every number read passes the tracking-number rule',
        () => {
            for (const text of [
                'kt 7q4m 92xd',
                'KT-O1LIABCD',
                'KT-7Q4M92XU',
                'xx KT-ZZZZZZZZ yy',
            ]) {
                const read = readTrackingNumber(text);
                assert.ok(read && normalizeTrackingNumber(read), text);
            }
        },
    ],
    [
        'the typed entry starts with what OCR read',
        () => {
            assert.equal(readPartialTrackingNumber('kt 7q4m'), 'KT-7Q4M');
            assert.equal(
                readPartialTrackingNumber('Tracking number\nKT-7Q4M9'),
                'KT-7Q4M9',
            );
            assert.equal(
                readPartialTrackingNumber('KT-7Q4M92XD'),
                'KT-7Q4M92XD',
            );
            assert.equal(readPartialTrackingNumber('KT'), 'KT-');
            assert.equal(readPartialTrackingNumber('Tracking number'), '');
            assert.equal(readPartialTrackingNumber(undefined), '');
        },
    ],
    [
        'a reading shows once two frames agree',
        () => {
            assert.equal(AGREEMENT, 2);
            const tally = new ReadingTally();

            assert.equal(tally.add('KT-7Q4M92XD'), false);
            // A misread on another frame is counted on its own.
            assert.equal(tally.add('KT-7Q4M92X0'), false);
            // A frame without a number agrees with nothing.
            assert.equal(tally.add(null), false);
            assert.equal(tally.add(null), false);
            assert.equal(tally.add('KT-7Q4M92XD'), true);

            tally.clear();
            assert.equal(tally.add('KT-7Q4M92XD'), false);
            assert.equal(tally.add('KT-7Q4M92X0'), false);
            assert.equal(tally.add('KT-7Q4M92X0'), true);
        },
    ],
    [
        'only the latest 8 frames count towards the agreement',
        () => {
            assert.equal(AGREEMENT_WINDOW, 8);
            const tally = new ReadingTally();

            // The same misread 8 frames apart is never shown...
            assert.equal(tally.add('KT-CE8JX07D'), false);

            for (let frame = 1; frame < AGREEMENT_WINDOW; frame++) {
                assert.equal(tally.add(null), false);
            }

            assert.equal(tally.add('KT-CE8JX07D'), false);

            // ...but 7 apart, inside one window, it is.
            for (let frame = 1; frame < AGREEMENT_WINDOW - 1; frame++) {
                assert.equal(tally.add(null), false);
            }

            assert.equal(tally.add('KT-CE8JX07D'), true);
        },
    ],
    [
        'recorded OCR output gives the number on the label',
        () => {
            assert.ok(readings.frames.length >= 8);

            for (const frame of readings.frames) {
                assert.equal(
                    readTrackingNumber(readLines(frame.items)),
                    frame.number,
                    frame.label,
                );
            }

            // Among them: the number with a word before it on its line
            // ("Parcel KT -9AXEW12E"), a frame that misread it (why two
            // frames must agree) and one where no number was read.
            assert.ok(
                readings.frames.some(
                    (frame) =>
                        frame.number === frame.label &&
                        frame.items.some((item) => item.text.includes('KT -')),
                ),
            );
            assert.ok(
                readings.frames.some(
                    (frame) =>
                        frame.number !== null && frame.number !== frame.label,
                ),
            );
            assert.ok(readings.frames.some((frame) => frame.number === null));
        },
    ],
    [
        'recorded scans show the number on the expected frame',
        () => {
            for (const scan of readings.scans) {
                const flow = scanning();
                const shown = scan.texts.findIndex((text) =>
                    readFrame(flow, text),
                );

                assert.equal(
                    shown === -1 ? null : shown,
                    scan.frame,
                    scan.label,
                );
                assert.equal(
                    flow.phase === 'confirm' ? flow.number : null,
                    scan.shown,
                    scan.label,
                );

                // What is shown is the number on the label, never a misread.
                if (scan.shown !== null) {
                    assert.equal(scan.shown, scan.label);
                }
            }
        },
    ],
    [
        'a barcode opens straight away; a refused number is skipped after',
        () => {
            const flow = scanning();

            // Nothing happens before the camera's picture shows.
            const starting = new ScanFlow();
            assert.equal(starting.barcodeRead(['KT-7Q4M92XD']), null);

            assert.equal(flow.barcodeRead([]), null);
            assert.equal(flow.barcodeRead(['KT-7Q4M92XD']), 'KT-7Q4M92XD');
            assert.equal(flow.phase, 'opening');
            assert.equal(flow.source, 'barcode');
            assert.equal(flow.usesCamera, true);

            // No parcel matches: the message shows and scanning goes on.
            assert.equal(
                flow.settle({ found: false, message: 'No parcel matches.' }),
                false,
            );
            assert.equal(flow.phase, 'scanning');
            assert.equal(flow.notice, 'No parcel matches.');
            assert.equal(flow.number, null);

            // The same label is not looked up again; another one is.
            assert.equal(flow.barcodeRead(['KT-7Q4M92XD']), null);
            assert.equal(
                flow.barcodeRead(['KT-7Q4M92XD', 'KT-CCP8WHRP']),
                'KT-CCP8WHRP',
            );
            assert.equal(flow.notice, null);
            assert.equal(flow.settle({ found: true }), true);
        },
    ],
    [
        'a failure worth retrying lets the same number be read again, after a pause',
        () => {
            let time = 1000;
            const flow = scanning(() => time);
            const failed = {
                found: false,
                message: 'Could not look up KT-7Q4M92XD.',
                retry: true,
            } as const;
            flow.barcodeRead(['KT-7Q4M92XD']);
            flow.settle(failed);

            assert.equal(flow.phase, 'scanning');
            assert.equal(flow.notice, 'Could not look up KT-7Q4M92XD.');

            // Not on the next frames: the message stays up meanwhile.
            time += RETRY_DELAY_MS - 1;
            assert.equal(flow.barcodeRead(['KT-7Q4M92XD']), null);
            flow.showHints();
            assert.equal(readFrame(flow, 'KT-7Q4M92XD'), false);
            assert.equal(readFrame(flow, 'KT-7Q4M92XD'), false);
            assert.equal(flow.notice, 'Could not look up KT-7Q4M92XD.');

            // Another label opens; this one again after the pause.
            assert.equal(
                flow.barcodeRead(['KT-7Q4M92XD', 'KT-CCP8WHRP']),
                'KT-CCP8WHRP',
            );
            flow.settle(failed);
            time += 1;
            assert.equal(flow.barcodeRead(['KT-7Q4M92XD']), 'KT-7Q4M92XD');

            // "Scan again" tries it at once.
            flow.settle(failed);
            flow.scanAgain();
            assert.equal(flow.barcodeRead(['KT-7Q4M92XD']), 'KT-7Q4M92XD');
        },
    ],
    [
        '"Scan again" forgets the refusals',
        () => {
            const flow = scanning();
            flow.barcodeRead(['KT-7Q4M92XD']);
            flow.settle({ found: false, message: 'No parcel matches.' });

            flow.scanAgain();
            assert.equal(flow.phase, 'scanning');
            assert.equal(flow.notice, null);
            assert.equal(flow.barcodeRead(['KT-7Q4M92XD']), 'KT-7Q4M92XD');
        },
    ],
    [
        'an OCR reading waits for two frames, then for a tap',
        () => {
            const flow = scanning();
            flow.showHints();

            assert.equal(readFrame(flow, 'Tracking number\nKT-7Q4M'), false);
            assert.equal(readFrame(flow, 'KT-7Q4M92XD'), false);
            assert.equal(flow.phase, 'scanning');
            assert.equal(readFrame(flow, 'kt 7q4m 92xd'), true);
            assert.equal(flow.phase, 'confirm');
            assert.equal(flow.number, 'KT-7Q4M92XD');
            assert.equal(flow.source, 'text');

            // Nothing more is read while it waits.
            assert.equal(readFrame(flow, 'KT-CCP8WHRP'), false);
            assert.equal(flow.number, 'KT-7Q4M92XD');

            assert.equal(flow.confirm(), 'KT-7Q4M92XD');
            assert.equal(flow.phase, 'opening');
            assert.equal(flow.confirm(), null);
        },
    ],
    [
        'a refused OCR reading is not shown again; "Scan again" drops it',
        () => {
            const flow = scanning();
            readFrame(flow, 'KT-7Q4M92XD');
            readFrame(flow, 'KT-7Q4M92XD');
            flow.confirm();
            flow.settle({ found: false, message: 'No parcel matches.' });

            // The agreement starts over and skips the refused number.
            assert.equal(readFrame(flow, 'KT-7Q4M92XD'), false);
            assert.equal(readFrame(flow, 'KT-7Q4M92XD'), false);
            assert.equal(flow.phase, 'scanning');

            // "Scan again" on a reading: back to scanning, nothing kept.
            assert.equal(readFrame(flow, 'KT-CCP8WHRP'), false);
            assert.equal(readFrame(flow, 'KT-CCP8WHRP'), true);
            flow.scanAgain();
            assert.equal(flow.phase, 'scanning');
            assert.equal(flow.number, null);
            assert.equal(readFrame(flow, 'KT-7Q4M92XD'), false);
            assert.equal(readFrame(flow, 'KT-7Q4M92XD'), true);
        },
    ],
    [
        'the typed entry starts with the reading, and a miss stays typing',
        () => {
            const flow = scanning();
            readFrame(flow, 'Tracking number\nKT-7Q4M');
            assert.equal(flow.typeInstead(), 'KT-7Q4M');
            assert.equal(flow.phase, 'typing');
            assert.equal(flow.usesCamera, false);

            // From a reading waiting for a tap: the reading itself.
            const confirming = scanning();
            readFrame(confirming, 'KT-7Q4M92XD');
            readFrame(confirming, 'KT-7Q4M92XD');
            assert.equal(confirming.typeInstead(), 'KT-7Q4M92XD');
            assert.equal(confirming.number, null);

            flow.typed('KT-CCP8WHRP');
            assert.equal(flow.phase, 'opening');
            assert.equal(flow.usesCamera, false);
            flow.settle({ found: false, message: 'No parcel matches.' });
            assert.equal(flow.phase, 'typing');
            assert.equal(flow.notice, 'No parcel matches.');

            // Back to the camera: it starts again, the message goes.
            flow.backToCamera();
            assert.equal(flow.phase, 'starting');
            assert.equal(flow.notice, null);
            flow.cameraOn();
            assert.equal(flow.phase, 'scanning');
            // A number refused when typed is not scanned either.
            assert.equal(flow.barcodeRead(['KT-CCP8WHRP']), null);
        },
    ],
    [
        'without a camera only the typed entry is left, and can be retried',
        () => {
            const flow = new ScanFlow();
            flow.reset();
            flow.cameraFailed('denied');
            assert.equal(flow.phase, 'blocked');
            assert.equal(flow.problem, 'denied');
            assert.equal(flow.usesCamera, false);
            assert.equal(flow.barcodeRead(['KT-7Q4M92XD']), null);

            // A typed miss keeps the explanation and the typed entry.
            flow.typed('KT-7Q4M92XD');
            flow.settle({ found: false, message: 'No parcel matches.' });
            assert.equal(flow.phase, 'blocked');

            // "Try the camera again".
            flow.cameraStarting();
            assert.equal(flow.phase, 'starting');
            assert.equal(flow.problem, null);
            flow.cameraOn();
            assert.equal(flow.phase, 'scanning');
        },
    ],
    [
        'the camera stopping during a lookup waits for its answer',
        () => {
            const flow = scanning();
            flow.barcodeRead(['KT-7Q4M92XD']);
            flow.cameraFailed('busy');
            assert.equal(flow.phase, 'opening');
            flow.settle({
                found: false,
                message: 'Could not look up KT-7Q4M92XD.',
                retry: true,
            });
            assert.equal(flow.phase, 'blocked');
            assert.equal(flow.problem, 'busy');

            // A reading waiting for a tap stays while the camera restarts
            // (the page shown again).
            const confirming = scanning();
            readFrame(confirming, 'KT-7Q4M92XD');
            readFrame(confirming, 'KT-7Q4M92XD');
            confirming.cameraStarting();
            assert.equal(confirming.phase, 'confirm');
        },
    ],
    [
        'opening the scanner again starts a new scan',
        () => {
            const flow = scanning();
            flow.showHints();
            readFrame(flow, 'KT-7Q4M');
            flow.barcodeRead(['KT-7Q4M92XD']);
            flow.settle({ found: false, message: 'No parcel matches.' });

            flow.reset();
            assert.equal(flow.phase, 'starting');
            assert.equal(flow.hints, false);
            assert.equal(flow.notice, null);
            assert.equal(flow.partial, '');
            flow.cameraOn();
            assert.equal(flow.barcodeRead(['KT-7Q4M92XD']), 'KT-7Q4M92XD');
        },
    ],
    [
        'the guide box is cropped from a video that covers its element',
        () => {
            // A landscape camera on a portrait phone: cut at the sides.
            assert.deepEqual(
                coverCrop(
                    { width: 1280, height: 720 },
                    { x: 0, y: 64, width: 375, height: 600 },
                    { x: 20, y: 300, width: 335, height: 105 },
                ),
                { x: 439, y: 283, width: 402, height: 126 },
            );
            // The same camera on a wide screen: cut at the top and bottom.
            assert.deepEqual(
                coverCrop(
                    { width: 1280, height: 720 },
                    { x: 0, y: 80, width: 1440, height: 700 },
                    { x: 440, y: 342.5, width: 560, height: 175 },
                ),
                { x: 391, y: 282, width: 498, height: 156 },
            );
            // The guide box has the OCR crop's shape.
            assert.equal(OCR_CROP.width / OCR_CROP.height, 16 / 5);
        },
    ],
    [
        'a box partly off the picture is clipped, and no picture is no crop',
        () => {
            assert.deepEqual(
                coverCrop(
                    { width: 100, height: 100 },
                    { x: 0, y: 0, width: 100, height: 100 },
                    { x: -10, y: 90, width: 30, height: 30 },
                ),
                { x: 0, y: 90, width: 20, height: 10 },
            );
            assert.equal(
                coverCrop(
                    { width: 0, height: 0 },
                    { x: 0, y: 0, width: 375, height: 600 },
                    { x: 20, y: 300, width: 335, height: 105 },
                ),
                null,
            );
            assert.equal(
                coverCrop(
                    { width: 100, height: 100 },
                    { x: 0, y: 0, width: 100, height: 100 },
                    { x: 200, y: 0, width: 30, height: 30 },
                ),
                null,
            );
        },
    ],
    [
        'OCR pieces become lines, read top to bottom and left to right',
        () => {
            const box = (x: number, y: number, width: number, height = 30) => [
                [x, y],
                [x + width, y],
                [x + width, y + height],
                [x, y + height],
            ];

            assert.equal(
                readLines([
                    { text: '92XD', poly: box(330, 104) },
                    { text: 'Tracking number', poly: box(40, 40, 200, 24) },
                    { text: 'KT-7Q4M', poly: box(120, 100) },
                ]),
                'Tracking number\nKT-7Q4M 92XD',
            );
            assert.equal(
                readTrackingNumber(
                    readLines([
                        { text: '92XD', poly: box(330, 104) },
                        { text: 'KT-7Q4M', poly: box(120, 100) },
                    ]),
                ),
                'KT-7Q4M92XD',
            );
            assert.equal(readLines([]), '');
        },
    ],
    [
        'camera errors are explained by their cause',
        () => {
            const error = (name: string) => new DOMException('', name);

            assert.equal(cameraProblem(error('NotAllowedError')), 'denied');
            assert.equal(cameraProblem(error('SecurityError')), 'denied');
            assert.equal(cameraProblem(error('NotFoundError')), 'missing');
            assert.equal(
                cameraProblem(error('OverconstrainedError')),
                'missing',
            );
            assert.equal(cameraProblem(error('NotReadableError')), 'busy');
            assert.equal(cameraProblem(error('AbortError')), 'busy');
            assert.equal(
                cameraProblem(new TypeError('no video')),
                'unsupported',
            );
            assert.equal(cameraProblem(undefined), 'busy');
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
    console.log(`\nAll ${checks.length} scanner checks passed.`);
}
