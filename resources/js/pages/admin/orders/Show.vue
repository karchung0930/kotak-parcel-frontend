<script setup lang="ts">
import { Head, Link, router } from '@inertiajs/vue3';
import { ExternalLink, Receipt, Store, Truck, Undo2 } from '@lucide/vue';
import { computed, ref, useTemplateRef } from 'vue';
import { dispatchAction } from '@/components/admin/dispatch';
import DispatchPanel from '@/components/admin/DispatchPanel.vue';
import AttemptPips from '@/components/AttemptPips.vue';
import BranchName from '@/components/BranchName.vue';
import Breadcrumbs from '@/components/Breadcrumbs.vue';
import JourneyConveyor from '@/components/brand/JourneyConveyor.vue';
import DateTime from '@/components/DateTime.vue';
import DescriptionItem from '@/components/DescriptionItem.vue';
import DescriptionList from '@/components/DescriptionList.vue';
import KeepTogether from '@/components/KeepTogether.vue';
import Money from '@/components/Money.vue';
import Notice from '@/components/Notice.vue';
import PlateBadge from '@/components/PlateBadge.vue';
import ReceiptNumber from '@/components/ReceiptNumber.vue';
import StatusChip from '@/components/StatusChip.vue';
import TextLink from '@/components/TextLink.vue';
import Timeline from '@/components/Timeline.vue';
import TrackingNumber from '@/components/TrackingNumber.vue';
import { Button } from '@/components/ui/button';
import { Sheet, SheetContent } from '@/components/ui/sheet';
import Weight from '@/components/Weight.vue';
import { useFitsViewport } from '@/composables/useFitsViewport';
import {
    formatDimensions,
    formatPhone,
    formatPostcodeCity,
    formatTrackingNumber,
    formatWeekdayDate,
    telHref,
} from '@/lib/format';
import { journeyTimes } from '@/lib/journey';
import { track } from '@/routes';
import { index as ordersIndex, show } from '@/routes/admin/orders';
import { show as showRateCard } from '@/routes/admin/rates';
import { show as counterOrder } from '@/routes/staff/orders';
import { receipt } from '@/routes/staff/payments';
import type {
    AdminOrdersShowPageProps,
    DeliveryAttempt,
    Option,
    OrderStatusValue,
} from '@/types';

const props = defineProps<AdminOrdersShowPageProps>();

/** The rate card that set the price shown: the final one once weighed. */
const pricedWith = computed(
    () =>
        props.order.final_rate_card ?? props.order.estimated_rate_card ?? null,
);

const breadcrumbs = computed(() => [
    { title: 'Orders', href: ordersIndex() },
    { title: props.order.tracking_number, href: show(props.order.id) },
]);

/*
|--------------------------------------------------------------------------
| Next step: assign, reschedule, reassign or return
|--------------------------------------------------------------------------
*/

const action = computed(() =>
    dispatchAction(props.order, props.maxFailedAttempts),
);
const failedAttempts = computed(() => props.order.failed_attempts ?? 0);

const panelOpen = ref(false);
const panelReturning = ref(false);
const panel = useTemplateRef<InstanceType<typeof DispatchPanel>>('panel');

function openPanel(returning = false): void {
    panelReturning.value = returning;
    panelOpen.value = true;
}

/**
 * Runs when the sheet opens: focus the panel title rather than the first
 * thing that takes focus (the close button), as on the dispatch page.
 */
function focusPanelTitle(event: Event): void {
    event.preventDefault();
    panel.value?.focusTitle();
}

/** Reload the drivers' job counts for another delivery day. */
function loadDay(day: string): void {
    if (
        !/^\d{4}-\d{2}-\d{2}$/.test(day) ||
        day < props.today ||
        day === props.date
    ) {
        return;
    }

    router.reload({ data: { date: day }, only: ['date', 'drivers'] });
}

/*
|--------------------------------------------------------------------------
| Delivery attempts and history
|--------------------------------------------------------------------------
*/

