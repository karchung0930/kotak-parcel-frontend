<script setup lang="ts">
import { computed } from 'vue';
import { formatMoney } from '@/lib/format';

/** An amount in sen shown as ringgit: 1800 → "RM 18.00" (tabular figures). */
const props = withDefaults(
    defineProps<{
        sen: number | null | undefined;
        /** JetBrains Mono, for amounts in tables. */
        mono?: boolean;
    }>(),
    { mono: false },
);

const text = computed(() => formatMoney(props.sen));
</script>

<template>
    <span :class="['whitespace-nowrap tabular-nums', { 'font-mono': mono }]">{{
        text
    }}</span>
</template>
