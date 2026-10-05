import { prepareZXingModule, readBarcodes } from 'zxing-wasm/reader';
import type { ReaderOptions } from 'zxing-wasm/reader';
import wasmUrl from 'zxing-wasm/reader/zxing_reader.wasm?url';
import { BARCODE_FORMATS } from '@/lib/scan';
import type { BarcodeMessage, BarcodeRequest } from './barcode';

/*
 * Reads barcodes off crops of the camera's guide box with ZXing-C++
 * (zxing-wasm, reader build), away from the page's thread so the camera
 * view stays smooth. The .wasm comes from this site's build, never a CDN.
 */
prepareZXingModule({
    overrides: {
        locateFile: (path: string, prefix: string) =>
            path.endsWith('.wasm') ? wasmUrl : prefix + path,
    },
    fireImmediately: true,
}).then(
    () => self.postMessage({ loaded: true } satisfies BarcodeMessage),
    () => self.postMessage({ loaded: false } satisfies BarcodeMessage),
);

/** The page keeps only text that is a tracking number. */
const OPTIONS: ReaderOptions = {
    formats: [...BARCODE_FORMATS],
    tryHarder: true,
    maxNumberOfSymbols: 4,
};

self.onmessage = async ({ data }: MessageEvent<BarcodeRequest>) => {
    let reply: BarcodeMessage;

    try {
        const results = await readBarcodes(data.image, OPTIONS);
        reply = { id: data.id, texts: results.map((result) => result.text) };
    } catch {
        reply = { id: data.id, texts: [], failed: true };
    }

    self.postMessage(reply);
};
