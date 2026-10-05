/**
 * The rules of the camera scanner (TrackingScanner.vue), kept apart from
 * the camera and the decoders so `tests/js/scan.check.ts` can run them in
 * Node: the steps of a scan (ScanFlow), the two-frame agreement, the guide
 * box's crop and the camera's errors. Reading a number out of text is in
 * lib/format.ts, with the other tracking-number rules.
 *
 * This file has no imports.
 */

/** How often the barcode reader gets a fresh crop of the guide box. */
export const BARCODE_INTERVAL_MS = 100;

/** How long the barcode reader works alone before hints and OCR start. */
export const HINT_DELAY_MS = 3000;

/**
 * After a failure worth retrying (no connection), how long the camera's
 * reads of that number wait before it is tried again: the message stays
 * up, and the page is not asked again on every frame.
 */
export const RETRY_DELAY_MS = 2000;

/**
 * How many OCR'd frames must give the same number before it is shown.
 * A single OCR reading can be wrong with high confidence, while a chance
 * misread rarely repeats on another frame.
 */
export const AGREEMENT = 2;

/**
 * The agreement counts over this many of the latest OCR'd frames, those
 * without a number included, so two misreads far apart in a long scan
 * never add up to a reading.
 */
export const AGREEMENT_WINDOW = 8;

/** The guide box's shape (16:5), also the size of the crop given to OCR. */
export const OCR_CROP = { width: 640, height: 200 };

/** The barcode reader gets the guide box at the camera's resolution, up to this width. */
export const BARCODE_MAX_WIDTH = 1280;

/**
 * The barcodes read (zxing-wasm format names): the counter pass prints
 * Code 39; Code 128 and QR codes are read too, in case a tracking number
 * is printed that way. Only text that is a tracking number counts.
 */
export const BARCODE_FORMATS = ['Code39', 'Code128', 'QRCode'] as const;

/**
 * Counts the numbers OCR reads until one has been read from AGREEMENT of
 * the latest AGREEMENT_WINDOW frames. Different numbers are counted apart,
 * so a misread on one frame waits until the right number has been read
 * twice.
 */
export class ReadingTally {
    private readings: (string | null)[] = [];

    /**
     * Count one frame's reading (null when the frame gave no number); true
     * once it has been read often enough.
     */
    add(reading: string | null): boolean {
        this.readings.push(reading);

        if (this.readings.length > AGREEMENT_WINDOW) {
            this.readings.shift();
        }

        return (
            reading !== null &&
            this.readings.filter((read) => read === reading).length >= AGREEMENT
        );
    }

    clear(): void {
        this.readings = [];
    }
}

export type Rect = { x: number; y: number; width: number; height: number };

/**
 * The part of the camera picture under the guide box, in the picture's own
 * pixels. The video fills its element with object-fit: cover, so the
 * picture is scaled to cover the element and centred, and its edges are
 * cut off on the longer side. Null until the picture has a size, or when
 * the box is off the picture.
 */
export function coverCrop(
    picture: { width: number; height: number },
    element: Rect,
    box: Rect,
): Rect | null {
    if (picture.width <= 0 || picture.height <= 0 || element.width <= 0) {
        return null;
    }

    const scale = Math.max(
        element.width / picture.width,
        element.height / picture.height,
    );
    const left = element.x + (element.width - picture.width * scale) / 2;
    const top = element.y + (element.height - picture.height * scale) / 2;

    const x = Math.max(0, (box.x - left) / scale);
    const y = Math.max(0, (box.y - top) / scale);
    const width =
        Math.min(picture.width, (box.x + box.width - left) / scale) - x;
    const height =
        Math.min(picture.height, (box.y + box.height - top) / scale) - y;

    if (width < 1 || height < 1) {
        return null;
    }

    return {
        x: Math.round(x),
        y: Math.round(y),
        width: Math.round(width),
        height: Math.round(height),
    };
}

/** A piece of text the OCR found, with its outline (corner points). */
export type ReadItem = { text: string; poly: number[][] };

/**
 * The OCR's pieces of text as lines, top to bottom, each read left to right.
 * A piece joins a line when its middle is within the line's height, so the
 * two halves of "KT-7Q4M 92XD" make one line while the label's other lines
 * stay apart.
 */
