<script setup lang="ts">
import Breadcrumbs from '@/components/Breadcrumbs.vue';
import type { BreadcrumbItem } from '@/types';

/**
 * The top of an app page (customer, console and settings pages): optional
 * breadcrumbs, the page's <h1>, a description and actions on the right.
 * The actions move under the title on phones, and on wider screens too
 * whenever the title or description would have to wrap to make room for
 * them, so the actions never squeeze the title into a narrow column. A
 * title without spaces breaks anywhere rather than pushing the page
 * sideways; a file name goes in the title slot as a FileName instead, so
 * it breaks between its parts.
 *
 * Slots: title (replaces the title text), actions (buttons/links), meta
 * (chips or details under the title).
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
        class="flex flex-col gap-4 sm:flex-row sm:flex-wrap sm:items-end sm:justify-between"
    >
        <div class="min-w-0">
            <Breadcrumbs
                v-if="breadcrumbs.length > 0"
                :breadcrumbs="breadcrumbs"
                class="mb-2"
            />
            <h1
                class="text-2xl leading-8 font-extrabold tracking-display wrap-anywhere text-ink sm:text-[28px] sm:leading-9"
            >
                <slot name="title">{{ title }}</slot>
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
