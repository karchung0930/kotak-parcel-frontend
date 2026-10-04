import type { PriceZone, RateImportStatusValue } from '@/types';

/**
 * Helpers for importing rate cards from spreadsheets: column letters, the
 * routes a sheet's columns can hold, the step an import is at and file
 * sizes. Columns count from 0 (A) and rows from 1, as in the server's
 * mapping. tests/js/rateImport.check.ts runs them on plain Node.
 */

/** A spreadsheet column's letter: 0 → A, 25 → Z, 26 → AA (as App\Support\RateSheets\Cells::column()). */
export function columnLetter(index: number): string {
    let letters = '';

    for (let n = index + 1; n > 0; n = Math.floor((n - 1) / 26)) {
        letters = String.fromCharCode(65 + ((n - 1) % 26)) + letters;
    }

    return letters;
}

/** The key of a route between two zone codes, as the selects use it. */
export function routeKey(origin: string, destination: string): string {
    return `${origin}>${destination}`;
}

/** The two zone codes of a route key; nulls for "not a route" (""). */
export function routeOf(key: string): {
    origin: string | null;
    destination: string | null;
} {
    const [origin, destination] = key.split('>');

    return origin && destination
        ? { origin, destination }
        : { origin: null, destination: null };
}

/**
 * Every route between the zones in the card's order (from the first zone
 * to each zone, then from the second…), labelled by the given function,
 * for a matrix column's select.
 */
export function routeOptions<Z extends Pick<PriceZone, 'code'>>(
    zones: Z[],
    label: (from: Z, to: Z) => string,
): { value: string; label: string }[] {
    return zones.flatMap((from) =>
        zones.map((to) => ({
            value: routeKey(from.code, to.code),
            label: label(from, to),
        })),
    );
}

export type ImportStep = 'upload' | 'columns' | 'rows' | 'draft';

/** The four steps of an import, as the page lists them. */
export const IMPORT_STEPS: { step: ImportStep; label: string }[] = [
    { step: 'upload', label: 'Upload' },
    { step: 'columns', label: 'Check columns' },
    { step: 'rows', label: 'Check rows' },
    { step: 'draft', label: 'Create draft' },
];

/**
 * The step an import is at. Once uploaded, it is at checking the columns,
 * while the file is read for them. A file that could not be read is back
 * at the upload; one whose rows have problems is at checking the rows; a
 * checked file waits for its draft, which is then done.
 */
export function importStep(
    status: RateImportStatusValue,
    hasLayout: boolean,
): ImportStep {
    switch (status) {
        case 'uploaded':
        case 'parsing':
        case 'needs_mapping':
            return 'columns';
        case 'failed':
            return hasLayout ? 'rows' : 'upload';
        case 'validating':
            return 'rows';
        default:
            return 'draft';
    }
}

/**
 * Why a chosen or dropped file cannot be uploaded, before it is sent: not
 * an .xlsx or .csv file, or over the size limit (in KB). The messages are
 * the server's, which checks again. Null when it can be sent.
 */
export function fileProblem(
    file: { name: string; size: number },
    maxKb: number,
): string | null {
    if (!/\.(xlsx|csv)$/i.test(file.name)) {
        return 'Choose an Excel (.xlsx) or CSV file. Older .xls files need saving as .xlsx first.';
    }

    return file.size > maxKb * 1024
        ? `The file is over ${formatFileSize(maxKb * 1024)}. Remove what is not prices, or split it.`
        : null;
}

/** A file size for people: 820 B, 14 KB, 1.2 MB, 5 MB. */
export function formatFileSize(bytes: number): string {
    if (bytes < 1024) {
        return `${bytes} B`;
    }

    if (bytes < 1024 * 1024) {
        return `${Math.round(bytes / 1024)} KB`;
    }

    return `${(bytes / (1024 * 1024)).toFixed(1).replace(/\.0$/, '')} MB`;
}
