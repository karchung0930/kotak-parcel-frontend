/**
 * The page's side of the barcode worker (barcode.worker.ts). The worker
 * starts the first time the scanner opens and stays for the rest of the
 * visit, so the next scan does not load ZXing again. If it does not load
 * (its files gone after a deploy, say), every read fails at once rather
 * than starting it again, until the scanner is opened again.
 */

export type BarcodeRequest = { id: number; image: ImageData };

/** The worker's messages: whether ZXing loaded, then a reply per image. */
export type BarcodeMessage =
    | { loaded: boolean }
    | { id: number; texts: string[]; failed?: boolean };

const FAILED = 'The barcode reader did not load.';

let worker: Worker | null = null;
let loading: Promise<void> | null = null;
let failed = false;
let nextId = 1;
const pending = new Map<
    number,
    { resolve: (texts: string[]) => void; reject: (error: Error) => void }
>();

/** The reader is gone: the reads waiting fail, and so does every new one. */
function fail(): void {
    failed = true;
    worker?.terminate();
    worker = null;

    for (const request of pending.values()) {
        request.reject(new Error(FAILED));
    }

    pending.clear();
}

/**
 * Start the reader when the scanner opens (or afresh, if it failed last
 * time). Resolves once ZXing is ready; rejects if it did not load.
 */
export function prepareBarcodeReader(): Promise<void> {
    if (loading && !failed) {
        return loading;
    }

    failed = false;
    const started = new Worker(
        new URL('./barcode.worker.ts', import.meta.url),
        {
            type: 'module',
        },
    );
    worker = started;

    loading = new Promise<void>((resolve, reject) => {
        started.onmessage = ({ data }: MessageEvent<BarcodeMessage>) => {
            if ('loaded' in data) {
                if (data.loaded) {
                    resolve();
                } else {
                    fail();
                    reject(new Error(FAILED));
                }

                return;
            }

            const request = pending.get(data.id);
            pending.delete(data.id);

            if (data.failed) {
                request?.reject(new Error(FAILED));
                fail();
            } else {
                request?.resolve(data.texts);
            }
        };

        // The worker's script did not load.
        started.onerror = () => {
            fail();
            reject(new Error(FAILED));
        };
    });

    return loading;
}

/**
 * The text of every barcode in an image (Code 39, Code 128 or QR). The
 * image's pixels move to the worker, so it is unusable afterwards.
 */
export function readBarcodeTexts(image: ImageData): Promise<string[]> {
    const reader = failed ? null : worker;

    if (!reader) {
        return Promise.reject(new Error(FAILED));
    }

    const id = nextId++;

    return new Promise((resolve, reject) => {
        pending.set(id, { resolve, reject });
        reader.postMessage({ id, image } satisfies BarcodeRequest, [
            image.data.buffer,
        ]);
    });
}
