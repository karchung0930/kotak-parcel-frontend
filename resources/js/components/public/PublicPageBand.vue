<script setup lang="ts">
import Breadcrumbs from '@/components/Breadcrumbs.vue';
import KotakTape from '@/components/brand/KotakTape.vue';
import type { BreadcrumbItem } from '@/types';

/**
 * The top of an inner public page (tracking, branches, pricing): a grey
 * band with breadcrumbs, the page's <h1> and intro, an optional panel on
 * the right (default slot, e.g. the tracking form), and the level Kotak
 * tape laid across its bottom edge.
 *
 * The tape overlaps the next 20px, so start the content below it with at
 * least pt-12.
 */
withDefaults(
    defineProps<{
        title: string;
        description?: string | null;
        breadcrumbs: BreadcrumbItem[];
        /** "stretch" makes the right panel as tall as the title block, so its bottom lines up with the intro text. */
        panelAlign?: 'start' | 'stretch';
    }>(),
    { description: null, panelAlign: 'start' },
);
</script>

<template>
    <header class="bg-surface">
        <div
            class="container-page flex flex-col gap-6 pt-6 pb-12 sm:pt-7 lg:flex-row lg:items-start lg:justify-between lg:gap-10 lg:pb-[52px] xl:gap-12"
        >
            <div class="max-w-2xl min-w-0">
                <Breadcrumbs :breadcrumbs="breadcrumbs" />
                <h1
                    class="mt-2 text-[28px] leading-9 font-extrabold tracking-display text-ink sm:text-[32px] sm:leading-10"
                >
                    {{ title }}
                </h1>
                <p
                    v-if="description"
                    class="mt-1.5 text-[15px] leading-6 text-pretty text-muted-foreground"
                >
                    {{ description }}
                </p>
                <slot name="meta" />
            </div>
            <!-- 400px wide (and a 40px gap) at 1024-1279px, so a short intro
                 beside it still fits on one line; 560px from 1280px. -->
            <div
                v-if="$slots.default"
                :class="[
                    'w-full lg:w-[400px] lg:flex-none xl:w-[560px]',
                    panelAlign === 'stretch' && 'lg:self-stretch',
                ]"
            >
                <slot />
            </div>
        </div>
    </header>
    <KotakTape :height="40" overlap />
</template>