export function readLines(items: ReadItem[]): string {
    const boxes = items
        .filter((item) => item.poly.length > 0)
        .map((item) => {
            const xs = item.poly.map((point) => point[0]);
            const ys = item.poly.map((point) => point[1]);
            const top = Math.min(...ys);
            const bottom = Math.max(...ys);

            return {
                text: item.text,
                left: Math.min(...xs),
                top,
                bottom,
                middle: (top + bottom) / 2,
            };
        })
        .sort((a, b) => a.middle - b.middle);

    const lines: {
        top: number;
        bottom: number;
        boxes: typeof boxes;
    }[] = [];

    for (const box of boxes) {
        const line = lines.find(
            (candidate) =>
                box.middle >= candidate.top && box.middle <= candidate.bottom,
        );

        if (line) {
            line.boxes.push(box);
            line.top = Math.min(line.top, box.top);
            line.bottom = Math.max(line.bottom, box.bottom);
        } else {
            lines.push({ top: box.top, bottom: box.bottom, boxes: [box] });
        }
    }

    return lines
        .map((line) =>
            line.boxes
                .sort((a, b) => a.left - b.left)
                .map((box) => box.text)
                .join(' '),
        )
        .join('\n');
}

/** Why the camera could not be used. */
export type CameraProblem = 'denied' | 'missing' | 'busy' | 'unsupported';

/**
 * What a failed getUserMedia() means for the person scanning: they turned
 * the camera off for the site (or the page is not allowed to use it),
 * there is no camera, or another app holds it. Anything else counts as
 * busy, which suggests trying again.
 */
export function cameraProblem(error: unknown): CameraProblem {
    const name =
        typeof error === 'object' && error !== null && 'name' in error
            ? String(error.name)
            : '';

    switch (name) {
        case 'NotAllowedError':
        case 'SecurityError':
            return 'denied';
        case 'NotFoundError':
        case 'OverconstrainedError':
            return 'missing';
        case 'TypeError':
            return 'unsupported';
        default:
            return 'busy';
    }
}

/**
 * What a page did with a scanned number: opened it, or why not. `retry`
 * marks a failure worth trying again (no connection, a save that did not
 * go through), so the camera may read the same number again; any other
 * refusal ("No parcel matches", another parcel's label) is not tried
 * again until "Scan again".
 */
export type ScanOutcome =
    | { found: true }
    | { found: false; message: string; retry?: boolean };

/**
 * starting: asking for the camera; scanning: reading barcodes (and text,
 * once the hints show); confirm: OCR read a number, waiting for a tap;
 * opening: the page is looking the number up; typing: the typed entry,
 * with the camera off; blocked: no camera (see `problem`), only the typed
 * entry.
 */
export type ScannerPhase =
    | 'starting'
    | 'scanning'
    | 'confirm'
    | 'opening'
    | 'typing'
    | 'blocked';

export type ScanSource = 'barcode' | 'text' | 'typed';

/**
 * Where a scan stands and what can happen next, apart from the camera and
 * the readers: useTrackingScanner.ts tells it what the camera did and what
 * was read, and does what it says (open a number, show a reading). A
 * barcode opens at once; an OCR reading waits until two frames agree and
 * then for a tap; a number the page refused is not opened again until
 * "Scan again", unless the refusal said to retry, and then only after
 * RETRY_DELAY_MS.
 */
export class ScanFlow {
    phase: ScannerPhase = 'starting';
    /** Why there is no camera (the blocked phase). */
    problem: CameraProblem | null = null;
    /** The hints (closer, steady, light) show, and OCR runs. */
    hints = false;
    /** The number being opened, or the reading waiting for a tap. */
    number: string | null = null;
    source: ScanSource | null = null;
    /** As much of a number as OCR read, to start the typed entry with. */
    partial = '';
    /** Why the last number did not open; scanning goes on meanwhile. */
    notice: string | null = null;

    private tally = new ReadingTally();
    private refused = new Set<string>();
    /** Numbers to try again, and the time from which they are read again. */
    private retryAt = new Map<string, number>();

    /** The clock, in milliseconds (the checks pass their own). */
    private readonly now: () => number;

    constructor(now: () => number = Date.now) {
        this.now = now;
    }

    /** The scanner opened: a new scan, with the camera starting. */
    reset(): void {
        this.tally.clear();
        this.refused.clear();
        this.retryAt.clear();
        this.phase = 'starting';
        this.problem = null;
        this.hints = false;
        this.number = null;
        this.source = null;
        this.partial = '';
        this.notice = null;
    }