const attempts = computed(() =>
    [...(props.order.delivery_attempts ?? [])]
        .sort((a, b) => a.attempted_at.localeCompare(b.attempted_at))
        .map((attempt, index) => ({ ...attempt, number: index + 1 }))
        .reverse(),
);

function outcomeChip(attempt: DeliveryAttempt): Option<OrderStatusValue> {
    return attempt.outcome.value === 'delivered'
        ? { value: 'delivered', label: 'Delivered' }
        : { value: 'delivery_failed', label: 'Not delivered' };
}

const pending = computed(() =>
    props.order.scheduled_for &&
    ['assigned', 'picked_up'].includes(props.order.status.value)
        ? {
              title: 'Delivered',
              description: `Expected on ${formatWeekdayDate(props.order.scheduled_for)}.`,
              date: props.order.scheduled_for,
          }
        : null,
);

/*
 * In two columns the right one is usually much shorter than the history
 * on the left, so its last two cards (customer and branch) stick 24px
 * under the console's top bar while the left column scrolls: the same gap
 * as between the cards (space-y-6), so @4xl:top-[88px] is the top bar's
 * 64px plus 24px. They only stick while they fit on screen with 24px free
 * under them too, so their end is never out of reach.
 */
const sideCards = useTemplateRef<HTMLElement>('sideCards');
const sideCardsFit = useFitsViewport(sideCards, 24);

const card = 'rounded-2xl border border-line bg-white p-5 sm:p-6';
const cardTitle =
    'text-lg leading-[26px] font-extrabold tracking-heading text-ink';

/*
 * The next step's buttons fill the card on phones and in the right-hand
 * column. In one column on a wider page (42 to 56rem, e.g. iPads) they
 * keep a button's width side by side instead of becoming 670px bars. A
 * label too long for a 320px phone ("Open at the drop-off counter") wraps
 * inside the button, centred like a button's, links included.
 */
const nextButton =
    'h-auto min-h-12 w-full rounded-lg py-2.5 text-center text-[15px] font-bold whitespace-normal @2xl:w-auto @2xl:min-w-56 @2xl:has-[>svg]:px-6 @4xl:w-full';
</script>

