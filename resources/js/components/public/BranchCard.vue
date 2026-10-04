<script setup lang="ts">
import { Clock, MapPin, Navigation, Phone, Store } from '@lucide/vue';
import { computed } from 'vue';
import BranchName from '@/components/BranchName.vue';
import BranchOpenStatus from '@/components/public/BranchOpenStatus.vue';
import { Button } from '@/components/ui/button';
import {
    branchAnchor,
    directionsUrl,
    formatDistance,
    kualaLumpurClock,
    parseOpeningHours,
} from '@/lib/branches';
import { formatPostcodeCity, telHref } from '@/lib/format';
import type { Branch } from '@/types';

/**
 * A branch on the branches page: address, phone, opening hours with
 * today's row marked, and Directions / Call buttons. Its id
 * (branch-<code>) is the target of links from the home page.
 *
 * The card is a @container: when it is wide (36rem and more inside, e.g.
 * a lone last card spanning two columns), the address and phone sit
 * beside the opening hours, with the buttons under the hours.
 */
const props = withDefaults(
    defineProps<{
        branch: Branch;
        now: Date | null;
        distanceKm?: number | null;
        nearest?: boolean;
        /** Outline it (the card a link pointed at). */
        highlighted?: boolean;
    }>(),
    {
        distanceKm: null,
        nearest: false,
        highlighted: false,
    },
);

const anchor = computed(() => branchAnchor(props.branch));
const periods = computed(() => parseOpeningHours(props.branch.opening_hours));
const today = computed(() =>
    props.now ? kualaLumpurClock(props.now).weekday : null,
);

const place = computed(() => {
    const { postcode, city, state } = props.branch;
    const town = formatPostcodeCity(postcode, city);

    return state === city ? town : `${town}, ${state}`;
});
</script>

<template>
    <article
        :id="anchor"
        tabindex="-1"
        :aria-labelledby="`${anchor}-name`"
        :class="[
            '@container flex h-full flex-col rounded-2xl border bg-white p-5 outline-none sm:p-6',
            highlighted
                ? 'border-brand shadow-card ring-1 ring-brand'
                : nearest
                  ? 'border-brand-edge shadow-card'
                  : 'border-line',
        ]"
    >
        <div class="flex items-start gap-3.5">
            <span
                class="flex size-11 flex-none items-center justify-center rounded-xl bg-brand-tint text-brand"
            >
                <Store aria-hidden="true" class="size-[22px]" />
            </span>
            <div class="min-w-0 flex-1">
                <p class="flex flex-wrap items-center gap-2">
                    <span
                        class="font-mono text-xs leading-5 font-bold tracking-[0.04em] text-muted-foreground"
                    >
                        {{ branch.code }}
                    </span>
                    <span
                        v-if="nearest"
                        class="rounded-[4px] bg-highlight px-1.5 text-[11px] leading-[18px] font-bold text-ink"
                    >
                        Nearest
                    </span>
                </p>
                <h3
                    :id="`${anchor}-name`"
                    class="text-lg leading-6 font-extrabold tracking-heading text-ink"
                >
                    <BranchName :name="branch.name" />
                </h3>
            </div>
            <p
                v-if="distanceKm !== null"
                class="flex-none pt-0.5 font-mono text-sm font-bold whitespace-nowrap text-ink-2"
            >
                {{ formatDistance(distanceKm) }}
                <span class="sr-only">away</span>
            </p>
        </div>

        <dl
            class="mt-5 flex flex-col gap-4 text-sm leading-[22px] text-ink-2 @xl:grid @xl:grid-cols-2 @xl:grid-rows-[auto_1fr] @xl:gap-x-8"
        >
            <div class="flex gap-3">
                <dt class="flex-none pt-0.5">
                    <MapPin aria-hidden="true" class="size-[18px] text-brand" />
                    <span class="sr-only">Address</span>
                </dt>
                <dd class="min-w-0">
                    {{ branch.address }}<br />
                    {{ place }}
                </dd>
            </div>
            <div class="flex gap-3">
                <dt class="flex-none pt-0.5">
                    <Phone aria-hidden="true" class="size-[18px] text-brand" />
                    <span class="sr-only">Phone</span>
                </dt>
                <dd>
                    <a
                        :href="telHref(branch.phone)"
                        class="tap-target relative font-semibold text-ink underline decoration-line-strong underline-offset-4 hover:text-brand-strong hover:decoration-current"
                    >
                        {{ branch.phone }}
                    </a>
                </dd>
            </div>
            <div
                class="flex gap-3 @xl:col-start-2 @xl:row-span-2 @xl:row-start-1"
            >
                <dt class="flex-none pt-0.5">
                    <Clock aria-hidden="true" class="size-[18px] text-brand" />
                    <span class="sr-only">Opening hours</span>
                </dt>
                <dd class="min-w-0 flex-1">
                    <p v-if="now && periods" class="mb-1.5">
                        <BranchOpenStatus
                            :hours="branch.opening_hours"
                            :now="now"
                        />
                    </p>
                    <ul v-if="periods" class="space-y-0.5">
                        <li
                            v-for="period in periods"
                            :key="period.days"
                            :class="[
                                'flex justify-between gap-4 tabular-nums',
                                today !== null &&
                                period.weekdays.includes(today)
                                    ? 'font-bold text-ink'
                                    : '',
                            ]"
                        >
                            <span>{{ period.days }}</span>
                            <span>{{ period.hours }}</span>
                        </li>
                    </ul>
                    <p v-else>{{ branch.opening_hours }}</p>
                </dd>
            </div>
        </dl>

        <!-- Equal halves; on a 320px phone a compact Call leaves room for
             "Directions" on one line. Wide: as wide as the hours column
             above (half, less half the gap). -->
        <div
            class="mt-auto grid grid-cols-[minmax(0,1fr)_auto] gap-2.5 pt-6 @[16rem]:grid-cols-2 @xl:ml-auto @xl:w-[calc(50%_-_1rem)]"
        >
            <Button as-child variant="outline" class="h-11 text-sm font-bold">
                <a
                    :href="directionsUrl(branch)"
                    target="_blank"
                    rel="noopener noreferrer"
                >
                    <Navigation aria-hidden="true" />
                    Directions
                    <span class="sr-only">
                        to {{ branch.name }} (opens Google Maps in a new tab)
                    </span>
                </a>
            </Button>
            <Button as-child variant="outline" class="h-11 text-sm font-bold">
                <a :href="telHref(branch.phone)">
                    <Phone aria-hidden="true" />
                    Call
                    <span class="sr-only">{{ branch.name }}</span>
                </a>
            </Button>
        </div>
    </article>
</template>
