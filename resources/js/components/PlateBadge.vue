<script setup lang="ts">
/**
 * A van's number plate as a light mono chip: "WXY 4821". Ink on surface
 * grey like the branch codes, with a border so it still reads as a plate.
 * It has the height, corners and text size of the chips it sits beside
 * (StatusChip size="sm", ActiveStatus, the role chips), so a row of them
 * lines up.
 */
defineProps<{ plate: string }>();
</script>

<template>
    <span
        class="inline-flex h-6 items-center rounded-sm border border-line-strong bg-surface px-2 font-mono text-xs font-bold whitespace-nowrap text-ink"
    >
        <span class="sr-only">Vehicle plate </span>{{ plate }}
    </span>
</template>
