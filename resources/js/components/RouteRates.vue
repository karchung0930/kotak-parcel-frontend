<script setup lang="ts">
import RouteTitle from '@/components/RouteTitle.vue';
import { formatKg, formatMoney } from '@/lib/format';
import type { PriceBand } from '@/types';

/**
 * One route's prices as a small table: a row per weight band ("Up to
 * 2 kg · RM 17.00"), then the price for each kg above the highest band.
 * The same card on the public pricing page and the admin's Rates pages.
 *
 * The card is two rows of a subgrid, the heading and the table, so in
 * RouteRatesGrid the headings of the cards side by side share one height
 * and their band rows line up even when one heading wraps. On its own it
 * stacks the two as usual.
 */
withDefaults(
    defineProps<{
        /** e.g. "Peninsular Malaysia → Sarawak" or "Within Sarawak". */
        title: string;
        /** Lightest first. */
        bands: PriceBand[];
        /** Null while a draft leaves it empty. */
        extraKgSen: number | null;
        headingLevel?: 'h3' | 'h4';
    }>(),
    { headingLevel: 'h3' },
);

/*
 * Prices take at least the width of "RM 100.00" in the monospaced face, so
 * the price column starts at the same place in every card of a row.
 */
const priceClass =
    'min-w-[9ch] py-2.5 font-mono font-bold whitespace-nowrap text-ink';
</script>

<template>
    <section class="row-span-2 grid grid-rows-subgrid gap-y-0">
        <!-- As tall as the tallest heading beside it, the text centred. The
             tint is laid over white, so it reads the same on a grey page. -->
        <component
            :is="headingLevel"
            class="flex items-center rounded-t-xl border border-line bg-white bg-linear-to-r from-surface/70 to-surface/70 px-5 py-3 text-[15px] leading-5 font-extrabold tracking-heading text-pretty text-ink"
        >
            <RouteTitle :title="title" />
        </component>
        <!-- .data-table in app.css: both columns left aligned, 20px at the ends -->
        <div
            class="self-start overflow-hidden rounded-b-xl border-x border-b border-line bg-white"
        >
            <table role="table" class="data-table text-sm [--columns:2]">
                <caption class="sr-only">
                    {{
                        title
                    }}: prices by weight
                </caption>
                <thead role="rowgroup" class="sr-only">
                    <tr role="row" class="data-table__row">
                        <th scope="col" role="columnheader">Weight</th>
                        <th scope="col" role="columnheader">Price</th>
                    </tr>
                </thead>
                <tbody
                    role="rowgroup"
                    class="data-table__body divide-y divide-line-soft"
                >
                    <tr
                        v-for="band in bands"
                        :key="band.maxWeightG"
                        role="row"
                        class="data-table__row"
                    >
                        <th
                            scope="row"
                            role="rowheader"
                            class="py-2.5 font-normal text-ink-2"
                        >
                            Up to {{ formatKg(band.maxWeightG) }}
                        </th>
                        <td role="cell" :class="priceClass">
                            {{ formatMoney(band.priceSen) }}
                        </td>
                    </tr>
                    <tr
                        v-if="bands.length === 0"
                        role="row"
                        class="data-table__row data-table__row--full"
                    >
                        <td role="cell" class="py-2.5 text-muted-foreground">
                            No weight bands yet.
                        </td>
                    </tr>
                    <!-- The label says it is per kg, so the amount lines up
                         with the band prices above it. -->
                    <tr role="row" class="data-table__row bg-surface/60">
                        <th
                            scope="row"
                            role="rowheader"
                            class="py-2.5 font-normal text-ink-2"
                        >
                            <template v-if="bands.length > 0">
                                Each kg over
                                {{
                                    formatKg(bands[bands.length - 1].maxWeightG)
                                }}
                            </template>
                            <template v-else>Each extra kg</template>
                        </th>
                        <td role="cell" :class="priceClass">
                            <template v-if="extraKgSen !== null">
                                {{ formatMoney(extraKgSen) }}
                            </template>
                            <span
                                v-else
                                class="font-sans font-semibold text-muted-foreground"
                            >
                                Not set
                            </span>
                        </td>
                    </tr>
                </tbody>
            </table>
        </div>
    </section>
</template>
