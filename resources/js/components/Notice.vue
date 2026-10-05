<script setup lang="ts">
import { Info } from '@lucide/vue';
import type { Component } from 'vue';

/**
 * A quiet inline note with an icon, e.g. "Pay at the branch by cash or
 * card" or the tracking page's privacy note. Default slot: the text.
 * For messages that appear after an action, add aria-live on a wrapper.
 * `size="lg"` sets the text at body size, for a note that is the news on
 * its page, such as the stops before a parcel out for delivery.
 */
withDefaults(
    defineProps<{
        title?: string | null;
        /** A lucide icon; defaults to Info. */
        icon?: Component | null;
        tone?: 'neutral' | 'brand' | 'warning' | 'success';
        size?: 'default' | 'lg';
    }>(),
    {
        title: null,
        icon: null,
        tone: 'neutral',
        size: 'default',
    },
);

const toneClass = {
    neutral: 'bg-surface text-ink-2',
    brand: 'bg-brand-tint text-ink-2',
    warning: 'bg-status-failed-tint text-ink-2',
    success: 'bg-status-delivered-tint text-ink-2',
};

const iconClass = {
    neutral: 'text-brand',
    brand: 'text-brand-strong',
    warning: 'text-status-failed',
    success: 'text-status-delivered',
};

const sizeClass = {
    default: { text: 'text-[13px] leading-5', icon: 'mt-px size-[18px]' },
    lg: { text: 'text-[15px] leading-6', icon: 'mt-0.5 size-5' },
};
</script>

<template>
    <div
        :class="[
            'flex gap-3 rounded-xl px-4 py-3',
            sizeClass[size].text,
            toneClass[tone],
        ]"
    >
        <component
            :is="icon ?? Info"
            aria-hidden="true"
            :class="['flex-none', sizeClass[size].icon, iconClass[tone]]"
        />
        <div class="min-w-0">
            <p v-if="title" class="text-sm font-bold text-ink">{{ title }}</p>
            <div class="text-pretty" :class="title ? 'mt-0.5' : ''">
                <slot />
            </div>
        </div>
    </div>
</template>
