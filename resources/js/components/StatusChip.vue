<script setup lang="ts">
import { computed } from 'vue';
import { STATUS_TONE_CLASSES, statusMeta } from '@/lib/status';
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
    <span
        :class="[
            'inline-flex max-w-full shrink-0 items-center gap-1.5 rounded-sm border font-bold whitespace-nowrap',
            STATUS_TONE_CLASSES[meta.tone],
            size === 'sm'
                ? 'h-6 pr-2 pl-1.5 text-xs'
                : 'h-7 pr-2.5 pl-2 text-[13px]',
        ]"
    >
        <component
            :is="meta.icon"
            aria-hidden="true"
            :class="size === 'sm' ? 'size-[13px]' : 'size-[15px]'"
            :stroke-width="2.4"
        />
        <span class="truncate">{{ meta.label }}</span>
    </span>
</template>
