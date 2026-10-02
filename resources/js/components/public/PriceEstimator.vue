<script setup lang="ts">
import { Link } from '@inertiajs/vue3';
import { ArrowRight, Circle, CircleCheck, Info, Store } from '@lucide/vue';
import { useDebounceFn } from '@vueuse/core';
import { computed, reactive, ref, useId, watch } from 'vue';
import InputError from '@/components/InputError.vue';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { useCanSendParcels } from '@/composables/useCanSendParcels';
import { formatMoney, formatWeight } from '@/lib/format';
import { estimatePrice, kgToGrams } from '@/lib/pricing';
import { create as createOrder } from '@/routes/orders';
import type { Pricing } from '@/types';

/**
 * "Quick price estimate": the parcel weight and the box size (length ×
 * width × height) in, the estimated price out, worked out in the browser
 * with the same formula as PriceCalculator.php.
 *
 * The price is the one big result. Under it, quietly, is why: a parcel is
 * charged on whichever is higher, its actual weight or its size weight
 * (L × W × H ÷ divisor, also called volumetric weight), rounded up to a
 * full kg. Values are checked against the parcel limits as the visitor
 * types; screen readers hear the price once they pause.
 *
 * Laid out with container queries, so the same card fits the narrow column
 * on the home page and the full container width on the pricing page. When
 * the result panel is wide enough, the price and the reasoning sit side by
 * side from a common top line; narrower, they stack. The two weights read
 * like a price list, with a dotted leader from each label to its value.
 *
 * "Send this parcel" passes the size on to the order form as
 * ?declared_weight_g=&length_cm=&width_cm=&height_cm=, which pre-fills the
 * parcel step. Signed-in staff, drivers and admins do not see the button.
 */
const props = withDefaults(
    defineProps<{
        pricing: Pricing;
        headingLevel?: 'h2' | 'h3';
        title?: string;
        description?: string;
    }>(),
    {
        headingLevel: 'h3',
        title: 'Quick price estimate',
        description: 'Enter the parcel weight and the box size in centimetres.',
    },
);

const canSend = useCanSendParcels();

type Side = 'length' | 'width' | 'height';
type Field = 'weight' | Side;

const FIELDS: Field[] = ['weight', 'length', 'width', 'height'];

const sides: { key: Side; label: string }[] = [
    { key: 'length', label: 'Length' },
    { key: 'width', label: 'Width' },
    { key: 'height', label: 'Height' },
];

// The worked example from the design: 4.2 kg in a 40 × 30 × 25 cm box.
const values = reactive<Record<Field, string>>({
    weight: '4.2',
    length: '40',
    width: '30',
    height: '25',
});

const id = `estimate-${useId()}`;

function weightError(value: string): string | undefined {
    if (value.trim() === '') {
        return undefined;
    }

    const grams = kgToGrams(value.trim());

    if (!Number.isFinite(grams) || grams <= 0) {
        return 'Enter the weight in kg, for example 4.2.';
    }

    if (grams > props.pricing.maxWeightG) {
        return `We take parcels up to ${formatWeight(props.pricing.maxWeightG)}.`;
    }

    return undefined;
}

function sideError(label: string, value: string): string | undefined {
    const text = value.trim();

    if (text === '') {
        return undefined;
    }

    if (!/^\d+$/.test(text) || Number(text) < 1) {
        return `Enter the ${label.toLowerCase()} in whole centimetres, for example 30.`;
    }

    if (Number(text) > props.pricing.maxDimensionCm) {
        return `${label} can be up to ${props.pricing.maxDimensionCm} cm.`;
    }

    return undefined;
}

const errors = computed<Record<Field, string | undefined>>(() => ({
    weight: weightError(values.weight),
    length: sideError('Length', values.length),
    width: sideError('Width', values.width),
    height: sideError('Height', values.height),
}));

/** The box size problems, shown together under the length × width × height row. */
const sizeErrors = computed(() =>
    sides.flatMap((side) => {
        const message = errors.value[side.key];

        return message ? [{ key: side.key, message }] : [];
    }),
);

const invalid = computed(() => FIELDS.some((field) => errors.value[field]));

const estimate = computed(() => {
    const filled = FIELDS.every((field) => values[field].trim() !== '');

    if (!filled || invalid.value) {
        return null;
    }

    return estimatePrice(props.pricing, {
        weightG: kgToGrams(values.weight.trim()),
        lengthCm: Number(values.length),
        widthCm: Number(values.width),
        heightCm: Number(values.height),
    });
});

