<script setup lang="ts">
import RouteRates from '@/components/RouteRates.vue';
import type { PriceBand } from '@/types';

/**
 * Route price cards side by side: one column on phones, two from 42rem and
 * three from 56rem of the grid's own width (a @container), so the public
 * pricing page and the admin's Rates page lay them out alike. Each card is
 * a two-row subgrid (heading, table), so in every row of cards the headings
 * share one height and the band rows line up, however the titles wrap.
 * Cards keep their own height: a route with fewer bands is not stretched.
 */
withDefaults(
    defineProps<{
        routes: {
            key: string;
            /** e.g. "Peninsular Malaysia → Sarawak" or "Within Sarawak". */
            title: string;
            bands: PriceBand[];
            extraKgSen: number | null;
        }[];
        headingLevel?: 'h3' | 'h4';
    }>(),
    { headingLevel: 'h3' },
);
</script>

<template>
    <div class="@container">
        <ul class="grid gap-4 @2xl:grid-cols-2 @4xl:grid-cols-3">
            <li
                v-for="route in routes"
                :key="route.key"
                class="row-span-2 grid grid-rows-subgrid gap-y-0"
            >
                <RouteRates
                    :title="route.title"
                    :bands="route.bands"
                    :extra-kg-sen="route.extraKgSen"
                    :heading-level="headingLevel"
                />
            </li>
        </ul>
    </div>
</template>
