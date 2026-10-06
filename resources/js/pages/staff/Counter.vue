<script setup lang="ts">
import { Head, Link, router, useForm, usePage } from '@inertiajs/vue3';
import { ArrowRight, ChevronRight, MapPin } from '@lucide/vue';
import { computed, onMounted, useTemplateRef } from 'vue';
import BranchName from '@/components/BranchName.vue';
import EmptyParcel from '@/components/brand/EmptyParcel.vue';
import KotakTape from '@/components/brand/KotakTape.vue';
import DateTime from '@/components/DateTime.vue';
import EmptyState from '@/components/EmptyState.vue';
import Money from '@/components/Money.vue';
import PageHeader from '@/components/PageHeader.vue';
import StatusChip from '@/components/StatusChip.vue';
import TrackingNumber from '@/components/TrackingNumber.vue';
import TrackingScanner from '@/components/TrackingScanner.vue';
import { Button } from '@/components/ui/button';
import { Spinner } from '@/components/ui/spinner';
import Weight from '@/components/Weight.vue';
import type { ScanOutcome } from '@/composables/useTrackingScanner';
import { formatDeliveryArea, pluralize, toTrackingQuery } from '@/lib/format';
import { counter } from '@/routes/staff';
import { show } from '@/routes/staff/orders';
import type { StaffCounterPageProps } from '@/types';

/**
 * The branch counter: scan a tracking number (with a USB scanner, which
 * types it into the field, or with the camera) or type it to open the
 * parcel (a match redirects straight to it), plus the parcels most
 * recently received here.
 */
const props = defineProps<StaffCounterPageProps>();

const page = usePage();
const branchName = computed(() => page.props.auth.user.branch_name);

/** "The latest 5 parcels weighed", followed by where in the template. */
const recentLead = computed(() =>
    props.recent.length > 0
        ? `The latest ${pluralize(props.recent.length, 'parcel')} weighed`
        : 'Parcels weighed',
);

// Admins without a branch see every branch's parcels, so show where each one is.
const showBranch = computed(() => !branchName.value);

const th = 'py-2.5 font-bold';

const scanInput = useTemplateRef<HTMLInputElement>('scanInput');

// Ready for the next scan, with a number that matched nothing selected.
onMounted(() => {
    scanInput.value?.focus();
    scanInput.value?.select();
});

/*
 * useForm rather than <Form>: a GET <Form> moves its fields into the URL
 * before its transform runs, so a transform there never sees the number.
 */
const form = useForm({ number: props.query ?? '' });

// "kt 7q4m 92xd" and a bare scanned "7Q4M92XD" both become "KT-7Q4M92XD".
function submit(): void {
    form.transform(({ number }) => ({
        number: toTrackingQuery(number),
    })).get(counter.url());
}

/**
 * A number read by the camera goes through the same search: a match opens
 * the parcel; otherwise the counter comes back with nothing found (the
 * field shows the number, as after a typed search), and the scanner says
 * so and keeps scanning. Misses replace the counter's history entry
 * rather than adding one each.
 */
function openScanned(number: string): Promise<ScanOutcome> {
    return new Promise((resolve) => {
        let outcome: ScanOutcome = {
            found: false,
            message: `Could not look up ${number}. Check the connection and scan again.`,
            retry: true,
        };

        router.get(
            counter.url({ query: { number } }),
            {},
            {
                replace: true,
                preserveState: true,
                // The parcel's page opens at its top.
                preserveScroll: (page) => page.component === 'staff/Counter',
                onSuccess: (page) => {
                    if (page.component === 'staff/Counter') {
                        form.number = number;
                        outcome = {
                            found: false,
                            message: `No parcel matches ${number}.`,
                        };
                    } else {
                        outcome = { found: true };
                    }
                },
                // No connection: the scanner says so, and reads the same
                // label again after a pause.
                onNetworkError: () => false,
                onFinish: () => resolve(outcome),
            },
        );
    });
}

const STEPS = [
    {
        title: 'Scan the label',
        text: 'Or type the number from their phone.',
    },
    {
        title: 'Weigh and measure',
        text: 'The final price updates as you type.',
    },
    { title: 'Take payment', text: 'Cash, or card with the terminal code.' },
    { title: 'Print the receipt', text: 'It carries the tracking number.' },
];
</script>

