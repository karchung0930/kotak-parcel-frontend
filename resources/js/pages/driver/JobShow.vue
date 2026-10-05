<script setup lang="ts">
import { Head, Link, useForm } from '@inertiajs/vue3';
import {
    ArrowLeft,
    Clock,
    ExternalLink,
    MapPin,
    PackageCheck,
    PackageOpen,
    Phone,
    Store,
    TriangleAlert,
} from '@lucide/vue';
import { computed, nextTick, ref, useTemplateRef } from 'vue';
import BranchName from '@/components/BranchName.vue';
import ChoiceCard from '@/components/ChoiceCard.vue';
import ConfirmActionDialog from '@/components/ConfirmActionDialog.vue';
import DateTime from '@/components/DateTime.vue';
import DescriptionItem from '@/components/DescriptionItem.vue';
import DescriptionList from '@/components/DescriptionList.vue';
import DeliverForm from '@/components/driver/DeliverForm.vue';
import FailForm from '@/components/driver/FailForm.vue';
import StatusChip from '@/components/StatusChip.vue';
import TrackingNumber from '@/components/TrackingNumber.vue';
import TrackingScanner from '@/components/TrackingScanner.vue';
import { Button } from '@/components/ui/button';
import Weight from '@/components/Weight.vue';
import type { ScanOutcome } from '@/composables/useTrackingScanner';
import { directionsUrl, mapSearchUrl } from '@/lib/branches';
import {
    formatBranchName,
    formatDeliveryArea,
    formatDimensions,
    formatPhone,
    formatPostcodeCity,
    formatShortDate,
    formatTrackingNumber,
    formatWeekdayDate,
    normalizeTrackingNumber,
    telHref,
    todayInKualaLumpur,
} from '@/lib/format';
import { jobs } from '@/routes/driver';
import { pickup } from '@/routes/driver/jobs';
import type { DriverJobShowPageProps } from '@/types';

/**
 * One delivery on the driver's phone: who and where (call, open in Maps),
 * the parcel, and the next step by status: confirm the pick-up at the
 * branch, then record the delivery or why it failed.
 */
const props = defineProps<DriverJobShowPageProps>();

const trackingNumber = computed(() =>
    formatTrackingNumber(props.order.tracking_number),
);

const status = computed(() => props.order.status.value);
const attempts = computed(() => props.order.delivery_attempts ?? []);
const failedBefore = computed(() => props.order.failed_attempts ?? 0);

// Back to the list the job is on: today's (with overdue jobs) or a later day's.
const backHref = computed(() => {
    const day = props.order.scheduled_for;

    return day && day > todayInKualaLumpur()
        ? jobs({ query: { date: day } })
        : jobs();
});

const addressLines = computed(() =>
    [
        props.order.address_line1,
        props.order.address_line2,
        formatPostcodeCity(props.order.postcode, props.order.city),
        props.order.state,
    ].filter((line): line is string => Boolean(line)),
);

// Google Maps gets the address with ordinary spaces.
const addressMapsUrl = computed(() =>
    mapSearchUrl(
        [...addressLines.value, 'Malaysia'].join(', ').replace(/\u00a0/g, ' '),
    ),
);

const branch = computed(() => props.order.branch ?? null);

const branchMapsUrl = computed(() =>
    branch.value ? directionsUrl(branch.value) : null,
);

// Picked up at the branch: a one-tap action behind a confirmation.
const pickupForm = useForm({});
const confirmingPickup = ref(false);

function confirmPickup(): void {
    pickupForm.submit(pickup(props.order.id), {
        preserveScroll: true,
        onFinish: () => (confirmingPickup.value = false),
    });
}

/**
 * Scanning this job's label at the branch records the pick-up: the label
 * in hand is the confirmation. Another parcel's label is refused, and the
 * scanner keeps looking.
 */
function pickUpScanned(number: string): Promise<ScanOutcome> {
    if (
        normalizeTrackingNumber(number) !==
        normalizeTrackingNumber(props.order.tracking_number)
    ) {
        return Promise.resolve({
            found: false,
            message: `That label is ${number}, not ${trackingNumber.value}. Scan this job's parcel.`,
        });
    }

    return new Promise((resolve) => {
        const message = `The pick-up of ${trackingNumber.value} was not saved. Try again.`;
        // Refused by the server (the job changed meanwhile): reading the
        // label again would not help, so it waits for "Scan again".
        let outcome: ScanOutcome = { found: false, message };

        pickupForm.submit(pickup(props.order.id), {
            preserveScroll: true,
            onSuccess: () => {
                outcome = { found: true };
                // The scanner goes with the branch card: on to the next
                // step, recording the delivery.
                void nextTick(() => outcomeTitle.value?.focus());
            },
            // No connection: the scanner says so, and reads the label
            // again after a pause.
            onNetworkError: () => {
                outcome = { found: false, message, retry: true };

                return false;
            },
            onFinish: () => resolve(outcome),
        });
    });
}

