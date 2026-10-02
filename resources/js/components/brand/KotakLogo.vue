<script setup lang="ts">
/**
 * The Kotak logo: a red rounded tile with the white box (and its tape
 * stripe), plus the "Kotak" wordmark. The wordmark is real text, so the
 * logo reads "Kotak" to screen readers; with `wordmark` off it keeps a
 * visually hidden "Kotak".
 */
withDefaults(
    defineProps<{
        size?: 'sm' | 'md' | 'lg';
        wordmark?: boolean;
        /**
         * A small grey tag after the wordmark, e.g. "Admin". Grey, as the
         * pale red tint means "selected" and a black fill is too heavy.
         */
        badge?: string | null;
    }>(),
    {
        size: 'md',
        wordmark: true,
        badge: null,
    },
);

const tile = { sm: 'size-7', md: 'size-8 sm:size-[38px]', lg: 'size-12' };
const text = {
    sm: 'text-lg',
    md: 'text-[21px] sm:text-[26px]',
    lg: 'text-3xl',
};
</script>

<template>
    <span class="inline-flex items-center gap-2.5 text-ink">
        <svg
            viewBox="0 0 32 32"
            aria-hidden="true"
            focusable="false"
            :class="['shrink-0', tile[size]]"
        >
            <rect width="32" height="32" rx="8" fill="#D0161E" />
            <path
                d="M16 5.5 26.5 10.75v10.5L16 26.5 5.5 21.25v-10.5Z"
                fill="#FFFFFF"
            />
            <path
                d="M5.5 10.75 16 16l10.5-5.25M16 16v10.5"
                fill="none"
                stroke="#D0161E"
                stroke-width="1.6"
                stroke-linejoin="round"
            />
            <path
                d="M10.75 8.13 21.25 13.38V18.6"
                fill="none"
                stroke="#D0161E"
                stroke-width="2.6"
                stroke-linejoin="round"
            />
        </svg>
        <span
            :class="[
                'leading-none font-extrabold tracking-display',
                text[size],
                { 'sr-only': !wordmark },
            ]"
        >
            Kotak
        </span>
        <span
            v-if="badge"
            class="inline-flex h-[22px] items-center rounded-[5px] border border-line bg-surface px-1.5 text-xs font-bold tracking-[0.02em] text-ink-2"
        >
            {{ badge }}
        </span>
    </span>
</template>
