<script setup lang="ts">
import { MapPin } from '@lucide/vue';
import { computed } from 'vue';
import type { MalaysianStateValue, Option } from '@/types';

/**
 * Which states are in which zone of a rate card: a card per zone with its
 * states, labelled as the server labels them ("W.P. Kuala Lumpur"). Used
 * on the public pricing page and the admin's Rates pages.
 */
const props = withDefaults(
    defineProps<{
        zones: { name: string; states: MalaysianStateValue[] }[];
        /** The state options from the server, for their labels. */
        states: Option<MalaysianStateValue>[];
        headingLevel?: 'h3' | 'h4';
        /** Cards per row from 1024px: 3 across a page, 2 in a narrower column. */
        columns?: 2 | 3;
    }>(),
    { headingLevel: 'h3', columns: 3 },
);

const labels = computed(
    () =>
        new Map(props.states.map((state) => [state.value, state.label])) as Map<
            string,
            string
        >,
);
</script>

<template>
    <!-- Cards keep their own height, so a short zone is not stretched. The
         16px gaps match the route cards (RouteRatesGrid). -->
    <ul
        :class="[
            'grid items-start gap-4 sm:grid-cols-2',
            columns === 3 ? 'lg:grid-cols-3' : '',
        ]"
    >
        <li
            v-for="zone in zones"
            :key="zone.name"
            class="rounded-xl border border-line bg-white p-4"
        >
            <component
                :is="headingLevel"
                class="flex items-center gap-2 text-[15px] leading-5 font-extrabold tracking-heading text-ink"
            >
                <MapPin
                    aria-hidden="true"
                    class="size-4 flex-none text-brand"
                />
                {{ zone.name }}
            </component>
            <ul
                v-if="zone.states.length > 0"
                class="mt-3 flex flex-wrap gap-1.5"
                :aria-label="`States in ${zone.name}`"
            >
                <li
                    v-for="state in zone.states"
                    :key="state"
                    class="rounded-sm bg-surface px-2 py-0.5 text-[12.5px] leading-5 font-semibold text-ink-2"
                >
                    {{ labels.get(state) ?? state }}
                </li>
            </ul>
            <p v-else class="mt-2 text-[13px] text-muted-foreground">
                No states yet.
            </p>
        </li>
    </ul>
</template>
