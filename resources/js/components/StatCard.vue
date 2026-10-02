<script setup lang="ts">
import type { InertiaLinkProps } from '@inertiajs/vue3';
import { Link } from '@inertiajs/vue3';
import type { Component } from 'vue';

/**
 * A summary number for console pages ("Awaiting assignment 5"). The icon
 * takes the tone's colour; with `href` the whole card is a link.
 */
withDefaults(
    defineProps<{
        label: string;
        value: string | number;
        icon?: Component | null;
        tone?: 'neutral' | 'brand' | 'paid' | 'failed' | 'delivered';
        hint?: string | null;
        href?: NonNullable<InertiaLinkProps['href']> | null;
    }>(),
    {
        icon: null,
        tone: 'neutral',
        hint: null,
        href: null,
    },
);

const iconClass = {
    neutral: 'text-ink-2',
    brand: 'text-brand',
    paid: 'text-status-paid',
    failed: 'text-status-failed',
    delivered: 'text-status-delivered',
};
</script>

<template>
    <component
        :is="href ? Link : 'div'"
        :href="href ?? undefined"
        :class="[
            'block rounded-xl border border-line bg-white px-4 py-3.5',
            href
                ? 'transition-colors hover:border-brand-edge hover:bg-brand-tint/40'
                : '',
        ]"
    >
        <!-- Below a 48rem @container the cards are narrow and a label may
             wrap, so every label keeps room for two lines and the values
             in a row line up -->
        <p
            class="flex min-h-9 items-start justify-between gap-2 text-[12.5px] leading-[18px] font-semibold text-muted-foreground @3xl:min-h-0"
        >
            {{ label }}
            <component
                :is="icon"
                v-if="icon"
                aria-hidden="true"
                :class="['mt-px size-4 flex-none', iconClass[tone]]"
            />
        </p>
        <p
            class="mt-1 text-[26px] leading-8 font-extrabold tracking-heading text-ink tabular-nums"
        >
            {{ value }}
        </p>
        <p v-if="hint" class="mt-0.5 text-xs leading-4 text-muted-foreground">
            {{ hint }}
        </p>
    </component>
</template>
