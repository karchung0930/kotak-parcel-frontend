<script setup lang="ts">
import { Head, Link, usePage } from '@inertiajs/vue3';
import {
    ArrowRight,
    Banknote,
    Calculator,
    CalendarClock,
    MapPinned,
    Package,
    RotateCcw,
    Ruler,
    Store,
    Weight,
} from '@lucide/vue';
import { computed, ref } from 'vue';
import ParcelBox from '@/components/brand/ParcelBox.vue';
import ParcelStack from '@/components/brand/ParcelStack.vue';
import Notice from '@/components/Notice.vue';
import PriceEstimator from '@/components/public/PriceEstimator.vue';
import PriceRules from '@/components/public/PriceRules.vue';
import PublicPageBand from '@/components/public/PublicPageBand.vue';
import RouteRatesTable from '@/components/RouteRatesTable.vue';
import RouteTitle from '@/components/RouteTitle.vue';
import SectionHeading from '@/components/SectionHeading.vue';
import { Button } from '@/components/ui/button';
import ZoneList from '@/components/ZoneList.vue';
import { useCanSendParcels } from '@/composables/useCanSendParcels';
import {
    formatDate,
    formatDateTime,
    formatDimensions,
    formatKg,
    formatMoney,
    formatVolumeSum,
    formatWeight,
    toLocalDateTime,
} from '@/lib/format';
import {
    billedWeightGrams,
    chargedByVolume,
    homeZone as findHomeZone,
    lowestExtraKgSen,
    lowestPriceSen,
    quote,
    routeBetween,
} from '@/lib/pricing';
import type { PriceQuote } from '@/lib/pricing';
import { home, pricing as pricingPage } from '@/routes';
import { index as branchesIndex } from '@/routes/branches';
import { create as createOrder } from '@/routes/orders';
import type { PricingIndexPageProps, PriceZone } from '@/types';

/**
 * The public pricing page: the rules, a worked example, which states are
 * in which zone and every route's weight bands, the estimator, everyday
 * examples and the parcel limits. All from the current rate card; when
 * new rates are scheduled, the page says from when.
 */
const props = defineProps<PricingIndexPageProps>();

const canSend = useCanSendParcels();
const maxAttempts = usePage().props.maxFailedAttempts;

const breadcrumbs = [
    { title: 'Home', href: home() },
    { title: 'Pricing', href: pricingPage() },
];

const zones = computed(() => props.pricing.zones);
const zoned = computed(() => zones.value.length > 1);

/*
 * The examples and the worked example are priced within the zone most
 * branches are in (Peninsular Malaysia today), the route most parcels
 * take, whatever order the zones are listed in.
 */
const homeZone = computed<PriceZone | null>(() =>
    findHomeZone(
        props.pricing,
        props.branches.map((branch) => branch.state),
    ),
);

type Example = {
    name: string;
    note: string;
    weightG: number;
    lengthCm: number;
    widthCm: number;
    heightCm: number;
};

type PricedExample = Example & { estimate: PriceQuote };

/** Everyday parcels, priced with the current rates. */
const EXAMPLES: Example[] = [
    {
        name: 'Documents',
        note: 'A4 envelope',
        weightG: 300,
        lengthCm: 32,
        widthCm: 23,
        heightCm: 2,
    },
    {
        name: 'Shoebox',
        note: 'Pair of shoes',
        weightG: 1200,
        lengthCm: 33,
        widthCm: 22,
        heightCm: 12,
    },
    {
        name: 'Medium box',
        note: 'Kitchenware',
        weightG: 4200,
        lengthCm: 40,
        widthCm: 30,
        heightCm: 25,
    },
    {
        name: 'Pillow',
        note: 'Large and light',
        weightG: 1500,
        lengthCm: 60,
        widthCm: 40,
        heightCm: 30,
    },
    {
        name: 'Heavy box',
        note: 'Books or tools',
        weightG: 12000,
        lengthCm: 35,
        widthCm: 25,
        heightCm: 20,
    },
];

const examples = computed<PricedExample[]>(() => {
    const state = homeZone.value?.states[0];

    if (!state) {
        return [];
    }

    return EXAMPLES.filter(
        (example) =>
            example.weightG <= props.pricing.maxWeightG &&
            Math.max(example.lengthCm, example.widthCm, example.heightCm) <=
                props.pricing.maxDimensionCm,
    ).flatMap((example) => {
        const estimate = quote(
            props.pricing,
            state,
            state,
            example.weightG,
            example.lengthCm,
            example.widthCm,
            example.heightCm,
        );

        return estimate ? [{ ...example, estimate }] : [];
    });
});