    /**
     * The camera is starting, or starting again (back from typing, "Try
     * the camera again", or the page shown again). A reading waiting for a
     * tap and a number being opened stay.
     */
    cameraStarting(): void {
        this.problem = null;

        if (this.phase !== 'confirm' && this.phase !== 'opening') {
            this.phase = 'starting';
        }
    }

    /** The camera's picture shows: scanning starts. */
    cameraOn(): void {
        if (this.phase === 'starting') {
            this.phase = 'scanning';
        }
    }

    /**
     * The camera could not start, or stopped: only the typed entry is
     * left. A number being opened still gets its answer first.
     */
    cameraFailed(problem: CameraProblem): void {
        this.problem = problem;
        this.tally.clear();

        if (this.phase !== 'opening') {
            this.phase = 'blocked';
            this.number = null;
            this.source = null;
        }
    }

    showHints(): void {
        this.hints = true;
    }

    /**
     * The tracking numbers in one frame's barcodes. The first one not
     * refused before is opened: it is returned for the page to look up.
     */
    barcodeRead(numbers: string[]): string | null {
        if (this.phase !== 'scanning') {
            return null;
        }

        const found = numbers.find((number) => !this.held(number));

        if (!found) {
            return null;
        }

        this.open(found, 'barcode');

        return found;
    }

    /**
     * One OCR'd frame: the tracking number read in it (or null) and as much
     * of one as was read. True when the frames agree on a number, which
     * then waits for a tap.
     */
    textRead(found: string | null, partial: string): boolean {
        if (this.phase !== 'scanning') {
            return false;
        }

        this.partial = partial || this.partial;
        const reading = found && !this.held(found) ? found : null;

        if (!this.tally.add(reading)) {
            return false;
        }

        this.number = reading;
        this.source = 'text';
        this.phase = 'confirm';

        return true;
    }

    /** The reading was checked: it is returned for the page to look up. */
    confirm(): string | null {
        const reading = this.phase === 'confirm' ? this.number : null;

        if (reading) {
            this.open(reading, 'text');
        }

        return reading;
    }

    /** A typed number, for the page to look up. */
    typed(number: string): void {
        this.open(number, 'typed');
    }

    /** A number not to open now: refused, or waiting to be tried again. */
    private held(number: string): boolean {
        return (
            this.refused.has(number) ||
            (this.retryAt.get(number) ?? 0) > this.now()
        );
    }

    private open(number: string, source: ScanSource): void {
        this.number = number;
        this.source = source;
        this.notice = null;
        this.phase = 'opening';
    }

    /**
     * The page's answer for the number being opened: true when it opened.
     * Otherwise its message shows and the scan goes on: typing again after
     * a typed number, scanning after a scanned one, or only the typed
     * entry when the camera has gone meanwhile.
     */
    settle(outcome: ScanOutcome): boolean {
        if (outcome.found) {
            return true;
        }

        if (this.number && outcome.retry) {
            this.retryAt.set(this.number, this.now() + RETRY_DELAY_MS);
        } else if (this.number) {
            this.refused.add(this.number);
        }

        const typed = this.source === 'typed';
        this.notice = outcome.message;
        this.number = null;
        this.source = null;
        this.tally.clear();
        this.phase = this.problem ? 'blocked' : typed ? 'typing' : 'scanning';

        return false;
    }

    /** Drop the reading and every refusal, and scan on. */
    scanAgain(): void {
        this.tally.clear();
        this.refused.clear();
        this.retryAt.clear();
        this.number = null;
        this.source = null;
        this.notice = null;

        if (this.phase === 'confirm') {
            this.phase = 'scanning';
        }
    }

    /**
     * Switch to the typed entry (the camera goes off). Returns what to
     * start it with: the reading waiting for a tap, or what OCR read.
     */
    typeInstead(): string {
        const start =
            this.phase === 'confirm' && this.number
                ? this.number
                : this.partial;
        this.tally.clear();
        this.number = null;
        this.source = null;
        this.notice = null;
        this.phase = 'typing';

        return start;
    }

    /** Back from the typed entry: the camera starts again. */
    backToCamera(): void {
        this.notice = null;
        this.cameraStarting();
    }

    /** Whether this step shows the camera's picture. */
    get usesCamera(): boolean {
        return (
            this.phase === 'starting' ||
            this.phase === 'scanning' ||
            this.phase === 'confirm' ||
            (this.phase === 'opening' && this.source !== 'typed')
        );
    }
}
