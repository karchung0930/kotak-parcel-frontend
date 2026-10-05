/**
 * Code 39, the barcode printed on the counter pass (TrackingBarcode.vue).
 * It covers every character a tracking number uses: digits, upper-case
 * letters and the dash, so a USB scanner or the phone camera reads
 * "KT-7Q4M92XD" straight off it.
 *
 * This file has no imports, so `tests/js/barcode.check.ts` can draw the
 * same bars in Node and read them back with the scanner's decoder.
 */

/**
 * Each character is 9 elements (bar, space, bar... bar); 1 marks a wide
 * element. "*" is the start and stop character.
 */
const PATTERNS: Record<string, string> = {
    '0': '000110100',
    '1': '100100001',
    '2': '001100001',
    '3': '101100000',
    '4': '000110001',
    '5': '100110000',
    '6': '001110000',
    '7': '000100101',
    '8': '100100100',
    '9': '001100100',
    A: '100001001',
    B: '001001001',
    C: '101001000',
    D: '000011001',
    E: '100011000',
    F: '001011000',
    G: '000001101',
    H: '100001100',
    I: '001001100',
    J: '000011100',
    K: '100000011',
    L: '001000011',
    M: '101000010',
    N: '000010011',
    O: '100010010',
    P: '001010010',
    Q: '000000111',
    R: '100000110',
    S: '001000110',
    T: '000010110',
    U: '110000001',
    V: '011000001',
    W: '111000000',
    X: '010010001',
    Y: '110010000',
    Z: '011010000',
    '-': '010000101',
    '*': '010010100',
};

/** Element widths in units: narrow 2, wide 5 (a 2.5 ratio). */
const NARROW = 2;
const WIDE = 5;

/** The quiet zone on each side: ten narrow elements. */
const QUIET_ZONE = 10 * NARROW;

export type Code39Bars = {
    /** Each bar's left edge and width, in units from the left edge. */
    bars: { x: number; width: number }[];
    /** The whole symbol's width in units, quiet zones included. */
    width: number;
};

/**
 * The bars of `text` between the start and stop characters, with a narrow
 * gap between characters. Characters Code 39 cannot hold are left out.
 */
export function code39Bars(text: string): Code39Bars {
    const bars: { x: number; width: number }[] = [];
    let x = QUIET_ZONE;
    const characters = `*${text}*`
        .split('')
        .filter((character) => PATTERNS[character]);

    characters.forEach((character, index) => {
        PATTERNS[character].split('').forEach((wide, element) => {
            const width = wide === '1' ? WIDE : NARROW;

            // Even elements are bars, odd ones are spaces.
            if (element % 2 === 0) {
                bars.push({ x, width });
            }

            x += width;
        });

        // A narrow gap between characters.
        if (index < characters.length - 1) {
            x += NARROW;
        }
    });

    return { bars, width: x + QUIET_ZONE };
}
