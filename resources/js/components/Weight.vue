<script setup lang="ts">
import { computed } from 'vue';
import { formatWeight } from '@/lib/format';

/** A weight in grams shown in kilograms: 6000 → "6.0 kg". */
const props = withDefaults(
    defineProps<{
        grams: number | null | undefined;
        mono?: boolean;
    }>(),
    { mono: false },
);

const text = computed(() => formatWeight(props.grams));
</script>

<template>
    <span :class="['whitespace-nowrap tabular-nums', { 'font-mono': mono }]">{{
        text
    }}</span>
</template>