/** "40 × 30 × 25 ÷ 5000": how the size weight is worked out. */
const sizeSum = computed(() =>
    estimate.value
        ? `${Number(values.length)} × ${Number(values.width)} × ${Number(values.height)} ÷ ${props.pricing.divisor}`
        : `L × W × H ÷ ${props.pricing.divisor}`,
);

/** How the price adds up, on one line: "RM 8.00 first kg + 5 kg × RM 2.00". */
const breakdown = computed(() => {
    if (!estimate.value) {
        return invalid.value
            ? 'Fix the value marked in red to see your price.'
            : 'Fill in the weight and all three sides.';
    }

    const first = formatMoney(props.pricing.base);

    return estimate.value.extraKg > 0
        ? `${first} first kg + ${estimate.value.extraKg} kg × ${formatMoney(props.pricing.perKg)}`
        : `${first} for the first kg`;
});

/** The two weights, with the higher one (the one charged) ticked. */
const weights = computed(() => {
    const result = estimate.value;

    if (!result) {
        return [];
    }

    return [
        {
            key: 'actual',
            label: 'Actual weight',
            sum: null,
            value: formatWeight(result.actualG),
            used: !result.byVolume,
        },
        {
            key: 'size',
            label: 'Size weight',
            sum: sizeSum.value,
            value: formatWeight(result.volumetricG),
            used: result.byVolume,
        },
    ];
});

/** 4.2 kg is charged as 5 kg: say so when the weight is rounded up. */
const roundedUp = computed(
    () => estimate.value !== null && estimate.value.chargeableG % 1000 !== 0,
);

const orderLink = computed(() =>
    createOrder(
        estimate.value
            ? {
                  query: {
                      declared_weight_g: estimate.value.actualG,
                      length_cm: Number(values.length),
                      width_cm: Number(values.width),
                      height_cm: Number(values.height),
                  },
              }
            : undefined,
    ),
);

/*
 * Screen readers hear the result (or the first problem) once the visitor
 * stops typing, rather than on every key press.
 */
const announcement = ref('');
const summary = computed(() => {
    if (estimate.value) {
        return `Estimated price ${formatMoney(estimate.value.priceSen)}, charged as ${estimate.value.chargedKg} kg.`;
    }

    return FIELDS.map((field) => errors.value[field]).find(Boolean) ?? '';
});
const announce = useDebounceFn((text: string) => {
    announcement.value = text;
}, 800);

watch(summary, (text) => announce(text));
</script>

