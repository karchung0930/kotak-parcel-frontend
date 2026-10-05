import type { Ref } from 'vue';
import { onBeforeUnmount, ref, shallowReactive, shallowRef, toRefs } from 'vue';
import {
    formatTrackingNumber,
    normalizeTrackingNumber,
    readPartialTrackingNumber,
    readTrackingNumber,
} from '@/lib/format';
import {
    BARCODE_INTERVAL_MS,
    BARCODE_MAX_WIDTH,
    HINT_DELAY_MS,
    OCR_CROP,
    ScanFlow,
    cameraProblem,
    coverCrop,
} from '@/lib/scan';
import type { Rect, ScanOutcome } from '@/lib/scan';
import { prepareBarcodeReader, readBarcodeTexts } from '@/lib/scanner/barcode';
import { signalFound, unlockSound } from '@/lib/scanner/sound';
import { prepareTextReader, readText } from '@/lib/scanner/text';

export type { ScanOutcome, ScannerPhase } from '@/lib/scan';

type Options = {
    video: Readonly<Ref<HTMLVideoElement | null>>;
    /** The guide box drawn over the video. */
    box: Readonly<Ref<HTMLElement | null>>;
    /** Look the number up and open it (the page's job). */
    resolve: (number: string) => Promise<ScanOutcome>;
    /** The number opened: the scanner can close. */
    onFound: () => void;
};

type ReaderState = 'loading' | 'ready' | 'failed';

/**
 * The camera scanner's moving parts: the rear camera, a barcode read of the
 * guide box about 10 times a second (zxing-wasm, in a worker), and after a
 * few seconds without one, OCR of the same box (PaddleOCR.js, in its own
 * worker) until two frames agree on a number. Both readers start loading
 * as soon as the scanner opens. The steps themselves (what opens, what
 * waits for a tap, what is refused) are ScanFlow's, in lib/scan.ts.
 *
 * The camera is on only while its picture is used: it goes off for the
 * typed entry, while the page is hidden and when the scanner closes.
 */
