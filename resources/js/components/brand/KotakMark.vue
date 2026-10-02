<script setup lang="ts">
/**
 * The Kotak box mark on its own (no tile): a white isometric box with
 * seams in the stroke colour. Used on the tape, the van and red surfaces.
 * Always decorative.
 */
withDefaults(
    defineProps<{
        /** Box colour. */
        fill?: string;
        /** Seam colour (usually the surface the mark sits on). */
        stroke?: string;
    }>(),
    {
        fill: '#FFFFFF',
        stroke: '#D0161E',
    },
);
</script>

<template>
    <svg viewBox="0 0 32 32" aria-hidden="true" focusable="false">
        <path
            d="M16 5.5 26.5 10.75v10.5L16 26.5 5.5 21.25v-10.5Z"
            :fill="fill"
        />
        <path
            d="M5.5 10.75 16 16l10.5-5.25M16 16v10.5"
            fill="none"
            :stroke="stroke"
            stroke-width="2.2"
            stroke-linejoin="round"
        />
    </svg>
</template>
