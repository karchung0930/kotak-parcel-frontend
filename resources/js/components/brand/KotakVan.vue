<script setup lang="ts">
import ParcelStackArt from '@/components/brand/art/ParcelStackArt.vue';
import VanArt from '@/components/brand/art/VanArt.vue';

/**
 * The red Kotak delivery van, side view. With `parcels` it becomes the
 * hero illustration: the van with the stack of taped, labelled parcels in
 * front of its rear doors.
 *
 * Size it with width classes (it keeps its aspect ratio). Pass `title` when
 * the picture carries meaning; without one it is decorative (aria-hidden).
 */
withDefaults(
    defineProps<{
        parcels?: boolean;
        /** Drop the small lettering for small sizes (under ~240px wide). */
        compact?: boolean;
        title?: string | null;
    }>(),
    {
        parcels: false,
        compact: false,
        title: null,
    },
);
</script>

<template>
    <svg
        :viewBox="parcels ? '40 230 672 326' : '140 226 570 330'"
        :role="title ? 'img' : undefined"
        :aria-hidden="title ? undefined : 'true'"
        focusable="false"
        class="block h-auto"
    >
        <title v-if="title">{{ title }}</title>
        <ellipse
            :cx="parcels ? 400 : 424"
            cy="544"
            :rx="parcels ? 300 : 272"
            ry="8"
            fill="#16181D"
            opacity="0.1"
        />
        <VanArt :compact="compact" />
        <ParcelStackArt v-if="parcels" />
    </svg>
</template>
