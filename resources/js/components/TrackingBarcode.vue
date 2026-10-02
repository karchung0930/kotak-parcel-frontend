<script setup lang="ts">
import { computed } from 'vue';
import { formatTrackingNumber } from '@/lib/format';

/**
 * A tracking number as a Code 39 barcode, so branch staff can scan it
 * straight into the counter search (a scanner "types" KT-XXXXXXXX and
 * presses Enter). Code 39 covers every character a tracking number uses:
 * digits, upper-case letters and the dash. Size it with width and height
 * classes (it stretches to fill them; keep it at least ~300px wide).
 */
const props = defineProps<{
    /** Any accepted form: "KT-7Q4M92XD", "KT7Q4M92XD"... */
    value: string;
}>();

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

const NARROW = 2;
const WIDE = 5;
const QUIET_ZONE = 10 * NARROW;
const HEIGHT = 60;

const text = computed(() => formatTrackingNumber(props.value));

const bars = computed(() => {
    const result: { x: number; width: number }[] = [];
    let x = QUIET_ZONE;
    const characters = `*${text.value}*`
        .split('')
        .filter((character) => PATTERNS[character]);

    characters.forEach((character, index) => {
        [...PATTERNS[character]].forEach((wide, element) => {
            const width = wide === '1' ? WIDE : NARROW;

            // Even elements are bars, odd ones are spaces.
            if (element % 2 === 0) {
                result.push({ x, width });
            }

            x += width;
        });

        // A narrow gap between characters.
        if (index < characters.length - 1) {
            x += NARROW;
        }
    });

    return { result, width: x + QUIET_ZONE };
});
</script>

<template>
    <svg
        :viewBox="`0 0 ${bars.width} ${HEIGHT}`"
        role="img"
        :aria-label="`Barcode for tracking number ${text}`"
        preserveAspectRatio="none"
        class="block"
    >
        <rect :width="bars.width" :height="HEIGHT" fill="#FFFFFF" />
        <rect
            v-for="(bar, index) in bars.result"
            :key="index"
            :x="bar.x"
            y="0"
            :width="bar.width"
            :height="HEIGHT"
            fill="#16181D"
        />
    </svg>
</template>
