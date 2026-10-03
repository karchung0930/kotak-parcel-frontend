<script setup lang="ts">
import { Head, useForm, usePage } from '@inertiajs/vue3';
import {
    ArrowRight,
    ChevronDown,
    CircleAlert,
    Clock,
    ExternalLink,
    Phone,
    Store,
    TriangleAlert,
    UserRound,
} from '@lucide/vue';
import { refDebounced } from '@vueuse/core';
import { computed, nextTick, useTemplateRef, watch } from 'vue';
import InputError from '@/components/InputError.vue';
import Notice from '@/components/Notice.vue';
import BranchPicker from '@/components/orders/BranchPicker.vue';
import FormSection from '@/components/orders/FormSection.vue';
import PriceEstimateCard from '@/components/orders/PriceEstimateCard.vue';
import PageHeader from '@/components/PageHeader.vue';
import PhoneInput from '@/components/PhoneInput.vue';
import TextLink from '@/components/TextLink.vue';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Spinner } from '@/components/ui/spinner';
import UnitInput from '@/components/UnitInput.vue';
import { useFitsViewport } from '@/composables/useFitsViewport';
import { directionsUrl } from '@/lib/branches';
import { formatMoney, formatPhone, formatWeight, telHref } from '@/lib/format';
import { estimatePrice, kgToGrams, zoneFor } from '@/lib/pricing';
import type { ParcelSize } from '@/lib/pricing';
import { store } from '@/routes/orders';
import { edit as editProfile } from '@/routes/profile';
import type { MalaysianStateValue, OrdersCreatePageProps } from '@/types';

/**
 * "Send a parcel": receiver, parcel and drop-off branch, with a live price
 * estimate. Phones get one column with a sticky "Create order" bar (the
 * D1 mobile design); desktops get the form on the left and the estimate
 * and chosen branch in a sticky column on the right.
 *
 * The estimate mirrors the server's PriceCalculator for display only, with
 * the current rate card, from the chosen branch's state to the receiver's
 * state: the server prices the order, and the branch confirms it after
 * weighing.
 */
const props = defineProps<OrdersCreatePageProps>();

/*
 * The home and pricing estimators link here with the parcel they priced
 * (?branch_id=3&state=Sabah&declared_weight_g=4200&length_cm=40&width_cm=30&height_cm=25),
 * so the form starts filled in. Only whole positive numbers, an open
 * branch and a known state are used.
 */
const page = usePage();
const query = new URLSearchParams(page.url.split('?')[1] ?? '');

function fromQuery(key: string): string {
    const value = query.get(key) ?? '';

    return /^[1-9]\d{0,5}$/.test(value) ? value : '';
}

const pricedGrams = fromQuery('declared_weight_g');
const pricedBranch = props.branches.find(
    (branch) => String(branch.id) === fromQuery('branch_id'),
);
const pricedState = props.states.find(
    (state) => state.value === query.get('state'),
);

const form = useForm({
    receiver_name: '',
    /** E.164 ("+60124583310") from PhoneInput, or the text as typed when it is not a valid number. */
    receiver_phone: '',
    address_line1: '',
    address_line2: '',
    city: '',
    state: (pricedState?.value ?? '') as MalaysianStateValue | '',
    postcode: '',
    item_name: '',
    /** Kilograms as typed ("4.2"); sent as declared_weight_g in grams. */
    weight_kg: pricedGrams === '' ? '' : String(Number(pricedGrams) / 1000),
    length_cm: fromQuery('length_cm'),
    width_cm: fromQuery('width_cm'),
    height_cm: fromQuery('height_cm'),
    branch_id: (pricedBranch?.id ??
        (props.branches.length === 1 ? props.branches[0].id : null)) as
        | number
        | null,
});

/** Server errors also use keys the form does not hold (declared_weight_g, phone). */
function error(field: string): string | undefined {
    return (form.errors as Partial<Record<string, string>>)[field];
}

const errorCount = computed(() => Object.keys(form.errors).length);

/** A field's error goes away as soon as the customer changes that field. */
watch(
    () => form.data(),
    (now, before) => {
        for (const key of Object.keys(now) as (keyof typeof now)[]) {
            if (now[key] !== before[key] && error(key)) {
                form.clearErrors(key);
            }
        }

        if (now.weight_kg !== before.weight_kg) {
            form.clearErrors('declared_weight_g' as keyof typeof now);
        }
    },
);

