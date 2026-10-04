<script setup lang="ts">
import { computed } from 'vue';
import RouteRatesGrid from '@/components/RouteRatesGrid.vue';
import { routeName } from '@/lib/pricing';
import type { PriceBand } from '@/types';

/**
 * Every route of a rate card as price cards, grouped by the zone they
 * leave from ("From Peninsular Malaysia", then its routes to each zone).
 * A route the card lacks shows as a card without bands. Used under an h2
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
                key: `${from.key}-${to.key}`,
                title: routeName(from.name, to.name, from.key === to.key),
                bands: route?.bands ?? [],
                extraKgSen: route?.extraKgSen ?? null,
            };
        }),
    })),
);
</script>

<template>
    <!-- 24px between the groups, as between sections. -->
    <div class="space-y-6">
        <div v-for="group in groups" :key="group.from.key" class="space-y-3">
            <h3 class="text-[15px] leading-6 font-bold text-muted-foreground">
                From {{ group.from.name }}
            </h3>
            <RouteRatesGrid :routes="group.routes" heading-level="h4" />
        </div>
    </div>
</template>