<template>
    <Head :title="`Order ${order.tracking_number}`" />

    <!-- The layout follows the width of the page's own area (a @container),
         not the window, because the sidebar takes 256px when open: at 1024
         wide that leaves 720px, too narrow for two columns -->
    <div class="@container space-y-6">
        <!-- The link moves beside the title from 56rem, so the line under
             the title keeps its full width (and stays on one line) until
             then -->
        <header
            class="flex flex-col gap-4 @4xl:flex-row @4xl:items-end @4xl:justify-between"
        >
            <div class="min-w-0">
                <Breadcrumbs :breadcrumbs="breadcrumbs" class="mb-3" />
                <div class="flex flex-wrap items-center gap-x-3 gap-y-2">
                    <!-- The visible number carries its own copy button. -->
                    <h1 class="sr-only">
                        Order {{ formatTrackingNumber(order.tracking_number) }}
                    </h1>
                    <TrackingNumber :value="order.tracking_number" size="lg" />
                    <StatusChip :status="order.status" />
                </div>
                <!-- "Created 29 Sep 2026, 14:05 by Aisyah Rahman for
                     drop-off at Bangsar South." -->
                <p
                    class="mt-2 max-w-2xl text-[15px] leading-6 text-muted-foreground"
                >
                    Created <DateTime :value="order.created_at" /><template
                        v-if="order.customer"
                    >
                        by {{ order.customer.name }}</template
                    ><template v-if="order.branch">
                        for drop-off at
                        <BranchName :name="order.branch.name" /></template
                    >.
                </p>
            </div>
            <div class="flex flex-wrap gap-2.5">
                <Button
                    variant="outline"
                    as-child
                    class="h-10 font-bold pointer-coarse:h-11"
                >
                    <a
                        :href="
                            track.url({
                                query: { number: order.tracking_number },
                            })
                        "
                        target="_blank"
                        rel="noopener"
                    >
                        <ExternalLink aria-hidden="true" />
                        Public tracking page
                        <span class="sr-only">(opens in a new tab)</span>
                    </a>
                </Button>
            </div>
        </header>

        <section
            aria-labelledby="journey-title"
            :class="[card, 'overflow-hidden']"
        >
            <h2 id="journey-title" class="sr-only">Delivery progress</h2>
            <JourneyConveyor
                :status="order.status.value"
                compact
                :times="journeyTimes(order.status_events ?? [])"
                :expected-delivery="order.scheduled_for"
                swipe-hint="Swipe to see every stage"
            />
        </section>

        <!--
            One column: the next step first, then the parcel, its history,
            payment and people.
            Two columns from 56rem (1200px wide with the sidebar open): the
            parcel and its history on the left; the next step, payment and
            people on the right. Both columns run to the end of the grid
            (the left one spans both rows, the right cards under the next
            step fill the second row). When the left one is longer, the
            side cards stick. When it is shorter (a new order with a short
            history), the page is too short for a sticky card to move, so
            the history card grows instead and both columns end on the
            same line.
        -->
        <div
            class="grid gap-6 @4xl:grid-cols-[minmax(0,1fr)_minmax(0,24rem)] @4xl:grid-rows-[auto_1fr]"
        >
            <!-- Here and in Payment, balanced lines keep the short
                 status texts from ending on a lone word or two -->
            <section
                aria-labelledby="next-title"
                :class="[
                    card,
                    'min-w-0 border-t-4 border-t-brand text-balance @4xl:col-start-2 @4xl:row-start-1',
                ]"
            >
                <h2 id="next-title" :class="cardTitle">Next step</h2>

                <template v-if="order.status.value === 'paid'">
                    <p class="mt-2 text-sm leading-6 text-ink-2">
                        Paid and waiting for a driver. Choose who delivers it
                        and on which day.
                    </p>
                    <Button :class="['mt-4', nextButton]" @click="openPanel()">
                        <Truck aria-hidden="true" class="size-[18px]" />
                        Assign driver
                    </Button>
                </template>

                <template v-else-if="order.status.value === 'assigned'">
                    <p class="mt-2 text-sm leading-6 text-ink-2">
                        Scheduled with
                        <strong class="font-bold text-ink">{{
                            order.driver?.name
                        }}</strong>
                        on
                        <strong class="font-bold text-ink">{{
                            formatWeekdayDate(order.scheduled_for)
                        }}</strong
                        >. It can be handed to another driver or day until it is
                        collected from the branch.
                    </p>
                    <Button
                        variant="outline"
                        :class="['mt-4', nextButton]"
                        @click="openPanel()"
                    >
                        <Truck aria-hidden="true" class="size-[18px]" />
                        Reassign driver or day
                    </Button>
                </template>

                <template v-else-if="order.status.value === 'delivery_failed'">
                    <p class="mt-2 text-sm leading-6 text-ink-2">
                        <template v-if="action === 'reschedule'">
                            {{ failedAttempts }} of
                            {{ maxFailedAttempts }} delivery attempts failed.
                            Try again on another day, or return the parcel to
                            the sender.
                        </template>
                        <template v-else>
                            All {{ maxFailedAttempts }} delivery attempts
                            failed. The parcel can only go back to the sender
                            now.
                        </template>
                    </p>
                    <div
                        class="mt-4 grid gap-2.5 @2xl:flex @2xl:flex-wrap @4xl:grid"
                    >
                        <Button
                            v-if="action === 'reschedule'"
                            :class="nextButton"
                            @click="openPanel()"
                        >
                            <Truck aria-hidden="true" class="size-[18px]" />
                            Reschedule delivery
                        </Button>
                        <!-- Opens the return panel, where the warning and
                             the step that cannot be undone are -->
                        <Button
                            variant="outline"
                            :class="nextButton"
                            @click="openPanel(true)"
                        >
                            <Undo2 aria-hidden="true" class="size-[18px]" />
                            Return to sender
                        </Button>
                    </div>
                </template>

                <template v-else-if="order.status.value === 'picked_up'">
                    <p class="mt-2 text-sm leading-6 text-ink-2">
                        Out for delivery with
                        <strong class="font-bold text-ink">{{
                            order.driver?.name
                        }}</strong
                        >. The driver records the outcome on their phone.
                    </p>
                </template>

                <template
                    v-else-if="
                        order.status.value === 'created' ||
                        order.status.value === 'dropped_off'
                    "
                >
                    <p class="mt-2 text-sm leading-6 text-ink-2">
                        {{
                            order.status.value === 'created'
                                ? 'Waiting for the customer to drop it off.'
                                : 'Weighed at the branch and waiting for payment.'
                        }}
                    </p>
                    <Button
                        variant="outline"
                        as-child
                        :class="['mt-4', nextButton]"
                    >
                        <Link :href="counterOrder(order.id)">
                            <Store aria-hidden="true" class="size-[18px]" />
                            Open at the drop-off counter
                        </Link>
                    </Button>
                </template>

                <Notice
                    v-else
                    class="mt-3"
                    :tone="
                        order.status.value === 'delivered'
                            ? 'success'
                            : 'neutral'
                    "
                >
                    <template v-if="order.status.value === 'delivered'">
                        Delivered
                        <DateTime :value="order.delivered_at" />. Nothing more
                        to do.
                    </template>
                    <template
                        v-else-if="order.status.value === 'returned_to_sender'"
                    >
                        Returned to the sender. This order is closed.
                    </template>
                    <template v-else>
                        Cancelled
                        <DateTime :value="order.cancelled_at" />. This order is
                        closed.
                    </template>
                </Notice>
            </section>

            <div
                class="min-w-0 space-y-6 @4xl:col-start-1 @4xl:row-span-2 @4xl:row-start-1 @4xl:flex @4xl:flex-col"
            >
                <section
                    aria-labelledby="details-title"
                    :class="[card, '@container']"
                >
                    <h2 id="details-title" :class="cardTitle">
                        Parcel and delivery
                    </h2>
                    <!-- The two lists sit side by side when the card has
                         32rem inside, otherwise one under the other -->
                    <div class="mt-2 grid gap-x-10 @lg:grid-cols-2">
                        <DescriptionList>
                            <DescriptionItem label="Item">
                                {{ order.item_name }}
                            </DescriptionItem>
                            <DescriptionItem label="Declared weight">
                                <Weight :grams="order.declared_weight_g" />
                            </DescriptionItem>
                            <DescriptionItem label="Weighed at branch">
                                <Weight
                                    v-if="order.measured_weight_g !== null"
                                    :grams="order.measured_weight_g"
                                />
                                <span
                                    v-else
                                    class="font-medium text-muted-foreground"
                                >
                                    Not yet
                                </span>
                            </DescriptionItem>
                            <DescriptionItem label="Box size">
                                {{
                                    formatDimensions(
                                        order.length_cm,
                                        order.width_cm,
                                        order.height_cm,
                                    )
                                }}
                            </DescriptionItem>
                            <DescriptionItem label="Chargeable weight">
                                <Weight :grams="order.chargeable_weight_g" />
                            </DescriptionItem>
                            <DescriptionItem
                                :label="
                                    order.final_price_sen !== null
                                        ? 'Price'
                                        : 'Estimated price'
                                "
                            >
                                <Money
                                    :sen="
                                        order.final_price_sen ??
                                        order.estimated_price_sen
                                    "
                                />
                            </DescriptionItem>
                            <DescriptionItem
                                v-if="pricedWith"
                                label="Priced with"
                            >
                                <TextLink :href="showRateCard(pricedWith.id)">
                                    <KeepTogether :text="pricedWith.name" />
                                </TextLink>
                            </DescriptionItem>
                        </DescriptionList>

                        <!-- A line between the lists when they are stacked -->
                        <DescriptionList
                            class="border-line-soft @max-lg:border-t"
                        >
                            <!-- Balanced, so a long street never leaves its
                                 last word alone on a line -->
                            <DescriptionItem
                                label="Deliver to"
                                stacked
                                class="text-balance"
                            >
                                <span class="block">{{
                                    order.receiver_name
                                }}</span>
                                <span class="block font-medium text-ink-2">
                                    {{
                                        [
                                            order.address_line1,
                                            order.address_line2,
                                        ]
                                            .filter(Boolean)
                                            .join(', ')
                                    }}
                                </span>
                                <span class="block font-medium text-ink-2">
                                    {{
                                        formatPostcodeCity(
                                            order.postcode,
                                            order.city,
                                        )
                                    }}, {{ order.state }}
                                </span>
                                <a
                                    :href="telHref(order.receiver_phone)"
                                    class="block w-fit font-medium text-brand-strong underline-offset-4 hover:underline pointer-coarse:py-3"
                                >
                                    {{ formatPhone(order.receiver_phone) }}
                                </a>
                            </DescriptionItem>
                            <DescriptionItem label="Delivery day">
                                <DateTime
                                    v-if="order.scheduled_for"
                                    :value="order.scheduled_for"
                                    format="weekday"
                                />
                                <span
                                    v-else
                                    class="font-medium text-muted-foreground"
                                >
                                    Not scheduled
                                </span>
                            </DescriptionItem>
                            <DescriptionItem label="Driver">
                                <span
                                    v-if="order.driver"
                                    class="inline-flex flex-wrap items-center justify-end gap-2"
                                >
                                    {{ order.driver.name }}
                                    <PlateBadge
                                        v-if="order.driver.vehicle_plate"
                                        :plate="order.driver.vehicle_plate"
                                    />
                                </span>
                                <span
                                    v-else
                                    class="font-medium text-muted-foreground"
                                >
                                    None yet
                                </span>
                            </DescriptionItem>
                        </DescriptionList>
                    </div>
                </section>

                <section aria-labelledby="attempts-title" :class="card">
                    <div
                        class="flex flex-wrap items-center justify-between gap-3"
                    >
                        <h2 id="attempts-title" :class="cardTitle">
                            Delivery attempts
                        </h2>
                        <AttemptPips
                            :used="failedAttempts"
                            :max="maxFailedAttempts"
                            :returned="
                                order.status.value === 'returned_to_sender'
                            "
                        />
                    </div>

                    <ol v-if="attempts.length > 0" class="mt-4 space-y-3">
                        <li
                            v-for="attempt in attempts"
                            :key="attempt.id"
                            class="rounded-xl border border-line p-4"
                        >
                            <div
                                class="flex flex-wrap items-center justify-between gap-2"
                            >
                                <p class="flex flex-wrap items-center gap-2.5">
                                    <span class="text-sm font-bold text-ink">
                                        Attempt {{ attempt.number }}
                                    </span>
                                    <StatusChip
                                        :status="outcomeChip(attempt)"
                                        size="sm"
                                    />
                                </p>
                                <DateTime
                                    :value="attempt.attempted_at"
                                    mono
                                    class="text-[13px] font-semibold text-ink-2"
                                />
                            </div>
                            <dl
                                class="mt-3 grid grid-cols-[6rem_minmax(0,1fr)] gap-x-3 gap-y-1.5 text-[13px] leading-5 sm:grid-cols-[7.5rem_minmax(0,1fr)]"
                            >
                                <template v-if="attempt.driver">
                                    <dt class="text-muted-foreground">
                                        Driver
                                    </dt>
                                    <dd class="font-semibold text-ink">
                                        {{ attempt.driver.name }}
                                    </dd>
                                </template>
                                <template v-if="attempt.failure_reason">
                                    <dt class="text-muted-foreground">
                                        Reason
                                    </dt>
                                    <dd class="font-semibold text-ink">
                                        {{ attempt.failure_reason.label }}
                                    </dd>
                                </template>
                                <template v-if="attempt.recipient_name">
                                    <dt class="text-muted-foreground">
                                        Received by
                                    </dt>
                                    <dd class="font-semibold text-ink">
                                        {{ attempt.recipient_name }}
                                    </dd>
                                </template>
                                <template v-if="attempt.note">
                                    <dt class="text-muted-foreground">
                                        Driver's note
                                    </dt>
                                    <dd class="text-ink-2">
                                        {{ attempt.note }}
                                    </dd>
                                </template>
                            </dl>
                            <figure v-if="attempt.photo_url" class="mt-4">
                                <a
                                    :href="attempt.photo_url"
                                    target="_blank"
                                    rel="noopener"
                                    class="block w-full max-w-xs overflow-hidden rounded-lg border border-line"
                                >
                                    <img
                                        :src="attempt.photo_url"
                                        :alt="`Proof of delivery photo for ${order.tracking_number}`"
                                        loading="lazy"
                                        class="aspect-[4/3] w-full bg-surface object-cover"
                                    />
                                </a>
                                <figcaption
                                    class="mt-1.5 text-xs leading-4 text-muted-foreground"
                                >
                                    Proof of delivery. Opens full size in a new
                                    tab.
                                </figcaption>
                            </figure>
                        </li>
                    </ol>
                    <p
                        v-else
                        class="mt-3 text-sm leading-6 text-balance text-muted-foreground"
                    >
                        No delivery attempts yet. Each visit is recorded here,
                        with a photo on delivery.
                    </p>
                </section>

                <section
                    aria-labelledby="history-title"
                    :class="[card, '@4xl:grow']"
                >
                    <h2 id="history-title" :class="cardTitle">History</h2>
                    <p
                        class="mt-1 text-[13px] leading-5 text-balance text-muted-foreground"
                    >
                        Every status change, who made it and where. Notes are
                        visible to the customer.
                    </p>
                    <Timeline
                        :events="order.status_events ?? []"
                        :pending="pending"
                        class="mt-5"
                    />
                </section>
            </div>

            <!-- In one column on a wider page (42 to 56rem, e.g. iPads),
                 payment sits beside the customer and branch cards rather
                 than every card taking the full width. -->
            <div
                class="min-w-0 space-y-6 @2xl:grid @2xl:grid-cols-2 @2xl:items-start @2xl:gap-6 @2xl:space-y-0 @4xl:col-start-2 @4xl:row-start-2 @4xl:block @4xl:space-y-6"
            >
                <section aria-labelledby="payment-title" :class="card">
                    <h2 id="payment-title" :class="cardTitle">Payment</h2>
                    <template v-if="order.payment">
                        <DescriptionList class="mt-2">
                            <DescriptionItem label="Amount">
                                <Money :sen="order.payment.amount_sen" />
                            </DescriptionItem>
                            <DescriptionItem label="Method">
                                {{ order.payment.method.label }}
                                <span
                                    v-if="order.payment.reference"
                                    class="font-mono font-semibold text-ink-2"
                                >
                                    · {{ order.payment.reference }}
                                </span>
                            </DescriptionItem>
                            <DescriptionItem label="Receipt" wrap>
                                <ReceiptNumber
                                    :value="order.payment.receipt_number"
                                />
                            </DescriptionItem>
                            <DescriptionItem label="Paid">
                                <DateTime :value="order.payment.paid_at" />
                            </DescriptionItem>
                            <DescriptionItem
                                v-if="order.payment.received_by"
                                label="Taken by"
                            >
                                {{ order.payment.received_by.name }}
                            </DescriptionItem>
                        </DescriptionList>
                        <Button
                            variant="outline"
                            as-child
                            class="mt-3 h-11 w-full rounded-lg font-bold"
                        >
                            <Link :href="receipt(order.payment.id)">
                                <Receipt aria-hidden="true" />
                                View receipt
                            </Link>
                        </Button>
                    </template>
                    <p
                        v-else
                        class="mt-2 text-sm leading-6 text-balance text-muted-foreground"
                    >
                        Not paid yet. The customer pays at the branch when the
                        parcel is weighed. Estimated price:
                        <Money
                            :sen="order.estimated_price_sen"
                            class="font-bold text-ink"
                        />.
                    </p>
                </section>

                <div
                    ref="sideCards"
                    class="space-y-6 @4xl:top-[88px]"
                    :class="sideCardsFit && '@4xl:sticky'"
                >
                    <section aria-labelledby="people-title" :class="card">
                        <h2 id="people-title" :class="cardTitle">
                            Customer and sender
                        </h2>
                        <DescriptionList class="mt-2">
                            <DescriptionItem
                                v-if="order.customer"
                                label="Account"
                                stacked
                            >
                                <span class="block">{{
                                    order.customer.name
                                }}</span>
                                <!-- Here and in every contact link, touch
                                     screens get 12px above and below: a
                                     44px target, and the email and the
                                     phone number are not one tap apart -->
                                <a
                                    :href="`mailto:${order.customer.email}`"
                                    class="block w-fit font-medium break-all text-brand-strong underline-offset-4 hover:underline pointer-coarse:py-3"
                                >
                                    {{ order.customer.email }}
                                </a>
                                <a
                                    v-if="order.customer.phone"
                                    :href="telHref(order.customer.phone)"
                                    class="block w-fit font-medium text-brand-strong underline-offset-4 hover:underline pointer-coarse:py-3"
                                >
                                    {{ formatPhone(order.customer.phone) }}
                                </a>
                            </DescriptionItem>
                            <DescriptionItem label="Sender" stacked>
                                <span class="block">{{
                                    order.sender_name
                                }}</span>
                                <a
                                    :href="telHref(order.sender_phone)"
                                    class="block w-fit font-medium text-brand-strong underline-offset-4 hover:underline pointer-coarse:py-3"
                                >
                                    {{ formatPhone(order.sender_phone) }}
                                </a>
                            </DescriptionItem>
                        </DescriptionList>
                    </section>

                    <section
                        v-if="order.branch"
                        aria-labelledby="branch-title"
                        :class="card"
                    >
                        <h2 id="branch-title" :class="cardTitle">
                            Drop-off branch
                        </h2>
                        <p class="mt-2 text-sm leading-6 font-bold text-ink">
                            <BranchName :name="order.branch.name" />{{ ' ' }}
                            <span
                                class="ml-1 rounded-[4px] bg-surface px-1.5 font-mono text-xs font-bold text-ink-2"
                            >
                                {{ order.branch.code }}
                            </span>
                        </p>
                        <!-- The postcode and city get their own line, as in
                             the delivery address, so they are never split -->
                        <p class="text-sm leading-6 text-balance text-ink-2">
                            <span class="block">{{
                                order.branch.address
                            }}</span>
                            <span class="block">{{
                                formatPostcodeCity(
                                    order.branch.postcode,
                                    order.branch.city,
                                )
                            }}</span>
                        </p>
                        <p
                            class="mt-1 text-[13px] leading-5 text-muted-foreground"
                        >
                            {{ order.branch.opening_hours }}
                        </p>
                        <a
                            :href="telHref(order.branch.phone)"
                            class="mt-1 inline-block text-sm font-semibold text-brand-strong underline-offset-4 hover:underline pointer-coarse:py-3"
                        >
                            {{ formatPhone(order.branch.phone) }}
                        </a>
                    </section>
                </div>
            </div>
        </div>
    </div>

    <Sheet v-model:open="panelOpen">
        <!-- The panel has its own close button. -->
        <SheetContent
            side="right"
            class="w-full gap-0 sm:max-w-md"
            :show-close-button="false"
            @open-auto-focus="focusPanelTitle"
        >
            <DispatchPanel
                v-if="action"
                ref="panel"
                in-sheet
                :order="order"
                :drivers="drivers"
                :date="date"
                :today="today"
                :max-failed-attempts="maxFailedAttempts"
                :start-returning="panelReturning"
                @close="panelOpen = false"
                @change-date="loadDay"
            />
        </SheetContent>
    </Sheet>
</template>
