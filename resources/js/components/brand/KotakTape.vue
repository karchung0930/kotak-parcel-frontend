<script setup lang="ts">
import { computed } from 'vue';
import KotakMark from '@/components/brand/KotakMark.vue';

/**
 * Kotak packaging tape: a level red band printed with the white box mark
 * and "KOTAK", repeated to the edge. Purely decorative (aria-hidden).
 *
 * Always horizontal. To lay it across the seam between two sections (the
 * hero's bottom edge, a divider), put it between them with `overlap`: it
 * pulls itself up and down by half its height and sits above both.
 */
const props = withDefaults(
    defineProps<{
        /** Band height in px: 60 hero, 40-44 dividers, 32-34 card headers. */
        height?: number;
        /** How many "box + KOTAK" repeats to print; the band clips the rest. */
        repeat?: number;
        /** Straddle the boundary between the elements before and after it. */
        overlap?: boolean;
        /** The drop shadow under the band (off for card headers). */
        shadow?: boolean;
    }>(),
    {
        height: 44,
        repeat: 24,
        overlap: false,
        shadow: true,
    },
);

const style = computed(() => {
    const h = props.height;

    return {
        height: `${h}px`,
        gap: `${Math.round(h * 0.72)}px`,
        paddingLeft: `${Math.round(h * 0.4)}px`,
        fontSize: `${Math.max(10, Math.round(h * 0.35))}px`,
        marginBlock: props.overlap ? `-${h / 2}px` : undefined,
    };
});

const markSize = computed(() => `${Math.round(props.height * 0.4)}px`);
const itemGap = computed(() => `${Math.round(props.height * 0.27)}px`);
</script>

<template>
    <div
        aria-hidden="true"
        class="pointer-events-none relative flex w-full min-w-0 items-center overflow-hidden bg-brand font-extrabold tracking-tape whitespace-nowrap text-white [contain:inline-size] select-none"
        :class="[
            shadow
                ? 'shadow-tape'
                : 'shadow-[inset_0_2px_0_rgb(255_255_255/0.16),inset_0_-2px_0_rgb(0_0_0/0.12)]',
            overlap ? 'z-10' : '',
        ]"
        :style="style"
    >
        <span
            v-for="index in repeat"
            :key="index"
            class="inline-flex flex-none items-center"
            :style="{ gap: itemGap }"
        >
            <KotakMark :style="{ width: markSize, height: markSize }" />
            KOTAK
        </span>
    </div>
</template>
