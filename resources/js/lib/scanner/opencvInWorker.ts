/**
 * Stands in for OpenCV.js on the page (vite.config.ts points the
 * `@techstark/opencv-js` import here).
 *
 * PaddleOCR.js's main entry imports OpenCV.js for the pipeline it can run
 * on the page itself. The scanner runs it in PaddleOCR.js's worker
 * (lib/scanner/text.ts), whose prebuilt script carries its own OpenCV.js,
 * so the page's copy is never used: leaving it out saves a 10 MB download
 * and the work of starting it. Anything that reaches for it fails loudly.
 */
const opencv: object = new Proxy(
    {},
    {
        get(_target, property) {
            // Not a promise: `await` and `instanceof Promise` see a plain object.
            if (property === 'then') {
                return undefined;
            }

            throw new Error(
                'OpenCV.js runs only inside the OCR worker (worker: true).',
            );
        },
    },
);

export default opencv;
