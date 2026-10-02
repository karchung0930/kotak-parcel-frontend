<script setup lang="ts">
import { Banknote, TriangleAlert, Weight } from '@lucide/vue';
import { computed } from 'vue';
import KotakTape from '@/components/brand/KotakTape.vue';
import Notice from '@/components/Notice.vue';
import { formatMoney, formatWeight } from '@/lib/format';
import type { ParcelSize, PriceEstimate } from '@/lib/pricing';
import type { Pricing } from '@/types';

/**
 * The live price estimate on "Send a parcel": the price, the chargeable
 * weight (the higher of actual and volumetric, tagged) and how the price
 * adds up. Display only; the server prices the order and the branch
 * confirms the final price when it weighs the parcel.
 *
 * Not a live region itself: the page announces a short summary instead,
 * so screen readers are not read the whole card on every keystroke.
 */
const props = defineProps<{
    pricing: Pricing;
    estimate: PriceEstimate | null;
    /** What the customer typed, for the volumetric sum and the limits. */
    size: Partial<ParcelSize>;
}>();

const volumeSum = computed(() => {
    const { lengthCm, widthCm, heightCm } = props.size;

    return `${lengthCm} × ${widthCm} × ${heightCm} ÷ ${props.pricing.divisor}`;
});

const breakdown = computed(() => {
    const first = `${formatMoney(props.pricing.base)} first kg`;

    if (!props.estimate || props.estimate.extraKg === 0) {
        return first;
    }

    return `${first} + ${props.estimate.extraKg} × ${formatMoney(props.pricing.perKg)}`;
});

/** 4.2 kg is charged as 5 kg: say so when the weight is rounded up. */
const roundedUp = computed(
    () => props.estimate !== null && props.estimate.chargeableG % 1000 !== 0,
);

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
                            {{ formatMoney(pricing.base) }}
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
                    Charged as {{ formatWeight(estimate.chargeableG) }}
                </span>
            </div>

            <dl v-if="estimate" class="mt-3.5 text-sm leading-5">
                <div
                    class="flex min-h-9 items-center justify-between gap-3 border-t border-line-soft py-2"
                >
                    <dt class="text-muted-foreground">Actual weight</dt>
                    <dd class="flex items-center gap-2 font-bold text-ink">
                        <span
                            v-if="!estimate.byVolume"
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
                    <dd class="flex items-center gap-2 font-bold text-ink">
                        <span
                            v-if="estimate.byVolume"
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
                            Priced as {{ estimate.chargedKg }} kg: every started
                            kg counts
                        </span>
                    </dt>
                    <dd class="font-extrabold text-brand-strong">
                        {{ formatWeight(estimate.chargeableG) }}
                    </dd>
                </div>
                <div
                    class="flex min-h-9 items-center justify-between gap-3 border-t border-line-soft py-2"
                >
                    <dt class="text-muted-foreground">{{ breakdown }}</dt>
                    <dd class="font-extrabold text-ink tabular-nums">
                        {{ formatMoney(estimate.priceSen) }}
                    </dd>
                </div>
            </dl>

            <p
                v-else
                class="mt-3 border-t border-line-soft pt-3 text-sm leading-[22px] text-pretty text-muted-foreground"
            >
                Add the weight and box size to see your price.
                {{ formatMoney(pricing.base) }} covers the first kg, then
                {{ formatMoney(pricing.perKg) }} for each extra kg. Big, light
                boxes are charged by size.
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