/** "Within Peninsular Malaysia. …" when the card has zones. */
const examplesNote = computed(() =>
    zoned.value && homeZone.value
        ? `Within ${homeZone.value.name}. Your final price is set at the counter.`
        : 'Worked out with the rates above. Your final price is set at the counter.',
);

/** The worked example: 4.2 kg in a 40 × 30 × 25 cm box. */
const worked = computed(
    () =>
        examples.value.find((example) => example.name === 'Medium box') ?? null,
);

const workedSteps = computed(() => {
    const example = worked.value;

    if (!example) {
        return [];
    }

    const { estimate } = example;

    return [
        {
            title: 'Actual weight',
            detail: 'Weighed at the counter',
            value: formatWeight(estimate.actualG),
        },
        {
            title: 'Size weight',
            detail: formatVolumeSum(
                example.lengthCm,
                example.widthCm,
                example.heightCm,
                props.pricing.divisor,
            ),
            value: formatWeight(estimate.volumetricG),
        },
        {
            title: 'Chargeable weight',
            detail: `The higher of the two, charged as ${formatKg(billedWeightGrams(estimate))}`,
            value: formatWeight(estimate.chargeableG),
        },
        {
            title: 'Price',
            detail:
                estimate.extraKg > 0
                    ? `${formatMoney(estimate.bandPriceSen)} + ${estimate.extraKg} × ${formatMoney(estimate.extraKgSen)}`
                    : `Up to ${formatKg(estimate.bandMaxG)}`,
            value: formatMoney(estimate.priceSen),
        },
    ];
});

/*
|--------------------------------------------------------------------------
| Prices by route
|--------------------------------------------------------------------------
|
| One card per route from the chosen zone. With several zones the visitor
| picks where the parcel leaves from (pale red marks the chosen zone).
|
*/

const fromCode = ref(homeZone.value?.code ?? zones.value[0]?.code ?? '');

const fromZone = computed(
    () =>
        zones.value.find((zone) => zone.code === fromCode.value) ??
        zones.value[0] ??
        null,
);

const routeCards = computed(() => {
    const from = fromZone.value;

    if (!from) {
        return [];
    }

    return zones.value.flatMap((to) => {
        const route = routeBetween(props.pricing, from, to);

        return route
            ? [
                  {
                      key: route.to,
                      to: to.name,
                      within: from.code === to.code,
                      bands: route.bands,
                      extraKgSen: route.extraKgSen,
                  },
              ]
            : [];
    });
});

/** "1 Nov 2026", with the time only when it is not midnight in Malaysia. */
const upcomingFrom = computed(() => {
    const at = props.upcoming?.effectiveFrom ?? null;

    return toLocalDateTime(at)?.endsWith('T00:00')
        ? formatDate(at)
        : formatDateTime(at);
});

const limits = computed(() => [
    {
        icon: Weight,
        title: `Up to ${formatWeight(props.pricing.maxWeightG)}`,
        text: 'The most one parcel can weigh.',
    },
    {
        icon: Ruler,
        title: `Up to ${props.pricing.maxDimensionCm} cm a side`,
        text: 'Length, width and height, each in whole centimetres.',
    },
    {
        icon: Banknote,
        title: 'Pay at the counter',
        text: 'By cash or card, once staff weigh your parcel. You get a receipt.',
    },
    {
        icon: RotateCcw,
        title: `Up to ${maxAttempts} delivery attempts`,
        text: `If nobody is in, we try again another day. After ${maxAttempts} failed attempts the parcel goes back to the sender.`,
    },
]);
</script>

