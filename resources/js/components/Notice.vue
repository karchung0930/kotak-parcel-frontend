<script setup lang="ts">
import { Info } from '@lucide/vue';
import type { Component } from 'vue';

/**
 * A quiet inline note with an icon, e.g. "Pay at the branch by cash or
 * card" or the tracking page's privacy note. Default slot: the text.
 * For messages that appear after an action, add aria-live on a wrapper.
 */
withDefaults(
    defineProps<{
        title?: string | null;
        /** A lucide icon; defaults to Info. */
        icon?: Component | null;
        tone?: 'neutral' | 'brand' | 'warning' | 'success';
    }>(),
    {
        title: null,
        icon: null,
        tone: 'neutral',
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
</script>

<template>
    <div
        :class="[
            'flex gap-3 rounded-xl px-4 py-3 text-[13px] leading-5',
            toneClass[tone],
        ]"
    >
        <component
            :is="icon ?? Info"
            aria-hidden="true"
            :class="['mt-px size-[18px] flex-none', iconClass[tone]]"
        />
        <div class="min-w-0">
            <p v-if="title" class="text-sm font-bold text-ink">{{ title }}</p>
            <div class="text-pretty" :class="title ? 'mt-0.5' : ''">
                <slot />
            </div>
        </div>
    </div>
</template>
