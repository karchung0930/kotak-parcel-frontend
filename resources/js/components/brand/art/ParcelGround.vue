<script setup lang="ts">
import { computed } from 'vue';

/**
 * What a parcel stands on, as an SVG group: a soft floor shadow reaching
 * past the side face and a darker contact shadow along the bottom edges,
 * so the parcel's back-bottom-right corner visibly rests on something.
 * Draw it before the parcel.
 *
 * Give it the parcel's footprint: the front-bottom-left corner (x, y), the
 * front width, and the oblique depth (dx across for dy up; ParcelArt is
 * 24 for 14). Both shadows are that footprint grown outwards along the
 * same angles, a little more to the right than to the left.
 */
const props = withDefaults(
    defineProps<{
        x: number;
        y: number;
        width: number;
        dx: number;
        dy: number;
        /** Scales the margins, for pictures drawn in larger units. */
        size?: number;
        /** On a dark background the floor is a lighter patch instead. */
        surface?: 'light' | 'dark';
        /** Only the contact shadow: a parcel stacked on another one. */
        contactOnly?: boolean;
    }>(),
    {
        size: 1,
        surface: 'light',
        contactOnly: false,
    },
);

type Margins = { left: number; front: number; right: number; back: number };

const round = (value: number): number => Math.round(value * 100) / 100;

/** The footprint grown by the margins (in the picture's units, before `size`). */
function grown(margins: Margins): string {
    const { x, y, width, dx, dy, size } = props;
    const left = margins.left * size;
    const front = margins.front * size;
    const right = margins.right * size;
    const back = margins.back * size;
    const along = (dx * (dy + back + front)) / dy;
    const bottom = round(y + front);
    const top = round(y - dy - back);

    return [
        `M${round(x - left)} ${bottom}`,
        `H${round(x + width + right)}`,
        `L${round(x + width + right + along)} ${top}`,
        `H${round(x - left + along)}Z`,
    ].join('');
}

const floor = computed(() => grown({ left: 3, front: 3, right: 6, back: 1 }));

const contact = computed(() =>
    grown({ left: 1, front: 1.5, right: 1.5, back: 0 }),
);

const dark = computed(() => props.surface === 'dark');
</script>

<template>
    <g>
        <!-- rounded corners: a stroke in the fill colour, faded as one -->
        <path
            v-if="!contactOnly"
            :d="floor"
            :fill="dark ? '#FFFFFF' : '#16181D'"
            :stroke="dark ? '#FFFFFF' : '#16181D'"
            :stroke-width="3 * size"
            stroke-linejoin="round"
            opacity="0.1"
        />
        <path
            :d="contact"
            :fill="dark ? '#000000' : '#16181D'"
            :opacity="dark ? 0.3 : 0.16"
        />
    </g>
</template>