export function useTrackingScanner({ video, box, resolve, onFound }: Options) {
    const flow = shallowReactive(new ScanFlow());
    const { phase, problem, hints, number, source, notice } = toRefs(flow);
    const barcodeReader = ref<ReaderState>('loading');
    const textReader = ref<ReaderState>('loading');
    const torchAvailable = ref(false);
    const torchOn = ref(false);

    const stream = shallowRef<MediaStream | null>(null);
    const canvas = document.createElement('canvas');
    const textCanvas = document.createElement('canvas');
    textCanvas.width = OCR_CROP.width;
    textCanvas.height = OCR_CROP.height;

    /** One per opening of the scanner: a page's late answer is dropped. */
    let session = 0;
    /** One per start of the camera: the reading loops of an older one stop. */
    let run = 0;
    /** The run whose OCR loop is going, so a run never has two. */
    let textRun = 0;
    /** The camera went off because the page was hidden. */
    let resumeWhenShown = false;
    let barcodeTimer: ReturnType<typeof setTimeout> | undefined;
    let hintTimer: ReturnType<typeof setTimeout> | undefined;
    let textTimer: ReturnType<typeof setTimeout> | undefined;

    /** The guide box's part of the current camera frame, or null. */
    function cropRect(): Rect | null {
        const element = video.value;
        const guide = box.value;

        if (!element || !guide || element.readyState < 2) {
            return null;
        }

        return coverCrop(
            { width: element.videoWidth, height: element.videoHeight },
            element.getBoundingClientRect(),
            guide.getBoundingClientRect(),
        );
    }

    function barcodeImage(): ImageData | null {
        const crop = cropRect();
        const context = canvas.getContext('2d', { willReadFrequently: true });

        if (!crop || !context || !video.value) {
            return null;
        }

        const scale = Math.min(1, BARCODE_MAX_WIDTH / crop.width);
        canvas.width = Math.round(crop.width * scale);
        canvas.height = Math.round(crop.height * scale);
        context.drawImage(
            video.value,
            crop.x,
            crop.y,
            crop.width,
            crop.height,
            0,
            0,
            canvas.width,
            canvas.height,
        );

        return context.getImageData(0, 0, canvas.width, canvas.height);
    }

    /** Draw the guide box's crop for OCR; false when there is no picture. */
    function drawTextCrop(): boolean {
        const crop = cropRect();
        const context = textCanvas.getContext('2d');

        if (!crop || !context || !video.value) {
            return false;
        }

        context.drawImage(
            video.value,
            crop.x,
            crop.y,
            crop.width,
            crop.height,
            0,
            0,
            OCR_CROP.width,
            OCR_CROP.height,
        );

        return true;
    }

    /** Ask the page to open a number, and carry on with its answer. */
    async function lookUp(found: string): Promise<void> {
        const current = session;
        const fromBarcode = flow.source === 'barcode';
        let outcome: ScanOutcome;

        try {
            outcome = await resolve(found);
        } catch {
            outcome = {
                found: false,
                message: `Could not open ${found}. Check your connection and try again.`,
                retry: true,
            };
        }

        if (outcome.found) {
            // Only now: a label the page refuses must not sound like a
            // success. The page may have moved on (and closed the scanner)
            // already.
            if (fromBarcode) {
                signalFound();
            }

            if (current === session) {
                onFound();
            }

            return;
        }

        if (current === session) {
            flow.settle(outcome);
        }
    }

    function scheduleBarcode(current: number, delay = BARCODE_INTERVAL_MS) {
        barcodeTimer = setTimeout(() => void readBarcode(current), delay);
    }

    async function readBarcode(current: number): Promise<void> {
        if (current !== run || barcodeReader.value === 'failed') {
            return;
        }

        const image = flow.phase === 'scanning' ? barcodeImage() : null;

        if (!image) {
            scheduleBarcode(current);

            return;
        }

        const started = performance.now();
        let texts: string[];

        try {
            texts = await readBarcodeTexts(image);
        } catch {
            barcodeFailed();

            return;
        }

        if (current !== run) {
            return;
        }

        const found = flow.barcodeRead(
            texts
                .map((text) => normalizeTrackingNumber(text))
                .filter((normalized) => normalized !== null)
                .map((normalized) => formatTrackingNumber(normalized)),
        );

        if (found) {
            void lookUp(found);
        }

        // About 10 reads a second, fewer when a read takes longer.
        scheduleBarcode(
            current,
            Math.max(0, BARCODE_INTERVAL_MS - (performance.now() - started)),
        );
    }

    /** OCR the guide box frame after frame, while this camera run lasts. */
    function startReadingText(current: number): void {
        if (current === run && textRun !== current) {
            textRun = current;
            void readFrameText(current);
        }
    }

    async function readFrameText(current: number): Promise<void> {
        if (current !== run) {
            return;
        }

        const ready =
            flow.phase === 'scanning' &&
            textReader.value === 'ready' &&
            drawTextCrop();

        if (!ready) {
            textTimer = setTimeout(() => void readFrameText(current), 200);

            return;
        }

        let text: string;

        try {
            text = await readText(textCanvas);
        } catch {
            if (current === run) {
                textTimer = setTimeout(() => void readFrameText(current), 500);
            }

            return;
        }

        if (current !== run) {
            return;
        }

        flow.textRead(
            readTrackingNumber(text),
            readPartialTrackingNumber(text),
        );

        // The next frame as soon as this one is read.
        textTimer = setTimeout(() => void readFrameText(current), 0);
    }

    /** Hints and OCR: after HINT_DELAY_MS, or now if they showed before. */
    function startHints(current: number): void {
        if (flow.hints || barcodeReader.value === 'failed') {
            flow.showHints();
            startReadingText(current);

            return;
        }

        hintTimer = setTimeout(() => {
            if (current === run) {
                flow.showHints();
                startReadingText(current);
            }
        }, HINT_DELAY_MS);
    }

    /**
     * The barcode reader did not load: no more barcode reads, and as no
     * barcode can be found, the printed number is read straight away.
     */
    function barcodeFailed(): void {
        barcodeReader.value = 'failed';
        clearTimeout(barcodeTimer);

        if (stream.value && !flow.hints) {
            clearTimeout(hintTimer);
            flow.showHints();
            startReadingText(run);
        }
    }

    function clearTimers(): void {
        clearTimeout(barcodeTimer);
        clearTimeout(hintTimer);
        clearTimeout(textTimer);
    }

    function releaseCamera(): void {
        for (const track of stream.value?.getTracks() ?? []) {
            track.stop();
        }

        stream.value = null;
        torchAvailable.value = false;
        torchOn.value = false;

        if (video.value) {
            video.value.srcObject = null;
        }
    }

    /** Turn the camera off and stop the reading loops. */
    function stopCamera(): void {
        run++;
        clearTimers();
        releaseCamera();
    }

    /** Turn the rear camera on and start reading what it shows. */
    async function startCamera(): Promise<void> {
        stopCamera();
        const current = run;
        flow.cameraStarting();

        if (!navigator.mediaDevices?.getUserMedia) {
            flow.cameraFailed('unsupported');

            return;
        }

        let started: MediaStream;

        try {
            started = await navigator.mediaDevices.getUserMedia({
                audio: false,
                video: {
                    facingMode: { ideal: 'environment' },
                    width: { ideal: 1920 },
                    height: { ideal: 1080 },
                },
            });
        } catch (error) {
            if (current === run) {
                flow.cameraFailed(cameraProblem(error));
            }

            return;
        }

        if (current !== run) {
            started.getTracks().forEach((track) => track.stop());

            return;
        }

        stream.value = started;
        const track = started.getVideoTracks()[0];
        const capabilities = track?.getCapabilities?.() as
            | (MediaTrackCapabilities & { torch?: boolean })
            | undefined;
        torchAvailable.value = capabilities?.torch === true;

        // The camera was taken away (another app, or the system): only
        // the typed entry is left, with a way to try again.
        track?.addEventListener('ended', () => {
            if (current === run) {
                stopCamera();
                flow.cameraFailed('busy');
            }
        });

        if (video.value) {
            video.value.srcObject = started;
            await video.value.play().catch(() => undefined);
        }

        if (current !== run) {
            return;
        }

        flow.cameraOn();

        if (barcodeReader.value !== 'failed') {
            scheduleBarcode(current, 0);
        }

        startHints(current);
    }

    // A hidden page keeps no camera on; it starts again when shown.
    function onVisibilityChange(): void {
        if (document.hidden) {
            if (flow.usesCamera) {
                resumeWhenShown = true;
                stopCamera();
            }
        } else if (resumeWhenShown) {
            resumeWhenShown = false;

            if (flow.usesCamera) {
                void startCamera();
            }
        }
    }

    /** Begin scanning: the camera and both readers. */
    function start(): void {
        session++;
        const current = session;
        flow.reset();
        resumeWhenShown = false;

        barcodeReader.value = 'loading';
        prepareBarcodeReader().then(
            () => current === session && (barcodeReader.value = 'ready'),
            () => current === session && barcodeFailed(),
        );
        textReader.value = 'loading';
        prepareTextReader().then(
            () => current === session && (textReader.value = 'ready'),
            () => current === session && (textReader.value = 'failed'),
        );

        document.addEventListener('visibilitychange', onVisibilityChange);
        void startCamera();
    }

    /** Stop everything (the scanner closed). The readers stay loaded. */
    function stop(): void {
        session++;
        stopCamera();
        document.removeEventListener('visibilitychange', onVisibilityChange);
    }

    async function toggleTorch(): Promise<void> {
        const track = stream.value?.getVideoTracks()[0];

        if (!track) {
            return;
        }

        const on = !torchOn.value;

        // Not in the DOM types yet: the flash on phones that have one.
        const torch: MediaTrackConstraintSet & { torch: boolean } = {
            torch: on,
        };

        try {
            await track.applyConstraints({ advanced: [torch] });
            torchOn.value = on;
        } catch {
            torchAvailable.value = false;
        }
    }

    /** Open the number OCR read (the person checked it). */
    function confirm(): void {
        const reading = flow.confirm();

        if (reading) {
            void lookUp(reading);
        }
    }

    /** Drop the reading and scan on, forgetting what was refused before. */
    function scanAgain(): void {
        flow.scanAgain();
    }

    /** The typed entry, started with what OCR read. The camera goes off. */
    function typeInstead(): string {
        stopCamera();

        return flow.typeInstead();
    }

    function backToCamera(): void {
        flow.backToCamera();
        void startCamera();
    }

    /** "Try the camera again" after it was refused or busy. */
    function retryCamera(): void {
        void startCamera();
    }

    function submitTyped(typed: string): void {
        flow.typed(typed);
        void lookUp(typed);
    }

    onBeforeUnmount(stop);

    return {
        phase,
        problem,
        hints,
        barcodeReader,
        textReader,
        number,
        source,
        notice,
        torchAvailable,
        torchOn,
        start,
        stop,
        unlockSound,
        toggleTorch,
        confirm,
        scanAgain,
        typeInstead,
        backToCamera,
        retryCamera,
        submitTyped,
    };
}
