<script setup lang="ts">
import type { Component } from 'vue';
import { STATUS_TONE_CLASSES } from '@/lib/status';
import type { StatusTone } from '@/lib/status';

/**
 * A status as icon + label in one of the status colour pairs, never colour
 * alone. StatusChip (orders) and RateCardPhaseChip (rate cards) map their
 * values onto it, so every chip in the app has one shape.
 */
withDefaults(
    defineProps<{
        icon: Component;
        label: string;
        tone: StatusTone;
        size?: 'sm' | 'md';
    }>(),
    { size: 'md' },
);
</script>

<template>
    <span
        :class="[
            'inline-flex max-w-full shrink-0 items-center gap-1.5 rounded-sm border font-bold whitespace-nowrap',
            STATUS_TONE_CLASSES[tone],
            size === 'sm'
                ? 'h-6 pr-2 pl-1.5 text-xs'
                : 'h-7 pr-2.5 pl-2 text-[13px]',
        ]"
    >
        <component
            :is="icon"
            aria-hidden="true"
            :class="[
                'flex-none',
                size === 'sm' ? 'size-[13px]' : 'size-[15px]',
            ]"
            :stroke-width="2.4"
        />
        <span class="truncate">{{ label }}</span>
    </span>
</template>
