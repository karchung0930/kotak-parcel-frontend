<script setup lang="ts">
import ParcelStackArt from '@/components/brand/art/ParcelStackArt.vue';

/**
 * Three taped Kotak parcels with shipping labels, stacked on their
 * ground. Size it with width classes; on a dark background pass
 * `surface="dark"` so the ground still shows. Pass `title` when it carries
 * meaning; otherwise it is decorative (aria-hidden).
 */
withDefaults(
    defineProps<{
        surface?: 'light' | 'dark';
        title?: string | null;
    }>(),
    { surface: 'light', title: null },
);
</script>

<template>
    <svg
        viewBox="40 250 212 302"
        :role="title ? 'img' : undefined"
        :aria-hidden="title ? undefined : 'true'"
        focusable="false"
        class="block h-auto"
    >
        <title v-if="title">{{ title }}</title>
        <ParcelStackArt :surface="surface" />
    </svg>
</template>
