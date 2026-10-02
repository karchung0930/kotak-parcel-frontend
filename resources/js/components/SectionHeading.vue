<script setup lang="ts">
import type { Component } from 'vue';

/**
 * A section title for marketing-style pages: a small red eyebrow (with an
 * optional icon), a big ExtraBold heading and an optional intro. Give it
 * an `id` and point the section's aria-labelledby at it.
 *
 * Slot: actions (e.g. a "Start an order" link, right-aligned on desktop).
 */
withDefaults(
    defineProps<{
        title: string;
        eyebrow?: string | null;
        icon?: Component | null;
        description?: string | null;
        id?: string;
        as?: 'h2' | 'h3';
        size?: 'lg' | 'md';
    }>(),
    {
        eyebrow: null,
        icon: null,
        description: null,
        id: undefined,
        as: 'h2',
        size: 'lg',
    },
);
</script>

<template>
    <div
        class="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between sm:gap-10"
    >
        <div class="min-w-0">
            <p
                v-if="eyebrow"
                class="flex items-center gap-2 text-sm leading-5 font-bold text-brand-strong"
            >
                <component
                    :is="icon"
                    v-if="icon"
                    aria-hidden="true"
                    class="size-[18px]"
                />
                {{ eyebrow }}
            </p>
            <component
                :is="as"
                :id="id"
                :class="[
                    'font-extrabold tracking-display text-ink',
                    eyebrow ? 'mt-2.5' : '',
                    size === 'lg'
                        ? 'text-[28px] leading-[34px] sm:text-4xl sm:leading-[44px] lg:text-[38px]'
                        : 'text-2xl leading-8 sm:text-[26px]',
                ]"
            >
                {{ title }}
            </component>
            <p
                v-if="description"
                class="mt-3 max-w-2xl text-base leading-[26px] text-pretty text-muted-foreground"
            >
                {{ description }}
            </p>
        </div>
        <div v-if="$slots.actions" class="flex flex-none items-center gap-3">
            <slot name="actions" />
        </div>
    </div>
</template>
