<script setup lang="ts">
import ParcelArt from '@/components/brand/art/ParcelArt.vue';
import ParcelGround from '@/components/brand/art/ParcelGround.vue';

/**
 * One cardboard parcel (oblique view) sealed with Kotak tape, optionally
 * with a shipping label, standing on its ground shadow. Size it with
 * width classes. Decorative unless a `title` is given.
 */
withDefaults(
    defineProps<{
        /** vertical: seam tape over the top and down the front; band: a band around it. */
        tape?: 'vertical' | 'band' | 'none';
        label?: boolean;
        title?: string | null;
    }>(),
    {
        tape: 'vertical',
        label: true,
        title: null,
    },
);
</script>

<template>
    <svg
        viewBox="-6 -16 126 82"
        :role="title ? 'img' : undefined"
        :aria-hidden="title ? undefined : 'true'"
        focusable="false"
        class="block h-auto"
    >
        <title v-if="title">{{ title }}</title>
        <ParcelGround :x="0" :y="60" :width="80" :dx="24" :dy="14" />
        <ParcelArt :tape="tape" :label="label" :bare="!label" />
    </svg>
</template>
