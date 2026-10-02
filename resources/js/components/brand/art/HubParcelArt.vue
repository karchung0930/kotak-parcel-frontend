<script setup lang="ts">
import { computed } from 'vue';
import { boxFaces, worldPath } from '@/components/brand/art/hubPerspective';

/**
 * A taped Kotak parcel in WarehouseScene's perspective (see
 * hubPerspective): a kraft box standing on y0 with its front face at
 * depth z0, red tape along the top and down the front, and a white label.
 * Its whole bottom rests on whatever it stands on, so give it a surface
 * at least as deep as the box. Always decorative.
 */
const props = withDefaults(
    defineProps<{
        /** Left edge, bottom and nearest face, in metres. */
        x: number;
        y: number;
        z: number;
        width?: number;
        height?: number;
        depth?: number;
        /** Print the label (off when the box is too small to read). */
        label?: boolean;
    }>(),
    {
        width: 0.46,
        height: 0.32,
        depth: 0.38,
        label: true,
    },
);

const faces = computed(() => {
    const { x, y, z, width, height, depth } = props;
    const box = boxFaces(x, x + width, y, y + height, z, z + depth);
    const mid = x + width / 2;
    const tape = width * 0.09;
    const top = y + height;

    return {
        ...box,
        tapeTop: worldPath([
            [mid - tape, top, z],
            [mid - tape, top, z + depth],
            [mid + tape, top, z + depth],
            [mid + tape, top, z],
        ]),
        tapeFront: worldPath([
            [mid - tape, top, z],
            [mid - tape, top - height * 0.34, z],
            [mid + tape, top - height * 0.34, z],
            [mid + tape, top, z],
        ]),
        label: worldPath([
            [x + width * 0.62, y + height * 0.12, z],
            [x + width * 0.62, y + height * 0.5, z],
            [x + width * 0.9, y + height * 0.5, z],
            [x + width * 0.9, y + height * 0.12, z],
        ]),
    };
});
</script>

<template>
    <g>
        <path v-if="faces.side" :d="faces.side" fill="#B98046" />
        <path v-if="faces.top" :d="faces.top" fill="#E7B97F" />
        <path :d="faces.front" fill="#D4995A" />
        <path v-if="faces.top" :d="faces.tapeTop" fill="#E4474D" />
        <path :d="faces.tapeFront" fill="#D0161E" />
        <path v-if="label" :d="faces.label" fill="#FFFFFF" />
    </g>
</template>
