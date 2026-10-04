<script setup lang="ts">
import { Link } from '@inertiajs/vue3';
import { ArrowRight } from '@lucide/vue';
import { computed } from 'vue';
import EmptyState from '@/components/EmptyState.vue';
import BranchLinkCard from '@/components/public/BranchLinkCard.vue';
import LocationSort from '@/components/public/LocationSort.vue';
import SectionHeading from '@/components/SectionHeading.vue';
import TextLink from '@/components/TextLink.vue';
import { useClock } from '@/composables/useClock';
import { useNearestBranches } from '@/composables/useNearestBranches';
import { index as branchesIndex } from '@/routes/branches';
import type { Branch } from '@/types';

/**
 * The home page's branch strip: up to six branches with "open now", and a
 * "Use my location" button that sorts them nearest first in the browser.
 */
const props = defineProps<{
    branches: Branch[];
}>();

const LIMIT = 6;

const now = useClock();
const finder = useNearestBranches(() => props.branches);
const { status, message } = finder;

const shown = computed(() => finder.branches.value.slice(0, LIMIT));
const more = computed(() => Math.max(0, props.branches.length - LIMIT));

const heading = computed(() => {
    const count = props.branches.length;

    if (count === 0) {
        return 'Find a Kotak branch';
    }

    return count === 1
        ? 'Drop off at our branch'
        : `Drop off at any of our ${count} branches`;
});
</script>

<template>
    <section
        id="branches"
        aria-labelledby="branches-title"
        class="bg-surface pt-[70px] pb-16 sm:pt-[86px] sm:pb-20"
    >
        <div
            class="container-page grid gap-8 lg:grid-cols-[300px_minmax(0,1fr)] lg:gap-12"
        >
            <div>
                <SectionHeading
                    id="branches-title"
                    size="md"
                    :title="heading"
                />
                <p class="mt-3 text-sm leading-[22px] text-ink-2">
                    Drop off and pay at the counter, by cash or card. Opening
                    hours vary by branch.
                </p>
                <!-- One row between 640 and 1023px, where the list runs
                     full width below; stacked in the sidebar from 1024px. -->
                <div
                    class="mt-5 flex flex-col items-start gap-5 sm:flex-row sm:flex-wrap sm:gap-x-6 sm:gap-y-3 lg:flex-col lg:gap-5"
                >
                    <LocationSort
                        v-if="branches.length > 1"
                        :status="status"
                        :message="message"
                        @locate="finder.locate"
                        @clear="finder.clear"
                    />
                    <Link
                        :href="branchesIndex()"
                        class="inline-flex min-h-11 items-center gap-1.5 text-[15px] font-bold text-brand-strong hover:text-brand-deep"
                    >
                        All branches and opening hours
                        <ArrowRight aria-hidden="true" class="size-[18px]" />
                    </Link>
                </div>
            </div>

            <div v-if="shown.length > 0">
                <ul
                    class="grid content-start gap-3 sm:grid-cols-2 xl:grid-cols-3"
                    :aria-label="
                        status === 'located'
                            ? 'Branches, nearest first'
                            : 'Branches'
                    "
                >
                    <li v-for="(item, index) in shown" :key="item.branch.id">
                        <BranchLinkCard
                            :branch="item.branch"
                            :now="now"
                            :distance-km="item.distanceKm"
                            :nearest="status === 'located' && index === 0"
                        />
                    </li>
                </ul>
                <p v-if="more > 0" class="mt-4 text-sm text-ink-2">
                    And {{ more }} more.
                    <TextLink :href="branchesIndex()">
                        See every branch
                    </TextLink>
                </p>
            </div>
            <EmptyState
                v-else
                as="h3"
                title="New branches are on the way"
                description="There are no branches taking parcels right now. Please check back soon."
            />
        </div>
    </section>
</template>
