<script setup lang="ts">
import { computed } from 'vue';
import RouteRatesTable from '@/components/RouteRatesTable.vue';
import type { PriceBand } from '@/types';

/**
 * Every route of a rate card as one price table per zone they leave from
 * ("From Peninsular Malaysia", a column for each zone it goes to). A
 * route the card lacks shows as a column without prices. Used under an h2
 * on a version's page and on an import's preview, so both read alike.
 */
const props = defineProps<{
    /** In the card's order; `key` is what the routes name them by (an id or a code). */
    zones: { key: string | number; name: string }[];
    routes: {
        from: string | number;
        to: string | number;
        /** Lightest first. */
        bands: PriceBand[];
        extraKgSen: number | null;
    }[];
}>();

const groups = computed(() =>
    props.zones.map((from) => ({
        from,
        routes: props.zones.map((to) => {
            const route = props.routes.find(
                (item) => item.from === from.key && item.to === to.key,
            );

            return {
                key: to.key,
                to: to.name,
                within: from.key === to.key,
                bands: route?.bands ?? [],
                extraKgSen: route?.extraKgSen ?? null,
            };
        }),
    })),
);
</script>

<template>
    <!-- 40px between the groups and 10px from a heading to its table, so
         each "From" heading reads as the next table's, not the last one's. -->
    <div class="space-y-10">
        <div v-for="group in groups" :key="group.from.key" class="space-y-2.5">
            <h3 class="text-[15px] leading-6 font-extrabold text-ink">
                From {{ group.from.name }}
            </h3>
            <RouteRatesTable
                :caption="`Prices from ${group.from.name}`"
                :routes="group.routes"
            />
        </div>
    </div>
</template>
