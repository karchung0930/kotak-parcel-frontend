<script setup lang="ts">
import { useForm } from '@inertiajs/vue3';
import { Info, RotateCcw, Scale, TriangleAlert } from '@lucide/vue';
import { computed, nextTick, ref } from 'vue';
import PriceBreakdown from '@/components/counter/PriceBreakdown.vue';
import InputError from '@/components/InputError.vue';
import Notice from '@/components/Notice.vue';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Spinner } from '@/components/ui/spinner';
import UnitInput from '@/components/UnitInput.vue';
import { formatDimensions, formatWeight } from '@/lib/format';
import { kgToGrams } from '@/lib/pricing';
import { dropOff } from '@/routes/staff/orders';
import type { MalaysianStateValue, Order, Pricing } from '@/types';

/**
 * Step 1 at the counter: weigh the parcel, correct the box size if it is
 * different and see the final price live before saving it.
 */
const props = defineProps<{
    order: Order;
    /** The card in effect, with the parcel limits. */
    pricing: Pricing;
    /** The state of this counter's branch, where the price runs from. */
    origin: MalaysianStateValue;
}>();

type Dimension = 'length_cm' | 'width_cm' | 'height_cm';
type Field = 'measured_weight_g' | Dimension;

const SIDES: { key: Dimension; id: string; label: string }[] = [
    { key: 'length_cm', id: 'length-cm', label: 'Length' },
    { key: 'width_cm', id: 'width-cm', label: 'Width' },
    { key: 'height_cm', id: 'height-cm', label: 'Height' },
];

const FIELD_IDS: Record<Field, string> = {
    measured_weight_g: 'measured-weight',
    length_cm: 'length-cm',
    width_cm: 'width-cm',
    height_cm: 'height-cm',
};

// What staff type from the scale, in kg; sent as whole grams.
const weightKg = ref('');

/*
 * The weight field is focused only with a mouse (a counter PC, often with a
 * USB scale). On a touch screen focusing it would open the keyboard and
 * scroll the page past the parcel's headline.
 */
const focusWeight =
    typeof window !== 'undefined' &&
    window.matchMedia('(pointer: fine)').matches;

// Pre-filled with the customer's measurements; only changed sides are sent.
const form = useForm({
    measured_weight_g: null as number | null,
    length_cm: String(props.order.length_cm),
    width_cm: String(props.order.width_cm),
    height_cm: String(props.order.height_cm),
});

const grams = computed(() =>
    weightKg.value.trim() === '' ? Number.NaN : kgToGrams(weightKg.value),
);

/** A typed side in cm, or null when it was left blank. */
function typedCm(key: Dimension): number | null {
    const value = form[key].trim();

    return value === '' ? null : Number(value);
}

/** The side used for the price: the typed one, or the customer's. */
function sideCm(key: Dimension): number {
    return typedCm(key) ?? props.order[key];
}

const size = computed(() => ({
    weightG: grams.value,
    lengthCm: sideCm('length_cm'),
    widthCm: sideCm('width_cm'),
    heightCm: sideCm('height_cm'),
}));

const sizeChanged = computed(() =>
    SIDES.some(({ key }) => sideCm(key) !== props.order[key]),
);

// Live feedback beside the price, before staff try to save.
const overLimit = computed(
    () =>
        grams.value > props.pricing.maxWeightG ||
        SIDES.some(({ key }) => sideCm(key) > props.pricing.maxDimensionCm),
);

const pricePlaceholder = computed(() =>
    Number.isFinite(grams.value) && grams.value > 0
        ? 'Check the box size: whole centimetres on every side.'
        : 'Enter the weight to see the price.',
);

function resetSize(): void {
    form.reset('length_cm', 'width_cm', 'height_cm');
    form.clearErrors('length_cm', 'width_cm', 'height_cm');
}

/** Friendly checks before sending, so staff never see raw validation text. */
function validate(): Partial<Record<Field, string>> {
    const errors: Partial<Record<Field, string>> = {};
    const weight = grams.value;

    if (!Number.isFinite(weight) || weight <= 0) {
        errors.measured_weight_g =
            'Enter the weight shown on the scale, in kg (for example 4.25).';
    } else if (weight > props.pricing.maxWeightG) {
        errors.measured_weight_g = `Kotak takes parcels up to ${formatWeight(props.pricing.maxWeightG)}. This parcel is too heavy to send.`;
    }

    for (const { key, label } of SIDES) {
        const value = typedCm(key);

        if (value === null) {
            continue;
        }

        if (!Number.isInteger(value) || value < 1) {
            errors[key] = `${label}: enter whole centimetres.`;
        } else if (value > props.pricing.maxDimensionCm) {
            errors[key] =
                `${label}: each side can be at most ${props.pricing.maxDimensionCm} cm.`;
        }
    }

    return errors;
}

function focusFirstError(): void {
    void nextTick(() => {
        const first = (Object.keys(FIELD_IDS) as Field[]).find(
            (field) => form.errors[field],
        );

        if (first) {
            document.getElementById(FIELD_IDS[first])?.focus();
        }
    });
}

function submit(): void {
    const errors = validate();

    form.clearErrors();

    if (Object.keys(errors).length > 0) {
        form.setError(errors);
        focusFirstError();

        return;
    }

    form.transform(() => ({
        measured_weight_g: grams.value,
        // A side is only sent when staff changed it.
        ...Object.fromEntries(
            SIDES.map(({ key }) => [
                key,
                sideCm(key) !== props.order[key] ? sideCm(key) : null,
            ]),
        ),
    })).submit(dropOff(props.order.id), {
        preserveScroll: true,
        onError: focusFirstError,
        // The payment step (OrderShow) takes this form's place: bring it into view.
        onSuccess: () =>
            void nextTick(() =>
                document
                    .getElementById('payment-step-title')
                    ?.closest('section')
                    ?.scrollIntoView({ block: 'start' }),
            ),
    });
}
</script>