/** Space-separated ids for aria-describedby, or undefined when there are none. */
function describedBy(
    ...ids: (string | false | null | undefined)[]
): string | undefined {
    const list = ids.filter(Boolean);

    return list.length > 0 ? list.join(' ') : undefined;
}

/*
|--------------------------------------------------------------------------
| Live estimate
|--------------------------------------------------------------------------
*/

function toNumber(value: string): number {
    const trimmed = value.trim().replace(',', '.');

    return trimmed === '' ? Number.NaN : Number(trimmed);
}

const size = computed<Partial<ParcelSize>>(() => ({
    weightG:
        form.weight_kg.trim() === '' ? Number.NaN : kgToGrams(form.weight_kg),
    lengthCm: toNumber(form.length_cm),
    widthCm: toNumber(form.width_cm),
    heightCm: toNumber(form.height_cm),
}));

const selectedBranch = computed(
    () => props.branches.find((branch) => branch.id === form.branch_id) ?? null,
);

/*
 * The price runs from the chosen branch's zone. Until a branch is chosen,
 * it is known anyway when every branch is in the same zone (all in the
 * Klang Valley, say), so the estimate shows from the parcel step on.
 */
const origin = computed<MalaysianStateValue | null>(() => {
    if (selectedBranch.value) {
        return selectedBranch.value.state;
    }

    const zones = new Set(
        props.branches.map(
            (branch) => zoneFor(props.pricing, branch.state)?.code,
        ),
    );

    return zones.size === 1 ? (props.branches[0]?.state ?? null) : null;
});

const estimate = computed(() =>
    estimatePrice(
        props.pricing,
        { origin: origin.value, destination: form.state || null },
        size.value,
    ),
);

const estimateNeeds = computed(() => {
    if (form.state === '') {
        return 'state';
    }

    return origin.value ? null : 'branch';
});

/** A short sentence for screen readers, once typing pauses. */
const estimateSummary = computed(() =>
    estimate.value
        ? `Estimated price ${formatMoney(estimate.value.priceSen)}, for ${formatWeight(estimate.value.chargeableG)} chargeable weight.`
        : '',
);
const announcedEstimate = refDebounced(estimateSummary, 800);

/*
 * On desktops the price and branch column sticks 32px under the site
 * header, the same gap as between this column and the form (lg:gap-x-8),
 * so lg:top-[109px] is the header's 77px (76px and its border) plus
 * 32px. It only sticks while it fits on screen with 32px free under it
 * too; on a short laptop screen, once the estimate and a branch are both
 * showing, it stays at the top of the form instead, so no card slides
 * under the header.
 */
const sideColumn = useTemplateRef<HTMLElement>('sideColumn');
const sideColumnFits = useFitsViewport(sideColumn, 32);

/*
|--------------------------------------------------------------------------
| Submitting
|--------------------------------------------------------------------------
*/

/** Error keys in the order the fields appear, with the element to focus. */
const FIELDS: [string, string][] = [
    ['receiver_name', '#receiver_name'],
    ['receiver_phone', '#receiver_phone'],
    ['address_line1', '#address_line1'],
    ['address_line2', '#address_line2'],
    ['postcode', '#postcode'],
    ['city', '#city'],
    ['state', '#state'],
    ['item_name', '#item_name'],
    ['weight_kg', '#weight_kg'],
    ['declared_weight_g', '#weight_kg'],
    ['length_cm', '#length_cm'],
    ['width_cm', '#width_cm'],
    ['height_cm', '#height_cm'],
    ['branch_id', 'input[name="branch_id"]'],
    ['phone', '#sender'],
];

/** Move focus to the first field the server (or the weight check) rejected. */
function focusFirstError(): void {
    const first = FIELDS.find(([key]) => error(key));

    if (first) {
        document.querySelector<HTMLElement>(first[1])?.focus();
    }
}

