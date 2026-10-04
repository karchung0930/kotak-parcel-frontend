<script setup lang="ts">
import { Banknote, TriangleAlert, Weight } from '@lucide/vue';
import { computed } from 'vue';
import KotakTape from '@/components/brand/KotakTape.vue';
import Notice from '@/components/Notice.vue';
import RouteTitle from '@/components/RouteTitle.vue';
import {
    formatKg,
    formatMoney,
    formatVolumeSum,
    formatWeight,
} from '@/lib/format';
import {
    billedWeightGrams,
    chargedByVolume,
    lowestPriceSen,
    routeName,
} from '@/lib/pricing';
import type { ParcelSize, PriceQuote } from '@/lib/pricing';
import type { Pricing } from '@/types';

/**
 * The live price estimate on "Send a parcel": the price, the route it is
 * priced on, the chargeable weight (the higher of actual and volumetric,
 * tagged) and how the price adds up from the weight band. Display only;
 * the server prices the order and the branch confirms the final price
 * when it weighs the parcel.
 *
 * Not a live region itself: the page announces a short summary instead,
 * so screen readers are not read the whole card on every keystroke.
 */
const props = defineProps<{
    pricing: Pricing;
    estimate: PriceQuote | null;
    /** What the customer typed, for the volumetric sum and the limits. */
    size: Partial<ParcelSize>;
    /** What the price still waits for besides the parcel: the receiver's state or a branch. */
    needs: 'state' | 'branch' | null;
}>();

const volumeSum = computed(() =>
    formatVolumeSum(
        props.size.lengthCm,
        props.size.widthCm,
        props.size.heightCm,
        props.pricing.divisor,
    ),
);

/** "Within Peninsular Malaysia" or "Peninsular Malaysia → Sarawak". */
const route = computed(() =>
    props.estimate
        ? routeName(props.estimate.originZone, props.estimate.destinationZone)
        : '',
);

/**
 * "RM 8.00 up to 1 kg" and "+ 5 kg × RM 2.00", as in the price estimator,
 * kept apart so a narrow card wraps between the two parts rather than
 * inside one.
 */
const breakdown = computed(() => {
    const priced = props.estimate;

    if (!priced) {
        return null;
    }

    return {
        band: `${formatMoney(priced.bandPriceSen)} up to ${formatKg(priced.bandMaxG)}`,
        extra:
            priced.extraKg > 0
                ? `+ ${priced.extraKg} kg × ${formatMoney(priced.extraKgSen)}`
                : null,
    };
});

/** 4.2 kg is priced as 5 kg: say why when the price stands for more. */
const roundedUp = computed(() => {
    const priced = props.estimate;

    if (!priced || billedWeightGrams(priced) === priced.chargeableG) {
        return null;
    }

    return priced.extraKg > 0
        ? `Priced as ${formatKg(billedWeightGrams(priced))}: every started kg counts`
        : `Priced in the band up to ${formatKg(priced.bandMaxG)}`;
});

const waitingFor = computed(() => {
    switch (props.needs) {
        case 'state':
            return "Choose the receiver's state in step 1 to see your price.";
        case 'branch':
            return 'Choose a drop-off branch in step 3 to see your price.';
        default:
            return 'Add the weight and box size to see your price.';
    }
});

const limits = computed(() => {
    const problems: string[] = [];
    const sides = [
        props.size.lengthCm,
        props.size.widthCm,
        props.size.heightCm,
    ];

    if ((props.size.weightG ?? 0) > props.pricing.maxWeightG) {
        problems.push(
            `We accept parcels up to ${formatWeight(props.pricing.maxWeightG)}.`,
        );
    }

    if (sides.some((side) => (side ?? 0) > props.pricing.maxDimensionCm)) {
        problems.push(
            `Each side of the box can be up to ${props.pricing.maxDimensionCm} cm.`,
        );
    }

    return problems;
});
</script>

