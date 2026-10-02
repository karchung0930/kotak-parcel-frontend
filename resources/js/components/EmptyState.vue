<script setup lang="ts">
import EmptyParcel from '@/components/brand/EmptyParcel.vue';

/**
 * A designed empty or not-found state: parcel illustration, heading,
 * explanation and actions.
 *
 * illustration: empty (nothing yet) · search (nothing matched) · done (all
 * caught up). Default slot: action buttons/links.
 */
withDefaults(
    defineProps<{
        title: string;
        description?: string | null;
        illustration?: 'empty' | 'search' | 'done';
        /** Heading level: h2 inside a page, h3 inside a section. */
        as?: 'h2' | 'h3';
        /** Without the dashed card (when it already sits inside a card). */
        bare?: boolean;
    }>(),
    {
        description: null,
        illustration: 'empty',
        as: 'h2',
        bare: false,
    },
);
</script>

<template>
    <div
        :class="[
            'flex flex-col items-center px-6 py-10 text-center sm:py-12',
            bare
                ? ''
                : 'rounded-xl border border-dashed border-line-strong bg-white',
        ]"
    >
        <EmptyParcel :variant="illustration" class="w-32 sm:w-36" />
        <component
            :is="as"
            class="mt-4 text-lg leading-7 font-extrabold tracking-heading text-ink"
        >
            {{ title }}
        </component>
        <p
            v-if="description"
            class="mt-1.5 max-w-md text-sm leading-[22px] text-muted-foreground"
        >
            {{ description }}
        </p>
        <div
            v-if="$slots.default"
            class="mt-6 flex flex-wrap items-center justify-center gap-3"
        >
            <slot />
        </div>
    </div>
</template>
