<script setup lang="ts">
import { refDebounced } from '@vueuse/core';
import { computed, useId } from 'vue';
import KotakTape from '@/components/brand/KotakTape.vue';
import KeepTogether from '@/components/KeepTogether.vue';
import RouteTitle from '@/components/RouteTitle.vue';
import { formatKg, formatMoney, formatWeight } from '@/lib/format';
import { estimatePrice, routeName } from '@/lib/pricing';
import type { ParcelSize } from '@/lib/pricing';
import type { MalaysianStateValue, Pricing } from '@/types';

/**
 * How a parcel's price is worked out at the counter: the big price, the
 * chargeable weight and the steps behind it: the route between the two
 * zones, actual vs volumetric weight, then the weight band and any extra
 * kg above it. Updates live while staff type; the price and chargeable
 * weight are announced politely to screen readers once typing pauses, so
 * each keystroke is not read out.
 */
const props = withDefaults(
    defineProps<{
        /** The rate card the price comes from, with the parcel limits. */
        pricing: Pricing;
        size: Partial<ParcelSize>;
        /** The state of the branch the parcel is handed in at. */
        origin: MalaysianStateValue;
        /** The delivery address's state. */
        destination: MalaysianStateValue;
        title?: string;
        /** The price to show instead of the computed one (the server's final price). */
        priceSen?: number | null;
        /** The customer's online estimate, to explain any difference. */
        estimateSen?: number | null;
        /** Shown while the weight is still missing. */
        placeholder?: string;
    }>(),
    {
        title: 'Final price',
        priceSen: null,
        estimateSen: null,
        placeholder: 'Enter the weight to see the price.',
    },
);

const id = `price-${useId()}`;

const estimate = computed(() =>
    estimatePrice(
        props.pricing,
        { origin: props.origin, destination: props.destination },
        props.size,
    ),
);

const price = computed(() => props.priceSen ?? estimate.value?.priceSen);

const difference = computed(() =>
    price.value === undefined || props.estimateSen === null
        ? null
        : price.value - props.estimateSen,
);

const summary = computed(() =>
    price.value === undefined || !estimate.value
        ? ''
        : `${props.title} ${formatMoney(price.value)}, ${formatWeight(estimate.value.chargeableG)} chargeable.`,
);

/** Read out once typing pauses, not on every keystroke. */
const announced = refDebounced(summary, 800);

const volumeFormula = computed(() => {
    const { lengthCm, widthCm, heightCm } = props.size;

    return `${lengthCm} × ${widthCm} × ${heightCm} ÷ ${props.pricing.divisor}`;
});

/** "Within Peninsular Malaysia" or "Peninsular Malaysia → Sarawak". */
const route = computed(() =>
    estimate.value
        ? routeName(estimate.value.originZone, estimate.value.destinationZone)
        : '',
);
</script>

<template>
    <section
        :aria-labelledby="id"
        class="overflow-hidden rounded-xl border border-line bg-white"
    >
        <KotakTape :height="34" :shadow="false" :repeat="8" />

        <div class="p-4 sm:p-5">
            <p aria-live="polite" class="sr-only">{{ announced }}</p>
            <div class="flex flex-wrap items-end justify-between gap-3">
                <div>
                    <h3
                        :id="id"
                        class="text-[13px] leading-[18px] font-bold text-muted-foreground"
                    >
                        {{ title }}
                    </h3>
                    <p
                        class="mt-0.5 text-4xl leading-[42px] font-extrabold tracking-display text-ink tabular-nums"
                    >
                        {{ price === undefined ? 'RM –' : formatMoney(price) }}
                    </p>
                </div>
                <p
                    v-if="estimate"
                    class="mb-1.5 inline-flex h-7 items-center rounded-sm bg-brand-tint px-2.5 text-[12.5px] font-bold whitespace-nowrap text-brand-strong"
                >
                    {{ formatWeight(estimate.chargeableG) }} chargeable
                </p>
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
                    <dd class="font-bold text-ink tabular-nums">
                        {{ formatWeight(estimate.actualG) }}
                    </dd>
                </div>
                <div
                    class="flex min-h-9 items-center justify-between gap-3 border-t border-line-soft py-2"
                >
                    <dt class="text-muted-foreground">
                        Volumetric
                        <span class="text-[12.5px] whitespace-nowrap">
                            ({{ volumeFormula }})
                        </span>
                    </dt>
                    <dd class="font-bold text-ink tabular-nums">
                        {{ formatWeight(estimate.volumetricG) }}
                    </dd>
                </div>
                <div
                    class="flex min-h-9 items-center justify-between gap-3 border-t border-line-soft py-2"
                >
                    <dt class="font-bold text-ink">
                        Chargeable, the higher one
                    </dt>
                    <dd class="font-extrabold text-brand-strong tabular-nums">
                        {{ formatWeight(estimate.chargeableG) }}
                    </dd>
                </div>
                <div
                    class="flex min-h-9 items-center justify-between gap-3 border-t border-line-soft py-2"
                >
                    <dt class="text-muted-foreground">
                        Band up to {{ formatKg(estimate.bandMaxG) }}
                    </dt>
                    <dd class="font-bold text-ink tabular-nums">
                        {{ formatMoney(estimate.bandPriceSen) }}
                    </dd>
                </div>
                <div
                    v-if="estimate.extraKg > 0"
                    class="flex min-h-9 items-center justify-between gap-3 border-t border-line-soft py-2"
                >
                    <!-- The extra kg part wraps whole, so a price is never
                         left alone on the next line. -->
                    <dt class="text-muted-foreground">
                        Extra kg over {{ formatKg(estimate.bandMaxG) }}
                        <span class="whitespace-nowrap">
                            ({{ estimate.extraKg }} ×
                            {{ formatMoney(estimate.extraKgSen) }})
                        </span>
                    </dt>
                    <dd class="font-bold text-ink tabular-nums">
                        {{
                            formatMoney(estimate.extraKg * estimate.extraKgSen)
                        }}
                    </dd>
                </div>
                <div
                    class="flex min-h-9 items-center justify-between gap-3 border-t border-line-soft py-2"
                >
                    <dt class="font-bold text-ink">Price</dt>
                    <dd class="font-extrabold text-ink tabular-nums">
                        {{ formatMoney(estimate.priceSen) }}
                    </dd>
                </div>
            </dl>
            <p
                v-else
                class="mt-3 border-t border-line-soft pt-3 text-sm leading-5 text-muted-foreground"
            >
                {{ placeholder }}
            </p>

            <p
                v-if="estimate && pricing.name"
                class="mt-3 text-[12.5px] leading-[18px] text-muted-foreground"
            >
                Priced with <KeepTogether :text="pricing.name" />.
            </p>

            <!-- The amount and its difference wrap as one part. -->
            <p
                v-if="difference !== null && estimate"
                class="mt-3 rounded-lg bg-surface px-3 py-2.5 text-[13px] leading-5 text-ink-2"
            >
                Customer's online estimate:
                <span class="whitespace-nowrap">
                    <strong class="font-bold text-ink">
                        {{ formatMoney(estimateSen) }}
                    </strong>
                    <template v-if="difference > 0">
                        · {{ formatMoney(difference) }} more
                    </template>
                    <template v-else-if="difference < 0">
                        · {{ formatMoney(-difference) }} less
                    </template>
                    <template v-else> · no change</template>
                </span>
            </p>
        </div>
    </section>
</template>