<template>
    <section
        aria-labelledby="estimate-title"
        class="overflow-hidden rounded-2xl border border-line bg-white"
    >
        <KotakTape :height="34" :repeat="10" :shadow="false" />

        <!-- In the form's column below 1024px, so padded like the steps
             around it; in the side column from 1024px. -->
        <div class="p-4 sm:p-6 lg:p-5">
            <div class="flex flex-wrap items-end justify-between gap-3">
                <div>
                    <h2
                        id="estimate-title"
                        class="text-[13px] leading-[18px] font-bold text-muted-foreground"
                    >
                        Estimated price
                    </h2>
                    <p
                        v-if="estimate"
                        class="mt-0.5 text-4xl leading-[42px] font-extrabold tracking-display text-ink tabular-nums"
                    >
                        {{ formatMoney(estimate.priceSen) }}
                    </p>
                    <p
                        v-else
                        class="mt-0.5 flex items-baseline gap-2 text-ink tabular-nums"
                    >
                        <span class="text-[15px] font-bold text-ink-2">
                            From
                        </span>
                        <span
                            class="text-4xl leading-[42px] font-extrabold tracking-display"
                        >
                            {{ formatMoney(lowestPriceSen(pricing)) }}
                        </span>
                    </p>
                </div>
                <span
                    v-if="estimate"
                    class="mb-1.5 inline-flex h-7 items-center gap-1.5 rounded-sm bg-brand-tint px-2.5 text-[12.5px] font-bold whitespace-nowrap text-brand-strong"
                >
                    <Weight
                        aria-hidden="true"
                        class="size-3.5"
                        :stroke-width="2.2"
                    />
                    Charged as {{ formatKg(billedWeightGrams(estimate)) }}
                </span>
            </div>

            <dl v-if="estimate" class="mt-3.5 text-sm leading-5">
                <div
                    class="flex min-h-9 items-center justify-between gap-3 border-t border-line-soft py-2"
                >
                    <dt class="text-muted-foreground">Route</dt>
                    <dd class="text-right font-bold text-pretty text-ink">
                        <RouteTitle :title="route" />
                    </dd>
                </div>
                <div
                    class="flex min-h-9 items-center justify-between gap-3 border-t border-line-soft py-2"
                >
                    <dt class="text-muted-foreground">Actual weight</dt>
                    <dd
                        class="flex items-center gap-2 font-bold whitespace-nowrap text-ink"
                    >
                        <span
                            v-if="!chargedByVolume(estimate)"
                            class="rounded-[4px] bg-brand-tint px-1.5 text-[11.5px] leading-5 font-bold text-brand-strong"
                        >
                            Higher
                        </span>
                        {{ formatWeight(estimate.actualG) }}
                    </dd>
                </div>
                <div
                    class="flex min-h-9 items-center justify-between gap-3 border-t border-line-soft py-2"
                >
                    <dt class="text-muted-foreground">
                        Size weight
                        <span class="text-[12.5px] whitespace-nowrap">
                            ({{ volumeSum }})
                        </span>
                    </dt>
                    <dd
                        class="flex items-center gap-2 font-bold whitespace-nowrap text-ink"
                    >
                        <span
                            v-if="chargedByVolume(estimate)"
                            class="rounded-[4px] bg-brand-tint px-1.5 text-[11.5px] leading-5 font-bold text-brand-strong"
                        >
                            Higher
                        </span>
                        {{ formatWeight(estimate.volumetricG) }}
                    </dd>
                </div>
                <div
                    class="flex min-h-9 items-center justify-between gap-3 border-t border-line-soft py-2"
                >
                    <dt class="font-bold text-ink">
                        Charged weight (the higher one)
                        <span
                            v-if="roundedUp"
                            class="block text-[12.5px] font-normal text-muted-foreground"
                        >
                            {{ roundedUp }}
                        </span>
                    </dt>
                    <dd
                        class="font-extrabold whitespace-nowrap text-brand-strong"
                    >
                        {{ formatWeight(estimate.chargeableG) }}
                    </dd>
                </div>
                <div
                    class="flex min-h-9 items-center justify-between gap-3 border-t border-line-soft py-2"
                >
                    <dt
                        v-if="breakdown"
                        class="flex flex-wrap gap-x-1 text-muted-foreground"
                    >
                        <span class="whitespace-nowrap">{{
                            breakdown.band
                        }}</span>
                        <span
                            v-if="breakdown.extra"
                            class="whitespace-nowrap"
                            >{{ breakdown.extra }}</span
                        >
                    </dt>
                    <dd
                        class="font-extrabold whitespace-nowrap text-ink tabular-nums"
                    >
                        {{ formatMoney(estimate.priceSen) }}
                    </dd>
                </div>
            </dl>

            <p
                v-else
                class="mt-3 border-t border-line-soft pt-3 text-sm leading-[22px] text-pretty text-muted-foreground"
            >
                {{ waitingFor }}
                Prices go by weight band, on the route from your branch to the
                receiver's state. Big, light boxes are charged by size.
            </p>

            <Notice
                v-if="limits.length > 0"
                tone="warning"
                :icon="TriangleAlert"
                title="Too big to send"
                class="mt-3"
            >
                <p v-for="problem in limits" :key="problem">{{ problem }}</p>
            </Notice>

            <Notice :icon="Banknote" class="mt-3">
                Pay at the branch by cash or card. Staff confirm the final price
                when they weigh it.
            </Notice>
        </div>
    </section>
</template>