<template>
    <Head title="Pricing">
        <meta
            head-key="description"
            name="description"
            content="Kotak parcel prices by weight band and delivery zone, on the higher of actual and volumetric weight. See every route's rates and estimate your price online."
        />
    </Head>

    <PublicPageBand
        title="Pricing"
        description="Priced by weight and route, confirmed when staff weigh your parcel."
        :breadcrumbs="breadcrumbs"
        panel-align="stretch"
    >
        <!-- Side by side from 360px; on a 320px phone a tile is too narrow
             for the price and its label, so they stack. -->
        <dl class="grid h-full grid-cols-1 gap-3 min-[360px]:grid-cols-2">
            <div
                class="flex flex-col justify-end rounded-xl border border-line bg-white px-4 py-3.5"
            >
                <dt
                    class="text-[13px] leading-[18px] font-semibold text-muted-foreground"
                >
                    Parcels from
                </dt>
                <dd
                    class="mt-1 text-[26px] leading-8 font-extrabold tracking-heading text-ink sm:text-[30px] sm:leading-9"
                >
                    {{ formatMoney(lowestPriceSen(pricing)) }}
                </dd>
            </div>
            <div
                class="flex flex-col justify-end rounded-xl border border-line bg-white px-4 py-3.5"
            >
                <dt
                    class="text-[13px] leading-[18px] font-semibold text-muted-foreground"
                >
                    Each extra kg from
                </dt>
                <dd
                    class="mt-1 text-[26px] leading-8 font-extrabold tracking-heading text-brand-strong sm:text-[30px] sm:leading-9"
                >
                    {{ formatMoney(lowestExtraKgSen(pricing)) }}
                </dd>
            </div>
        </dl>
    </PublicPageBand>

    <!-- The rule -->
    <section aria-labelledby="rule-title" class="pt-12 pb-16 sm:pt-16 sm:pb-20">
        <div v-if="upcoming" class="container-page mb-10">
            <Notice
                tone="brand"
                :icon="CalendarClock"
                :title="`New rates from ${upcomingFrom}`"
            >
                Parcels weighed at the counter from then on are priced with the
                new rates.
            </Notice>
        </div>

        <!-- grid-cols-1 keeps the worked example inside narrow phones. The
             card is 440px wide at 1024-1279px, so the rules keep room. -->
        <div
            class="container-page grid grid-cols-1 gap-10 lg:grid-cols-[minmax(0,1fr)_minmax(0,440px)] xl:grid-cols-[minmax(0,1fr)_minmax(0,520px)] xl:gap-16"
        >
            <div>
                <SectionHeading
                    id="rule-title"
                    size="md"
                    eyebrow="The rule"
                    :icon="Calculator"
                    title="How we work out the price"
                    description="We charge on chargeable weight: whichever is higher, the actual weight or the size weight (also called volumetric weight). Large, light parcels take up room in the van, so they are priced by size."
                />
                <PriceRules :pricing="pricing" class="mt-8" />
            </div>

            <div
                v-if="worked"
                class="rounded-2xl border border-line bg-white p-5 shadow-card sm:p-7"
            >
                <div class="flex items-start justify-between gap-4">
                    <div>
                        <h3
                            class="text-xl leading-7 font-extrabold tracking-heading text-ink"
                        >
                            Worked example
                        </h3>
                        <p
                            class="mt-1 text-sm leading-5 text-pretty text-muted-foreground"
                        >
                            {{ formatWeight(worked.weightG) }} in a
                            <!-- keeps the box size together; it still wraps inside itself at 320px -->
                            <span class="inline-block"
                                >{{
                                    formatDimensions(
                                        worked.lengthCm,
                                        worked.widthCm,
                                        worked.heightCm,
                                    )
                                }}&nbsp;box</span
                            >
                        </p>
                        <p
                            v-if="zoned && homeZone"
                            class="text-sm leading-5 text-muted-foreground"
                        >
                            <RouteTitle :title="`Within ${homeZone.name}`" />
                        </p>
                    </div>
                    <ParcelBox class="w-23 flex-none sm:w-28" />
                </div>
                <ol class="mt-5 divide-y divide-line-soft">
                    <li
                        v-for="(step, index) in workedSteps"
                        :key="step.title"
                        class="flex items-center gap-3.5 py-3.5"
                    >
                        <span
                            aria-hidden="true"
                            :class="[
                                'flex size-7 flex-none items-center justify-center rounded-md font-mono text-[13px] font-bold',
                                index === workedSteps.length - 1
                                    ? 'bg-brand text-white'
                                    : 'bg-brand-tint text-brand-strong',
                            ]"
                        >
                            {{ index + 1 }}
                        </span>
                        <div class="min-w-0 flex-1">
                            <p class="text-[15px] leading-5 font-bold text-ink">
                                {{ step.title }}
                            </p>
                            <!-- The price sum ("RM 8.00 + 5 × RM 2.00") stays on one line from 360px; narrower, it wraps. The other notes wrap balanced. -->
                            <p
                                :class="[
                                    'mt-0.5 text-[13px] leading-5 text-muted-foreground',
                                    index === workedSteps.length - 1
                                        ? 'min-[360px]:whitespace-nowrap'
                                        : 'text-balance',
                                ]"
                            >
                                {{ step.detail }}
                            </p>
                        </div>
                        <p
                            :class="[
                                'flex-none text-right font-extrabold tracking-heading whitespace-nowrap',
                                index === workedSteps.length - 1
                                    ? 'text-xl text-brand-strong sm:text-2xl'
                                    : 'text-lg text-ink',
                            ]"
                        >
                            {{ step.value }}
                        </p>
                    </li>
                </ol>
            </div>
        </div>
    </section>

    <!-- Zones and every route's weight bands -->
    <section
        aria-labelledby="rates-title"
        class="border-t border-line-soft pt-14 pb-16 sm:pt-16 sm:pb-20"
    >
        <div class="container-page">
            <SectionHeading
                id="rates-title"
                size="md"
                eyebrow="Rates"
                :icon="MapPinned"
                :title="
                    zoned ? 'Prices by route' : 'One price list for Malaysia'
                "
                :description="
                    zoned
                        ? 'Find the zone your branch is in and the zone the parcel goes to.'
                        : 'The same rates from every branch to every state.'
                "
            />

            <template v-if="zoned">
                <h3
                    class="mt-8 text-base leading-6 font-extrabold tracking-heading text-ink"
                >
                    Which states are in which zone
                </h3>
                <ZoneList
                    :zones="zones"
                    :states="states"
                    heading-level="h4"
                    class="mt-3"
                />

                <h3
                    id="routes-from-title"
                    class="mt-10 text-base leading-6 font-extrabold tracking-heading text-ink"
                >
                    Rates from
                </h3>
                <!-- Toggle chips: the chosen zone is pale red. -->
                <div
                    role="group"
                    aria-labelledby="routes-from-title"
                    class="mt-3 flex flex-wrap gap-2"
                >
                    <button
                        v-for="zone in zones"
                        :key="zone.code"
                        type="button"
                        :aria-pressed="zone.code === fromZone?.code"
                        :class="[
                            'h-10 rounded-lg border px-3.5 text-sm font-bold transition-colors pointer-coarse:h-11',
                            zone.code === fromZone?.code
                                ? 'border-brand bg-brand-tint text-brand-strong'
                                : 'border-line-strong bg-white text-ink-2 hover:border-ink-2',
                        ]"
                        @click="fromCode = zone.code"
                    >
                        {{ zone.name }}
                    </button>
                </div>
            </template>

            <!-- Choosing a zone says so once, not every table again. -->
            <p v-if="zoned" class="sr-only" aria-live="polite">
                Showing rates from {{ fromZone?.name }}
            </p>
            <RouteRatesTable
                :caption="`Prices from ${fromZone?.name ?? 'Malaysia'}`"
                :routes="routeCards"
                class="mt-6"
            />

            <p
                class="mt-5 flex items-start gap-2 text-[13px] leading-5 text-muted-foreground"
            >
                <Ruler
                    aria-hidden="true"
                    class="mt-0.5 size-4 flex-none text-brand"
                />
                Weights are chargeable weights: the actual weight or the size
                weight ({{
                    formatVolumeSum(null, null, null, pricing.divisor, {
                        whole: true,
                    })
                }}), whichever is higher.
            </p>
        </div>
    </section>

    <!-- The calculator: the card spans the full container width, so its
         edges line up with the sections above and below. -->
    <section
        id="estimate"
        aria-label="Price estimate"
        class="bg-surface py-14 sm:py-16"
    >
        <div class="container-page">
            <PriceEstimator
                :pricing="pricing"
                :branches="branches"
                :states="states"
                heading-level="h2"
                title="Estimate your price"
            />
        </div>
    </section>

    <!-- Examples -->
    <section
        v-if="examples.length > 0"
        aria-labelledby="examples-title"
        class="pt-14 sm:pt-20"
    >
        <div class="container-page">
            <SectionHeading
                id="examples-title"
                size="md"
                eyebrow="Examples"
                :icon="Package"
                title="What everyday parcels cost"
                :description="examplesNote"
            />

            <!-- Phones: one card per parcel -->
            <ul class="mt-6 grid gap-3 md:hidden">
                <li
                    v-for="example in examples"
                    :key="example.name"
                    class="rounded-xl border border-line bg-white p-4"
                >
                    <div class="flex items-start justify-between gap-3">
                        <div>
                            <h3 class="text-base leading-6 font-bold text-ink">
                                {{ example.name }}
                            </h3>
                            <p
                                class="text-[13px] leading-5 text-muted-foreground"
                            >
                                {{ example.note }}
                            </p>
                        </div>
                        <p
                            class="font-mono text-lg leading-6 font-bold whitespace-nowrap text-ink"
                        >
                            {{ formatMoney(example.estimate.priceSen) }}
                        </p>
                    </div>
                    <dl
                        class="mt-3 grid grid-cols-2 gap-x-4 gap-y-2 border-t border-line-soft pt-3 text-[13px] leading-5"
                    >
                        <div>
                            <dt class="text-muted-foreground">Weight</dt>
                            <dd class="font-semibold text-ink">
                                {{ formatWeight(example.weightG) }}
                            </dd>
                        </div>
                        <div>
                            <dt class="text-muted-foreground">Box size</dt>
                            <dd class="font-semibold text-ink">
                                {{
                                    formatDimensions(
                                        example.lengthCm,
                                        example.widthCm,
                                        example.heightCm,
                                    )
                                }}
                            </dd>
                        </div>
                        <div>
                            <dt class="text-muted-foreground">Size weight</dt>
                            <dd class="font-semibold text-ink">
                                {{ formatWeight(example.estimate.volumetricG) }}
                            </dd>
                        </div>
                        <div>
                            <dt class="text-muted-foreground">Charged as</dt>
                            <dd class="font-semibold text-ink">
                                {{
                                    formatKg(
                                        billedWeightGrams(example.estimate),
                                    )
                                }}
                                {{
                                    chargedByVolume(example.estimate)
                                        ? '(by size)'
                                        : ''
                                }}
                            </dd>
                        </div>
                    </dl>
                </li>
            </ul>

            <!-- Tablets and up: a table (.data-table in app.css). -->
            <div
                class="mt-8 hidden overflow-hidden rounded-2xl border border-line bg-white md:block"
            >
                <table role="table" class="data-table text-sm [--columns:7]">
                    <caption class="sr-only">
                        Example prices for everyday parcels
                    </caption>
                    <thead
                        role="rowgroup"
                        class="data-table__head bg-surface text-[13px] whitespace-nowrap text-muted-foreground"
                    >
                        <tr role="row" class="data-table__row">
                            <th
                                scope="col"
                                role="columnheader"
                                class="py-3 font-semibold"
                            >
                                Parcel
                            </th>
                            <th
                                scope="col"
                                role="columnheader"
                                class="py-3 font-semibold"
                            >
                                Weight
                            </th>
                            <th
                                scope="col"
                                role="columnheader"
                                class="py-3 font-semibold"
                            >
                                Box size
                            </th>
                            <th
                                scope="col"
                                role="columnheader"
                                class="py-3 font-semibold"
                            >
                                Size weight
                            </th>
                            <th
                                scope="col"
                                role="columnheader"
                                class="py-3 font-semibold"
                            >
                                Charged as
                            </th>
                            <th
                                scope="col"
                                role="columnheader"
                                class="py-3 font-semibold"
                            >
                                Charged by
                            </th>
                            <th
                                scope="col"
                                role="columnheader"
                                class="py-3 font-semibold"
                            >
                                Price
                            </th>
                        </tr>
                    </thead>
                    <!-- Only the parcel names may wrap. -->
                    <tbody
                        role="rowgroup"
                        class="data-table__body divide-y divide-line-soft whitespace-nowrap"
                    >
                        <tr
                            v-for="example in examples"
                            :key="example.name"
                            role="row"
                            class="data-table__row"
                        >
                            <th
                                scope="row"
                                role="rowheader"
                                class="py-4 font-normal whitespace-normal"
                            >
                                <span class="block font-bold text-ink">{{
                                    example.name
                                }}</span>
                                <span
                                    class="block text-[13px] text-muted-foreground"
                                    >{{ example.note }}</span
                                >
                            </th>
                            <td
                                role="cell"
                                class="py-4 text-ink-2 tabular-nums"
                            >
                                {{ formatWeight(example.weightG) }}
                            </td>
                            <td
                                role="cell"
                                class="py-4 text-ink-2 tabular-nums"
                            >
                                {{
                                    formatDimensions(
                                        example.lengthCm,
                                        example.widthCm,
                                        example.heightCm,
                                    )
                                }}
                            </td>
                            <td
                                role="cell"
                                class="py-4 text-ink-2 tabular-nums"
                            >
                                {{ formatWeight(example.estimate.volumetricG) }}
                            </td>
                            <td
                                role="cell"
                                class="py-4 font-semibold text-ink tabular-nums"
                            >
                                {{
                                    formatKg(
                                        billedWeightGrams(example.estimate),
                                    )
                                }}
                            </td>
                            <td role="cell" class="py-4">
                                <span
                                    :class="[
                                        'inline-block rounded-[4px] px-1.5 text-[11px] leading-[18px] font-bold whitespace-nowrap',
                                        chargedByVolume(example.estimate)
                                            ? 'bg-highlight text-ink'
                                            : 'bg-line-soft text-ink-2',
                                    ]"
                                >
                                    {{
                                        chargedByVolume(example.estimate)
                                            ? 'By size'
                                            : 'By weight'
                                    }}
                                </span>
                            </td>
                            <td
                                role="cell"
                                class="py-4 font-mono text-[15px] font-bold text-ink"
                            >
                                {{ formatMoney(example.estimate.priceSen) }}
                            </td>
                        </tr>
                    </tbody>
                </table>
            </div>
        </div>
    </section>

    <!-- Limits and paying -->
    <section
        aria-labelledby="limits-title"
        class="pt-14 pb-16 sm:pt-20 sm:pb-20"
    >
        <div class="container-page">
            <SectionHeading
                id="limits-title"
                size="md"
                eyebrow="Good to know"
                :icon="Store"
                title="Parcel limits and paying"
                :description="`Parcels over ${formatWeight(pricing.maxWeightG)} or longer than ${pricing.maxDimensionCm} cm on any side cannot be sent with Kotak.`"
            />
            <!-- Phones: the icon beside the text, as in the rules above -->
            <ul class="mt-8 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
                <li
                    v-for="limit in limits"
                    :key="limit.title"
                    class="rounded-2xl bg-surface p-5 max-sm:flex max-sm:items-start max-sm:gap-3.5 max-sm:p-4"
                >
                    <span
                        class="flex size-11 flex-none items-center justify-center rounded-lg bg-white text-brand"
                    >
                        <component
                            :is="limit.icon"
                            aria-hidden="true"
                            class="size-[22px]"
                        />
                    </span>
                    <div class="min-w-0">
                        <h3
                            class="mt-4 text-[17px] leading-6 font-extrabold tracking-heading text-ink max-sm:mt-0"
                        >
                            {{ limit.title }}
                        </h3>
                        <p
                            class="mt-1 text-sm leading-[22px] text-muted-foreground"
                        >
                            {{ limit.text }}
                        </p>
                    </div>
                </li>
            </ul>

            <!-- Call to action: a light red-tint panel, so it never meets the
                 red footer tape below red on red. From 640px the parcel stack
                 stands on its ground at the right with at least 40px of panel
                 above and below it (the panel's padding plus the drawing's own
                 margin); phones show the text and buttons only. -->
            <div
                class="mt-14 rounded-2xl bg-brand-tint px-5 py-8 sm:grid sm:grid-cols-[minmax(0,1fr)_auto] sm:items-center sm:gap-8 sm:px-8 sm:py-10 md:gap-10 md:px-10 lg:gap-12 lg:px-14"
            >
                <div>
                    <h2
                        class="text-[26px] leading-8 font-extrabold tracking-display text-ink sm:text-[32px] sm:leading-10"
                    >
                        Ready to send a parcel?
                    </h2>
                    <p class="mt-2 max-w-lg text-[15px] leading-6 text-ink-2">
                        Create the order online in a couple of minutes, then
                        drop the parcel at any Kotak branch in the Klang Valley.
                    </p>
                    <div class="mt-6 flex flex-col gap-2.5 sm:flex-row">
                        <Button
                            v-if="canSend"
                            as-child
                            class="h-12 px-5 text-[15px] font-bold"
                        >
                            <Link :href="createOrder()">
                                Send a parcel
                                <ArrowRight aria-hidden="true" />
                            </Link>
                        </Button>
                        <Button
                            as-child
                            variant="outline"
                            class="h-12 px-5 text-[15px] font-bold"
                        >
                            <Link :href="branchesIndex()">Find a branch</Link>
                        </Button>
                    </div>
                </div>
                <ParcelStack class="w-32 max-sm:hidden md:w-36 lg:w-40" />
            </div>
        </div>
    </section>
</template>