<template>
    <Head title="Drop-off counter" />

    <div class="grid w-full max-w-[1280px] gap-6">
        <PageHeader
            title="Drop-off counter"
            description="Weigh parcels, take payment and print receipts."
        >
            <!-- 40px tall; a long branch name wraps after its dash and
                 the badge grows with it. -->
            <template v-if="branchName" #actions>
                <p
                    class="inline-flex min-h-10 items-center gap-2 rounded-lg border border-line bg-white px-3.5 py-2 text-sm leading-5 font-semibold text-ink-2"
                >
                    <MapPin
                        aria-hidden="true"
                        class="size-4 flex-none text-brand"
                    />
                    <span class="sr-only">Your branch:</span>
                    <BranchName :name="branchName" />
                </p>
            </template>
        </PageHeader>

        <!-- Scan station: the steps sit beside the form once the card is
             56rem wide (a container query, as the sidebar takes 16rem). -->
        <section
            aria-labelledby="scan-title"
            class="@container overflow-hidden rounded-2xl border border-line bg-white shadow-card"
        >
            <KotakTape :height="34" :shadow="false" />

            <div
                class="grid gap-8 p-5 sm:p-7 @4xl:grid-cols-[minmax(0,1fr)_340px] @4xl:gap-10"
            >
                <div class="min-w-0">
                    <h2
                        id="scan-title"
                        class="text-2xl leading-8 font-extrabold tracking-display text-ink sm:text-[28px] sm:leading-9"
                    >
                        Find a parcel
                    </h2>
                    <p class="mt-1 text-[15px] leading-6 text-muted-foreground">
                        Scan the barcode, or type the number from the customer's
                        phone.
                    </p>

                    <form
                        :action="counter.url()"
                        method="get"
                        role="search"
                        aria-label="Find a parcel by tracking number"
                        class="@container mt-5"
                        @submit.prevent="submit"
                    >
                        <label
                            for="scan-number"
                            class="text-sm leading-5 font-bold text-ink"
                        >
                            Tracking number
                        </label>
                        <!-- One row once the form is wide enough for the number
                             and the button; stacked below that. -->
                        <div
                            class="mt-1.5 flex flex-col gap-2.5 @[28rem]:flex-row @[28rem]:items-start"
                        >
                            <div class="min-w-0 flex-1">
                                <div class="relative">
                                    <input
                                        id="scan-number"
                                        ref="scanInput"
                                        name="number"
                                        type="text"
                                        required
                                        maxlength="32"
                                        v-model="form.number"
                                        autocomplete="off"
                                        autocapitalize="characters"
                                        spellcheck="false"
                                        enterkeyhint="go"
                                        placeholder="KT-7Q4M92XD"
                                        :aria-invalid="
                                            query ? 'true' : undefined
                                        "
                                        :aria-describedby="
                                            query
                                                ? 'scan-hint scan-not-found'
                                                : 'scan-hint'
                                        "
                                        class="h-16 w-full rounded-xl border-[1.5px] border-field bg-white pr-16 pl-4 font-mono text-xl font-bold tracking-[0.04em] text-ink uppercase outline-none placeholder:font-medium placeholder:text-subtle focus-visible:border-brand focus-visible:ring-[3px] focus-visible:ring-brand/25 aria-invalid:border-brand-strong sm:text-[22px]"
                                    />
                                    <!-- The camera button sits inside the
                                         field at its right end; the field's
                                         right padding keeps the number clear
                                         of it. -->
                                    <TrackingScanner
                                        :resolve="openScanned"
                                        in-field
                                        class="absolute top-1/2 right-2 size-11 -translate-y-1/2 rounded-lg bg-white p-0"
                                    />
                                </div>
                                <!-- Right under the number it explains, at
                                     every width. -->
                                <p
                                    id="scan-hint"
                                    class="mt-1.5 text-[13px] leading-5 text-muted-foreground"
                                >
                                    KT- is optional, and spaces or dashes are
                                    fine.
                                </p>
                            </div>
                            <Button
                                type="submit"
                                :disabled="form.processing"
                                class="h-14 rounded-xl px-7 text-base font-bold hover:bg-brand-strong @[28rem]:h-16"
                            >
                                <Spinner v-if="form.processing" />
                                Open parcel
                                <ArrowRight
                                    v-if="!form.processing"
                                    aria-hidden="true"
                                    class="size-5"
                                />
                            </Button>
                        </div>
                    </form>

                    <div
                        v-if="query"
                        id="scan-not-found"
                        role="alert"
                        class="mt-5 flex items-center gap-4 rounded-xl border border-brand-edge bg-brand-tint px-4 py-3.5"
                    >
                        <EmptyParcel
                            variant="search"
                            class="hidden w-16 flex-none sm:block"
                        />
                        <div class="min-w-0">
                            <p class="text-[15px] leading-6 font-bold text-ink">
                                No parcel matches
                                <TrackingNumber :value="query" size="inline" />
                            </p>
                            <p class="mt-0.5 text-sm leading-5 text-ink-2">
                                Check the number with the customer and scan
                                again. Kotak numbers are KT- and then 8 letters
                                and digits.
                            </p>
                        </div>
                    </div>
                </div>

                <!-- A reminder for new staff: two by two under the form
                     on tablets, and left out on phones, where it would
                     push the recent parcels onto a second screen. -->
                <div
                    class="hidden rounded-xl bg-surface p-5 sm:block @4xl:self-start"
                >
                    <h3
                        class="text-[15px] leading-6 font-extrabold tracking-heading text-ink"
                    >
                        At the counter
                    </h3>
                    <ol
                        class="mt-3 grid gap-3.5 @xl:grid-cols-2 @xl:gap-x-8 @4xl:grid-cols-1"
                    >
                        <li
                            v-for="(step, index) in STEPS"
                            :key="step.title"
                            class="flex gap-3"
                        >
                            <span
                                aria-hidden="true"
                                class="inline-flex size-7 flex-none items-center justify-center rounded-md bg-brand font-mono text-[13px] font-bold text-white"
                            >
                                {{ index + 1 }}
                            </span>
                            <span class="min-w-0">
                                <span
                                    class="block text-sm leading-5 font-bold text-ink"
                                >
                                    {{ step.title }}
                                </span>
                                <span
                                    class="block text-[13px] leading-5 text-muted-foreground"
                                >
                                    {{ step.text }}
                                </span>
                            </span>
                        </li>
                    </ol>
                </div>
            </div>
        </section>

        <!-- Recently received -->
        <section
            aria-labelledby="recent-title"
            class="@container/recent overflow-hidden rounded-xl border border-line bg-white"
        >
            <div
                class="flex flex-wrap items-baseline justify-between gap-x-4 gap-y-1 border-b border-line px-4 py-4 sm:px-5"
            >
                <h2
                    id="recent-title"
                    class="text-lg leading-6 font-extrabold tracking-heading text-ink"
                >
                    Recently received
                </h2>
                <p class="text-[13px] leading-5 text-muted-foreground">
                    {{ recentLead }} at
                    <BranchName v-if="branchName" :name="branchName" />
                    <template v-else>every branch</template>
                </p>
            </div>

            <EmptyState
                v-if="recent.length === 0"
                as="h3"
                bare
                title="No parcels received yet"
                description="Parcels weighed at this counter appear here, newest first."
            />

            <template v-else>
                <!--
                    Wide cards: a table (.data-table in app.css) once the
                    card is 42rem wide (container queries, as the sidebar
                    takes 16rem when it is open). The last column joins
                    once the card is 56rem wide, so the columns go from 5
                    to 6 there. The tracking number's link covers its row,
                    so a tap anywhere on the row opens the parcel.
                -->
                <div
                    class="@container hidden overflow-x-auto @2xl/recent:block"
                >
                    <table
                        role="table"
                        class="data-table text-[13.5px] leading-5 [--columns:5] @4xl:[--columns:6]"
                    >
                        <caption class="sr-only">
                            Parcels recently received, newest first
                        </caption>
                        <thead
                            role="rowgroup"
                            class="data-table__head border-b border-line bg-surface/70 text-[12.5px] whitespace-nowrap text-muted-foreground"
                        >
                            <tr role="row" class="data-table__row">
                                <th scope="col" role="columnheader" :class="th">
                                    Tracking no.
                                </th>
                                <th scope="col" role="columnheader" :class="th">
                                    Receiver
                                </th>
                                <th scope="col" role="columnheader" :class="th">
                                    Parcel
                                </th>
                                <th scope="col" role="columnheader" :class="th">
                                    Price
                                </th>
                                <th scope="col" role="columnheader" :class="th">
                                    Status
                                </th>
                                <th
                                    scope="col"
                                    role="columnheader"
                                    :class="[th, 'hidden @4xl:block']"
                                >
                                    {{ showBranch ? 'Branch' : 'Last update' }}
                                </th>
                            </tr>
                        </thead>
                        <tbody
                            role="rowgroup"
                            class="data-table__body divide-y divide-line-soft whitespace-nowrap"
                        >
                            <tr
                                v-for="item in recent"
                                :key="item.id"
                                role="row"
                                class="data-table__row relative transition-colors hover:bg-surface/70"
                            >
                                <td role="cell" class="py-3">
                                    <TrackingNumber
                                        :value="item.tracking_number"
                                        size="sm"
                                        :copyable="false"
                                        :href="show(item.id)"
                                        stretched
                                    />
                                </td>
                                <td role="cell" class="py-3">
                                    <p
                                        class="leading-[19px] font-bold text-ink"
                                    >
                                        {{
                                            formatDeliveryArea(
                                                item.city,
                                                item.postcode,
                                            )
                                        }}
                                    </p>
                                    <p
                                        class="text-[12.5px] leading-[17px] text-muted-foreground"
                                    >
                                        {{ item.receiver_name }}
                                    </p>
                                </td>
                                <td role="cell" class="max-w-[220px] py-3">
                                    <p class="truncate leading-[19px] text-ink">
                                        {{ item.item_name }}
                                    </p>
                                    <p
                                        class="text-[12.5px] leading-[17px] text-muted-foreground"
                                    >
                                        <Weight
                                            :grams="item.chargeable_weight_g"
                                        />
                                        chargeable
                                    </p>
                                </td>
                                <td role="cell" class="py-3 font-bold text-ink">
                                    <Money
                                        :sen="
                                            item.final_price_sen ??
                                            item.estimated_price_sen
                                        "
                                        mono
                                    />
                                </td>
                                <td role="cell" class="py-3">
                                    <StatusChip
                                        :status="item.status"
                                        size="sm"
                                    />
                                </td>
                                <td
                                    role="cell"
                                    class="hidden py-3 text-[13px] leading-[18px] text-ink-2 @4xl:block"
                                >
                                    <template v-if="showBranch">
                                        <BranchName
                                            v-if="item.branch"
                                            :name="item.branch.name"
                                        />
                                    </template>
                                    <DateTime
                                        v-else
                                        :value="item.updated_at"
                                        format="shortDateTime"
                                        mono
                                        class="whitespace-nowrap"
                                    />
                                </td>
                            </tr>
                        </tbody>
                    </table>
                </div>

                <!-- Narrower cards: a list -->
                <ul class="divide-y divide-line-soft @2xl/recent:hidden">
                    <li v-for="item in recent" :key="item.id">
                        <Link
                            :href="show(item.id)"
                            class="flex items-center gap-3 px-4 py-3.5 hover:bg-surface/70"
                        >
                            <span class="min-w-0 flex-1">
                                <!-- A status that wraps stays on the
                                     right, like every other. -->
                                <span
                                    class="flex flex-wrap items-center justify-between gap-2"
                                >
                                    <TrackingNumber
                                        :value="item.tracking_number"
                                        size="inline"
                                        class="text-sm text-brand-strong"
                                    />
                                    <StatusChip
                                        :status="item.status"
                                        size="sm"
                                        class="ml-auto"
                                    />
                                </span>
                                <span
                                    class="mt-1 block text-sm leading-5 font-bold text-ink"
                                >
                                    {{
                                        formatDeliveryArea(
                                            item.city,
                                            item.postcode,
                                        )
                                    }}
                                    <span
                                        class="font-medium text-muted-foreground"
                                    >
                                        · {{ item.receiver_name }}
                                    </span>
                                </span>
                                <!-- Only the item's name is cut short:
                                     the weight and the price stay whole. -->
                                <span
                                    class="mt-0.5 flex gap-1 text-[13px] leading-5 text-muted-foreground"
                                >
                                    <span class="min-w-0 truncate">{{
                                        item.item_name
                                    }}</span>
                                    <span class="flex-none whitespace-nowrap">
                                        ·
                                        <Weight
                                            :grams="item.chargeable_weight_g"
                                        />
                                        ·
                                        <Money
                                            :sen="
                                                item.final_price_sen ??
                                                item.estimated_price_sen
                                            "
                                        />
                                    </span>
                                </span>
                            </span>
                            <ChevronRight
                                aria-hidden="true"
                                class="size-5 flex-none text-muted-foreground"
                            />
                        </Link>
                    </li>
                </ul>
            </template>
        </section>
    </div>
</template>
