<script setup lang="ts">
import { computed, useTemplateRef } from 'vue';
import { useScrollHint } from '@/composables/useScrollHint';
import { formatKg, formatMoney } from '@/lib/format';
import { rateTableRows } from '@/lib/pricing';
import type { PriceBand } from '@/types';

/**
 * Every route from one zone as one table: a row per weight limit used by
 * any of the routes (lightest first), a column per destination in the
 * card's zone order (so a destination keeps its column in every origin's
 * table), and last the price per kg after each route's highest band.
 *
 * A route's own band prices are bold. Where a row is another route's limit,
 * the price is worked out the server's way (`priceAtWeight`: the lightest
 * band that covers it, or the highest band plus each started kg) and shown
 * muted, so nothing reads as a band the card does not have. An en dash
 * marks a price that cannot be worked out (no bands, or no extra-kg price).
 *
 * On narrow screens the table scrolls inside its box with the weight
 * column held in place. Used on the pricing page and the admin's Rates
 * pages (through RouteGroups).
 */
const props = defineProps<{
    /** Read out as the table's caption, e.g. "Prices from Sarawak". */
    caption: string;
    routes: {
        key: string | number;
        /** The destination zone's name. */
        to: string;
        /** A route inside the origin zone ("Within Sarawak"). */
        within: boolean;
        /** Lightest first. */
        bands: PriceBand[];
        extraKgSen: number | null;
    }[];
}>();

const rows = computed(() =>
    rateTableRows(props.routes).map((row) => ({
        weightG: row.weightG,
        cells: row.prices.map((price, index) => ({
            key: props.routes[index].key,
            price,
        })),
    })),
);

const hasWorkedOut = computed(() =>
    rows.value.some((row) =>
        row.cells.some((cell) => cell.price && !cell.price.own),
    ),
);

/*
 * Whether columns are hidden past the right edge: a fade there and a hint
 * above say the table scrolls; both go once it is scrolled to the end.
 */
const scroller = useTemplateRef<HTMLElement>('scroller');
const { overflows, moreRight, measure } = useScrollHint(scroller);

const cellClass =
    'border-b border-line-soft px-4 py-2.5 text-left whitespace-nowrap';
const stickyClass =
    'sticky left-0 z-10 border-r border-line-soft bg-white pl-5 font-normal text-ink-2';
</script>

<template>
    <!-- Contained, so the table's own width never widens the page: it
         scrolls inside its box instead. -->
    <div class="min-w-0 [contain:inline-size]">
        <p
            v-if="overflows"
            class="mb-2 text-[13px] leading-5 text-muted-foreground"
        >
            Swipe for more destinations <span aria-hidden="true">→</span>
        </p>
        <div class="relative">
            <div
                ref="scroller"
                class="relative overflow-x-auto overscroll-x-contain rounded-xl border border-line bg-white"
                @scroll.passive="measure"
            >
                <!-- Fixed columns, so a destination's column is as wide in every
                 origin's table; past the box's width it scrolls. -->
                <table
                    class="w-full min-w-[calc(7rem+var(--cols)*8rem)] table-fixed border-separate border-spacing-0 text-sm sm:min-w-[calc(11rem+var(--cols)*10rem)]"
                    :style="{ '--cols': routes.length }"
                >
                    <caption class="sr-only">
                        {{
                            caption
                        }}, by chargeable weight
                    </caption>
                    <thead>
                        <tr
                            class="text-[13px] leading-5 font-extrabold text-ink"
                        >
                            <th
                                scope="col"
                                :class="[
                                    cellClass,
                                    stickyClass,
                                    'w-28 bg-surface! font-bold text-muted-foreground sm:w-44',
                                ]"
                            >
                                Weight
                            </th>
                            <th
                                v-for="route in routes"
                                :key="route.key"
                                scope="col"
                                :class="[
                                    cellClass,
                                    'bg-surface whitespace-normal!',
                                ]"
                            >
                                <template v-if="route.within">
                                    Within {{ route.to }}
                                </template>
                                <template v-else>
                                    <span aria-hidden="true">→ </span>
                                    <span class="sr-only">To </span
                                    >{{ route.to }}
                                </template>
                            </th>
                        </tr>
                    </thead>
                    <tbody>
                        <tr v-for="row in rows" :key="row.weightG">
                            <th scope="row" :class="[cellClass, stickyClass]">
                                Up to {{ formatKg(row.weightG) }}
                            </th>
                            <td
                                v-for="cell in row.cells"
                                :key="cell.key"
                                :class="[
                                    cellClass,
                                    'font-mono',
                                    cell.price?.own
                                        ? 'font-bold text-ink'
                                        : 'text-muted-foreground',
                                ]"
                            >
                                <template v-if="cell.price">
                                    {{ formatMoney(cell.price.priceSen) }}
                                    <span
                                        v-if="!cell.price.own"
                                        class="sr-only"
                                    >
                                        (worked out)</span
                                    >
                                </template>
                                <span v-else aria-label="No price">–</span>
                            </td>
                        </tr>
                        <tr v-if="rows.length === 0">
                            <td
                                :colspan="routes.length + 1"
                                :class="[
                                    cellClass,
                                    'pl-5 text-muted-foreground',
                                ]"
                            >
                                No weight bands yet.
                            </td>
                        </tr>
                        <!-- Each route's own limit, as the routes end at different weights. -->
                        <tr class="[&>*]:border-b-0 [&>*]:bg-surface/60">
                            <th
                                scope="row"
                                :class="[cellClass, stickyClass, 'bg-surface!']"
                            >
                                Each extra kg
                            </th>
                            <td
                                v-for="route in routes"
                                :key="route.key"
                                :class="cellClass"
                            >
                                <span
                                    v-if="route.extraKgSen !== null"
                                    class="font-mono font-bold text-ink"
                                >
                                    {{ formatMoney(route.extraKgSen) }}
                                </span>
                                <span
                                    v-else
                                    class="font-semibold text-muted-foreground"
                                >
                                    Not set
                                </span>
                                <span
                                    v-if="route.bands.length > 0"
                                    class="block text-xs leading-4 text-muted-foreground"
                                >
                                    over
                                    {{
                                        formatKg(
                                            route.bands[route.bands.length - 1]
                                                .maxWeightG,
                                        )
                                    }}
                                </span>
                            </td>
                        </tr>
                    </tbody>
                </table>
            </div>
            <div
                v-if="moreRight"
                aria-hidden="true"
                class="pointer-events-none absolute inset-y-px right-px w-10 rounded-r-xl bg-linear-to-l from-ink/15 to-transparent"
            />
        </div>
        <p
            v-if="hasWorkedOut"
            class="mt-2 text-[13px] leading-5 text-muted-foreground"
        >
            <span class="font-mono font-bold text-ink">Bold</span> prices are
            the route's own weight bands; grey ones are worked out from them, as
            the price would be charged.
        </p>
    </div>
</template>