function submit(): void {
    const weightG = kgToGrams(form.weight_kg);

    if (form.weight_kg.trim() !== '' && !Number.isFinite(weightG)) {
        form.setError(
            'weight_kg',
            'Enter the weight in kilograms, for example 4.2.',
        );
        void nextTick(focusFirstError);

        return;
    }

    form.transform(({ weight_kg, address_line2, ...data }) => ({
        ...data,
        address_line2: address_line2.trim() === '' ? null : address_line2,
        declared_weight_g: weight_kg.trim() === '' ? '' : weightG,
    })).submit(store(), {
        // Stay put to fix errors; the new order's page opens at the top.
        preserveScroll: 'errors',
        onError: () => void nextTick(focusFirstError),
    });
}

const SIDES = [
    { key: 'length_cm', label: 'Length', placeholder: '40' },
    { key: 'width_cm', label: 'Width', placeholder: '30' },
    { key: 'height_cm', label: 'Height', placeholder: '25' },
] as const;

const inputClass =
    'h-12 rounded-lg border-[1.5px] px-3.5 text-base font-semibold text-ink shadow-none md:text-base';
const labelClass =
    'mb-1.5 block text-[13.5px] leading-[19px] font-semibold text-ink';
const hintClass = 'mt-1.5 text-[12.5px] leading-[18px] text-muted-foreground';
</script>