// Out for delivery: the driver chooses what happened.
const outcome = ref<'delivered' | 'failed' | null>(null);
const outcomeTitle = useTemplateRef<HTMLHeadingElement>('outcomeTitle');

const OUTCOMES = [
    {
        value: 'delivered',
        label: 'Delivered',
        hint: 'Name and photo',
        icon: PackageCheck,
    },
    {
        value: 'failed',
        label: "Couldn't deliver",
        hint: 'Say why',
        icon: TriangleAlert,
    },
] as const;

const cardClass = 'rounded-2xl border border-line bg-white p-4 sm:p-5';
const headingClass =
    'text-[17px] leading-6 font-extrabold tracking-heading text-ink';
// The call and map links, 48px tall for a thumb. The white ones are outline
// Buttons, so they hover like every other outline button on the site. Each
// pair sits side by side only where both its labels fit on one line (a
// container query on the card, sized to that pair); on a narrower phone,
// such as 320px, they stack at full width.
const actionLinkClass =
    'h-12 rounded-xl border-[1.5px] px-4 text-[15px] font-bold whitespace-normal';
</script>

<template>
    <Head :title="`Delivery ${trackingNumber}`" />

    <div class="grid grid-cols-1 gap-5 sm:gap-6">
        <Link
            :href="backHref"
            class="-ml-2 inline-flex h-11 w-fit items-center gap-2 rounded-lg px-2 text-[15px] font-bold text-ink-2 hover:bg-white hover:text-ink"
        >
            <ArrowLeft aria-hidden="true" class="size-5" />
            My jobs
        </Link>

        <header>
            <div class="flex flex-wrap items-center gap-x-3 gap-y-2">
                <TrackingNumber :value="order.tracking_number" size="md" />
                <StatusChip :status="order.status" />
            </div>
            <h1
                class="mt-3 text-[28px] leading-[34px] font-extrabold tracking-display text-ink sm:text-[32px] sm:leading-10"
            >
                {{ order.receiver_name }}
            </h1>
            <p class="mt-1 text-base leading-6 font-semibold text-ink-2">
                {{ formatDeliveryArea(order.city, order.postcode) }}
            </p>
            <div
                v-if="
                    order.is_overdue || failedBefore > 0 || order.scheduled_for
                "
                class="mt-3 flex flex-wrap gap-2"
            >
                <span
                    v-if="order.is_overdue"
                    class="inline-flex h-7 items-center gap-1.5 rounded-sm bg-status-failed-tint px-2.5 text-[13px] font-bold text-status-failed"
                >
                    <Clock aria-hidden="true" class="size-3.5" />
                    Overdue, was due {{ formatShortDate(order.scheduled_for) }}
                </span>
                <span
                    v-else-if="order.scheduled_for"
                    class="inline-flex h-7 items-center gap-1.5 rounded-sm bg-status-neutral-tint px-2.5 text-[13px] font-bold text-status-neutral"
                >
                    <Clock aria-hidden="true" class="size-3.5" />
                    {{ formatWeekdayDate(order.scheduled_for) }}
                </span>
                <span
                    v-if="failedBefore > 0"
                    class="inline-flex h-7 items-center gap-1.5 rounded-sm bg-status-failed-tint px-2.5 text-[13px] font-bold text-status-failed"
                >
                    <TriangleAlert aria-hidden="true" class="size-3.5" />
                    Delivery attempt {{ failedBefore + 1 }}
                </span>
            </div>
        </header>

        <!-- Assigned: collect it from the branch first -->
        <section
            v-if="status === 'assigned' && branch"
            aria-labelledby="branch-title"
            class="overflow-hidden rounded-2xl border border-brand-edge bg-white"
        >
            <div class="bg-brand-tint px-4 py-3 sm:px-5">
                <h2
                    id="branch-title"
                    class="flex items-center gap-2 text-[15px] leading-6 font-extrabold text-brand-strong"
                >
                    <Store aria-hidden="true" class="size-5" />
                    First, collect it from the branch
                </h2>
            </div>
            <div class="@container p-4 sm:p-5">
                <p class="text-lg leading-6 font-extrabold text-ink">
                    <BranchName :name="branch.name" />
                </p>
                <address
                    class="mt-1 text-[15px] leading-6 text-pretty text-ink-2 not-italic"
                >
                    {{ branch.address }},
                    {{ formatPostcodeCity(branch.postcode, branch.city) }}
                </address>
                <p
                    class="mt-1 flex items-center gap-1.5 text-sm leading-5 text-muted-foreground"
                >
                    <Clock aria-hidden="true" class="size-4" />
                    {{ branch.opening_hours }}
                </p>
                <div class="mt-4 grid gap-2.5 @[17.5rem]:grid-cols-2">
                    <Button variant="outline" as-child :class="actionLinkClass">
                        <a :href="telHref(branch.phone)">
                            <Phone aria-hidden="true" class="size-[18px]" />
                            Call branch
                        </a>
                    </Button>
                    <Button
                        v-if="branchMapsUrl"
                        variant="outline"
                        as-child
                        :class="actionLinkClass"
                    >
                        <a
                            :href="branchMapsUrl"
                            target="_blank"
                            rel="noopener noreferrer"
                        >
                            <MapPin
                                aria-hidden="true"
                                class="size-[18px] text-brand"
                            />
                            Directions
                            <span class="sr-only">(opens Google Maps)</span>
                        </a>
                    </Button>
                </div>
                <!-- At the branch: scanning the label records the pick-up
                     (the same step as "Picked up at branch" below). -->
                <div
                    class="mt-4 flex flex-col gap-2.5 border-t border-line-soft pt-4 @[30rem]:flex-row @[30rem]:items-center @[30rem]:justify-between"
                >
                    <p class="text-sm leading-5 text-balance text-ink-2">
                        Got the parcel? Scan its label to record the pick-up.
                    </p>
                    <TrackingScanner
                        :resolve="pickUpScanned"
                        title="Scan the parcel"
                        action-label="Record pick-up"
                        busy-label="Recording the pick-up of"
                        :class="[actionLinkClass, 'flex-none']"
                    />
                </div>
            </div>
        </section>

        <!-- The receiver -->
        <section
            aria-labelledby="receiver-title"
            :class="[cardClass, '@container']"
        >
            <h2 id="receiver-title" :class="headingClass">Deliver to</h2>
            <p class="mt-2 text-base leading-6 font-bold text-ink">
                {{ order.receiver_name }}
            </p>
            <p class="text-[15px] leading-6 font-semibold text-ink-2">
                {{ formatPhone(order.receiver_phone) }}
            </p>
            <address class="mt-2 text-[15px] leading-6 text-ink not-italic">
                <span v-for="line in addressLines" :key="line" class="block">{{
                    line
                }}</span>
            </address>
            <!-- On phones a compact Call leaves room for "Open in Maps";
                 from 640px equal halves, like the branch card's. -->
            <div
                class="mt-4 grid gap-2.5 sm:grid-cols-2 max-sm:@[17rem]:grid-cols-[auto_minmax(0,1fr)]"
            >
                <Button variant="outline" as-child :class="actionLinkClass">
                    <a :href="telHref(order.receiver_phone)">
                        <Phone aria-hidden="true" class="size-[18px]" />
                        Call
                        <span class="sr-only">{{ order.receiver_name }}</span>
                    </a>
                </Button>
                <Button variant="outline" as-child :class="actionLinkClass">
                    <a
                        :href="addressMapsUrl"
                        target="_blank"
                        rel="noopener noreferrer"
                    >
                        <MapPin
                            aria-hidden="true"
                            class="size-[18px] text-brand"
                        />
                        Open in Maps
                        <ExternalLink
                            aria-hidden="true"
                            class="size-3.5 text-muted-foreground"
                        />
                        <span class="sr-only">(opens Google Maps)</span>
                    </a>
                </Button>
            </div>
        </section>

        <!-- Out for delivery: record what happened -->
        <section
            v-if="status === 'picked_up'"
            aria-labelledby="outcome-title"
            :class="cardClass"
        >
            <h2
                id="outcome-title"
                ref="outcomeTitle"
                tabindex="-1"
                :class="[headingClass, 'outline-none']"
            >
                Record the delivery
            </h2>
            <fieldset class="mt-3 min-w-0">
                <legend class="sr-only">What happened at the door?</legend>
                <!-- Stacked on phones: side by side, "Couldn't deliver" and
                     its hint would wrap in a half-width tile. -->
                <div class="grid grid-cols-1 gap-2 sm:grid-cols-2">
                    <!-- Green once delivered, amber when it could not be. -->
                    <ChoiceCard
                        v-for="option in OUTCOMES"
                        :key="option.value"
                        v-model="outcome"
                        name="outcome"
                        :value="option.value"
                        :tone="
                            option.value === 'delivered'
                                ? 'delivered'
                                : 'failed'
                        "
                    >
                        <span
                            class="text-base leading-5 font-extrabold text-ink"
                        >
                            {{ option.label }}
                        </span>
                        <span
                            class="flex items-start gap-1.5 text-[13px] leading-5 text-muted-foreground"
                        >
                            <component
                                :is="option.icon"
                                aria-hidden="true"
                                class="mt-[3px] size-3.5 flex-none"
                            />
                            {{ option.hint }}
                        </span>
                    </ChoiceCard>
                </div>
            </fieldset>

            <div v-if="outcome" class="mt-5 border-t border-line-soft pt-5">
                <DeliverForm v-if="outcome === 'delivered'" :order="order" />
                <FailForm
                    v-else
                    :order="order"
                    :failure-reasons="failureReasons"
                />
            </div>
        </section>

        <!-- The parcel -->
        <section aria-labelledby="parcel-title" :class="cardClass">
            <h2 id="parcel-title" :class="headingClass">Parcel</h2>
            <!-- From 640px two columns, each label above its value, so a
                 wide card leaves no long gap between them; the rows in the
                 last line drop their divider, like the last row of a single
                 column. -->
            <DescriptionList
                class="mt-1 sm:grid sm:grid-cols-2 sm:gap-x-8 sm:[&>:nth-last-child(2):nth-child(odd)]:border-b-0"
            >
                <DescriptionItem label="What's inside" stacked="sm">
                    {{ order.item_name }}
                </DescriptionItem>
                <DescriptionItem label="Box size" stacked="sm">
                    {{
                        formatDimensions(
                            order.length_cm,
                            order.width_cm,
                            order.height_cm,
                        )
                    }}
                </DescriptionItem>
                <DescriptionItem label="Weight" stacked="sm">
                    <Weight :grams="order.measured_weight_g" />
                </DescriptionItem>
                <DescriptionItem v-if="branch" label="From branch" stacked="sm">
                    <BranchName :name="branch.name" />
                </DescriptionItem>
            </DescriptionList>
        </section>

        <!-- Earlier attempts -->
        <section
            v-if="attempts.length > 0"
            aria-labelledby="attempts-title"
            :class="cardClass"
        >
            <h2 id="attempts-title" :class="headingClass">Earlier attempts</h2>
            <ol class="mt-3 grid grid-cols-1 gap-2.5">
                <li
                    v-for="(attempt, index) in attempts"
                    :key="attempt.id"
                    class="rounded-xl bg-surface px-3.5 py-3"
                >
                    <p
                        class="flex flex-wrap items-center justify-between gap-x-3 gap-y-1"
                    >
                        <span class="text-[15px] leading-5 font-bold text-ink">
                            Attempt {{ index + 1 }}:
                            {{
                                attempt.failure_reason?.label ??
                                attempt.outcome.label
                            }}
                        </span>
                        <DateTime
                            :value="attempt.attempted_at"
                            format="shortDateTime"
                            class="text-[13px] leading-5 text-muted-foreground"
                        />
                    </p>
                    <p
                        v-if="attempt.note"
                        class="mt-1 text-sm leading-5 text-ink-2"
                    >
                        “{{ attempt.note }}”
                    </p>
                    <p
                        v-if="attempt.driver"
                        class="mt-1 text-[13px] leading-5 text-muted-foreground"
                    >
                        {{ attempt.driver.name }}
                    </p>
                </li>
            </ol>
        </section>

        <!-- Assigned: confirm the pick-up (sticky). On phones it is a bar on
             the screen's bottom edge: -mb-16 takes up the page's bottom
             padding, so it stays there at the end of the page too. From
             640px it is a card floating 20px above the edge (the gap
             between cards); -mb-11 leaves 20px of the padding, so at the
             end of the page it stays in the same place. -->
        <div
            v-if="status === 'assigned'"
            class="sticky bottom-0 z-20 -mx-4 -mb-16 border-t border-line bg-white/95 px-4 pt-3 pb-[max(0.75rem,env(safe-area-inset-bottom))] shadow-bar backdrop-blur sm:bottom-5 sm:mx-0 sm:-mb-11 sm:rounded-2xl sm:border sm:p-4"
        >
            <Button
                type="button"
                class="h-14 w-full rounded-xl text-base font-bold hover:bg-brand-strong"
                @click="confirmingPickup = true"
            >
                <PackageOpen aria-hidden="true" class="size-5" />
                Picked up at branch
            </Button>
        </div>

        <ConfirmActionDialog
            v-model:open="confirmingPickup"
            :icon="PackageOpen"
            title="Picked up at the branch?"
            :description="`Confirm that you have ${trackingNumber} with you${branch ? ` from ${formatBranchName(branch.name)}` : ''}. Tracking will show it as out for delivery.`"
            confirm-label="Yes, I have it"
            :processing="pickupForm.processing"
            @confirm="confirmPickup"
        />
    </div>
</template>