<template>
    <form
        novalidate
        class="grid gap-6 @[50rem]:grid-cols-[minmax(0,1fr)_minmax(0,320px)] @[50rem]:gap-x-8"
        @submit.prevent="submit"
    >
        <div class="grid content-start gap-6">
            <div class="grid gap-2">
                <Label
                    for="measured-weight"
                    class="text-sm leading-5 font-bold text-ink"
                >
                    Weight on the scale
                </Label>
                <UnitInput
                    id="measured-weight"
                    v-model="weightKg"
                    v-focus="focusWeight"
                    unit="kg"
                    size="xl"
                    :icon="Scale"
                    type="text"
                    inputmode="decimal"
                    autocomplete="off"
                    placeholder="0.00"
                    :aria-invalid="
                        form.errors.measured_weight_g ? 'true' : undefined
                    "
                    :aria-describedby="
                        form.errors.measured_weight_g
                            ? 'measured-weight-hint measured-weight-error'
                            : 'measured-weight-hint'
                    "
                />
                <p
                    id="measured-weight-hint"
                    class="text-[13px] leading-5 text-pretty text-muted-foreground"
                >
                    The customer declared
                    <strong class="font-bold text-ink-2">{{
                        formatWeight(order.declared_weight_g)
                    }}</strong
                    >. Up to {{ formatWeight(pricing.maxWeightG) }} per parcel.
                </p>
                <InputError
                    id="measured-weight-error"
                    :message="form.errors.measured_weight_g"
                />
            </div>

            <fieldset class="min-w-0">
                <legend class="text-sm leading-5 font-bold text-ink">
                    Box size in cm
                </legend>
                <div class="mt-2 grid grid-cols-3 gap-2.5 sm:gap-3">
                    <div v-for="side in SIDES" :key="side.key">
                        <Label
                            :for="side.id"
                            class="mb-1 text-[12.5px] leading-[17px] font-medium text-muted-foreground"
                        >
                            {{ side.label }}
                        </Label>
                        <UnitInput
                            :id="side.id"
                            v-model="form[side.key]"
                            size="lg"
                            type="text"
                            inputmode="numeric"
                            autocomplete="off"
                            :placeholder="String(order[side.key])"
                            :aria-invalid="
                                form.errors[side.key] ? 'true' : undefined
                            "
                            :aria-describedby="
                                form.errors[side.key]
                                    ? `box-size-hint ${side.id}-error`
                                    : 'box-size-hint'
                            "
                        />
                    </div>
                </div>
                <div class="mt-2 flex flex-wrap items-start gap-x-4 gap-y-2">
                    <p
                        id="box-size-hint"
                        class="flex min-w-0 flex-1 basis-64 gap-2 text-[13px] leading-5 text-pretty text-muted-foreground"
                    >
                        <Info
                            aria-hidden="true"
                            class="mt-0.5 size-4 flex-none"
                        />
                        <span>
                            From the customer's order ({{
                                formatDimensions(
                                    order.length_cm,
                                    order.width_cm,
                                    order.height_cm,
                                )
                            }}). Measure the outside of the box and change any
                            side that is different.
                        </span>
                    </p>
                    <button
                        v-if="sizeChanged"
                        type="button"
                        class="relative -my-1.5 inline-flex h-8 flex-none items-center gap-1.5 rounded-md px-2 text-[13px] font-bold text-brand-strong hover:bg-brand-tint pointer-coarse:after:absolute pointer-coarse:after:inset-x-0 pointer-coarse:after:-inset-y-1.5"
                        @click="resetSize"
                    >
                        <RotateCcw aria-hidden="true" class="size-3.5" />
                        Use the customer's size
                    </button>
                </div>
                <div class="mt-2 grid gap-1">
                    <InputError
                        v-for="side in SIDES"
                        :id="`${side.id}-error`"
                        :key="side.key"
                        :message="form.errors[side.key]"
                    />
                </div>
            </fieldset>
        </div>

        <!-- The price sits beside the fields from 50rem (like the payment
             step), when the fields still have about 450px. Under them in a
             narrower card. -->
        <div
            class="grid content-start gap-3 @[50rem]:col-start-2 @[50rem]:row-span-2 @[50rem]:row-start-1"
        >
            <PriceBreakdown
                :pricing="pricing"
                :size="size"
                :origin="origin"
                :destination="order.state"
                :estimate-sen="order.estimated_price_sen"
                :placeholder="pricePlaceholder"
            />
            <div aria-live="polite">
                <Notice
                    v-if="overLimit"
                    :icon="TriangleAlert"
                    tone="warning"
                    title="Over Kotak's limits"
                >
                    Parcels can weigh up to
                    {{ formatWeight(pricing.maxWeightG) }} and measure up to
                    {{ pricing.maxDimensionCm }} cm on each side. This one
                    cannot be sent.
                </Notice>
            </div>
        </div>

        <div class="@[50rem]:col-start-1">
            <Button
                type="submit"
                :disabled="form.processing"
                class="h-12 w-full rounded-lg px-6 text-[15px] font-bold hover:bg-brand-strong sm:w-auto"
            >
                <Spinner v-if="form.processing" />
                Save weight and price
            </Button>
            <p class="mt-2 text-[13px] leading-5 text-muted-foreground">
                The customer pays this price in the next step.
            </p>
        </div>
    </form>
</template>
