<script setup lang="ts">
import Breadcrumbs from '@/components/Breadcrumbs.vue';
import type { BreadcrumbItem } from '@/types';

/**
 * The top of an app page (customer, console and settings pages): optional
 * breadcrumbs, the page's <h1>, a description and actions on the right
 * (they wrap under the title on phones).
 *
 * Slots: actions (buttons/links), meta (chips or details under the title).
 */
withDefaults(
    defineProps<{
        title: string;
        description?: string | null;
        breadcrumbs?: BreadcrumbItem[];
    }>(),
    {
        description: null,
        breadcrumbs: () => [],
    },
);
</script>

<template>
    <header
        class="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between"
    >
        <div class="min-w-0">
            <Breadcrumbs
                v-if="breadcrumbs.length > 0"
                :breadcrumbs="breadcrumbs"
                class="mb-2"
            />
            <h1
                class="text-2xl leading-8 font-extrabold tracking-display text-ink sm:text-[28px] sm:leading-9"
            >
                {{ title }}
            </h1>
            <p
                v-if="description"
                class="mt-1 max-w-2xl text-sm leading-5 text-pretty text-muted-foreground sm:text-[15px] sm:leading-6"
            >
                {{ description }}
            </p>
            <div
                v-if="$slots.meta"
                class="mt-3 flex flex-wrap items-center gap-2"
            >
                <slot name="meta" />
            </div>
        </div>
        <div
            v-if="$slots.actions"
            class="flex flex-none flex-wrap items-center gap-2"
        >
            <slot name="actions" />
        </div>
    </header>
</template>
