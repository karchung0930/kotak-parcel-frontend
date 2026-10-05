import type { PaddleOCR } from '@paddleocr/paddleocr-js';
import ortWasmUrl from 'onnxruntime-web/ort-wasm-simd-threaded.jsep.wasm?url';
import detectionModelUrl from '../../../models/PP-OCRv6_tiny_det_onnx_infer.tar?url';
import recognitionModelUrl from '../../../models/PP-OCRv6_tiny_rec_onnx_infer.tar?url';
import { readLines } from '@/lib/scan';

/**
 * Reads the printed tracking number when there is no barcode to read:
 * PaddleOCR.js with the PP-OCRv6 tiny detection and recognition models,
 * run by ONNX Runtime's WebAssembly backend in PaddleOCR.js's own worker,
 * so the page stays smooth.
 *
 * Everything is served from this site's build with a hashed name: the
 * model archives (resources/models) and the ONNX Runtime .wasm that the
 * worker's runtime expects (onnxruntime-web is pinned to the version
 * PaddleOCR.js's worker is built with). Nothing is fetched from a CDN.
 * The SDK is imported only here, when the scanner opens, and the instance
 * stays for the rest of the visit.
 */
type TextReader = Awaited<ReturnType<typeof PaddleOCR.create>>;

let reader: Promise<TextReader> | null = null;

/** Start loading the models (when the scanner opens); resolves once ready. */
export function prepareTextReader(): Promise<TextReader> {
    reader ??= import('@paddleocr/paddleocr-js')
        .then(({ PaddleOCR }) =>
            PaddleOCR.create({
                textDetectionModelName: 'PP-OCRv6_tiny_det',
                textDetectionModelAsset: { url: detectionModelUrl },
                textRecognitionModelName: 'PP-OCRv6_tiny_rec',
                textRecognitionModelAsset: { url: recognitionModelUrl },
                worker: true,
                ortOptions: {
                    backend: 'wasm',
                    // ONNX Runtime also takes the .wasm file itself, which
                    // has a hashed name here. The SDK's type lists only a
                    // folder, but it hands the value to the runtime as is.
                    wasmPaths: {
                        wasm: new URL(ortWasmUrl, location.href).href,
                    } as unknown as string,
                },
            }),
        )
        .catch((error: unknown) => {
            // A failed download is tried again the next time the scanner opens.
            reader = null;

            throw error;
        });

    return reader;
}

/**
 * The text on a canvas, line by line (see readLines). The SDK copies the
 * canvas into a bitmap that moves to its worker, so the canvas can be drawn
 * on again as soon as this resolves.
 */
export async function readText(canvas: HTMLCanvasElement): Promise<string> {
    const ocr = await prepareTextReader();
    const [result] = await ocr.predict(canvas);

    return readLines(result?.items ?? []);
}