<template>
    <Head title="Send a parcel" />

    <PageHeader
        title="Send a parcel"
        description="Get a price, a tracking number and your nearest branch. You pay when you drop it off."
    />

    <!-- Below 1024px focus scrolls a field at least 128px above the bottom
         edge, so it and its error stay clear of the submit bar stuck there
         (80px, about 100px over a phone's home indicator). -->
    <form
        novalidate
        aria-label="Send a parcel"
        class="mt-5 max-lg:**:scroll-mb-32 sm:mt-6"
        @submit.prevent="submit"
    >
        <div
            class="grid gap-4 lg:grid-cols-[minmax(0,1fr)_360px] lg:grid-rows-[repeat(4,auto)_1fr] lg:gap-x-8 lg:gap-y-5 xl:grid-cols-[minmax(0,1fr)_400px]"
        >
            <!-- Sender (read-only, from the customer's profile) -->
            <section
                id="sender"
                tabindex="-1"
                aria-labelledby="sender-title"
                class="rounded-2xl border border-line bg-white px-4 py-3.5 outline-none sm:px-6 lg:col-start-1"
            >
                <div class="flex items-center gap-3">
                    <span
                        class="flex size-10 flex-none items-center justify-center rounded-full bg-surface text-ink-2"
                    >
                        <UserRound aria-hidden="true" class="size-5" />
                    </span>
                    <div class="min-w-0 flex-1">
                        <h2
                            id="sender-title"
                            class="text-[12.5px] leading-4 font-semibold text-muted-foreground"
                        >
                            Sending as
                        </h2>
                        <p
                            class="mt-0.5 text-[15px] leading-[22px] font-bold text-ink"
                        >
                            {{ sender.name }}
                        </p>
                        <p
                            v-if="sender.phone"
                            class="text-sm font-semibold whitespace-nowrap text-ink-2"
                        >
                            {{ formatPhone(sender.phone) }}
                        </p>
                    </div>
                    <!-- A 44px-tall target; -mr-2 keeps the word where it was -->
                    <TextLink
                        :href="editProfile()"
                        class="-mr-2 inline-flex min-h-11 flex-none items-center px-2 text-sm"
                    >
                        Edit<span class="sr-only"> your sender details</span>
                    </TextLink>
                </div>

                <Notice
                    v-if="!sender.phone || error('phone')"
                    tone="warning"
                    :icon="TriangleAlert"
                    title="Add your mobile number first"
                    class="mt-3"
                >
                    {{
                        error('phone') ??
                        'Branch staff and drivers use it to reach you about the parcel.'
                    }}
                    <TextLink :href="editProfile()"
                        >Add it in Settings</TextLink
                    >
                </Notice>
            </section>

            <!-- 1 Receiver -->
            <FormSection
                id="receiver-title"
                :step="1"
                title="Receiver"
                class="lg:col-start-1"
            >
                <div class="grid gap-4 sm:grid-cols-2">
                    <div>
                        <Label for="receiver_name" :class="labelClass">
                            Full name
                        </Label>
                        <Input
                            id="receiver_name"
                            v-model="form.receiver_name"
                            name="receiver_name"
                            required
                            maxlength="100"
                            autocomplete="shipping name"
                            placeholder="e.g. Daniel Lim"
                            :class="inputClass"
                            :aria-invalid="
                                form.errors.receiver_name ? true : undefined
                            "
                            :aria-describedby="
                                describedBy(
                                    form.errors.receiver_name &&
                                        'receiver_name-error',
                                )
                            "
                        />
                        <InputError
                            id="receiver_name-error"
                            :message="form.errors.receiver_name"
                            class="mt-1.5"
                        />
                    </div>

                    <div class="grid content-start gap-1.5">
                        <Label
                            for="receiver_phone"
                            :class="[labelClass, 'mb-0']"
                        >
                            Phone number
                        </Label>
                        <PhoneInput
                            id="receiver_phone"
                            v-model="form.receiver_phone"
                            kind="any"
                            required
                            autocomplete="shipping tel-national"
                            :error="form.errors.receiver_phone"
                            class="h-12 rounded-lg border-[1.5px] shadow-none"
                            input-class="px-3.5 text-base font-semibold md:text-base"
                        />
                    </div>

                    <div class="sm:col-span-2">
                        <Label for="address_line1" :class="labelClass">
                            Street address
                        </Label>
                        <Input
                            id="address_line1"
                            v-model="form.address_line1"
                            name="address_line1"
                            required
                            maxlength="255"
                            autocomplete="shipping address-line1"
                            placeholder="e.g. No. 18, Jalan Tun Mohd Fuad 3"
                            :class="inputClass"
                            :aria-invalid="
                                form.errors.address_line1 ? true : undefined
                            "
                            :aria-describedby="
                                describedBy(
                                    form.errors.address_line1 &&
                                        'address_line1-error',
                                )
                            "
                        />
                        <InputError
                            id="address_line1-error"
                            :message="form.errors.address_line1"
                            class="mt-1.5"
                        />
                    </div>

                    <div class="sm:col-span-2">
                        <Label for="address_line2" :class="labelClass">
                            Unit, building or area
                            <span class="font-normal text-muted-foreground">
                                (optional)
                            </span>
                        </Label>
                        <Input
                            id="address_line2"
                            v-model="form.address_line2"
                            name="address_line2"
                            maxlength="255"
                            autocomplete="shipping address-line2"
                            placeholder="e.g. Taman Tun Dr Ismail"
                            :class="inputClass"
                            :aria-invalid="
                                form.errors.address_line2 ? true : undefined
                            "
                            :aria-describedby="
                                describedBy(
                                    form.errors.address_line2 &&
                                        'address_line2-error',
                                )
                            "
                        />
                        <InputError
                            id="address_line2-error"
                            :message="form.errors.address_line2"
                            class="mt-1.5"
                        />
                    </div>

                    <div
                        class="grid grid-cols-[128px_minmax(0,1fr)] gap-x-2.5 gap-y-4 sm:col-span-2 sm:grid-cols-[140px_minmax(0,1fr)_minmax(0,1fr)] sm:gap-x-4"
                    >
                        <div>
                            <Label for="postcode" :class="labelClass">
                                Postcode
                            </Label>
                            <Input
                                id="postcode"
                                v-model="form.postcode"
                                name="postcode"
                                required
                                inputmode="numeric"
                                maxlength="5"
                                autocomplete="shipping postal-code"
                                placeholder="60000"
                                :class="inputClass"
                                :aria-invalid="
                                    form.errors.postcode ? true : undefined
                                "
                                :aria-describedby="
                                    describedBy(
                                        form.errors.postcode &&
                                            'postcode-error',
                                    )
                                "
                            />
                            <InputError
                                id="postcode-error"
                                :message="form.errors.postcode"
                                class="mt-1.5"
                            />
                        </div>
                        <div>
                            <Label for="city" :class="labelClass">City</Label>
                            <Input
                                id="city"
                                v-model="form.city"
                                name="city"
                                required
                                maxlength="100"
                                autocomplete="shipping address-level2"
                                placeholder="e.g. Kuala Lumpur"
                                :class="inputClass"
                                :aria-invalid="
                                    form.errors.city ? true : undefined
                                "
                                :aria-describedby="
                                    describedBy(
                                        form.errors.city && 'city-error',
                                    )
                                "
                            />
                            <InputError
                                id="city-error"
                                :message="form.errors.city"
                                class="mt-1.5"
                            />
                        </div>
                        <div class="col-span-2 sm:col-span-1">
                            <Label for="state" :class="labelClass">State</Label>
                            <div class="relative">
                                <select
                                    id="state"
                                    v-model="form.state"
                                    name="state"
                                    required
                                    autocomplete="shipping address-level1"
                                    :aria-invalid="
                                        form.errors.state ? true : undefined
                                    "
                                    :aria-describedby="
                                        describedBy(
                                            form.errors.state && 'state-error',
                                        )
                                    "
                                    :class="[
                                        'h-12 w-full appearance-none rounded-lg border-[1.5px] border-input bg-white pr-10 pl-3.5 text-base font-semibold outline-none focus-visible:border-ring focus-visible:ring-[3px] focus-visible:ring-ring/50 aria-invalid:border-destructive',
                                        form.state === ''
                                            ? 'text-subtle'
                                            : 'text-ink',
                                    ]"
                                >
                                    <option value="" disabled>
                                        Choose a state
                                    </option>
                                    <option
                                        v-for="option in states"
                                        :key="option.value"
                                        :value="option.value"
                                        class="text-ink"
                                    >
                                        {{ option.label }}
                                    </option>
                                </select>
                                <ChevronDown
                                    aria-hidden="true"
                                    class="pointer-events-none absolute top-1/2 right-3.5 size-[18px] -translate-y-1/2 text-muted-foreground"
                                />
                            </div>
                            <InputError
                                id="state-error"
                                :message="form.errors.state"
                                class="mt-1.5"
                            />
                        </div>
                    </div>
                </div>
            </FormSection>

            <!-- 2 Parcel -->
            <FormSection
                id="parcel-title"
                :step="2"
                title="Parcel"
                class="lg:col-start-1"
            >
                <div class="grid gap-4">
                    <div>
                        <Label for="item_name" :class="labelClass">
                            What's inside?
                        </Label>
                        <Input
                            id="item_name"
                            v-model="form.item_name"
                            name="item_name"
                            required
                            maxlength="100"
                            placeholder="e.g. Ceramic dinner set"
                            :class="inputClass"
                            :aria-invalid="
                                form.errors.item_name ? true : undefined
                            "
                            :aria-describedby="
                                describedBy(
                                    form.errors.item_name && 'item_name-error',
                                )
                            "
                        />
                        <InputError
                            id="item_name-error"
                            :message="form.errors.item_name"
                            class="mt-1.5"
                        />
                    </div>

                    <div
                        class="grid gap-4 sm:grid-cols-[160px_minmax(0,1fr)] sm:gap-5"
                    >
                        <div>
                            <Label for="weight_kg" :class="labelClass">
                                Weight
                                <span class="sr-only">in kilograms</span>
                            </Label>
                            <UnitInput
                                id="weight_kg"
                                v-model="form.weight_kg"
                                unit="kg"
                                size="lg"
                                name="weight_kg"
                                required
                                inputmode="decimal"
                                autocomplete="off"
                                placeholder="0.0"
                                :aria-invalid="
                                    error('declared_weight_g') ||
                                    form.errors.weight_kg
                                        ? true
                                        : undefined
                                "
                                :aria-describedby="
                                    describedBy(
                                        'weight_kg-hint',
                                        (error('declared_weight_g') ||
                                            form.errors.weight_kg) &&
                                            'weight_kg-error',
                                    )
                                "
                            />
                            <p id="weight_kg-hint" :class="hintClass">
                                Up to {{ formatWeight(pricing.maxWeightG) }}
                            </p>
                            <InputError
                                id="weight_kg-error"
                                :message="
                                    form.errors.weight_kg ??
                                    error('declared_weight_g')
                                "
                                class="mt-1.5"
                            />
                        </div>

                        <fieldset class="min-w-0">
                            <legend
                                class="text-[13.5px] leading-[19px] font-semibold text-ink"
                            >
                                Box size in cm
                            </legend>
                            <!-- Each side's name goes under its box, as on the
                                 pricing page, so the boxes line up with the
                                 weight and the names share a line with its
                                 "Up to" hint. -->
                            <div class="mt-1.5 grid grid-cols-3 gap-2.5">
                                <div v-for="side in SIDES" :key="side.key">
                                    <UnitInput
                                        :id="side.key"
                                        v-model="form[side.key]"
                                        size="lg"
                                        :name="side.key"
                                        required
                                        inputmode="numeric"
                                        autocomplete="off"
                                        :placeholder="side.placeholder"
                                        :aria-invalid="
                                            form.errors[side.key]
                                                ? true
                                                : undefined
                                        "
                                        :aria-describedby="
                                            describedBy(
                                                form.errors[side.key] &&
                                                    `${side.key}-error`,
                                            )
                                        "
                                    />
                                    <Label
                                        :for="side.key"
                                        :class="[
                                            hintClass,
                                            'block font-medium',
                                        ]"
                                    >
                                        {{ side.label }}
                                        <span class="sr-only"
                                            >in centimetres</span
                                        >
                                    </Label>
                                </div>
                            </div>
                            <InputError
                                v-for="side in SIDES"
                                :id="`${side.key}-error`"
                                :key="side.key"
                                :message="form.errors[side.key]"
                                class="mt-1.5"
                            />
                        </fieldset>
                    </div>
                </div>
            </FormSection>

            <!-- Live estimate and the chosen branch, sticky on desktops
                 while they fit on screen -->
            <aside
                aria-label="Price and drop-off"
                class="lg:col-start-2 lg:row-[1/span_5]"
            >
                <div
                    ref="sideColumn"
                    class="space-y-4 lg:top-[109px]"
                    :class="sideColumnFits && 'lg:sticky'"
                >
                    <PriceEstimateCard
                        :pricing="pricing"
                        :estimate="estimate"
                        :size="size"
                        :needs="estimateNeeds"
                    />
                    <p aria-live="polite" class="sr-only">
                        {{ announcedEstimate }}
                    </p>

                    <section
                        aria-labelledby="dropoff-title"
                        class="hidden rounded-2xl border border-line bg-white p-5 lg:block"
                    >
                        <h2
                            id="dropoff-title"
                            class="text-[13px] leading-[18px] font-bold text-muted-foreground"
                        >
                            Drop off at
                        </h2>
                        <!-- What BranchDetails shows, set tighter so the
                             column fits on laptop screens: small icons and
                             the directions link on the phone's line. -->
                        <div
                            v-if="selectedBranch"
                            class="mt-2.5 text-sm leading-5 text-ink-2"
                        >
                            <div class="flex items-start gap-2.5">
                                <Store
                                    aria-hidden="true"
                                    class="mt-[3px] size-4 flex-none text-brand"
                                    :stroke-width="2.2"
                                />
                                <div class="min-w-0">
                                    <p
                                        class="text-base leading-[22px] font-extrabold tracking-heading text-ink"
                                    >
                                        {{ selectedBranch.name }}
                                    </p>
                                    <p class="mt-0.5 text-muted-foreground">
                                        {{ selectedBranch.address }},
                                        {{ selectedBranch.postcode }}
                                        {{ selectedBranch.city }},
                                        {{ selectedBranch.state }}
                                    </p>
                                </div>
                            </div>

                            <ul class="mt-2 space-y-2">
                                <li class="flex items-start gap-2.5">
                                    <Clock
                                        aria-hidden="true"
                                        class="mt-0.5 size-4 flex-none text-brand"
                                    />
                                    <span>
                                        <span class="sr-only">
                                            Opening hours:
                                        </span>
                                        {{ selectedBranch.opening_hours }}
                                    </span>
                                </li>
                                <li class="flex items-start gap-2.5">
                                    <Phone
                                        aria-hidden="true"
                                        class="mt-0.5 size-4 flex-none text-brand"
                                    />
                                    <a
                                        :href="telHref(selectedBranch.phone)"
                                        class="font-semibold whitespace-nowrap text-ink-2 underline decoration-line-strong underline-offset-4 hover:text-brand-strong hover:decoration-current"
                                    >
                                        <span class="sr-only">
                                            Call the branch:
                                        </span>
                                        {{ formatPhone(selectedBranch.phone) }}
                                    </a>
                                    <a
                                        :href="directionsUrl(selectedBranch)"
                                        target="_blank"
                                        rel="noopener noreferrer"
                                        class="ml-auto inline-flex items-center gap-1.5 font-semibold whitespace-nowrap text-brand-strong underline decoration-brand-edge underline-offset-4 hover:text-brand-deep hover:decoration-current"
                                    >
                                        Get directions
                                        <ExternalLink
                                            aria-hidden="true"
                                            class="size-3.5"
                                        />
                                        <span class="sr-only">
                                            (opens Google Maps in a new tab)
                                        </span>
                                    </a>
                                </li>
                            </ul>
                        </div>
                        <p
                            v-else
                            class="mt-2 text-sm leading-[22px] text-muted-foreground"
                        >
                            Choose a branch in step 3. You can drop the parcel
                            off any day it's open.
                        </p>
                    </section>
                </div>
            </aside>

            <!-- 3 Drop-off branch -->
            <FormSection
                id="branch-title"
                :step="3"
                title="Drop-off branch"
                description="Where will you bring the parcel?"
                class="lg:col-start-1"
            >
                <BranchPicker
                    v-model="form.branch_id"
                    :branches="branches"
                    :error="form.errors.branch_id"
                />
            </FormSection>

            <div class="lg:col-start-1 lg:self-start">
                <p class="text-[12.5px] leading-[18px] text-muted-foreground">
                    You'll get a KT- tracking number straight away. Nothing is
                    charged until you drop the parcel off and staff weigh it.
                </p>

                <!-- Desktop submit row -->
                <div
                    class="mt-4 hidden items-center gap-5 rounded-2xl border border-line bg-white p-4 pl-6 lg:flex"
                >
                    <div class="min-w-0 flex-1">
                        <p
                            class="text-xs leading-4 font-semibold text-muted-foreground"
                        >
                            Estimate
                        </p>
                        <p
                            class="text-2xl leading-8 font-extrabold tracking-heading text-ink tabular-nums"
                        >
                            {{
                                estimate ? formatMoney(estimate.priceSen) : '—'
                            }}
                        </p>
                    </div>
                    <p
                        v-if="errorCount > 0"
                        role="alert"
                        class="flex items-center gap-1.5 text-sm font-semibold text-brand-strong"
                    >
                        <CircleAlert aria-hidden="true" class="size-4" />
                        Check the highlighted
                        {{ errorCount === 1 ? 'field' : 'fields' }}
                    </p>
                    <Button
                        type="submit"
                        class="h-12 px-6 text-base font-extrabold"
                        :disabled="form.processing"
                    >
                        <Spinner v-if="form.processing" />
                        Create order
                        <ArrowRight
                            v-if="!form.processing"
                            aria-hidden="true"
                            class="size-[18px]"
                            :stroke-width="2.4"
                        />
                    </Button>
                </div>
            </div>
        </div>

        <!-- Phone and tablet submit bar. Phones get a full-width button;
             from 640px it keeps its size on the right, as on desktops. -->
        <div
            class="sticky bottom-0 z-30 -mx-4 mt-5 flex items-center gap-3.5 border-t border-line bg-white px-4 pt-3 pb-[max(1rem,env(safe-area-inset-bottom))] shadow-bar sm:-mx-6 sm:px-6 lg:hidden"
        >
            <div class="flex-none">
                <p
                    class="text-xs leading-4 font-semibold text-muted-foreground"
                >
                    Estimate
                </p>
                <p
                    class="text-[21px] leading-[26px] font-extrabold tracking-heading text-ink tabular-nums"
                >
                    {{ estimate ? formatMoney(estimate.priceSen) : '—' }}
                </p>
            </div>
            <Button
                type="submit"
                class="h-[52px] flex-1 rounded-xl text-base font-extrabold sm:ml-auto sm:flex-none sm:has-[>svg]:px-8"
                :disabled="form.processing"
            >
                <Spinner v-if="form.processing" />
                Create order
                <ArrowRight
                    v-if="!form.processing"
                    aria-hidden="true"
                    class="size-[18px]"
                    :stroke-width="2.4"
                />
            </Button>
        </div>
    </form>
</template>