<template>
    <div
        role="group"
        :aria-labelledby="`${id}-title`"
        class="@container/estimator rounded-2xl border border-line bg-white p-5 shadow-card sm:p-7"
    >
        <div
            class="flex flex-col gap-3 @xl/estimator:flex-row @xl/estimator:items-start @xl/estimator:justify-between @xl/estimator:gap-4"
        >
            <div class="min-w-0">
                <component
                    :is="headingLevel"
                    :id="`${id}-title`"
                    class="text-xl leading-7 font-extrabold tracking-heading text-ink"
                >
                    {{ title }}
                </component>
                <p
                    class="mt-1 text-sm leading-5 text-pretty text-muted-foreground"
                >
                    {{ description }}
                </p>
            </div>
            <p
                class="inline-flex h-[30px] flex-none items-center gap-1.5 self-start rounded-sm bg-surface px-2.5 text-[12.5px] font-semibold whitespace-nowrap text-ink-2"
            >
                <Info aria-hidden="true" class="size-3.5" />
                Final price set at the counter
            </p>
        </div>

        <!-- The inputs and the result sit side by side only from 72rem, where
             the result column is still wide enough to show the price and the
             reasoning side by side too; below that they stack. -->
        <div
            class="mt-6 grid gap-6 @6xl/estimator:grid-cols-[minmax(0,1fr)_minmax(0,1.1fr)] @6xl/estimator:items-center @6xl/estimator:gap-8"
        >
            <!-- What the visitor types: the weight, then the box size -->
            <div class="@container/inputs">
                <div
                    class="flex flex-col gap-5 @lg/inputs:flex-row @lg/inputs:gap-6"
                >
                    <div class="min-w-0 @lg/inputs:w-40 @lg/inputs:flex-none">
                        <Label
                            :for="`${id}-weight`"
                            class="mb-1.5 text-[13px] leading-[19px] font-semibold text-ink"
                        >
                            Parcel weight
                            <span class="sr-only">in kilograms</span>
                        </Label>
                        <div class="relative">
                            <Input
                                :id="`${id}-weight`"
                                v-model="values.weight"
                                type="text"
                                inputmode="decimal"
                                autocomplete="off"
                                :aria-invalid="
                                    errors.weight ? 'true' : undefined
                                "
                                :aria-describedby="
                                    errors.weight
                                        ? `${id}-weight-error`
                                        : undefined
                                "
                                class="h-[50px] rounded-lg bg-white pr-11 pl-3.5 text-[17px] font-bold text-ink md:text-[17px]"
                            />
                            <span
                                aria-hidden="true"
                                class="pointer-events-none absolute top-1/2 right-3.5 -translate-y-1/2 text-sm font-semibold text-muted-foreground"
                            >
                                kg
                            </span>
                        </div>
                        <InputError
                            :id="`${id}-weight-error`"
                            :message="errors.weight"
                            class="mt-1.5 text-[13px] leading-[18px]"
                        />
                    </div>

                    <div
                        role="group"
                        :aria-labelledby="`${id}-size-label`"
                        class="min-w-0 flex-1"
                    >
                        <p
                            :id="`${id}-size-label`"
                            class="mb-1.5 text-[13px] leading-[19px] font-semibold text-ink"
                        >
                            Box size
                            <span class="font-medium text-muted-foreground">
                                in cm
                            </span>
                        </p>
                        <div class="flex items-start gap-1.5">
                            <template
                                v-for="(side, index) in sides"
                                :key="side.key"
                            >
                                <span
                                    v-if="index > 0"
                                    aria-hidden="true"
                                    class="flex h-[50px] flex-none items-center text-base font-semibold text-muted-foreground"
                                >
                                    ×
                                </span>
                                <div class="min-w-0 flex-1">
                                    <Input
                                        :id="`${id}-${side.key}`"
                                        v-model="values[side.key]"
                                        type="text"
                                        inputmode="numeric"
                                        autocomplete="off"
                                        :aria-invalid="
                                            errors[side.key]
                                                ? 'true'
                                                : undefined
                                        "
                                        :aria-describedby="
                                            errors[side.key]
                                                ? `${id}-${side.key}-error`
                                                : undefined
                                        "
                                        class="h-[50px] rounded-lg bg-white px-2 text-center text-[17px] font-bold text-ink md:text-[17px]"
                                    />
                                    <Label
                                        :for="`${id}-${side.key}`"
                                        class="mt-1 justify-center text-xs leading-4 font-medium text-muted-foreground"
                                    >
                                        {{ side.label }}
                                        <span class="sr-only">
                                            in centimetres
                                        </span>
                                    </Label>
                                </div>
                            </template>
                        </div>
                        <div
                            v-if="sizeErrors.length > 0"
                            class="mt-2 flex flex-col gap-1"
                        >
                            <InputError
                                v-for="problem in sizeErrors"
                                :id="`${id}-${problem.key}-error`"
                                :key="problem.key"
                                :message="problem.message"
                                class="text-[13px] leading-[18px]"
                            />
                        </div>
                    </div>
                </div>
            </div>

            <!-- The result: one price, with the reasoning quietly beside it
                 (under it when the panel is narrow). Side by side, the two
                 columns share a top line and a full-height divider. The
                 price column is at least as wide as its longest everyday
                 sum ("… + 29 kg × RM 2.00"), so the divider stays put as
                 the visitor types, including across 1 kg, where the sum
                 gets shorter. -->
            <div class="@container/result rounded-xl bg-surface p-4 sm:p-5">
                <div
                    class="flex flex-col gap-4 @lg/result:flex-row @lg/result:gap-6"
                >
                    <div class="flex-none @lg/result:min-w-50">
                        <p class="text-[13px] leading-5 font-bold text-ink-2">
                            Estimated price
                        </p>
                        <p
                            class="mt-1 text-4xl leading-[42px] font-extrabold tracking-display whitespace-nowrap text-brand-strong tabular-nums @sm/result:text-[40px] @sm/result:leading-[46px]"
                        >
                            <template v-if="estimate">
                                {{ formatMoney(estimate.priceSen) }}
                            </template>
                            <template v-else>
                                <span
                                    class="mr-2 text-[15px] font-bold tracking-normal text-ink-2"
                                >
                                    From
                                </span>
                                {{ formatMoney(pricing.base) }}
                            </template>
                        </p>
                        <p
                            :class="[
                                'mt-0.5 text-[13px] leading-5 text-muted-foreground',
                                estimate
                                    ? 'whitespace-nowrap tabular-nums'
                                    : '',
                            ]"
                        >
                            {{ breakdown }}
                        </p>
                    </div>

                    <div
                        class="min-w-0 flex-1 border-t border-line pt-4 text-[13px] leading-5 @lg/result:border-t-0 @lg/result:border-l @lg/result:pt-0 @lg/result:pl-6"
                    >
                        <template v-if="estimate">
                            <p class="text-ink-2">
                                <span class="font-bold text-ink">
                                    Charged as {{ estimate.chargedKg }} kg</span
                                >,
                                {{
                                    roundedUp
                                        ? 'the higher of these two, rounded up to a full kg:'
                                        : 'the higher of these two:'
                                }}
                            </p>
                            <!-- Read like a price list: a dotted leader runs
                                 from each label (and the size sum) to its
                                 value. When a row is too narrow, the sum and
                                 the leader move under the label together and
                                 the value stays at the end of that line. -->
                            <ul class="mt-2 flex flex-col gap-2">
                                <li
                                    v-for="weight in weights"
                                    :key="weight.key"
                                    :class="[
                                        'grid grid-cols-[1rem_minmax(0,1fr)_auto] gap-x-2',
                                        weight.used
                                            ? 'text-ink'
                                            : 'text-muted-foreground',
                                    ]"
                                >
                                    <CircleCheck
                                        v-if="weight.used"
                                        aria-hidden="true"
                                        class="mt-0.5 size-4 self-start text-brand-strong"
                                    />
                                    <Circle
                                        v-else
                                        aria-hidden="true"
                                        class="mt-0.5 size-4 self-start text-line-strong"
                                    />
                                    <span
                                        class="flex min-w-0 flex-wrap items-center gap-x-2"
                                    >
                                        <span
                                            :class="
                                                weight.used
                                                    ? 'font-semibold'
                                                    : ''
                                            "
                                        >
                                            {{ weight.label }}
                                        </span>
                                        <span
                                            class="flex flex-1 items-center gap-2"
                                        >
                                            <span
                                                v-if="weight.sum"
                                                class="whitespace-nowrap text-muted-foreground"
                                            >
                                                {{ weight.sum }}
                                            </span>
                                            <span
                                                aria-hidden="true"
                                                class="price-estimator__leader min-w-4 flex-1 text-line-strong"
                                            />
                                        </span>
                                    </span>
                                    <span
                                        :class="[
                                            'self-end whitespace-nowrap tabular-nums',
                                            weight.used ? 'font-bold' : '',
                                        ]"
                                    >
                                        {{ weight.value }}
                                        <span
                                            v-if="weight.used"
                                            class="sr-only"
                                        >
                                            (the higher one)
                                        </span>
                                    </span>
                                </li>
                            </ul>
                        </template>
                        <p v-else class="text-muted-foreground">
                            We charge whichever is higher: the actual weight or
                            the size weight ({{ sizeSum }}), rounded up to a
                            full kg.
                        </p>
                    </div>
                </div>
            </div>
        </div>

        <p class="sr-only" aria-live="polite" aria-atomic="true">
            {{ announcement }}
        </p>

        <div
            class="mt-6 flex flex-col gap-4 border-t border-line pt-5 @xl/estimator:flex-row @xl/estimator:items-center @xl/estimator:justify-between @xl/estimator:gap-5"
        >
            <p
                class="flex items-center gap-2 text-sm leading-5 text-muted-foreground @sm/estimator:whitespace-nowrap"
            >
                <Store aria-hidden="true" class="size-5 flex-none text-brand" />
                Pay at the branch after weighing, by cash or card.
            </p>
            <Button
                v-if="canSend"
                as-child
                class="h-12 w-full flex-none rounded-lg px-5 text-[15px] font-bold @xl/estimator:w-auto"
            >
                <Link :href="orderLink">
                    Send this parcel
                    <ArrowRight aria-hidden="true" class="size-[18px]" />
                </Link>
            </Button>
        </div>
    </div>
</template>

<style scoped>
/*
 * The dotted leader from a weight's label to its value, as in a price list:
 * round 2px dots every 6px in the element's colour (text-line-strong),
 * spaced evenly so no dot is cut off at either end. The strip is 2px tall
 * and sits 1px below the middle of the 20px line, which is the optical
 * centre of the 13px text (between the x-height and the figure height of
 * Plus Jakarta Sans), so it lines up with the words on both sides.
 */
.price-estimator__leader {
    height: 2px;
    translate: 0 1px;
    background-image: radial-gradient(
        circle,
        currentColor 0.75px,
        transparent 1.25px
    );
    background-position: center;
    background-repeat: space no-repeat;
    background-size: 6px 2px;
}
</style>
