<script setup lang="ts">
import { Head } from '@inertiajs/vue3';
import {
    ClipboardList,
    Package,
    PackageCheck,
    Receipt,
    ScanBarcode,
    Search,
    X,
} from '@lucide/vue';
import { computed, nextTick, onMounted, ref } from 'vue';
import type { Component } from 'vue';
import EmptyState from '@/components/EmptyState.vue';
import BranchCard from '@/components/public/BranchCard.vue';
import LocationSort from '@/components/public/LocationSort.vue';
import LocationSortNote from '@/components/public/LocationSortNote.vue';
import PublicPageBand from '@/components/public/PublicPageBand.vue';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { useClock } from '@/composables/useClock';
import { useNearestBranches } from '@/composables/useNearestBranches';
import type { BranchWithDistance } from '@/composables/useNearestBranches';
import { branchAnchor } from '@/lib/branches';
import { pluralize } from '@/lib/format';
import { home } from '@/routes';
import { index as branchesIndex } from '@/routes/branches';
import type { Branch, BranchesIndexPageProps } from '@/types';

const props = defineProps<BranchesIndexPageProps>();

const breadcrumbs = [
    { title: 'Home', href: home() },
    { title: 'Branches', href: branchesIndex() },
];

const now = useClock();

/*
|--------------------------------------------------------------------------
| Search and nearest-first sort (both in the browser)
|--------------------------------------------------------------------------
*/

const search = ref('');
const term = computed(() => search.value.trim().toLowerCase());

function matches(branch: Branch, text: string): boolean {
    return [
        branch.name,
        branch.code,
        branch.address,
        branch.city,
        branch.state,
        branch.postcode,
    ].some((value) => value.toLowerCase().includes(text));
}

const filtered = computed(() =>
    term.value
        ? props.branches.filter((branch) => matches(branch, term.value))
        : props.branches,
);

const finder = useNearestBranches(filtered);
const { status, message } = finder;

type Group = { id: string; title: string; items: BranchWithDistance[] };

/** By state, as the server orders them, or one nearest-first list. */
const groups = computed<Group[]>(() => {
    if (status.value === 'located') {
        return [
            {
                id: 'nearest',
                title: 'Nearest to you',
                items: finder.branches.value,
            },
        ];
    }

    const byState = new Map<string, BranchWithDistance[]>();

    for (const item of finder.branches.value) {
        const items = byState.get(item.branch.state) ?? [];
        items.push(item);
        byState.set(item.branch.state, items);
    }

    return [...byState].map(([state, items]) => ({
        id: `state-${state.toLowerCase().replace(/[^a-z0-9]+/g, '-')}`,
        title: state,
        items,
    }));
});

const resultNote = computed(() => {
    if (!term.value) {
        return '';
    }

    return filtered.value.length === 0
        ? `No branch matches “${search.value.trim()}”.`
        : `Showing ${filtered.value.length} of ${pluralize(props.branches.length, 'branch', 'branches')}.`;
});

const areas = computed(() => {
    const states = [...new Set(props.branches.map((branch) => branch.state))];

    return states.length > 1
        ? `${states.slice(0, -1).join(', ')} and ${states[states.length - 1]}`
        : (states[0] ?? '');
});

const description = computed(() => {
    const count = props.branches.length;

    if (count === 0) {
        return 'Drop off and pay at any Kotak branch, by cash or card.';
    }

    return `${pluralize(count, 'branch', 'branches')} across ${areas.value}. Drop off and pay by cash or card.`;
});

/*
|--------------------------------------------------------------------------
| "Before you go": the drop-off steps, in order
|--------------------------------------------------------------------------
*/

const TIPS: { icon: Component; title: string; text: string }[] = [
    {
        icon: ClipboardList,
        title: 'Create the order online',
        text: "Add the receiver's details and the parcel's weight and size. You get a KT- tracking number straight away.",
    },
    {
        icon: Package,
        title: 'Pack and seal the parcel',
        text: 'Use a sturdy box and tape it shut, so it is ready to hand over when you reach the counter.',
    },
    {
        icon: ScanBarcode,
        title: 'Show your code at the counter',
        text: 'Open the order on your phone. Staff scan the barcode or type the number, then weigh and measure the parcel.',
    },
    {
        icon: Receipt,
        title: 'Pay and keep the receipt',
        text: 'Staff confirm the final price. Pay by cash or card and keep the receipt: it carries your tracking number.',
    },
];

