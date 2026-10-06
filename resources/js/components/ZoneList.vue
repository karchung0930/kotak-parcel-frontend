<script setup lang="ts">
import { MapPin } from '@lucide/vue';
import { computed } from 'vue';
import type { MalaysianStateValue, Option } from '@/types';

/**
 * Which states are in which zone of a rate card: one card with a row per
 * zone (its name, then its states), labelled as the server labels them
 * ("W.P. Kuala Lumpur"). Rows rather than a card per zone, so a zone of
 * many states never leaves a gap beside a zone of one. Used on the public
 * pricing page and the admin's Rates pages.
 */
const props = withDefaults(
    defineProps<{
        zones: { name: string; states: MalaysianStateValue[] }[];
        /** The state options from the server, for their labels. */
        states: Option<MalaysianStateValue>[];
        headingLevel?: 'h3' | 'h4';
    }>(),
    { headingLevel: 'h3' },
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
    <!-- The name in its own column from 640px (stacked above its states on
         phones), so every zone's states start at the same place. -->
    <ul
        class="divide-y divide-line-soft rounded-xl border border-line bg-white"
    >
        <li
            v-for="zone in zones"
            :key="zone.name"
            class="grid gap-2.5 px-4 py-3.5 sm:grid-cols-[minmax(0,12rem)_minmax(0,1fr)] sm:gap-5 sm:px-5"
        >
            <component
                :is="headingLevel"
                class="flex items-start gap-2 text-[15px] leading-6 font-extrabold tracking-heading text-ink"
            >
                <MapPin
                    aria-hidden="true"
                    class="mt-1 size-4 flex-none text-brand"
                />
                {{ zone.name }}
            </component>
            <ul
                v-if="zone.states.length > 0"
                class="flex flex-wrap gap-1.5"
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
            <p v-else class="text-[13px] leading-6 text-muted-foreground">
                No states yet.
            </p>
        </li>
    </ul>
</template>
