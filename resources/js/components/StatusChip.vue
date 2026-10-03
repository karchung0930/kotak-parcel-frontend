<script setup lang="ts">
import { computed } from 'vue';
import ToneChip from '@/components/ToneChip.vue';
import { statusMeta } from '@/lib/status';
import type { Option, OrderStatusValue } from '@/types';

/**
 * An order status as icon + label in its colour pair, e.g. a blue receipt
 * "Paid" or an amber warning "Delivery Failed". Pass the { value, label }
 * option from the server (its label wins) or a bare status value.
 */
const props = withDefaults(
    defineProps<{
        status: OrderStatusValue | Option<OrderStatusValue>;
        size?: 'sm' | 'md';
    }>(),
    { size: 'md' },
);

const meta = computed(() => statusMeta(props.status));
</script>

<template>
    <ToneChip
        :icon="meta.icon"
        :label="meta.label"
        :tone="meta.tone"
        :size="size"
    />
</template>