/*
|--------------------------------------------------------------------------
| Links from the home page (/branches#branch-pj-ss2)
|--------------------------------------------------------------------------
*/

const highlighted = ref<string | null>(null);

onMounted(async () => {
    const id = decodeURIComponent(window.location.hash.slice(1));

    if (!id.startsWith('branch-')) {
        return;
    }

    highlighted.value = id;
    await nextTick();

    const card = document.getElementById(id);
    card?.scrollIntoView({ block: 'center' });
    card?.focus({ preventScroll: true });
});
</script>

<template>
    <Head title="Branches and opening hours">
        <meta
            head-key="description"
            name="description"
            content="Find a Kotak branch in the Klang Valley: addresses, phone numbers and opening hours. Drop off your parcel and pay by cash or card."
        />
    </Head>

    <PublicPageBand
        title="Branches"
        :description="description"
        :breadcrumbs="breadcrumbs"
    />

    <!-- The same top space under the band's tape as the Track page -->
    <div class="container-page pt-12 pb-16 sm:pt-14 sm:pb-20">
        <EmptyState
            v-if="branches.length === 0"
            title="No branches are taking parcels right now"
            description="New branches are on the way. Please check back soon."
        />

        <template v-else>
            <div class="rounded-2xl border border-line bg-white p-4 sm:p-5">
                <!-- One row from sm up: the field and the buttons are both 48px tall and share a bottom edge. -->
                <div class="flex flex-col gap-3 sm:flex-row sm:items-end">
                    <div
                        role="search"
                        aria-label="Branches"
                        class="min-w-0 sm:flex-1"
                    >
                        <Label
                            for="branch-search"
                            class="mb-1.5 text-[13px] leading-[19px] font-semibold text-ink"
                        >
                            Search by name, area or postcode
                        </Label>
                        <div class="relative">
                            <Search
                                aria-hidden="true"
                                class="pointer-events-none absolute top-1/2 left-3.5 size-5 -translate-y-1/2 text-muted-foreground"
                            />
                            <Input
                                id="branch-search"
                                v-model="search"
                                type="search"
                                autocomplete="off"
                                enterkeyhint="search"
                                placeholder="e.g. Petaling Jaya or 59200"
                                aria-describedby="branch-search-result"
                                class="h-12 rounded-lg bg-white pr-12 pl-11 text-base md:text-base [&::-webkit-search-cancel-button]:hidden"
                            />
                            <button
                                v-if="search"
                                type="button"
                                class="absolute top-1/2 right-1.5 flex size-9 -translate-y-1/2 items-center justify-center rounded-md text-ink-2 hover:bg-surface hover:text-ink"
                                @click="search = ''"
                            >
                                <X aria-hidden="true" class="size-[18px]" />
                                <span class="sr-only">Clear search</span>
                            </button>
                        </div>
                    </div>

                    <LocationSort
                        size="lg"
                        :note="false"
                        :status="status"
                        :message="message"
                        @locate="finder.locate"
                        @clear="finder.clear"
                    />
                </div>

                <!-- Both notes run full width under the row. They stay in the page while empty, for aria-live. -->
                <p
                    id="branch-search-result"
                    role="status"
                    aria-live="polite"
                    :class="[
                        'text-sm leading-5 text-ink-2',
                        resultNote ? 'mt-3' : '',
                    ]"
                >
                    {{ resultNote }}
                </p>
                <LocationSortNote
                    :status="status"
                    :message="message"
                    :class="message ? 'mt-3' : ''"
                />
            </div>

            <EmptyState
                v-if="filtered.length === 0"
                illustration="search"
                class="mt-8"
                :title="`No branch matches “${search.trim()}”`"
                description="Try the branch name, the town or the postcode. You can also clear the search to see every branch."
            >
                <Button
                    type="button"
                    variant="outline"
                    class="h-11 border-field px-5 font-bold"
                    @click="search = ''"
                >
                    Clear search
                </Button>
            </EmptyState>

            <section
                v-for="group in groups"
                :key="group.id"
                :aria-labelledby="group.id"
                class="mt-10 sm:mt-12"
            >
                <div class="flex items-baseline justify-between gap-4">
                    <h2
                        :id="group.id"
                        class="text-[22px] leading-8 font-extrabold tracking-heading text-ink sm:text-2xl"
                    >
                        {{ group.title }}
                    </h2>
                    <p class="text-sm text-muted-foreground">
                        {{
                            pluralize(group.items.length, 'branch', 'branches')
                        }}
                    </p>
                </div>
                <!-- Three across from 1024px. In two columns, an odd last
                     card spans both, and BranchCard lays itself out wide. -->
                <ul class="mt-4 grid gap-4 md:grid-cols-2 lg:grid-cols-3">
                    <li
                        v-for="(item, index) in group.items"
                        :key="item.branch.id"
                        class="md:max-lg:last:odd:col-span-2"
                    >
                        <BranchCard
                            :branch="item.branch"
                            :now="now"
                            :distance-km="item.distanceKm"
                            :nearest="status === 'located' && index === 0"
                            :highlighted="
                                highlighted === branchAnchor(item.branch)
                            "
                        />
                    </li>
                </ul>
            </section>

            <section
                aria-labelledby="before-you-go-title"
                class="mt-12 rounded-2xl bg-surface p-4 sm:mt-14 sm:p-6 lg:p-8"
            >
                <!-- Phones: the icon sits level with the title and the text
                     runs full width under both. From 640px the icon stands
                     beside the title and the text. -->
                <div
                    class="grid grid-cols-[auto_minmax(0,1fr)] items-center gap-x-3.5 sm:items-start"
                >
                    <span
                        class="flex size-11 flex-none items-center justify-center rounded-xl bg-white text-brand sm:row-span-2"
                    >
                        <PackageCheck aria-hidden="true" class="size-[22px]" />
                    </span>
                    <h2
                        id="before-you-go-title"
                        class="text-[22px] leading-8 font-extrabold tracking-heading text-ink sm:text-2xl"
                    >
                        Before you go
                    </h2>
                    <p
                        class="col-span-2 mt-2 text-[15px] leading-6 text-pretty text-ink-2 sm:col-span-1 sm:col-start-2 sm:mt-0.5"
                    >
                        Four steps from your door to the counter. Any Kotak
                        branch can take your parcel, not only the one you
                        picked.
                    </p>
                </div>

                <ol
                    class="mt-5 grid gap-3 sm:mt-6 sm:grid-cols-2 sm:gap-4 xl:grid-cols-4"
                >
                    <li
                        v-for="(tip, index) in TIPS"
                        :key="tip.title"
                        class="rounded-xl bg-white p-4 sm:p-5"
                    >
                        <div class="flex items-center justify-between gap-3">
                            <span
                                class="flex size-9 flex-none items-center justify-center rounded-lg bg-brand-tint text-brand"
                            >
                                <component
                                    :is="tip.icon"
                                    aria-hidden="true"
                                    class="size-[18px]"
                                />
                            </span>
                            <span
                                aria-hidden="true"
                                class="font-mono text-xs leading-5 font-bold tracking-[0.04em] text-muted-foreground"
                            >
                                {{ String(index + 1).padStart(2, '0') }}
                            </span>
                        </div>
                        <h3
                            class="mt-3.5 text-[15px] leading-6 font-bold text-ink"
                        >
                            {{ tip.title }}
                        </h3>
                        <p
                            class="mt-1 text-sm leading-[22px] text-pretty text-ink-2"
                        >
                            {{ tip.text }}
                        </p>
                    </li>
                </ol>
            </section>
        </template>
    </div>
</template>
