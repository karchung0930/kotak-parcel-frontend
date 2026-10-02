<script setup lang="ts">
import { Head, Link } from '@inertiajs/vue3';
import { CreditCard, Printer, ReceiptText, Scale, ScanLine } from '@lucide/vue';
import { computed, useTemplateRef } from 'vue';
import JourneyConveyor from '@/components/brand/JourneyConveyor.vue';
import Breadcrumbs from '@/components/Breadcrumbs.vue';
import CounterOrderDetails from '@/components/counter/CounterOrderDetails.vue';
import PriceBreakdown from '@/components/counter/PriceBreakdown.vue';
import RefusePriceDialog from '@/components/counter/RefusePriceDialog.vue';
import TakePaymentForm from '@/components/counter/TakePaymentForm.vue';
import WeighParcelForm from '@/components/counter/WeighParcelForm.vue';
import DateTime from '@/components/DateTime.vue';
import Notice from '@/components/Notice.vue';
import StatusChip from '@/components/StatusChip.vue';
import Timeline from '@/components/Timeline.vue';
import TrackingNumber from '@/components/TrackingNumber.vue';
import { Button } from '@/components/ui/button';
import { useFitsViewport } from '@/composables/useFitsViewport';
import {
    formatDateTime,
    formatMoney,
    formatTrackingNumber,
    formatWeekdayDate,
    formatWeight,
} from '@/lib/format';
import { journeyTimes } from '@/lib/journey';
import { counter } from '@/routes/staff';
import { show } from '@/routes/staff/orders';
import { receipt } from '@/routes/staff/payments';
import type { StaffOrderShowPageProps } from '@/types';

/**
 * A parcel at the branch counter. What staff do next depends on its
 * status: weigh it (Created), take payment or cancel it (Dropped Off),
 * then print the receipt. The history and every detail stay on the page.
 */
const props = defineProps<StaffOrderShowPageProps>();

const trackingNumber = computed(() =>
    formatTrackingNumber(props.order.tracking_number),
);

const events = computed(() => props.order.status_events ?? []);

const lastUpdate = computed(
    () => events.value.at(-1)?.created_at ?? props.order.updated_at,
);

const cancelReason = computed(
    () =>
        events.value.findLast((event) => event.status.value === 'cancelled')
            ?.note ?? null,
);

/**
 * The counter's headline for each status, written for staff. Keep each
 * text short enough for one line in the status card's 440px column.
 */
const headline = computed(() => {
    const order = props.order;
    const driver = order.driver?.name ?? 'The driver';
    const day = order.scheduled_for
        ? formatWeekdayDate(order.scheduled_for)
        : 'the scheduled day';

    switch (order.status.value) {
        case 'created':
            return {
                title: 'Weigh the parcel',
                text: 'Booked online. Weigh and measure it to set the final price.',
            };
        case 'dropped_off':
            return {
                title: 'Take payment',
                text: `Weighed and priced. Collect ${formatMoney(order.final_price_sen)} to send it on its way.`,
            };
        case 'paid':
            return {
                title: 'Paid, waiting for a driver',
                text: 'Put it in the dispatch area until an admin assigns a driver.',
            };
        case 'assigned':
            return {
                title: 'Scheduled for delivery',
                text: `${driver} collects it from the branch on ${day}.`,
            };
        case 'picked_up':
            return {
                title: 'Out for delivery',
                text: `${driver} is delivering it on ${day}.`,
            };
        case 'delivered':
            return {
                title: 'Delivered',
                text: `Delivered on ${formatDateTime(order.delivered_at)}.`,
            };
        case 'delivery_failed':
            return {
                title: 'Delivery failed',
                text: 'The last attempt failed. An admin will reschedule or return it.',
            };
        case 'returned_to_sender':
            return {
                title: 'Returned to sender',
                text: 'Keep the parcel aside for the sender to collect.',
            };
        case 'cancelled':
            return {
                title: 'Order cancelled',
                text: order.dropped_off_at
                    ? 'Hand the parcel back to the customer. Nothing was charged.'
                    : 'The order was cancelled before the parcel reached a branch.',
            };
        default:
            return {
                title: order.status.label,
                text: order.status_description,
            };
    }
});

const parcelSize = computed(() => ({
    weightG: props.order.measured_weight_g ?? Number.NaN,
    lengthCm: props.order.length_cm,
    widthCm: props.order.width_cm,
    heightCm: props.order.height_cm,
}));

const cardClass = 'overflow-hidden rounded-xl border border-line bg-white';

/*
 * On desktops the shorter column sticks while the other one scrolls, so
 * neither side is left blank: the history card next to a long details
 * column, or the details column's last cards next to a long history or
 * payment form (CounterOrderDetails sticks those; the page stretches the
 * column to the end of the grid so they have room to move).
 * xl:top-[88px] is the top bar's 64px plus the 24px gap between the cards
 * (lg:gap-6). The history card sticks only while it fits on screen with
 * 24px free under it too, so its end is never out of reach.
 */
const historyCard = useTemplateRef<HTMLElement>('historyCard');
const historyFits = useFitsViewport(historyCard, 24);
</script>

<template>
    <Head :title="`${trackingNumber} at the counter`" />

    <div class="grid w-full max-w-[1280px] gap-5 lg:gap-6">
        <div class="flex flex-wrap items-center justify-between gap-3">
            <Breadcrumbs
                :breadcrumbs="[
                    { title: 'Drop-off counter', href: counter() },
                    { title: trackingNumber, href: show(order.id) },
                ]"
            />
            <Button
                variant="outline"
                as-child
                class="h-10 rounded-lg font-bold print:hidden"
            >
                <Link :href="counter()">
                    <ScanLine aria-hidden="true" />
                    Next parcel
                </Link>
            </Button>
        </div>

        <!-- Status card -->
        <section
            aria-labelledby="order-title"
            class="rounded-2xl border border-line bg-white p-5 shadow-card sm:p-7"
        >
            <!-- The text keeps 440px, so the facts and the one-line headline
                 fit beside the conveyor while the sidebar is open. -->
            <div
                class="grid gap-7 xl:grid-cols-[minmax(440px,1fr)_minmax(0,500px)] xl:items-center xl:gap-8"
            >
                <div class="min-w-0">
                    <p
                        class="text-[13px] leading-[18px] font-semibold text-muted-foreground"
                    >
                        Tracking number
                    </p>
                    <TrackingNumber
                        :value="order.tracking_number"
                        size="lg"
                        class="mt-1"
                    />
                    <div
                        class="mt-4 flex flex-wrap items-center gap-x-3 gap-y-2"
                    >
                        <StatusChip :status="order.status" />
                        <span
                            class="text-[13px] leading-[18px] text-muted-foreground"
                        >
                            Last update
                            <DateTime :value="lastUpdate" />
                        </span>
                    </div>
                    <h1
                        id="order-title"
                        class="mt-3 text-[30px] leading-9 font-extrabold tracking-display text-ink sm:text-[40px] sm:leading-[46px]"
                    >
                        {{ headline.title }}
                    </h1>
                    <p class="mt-2 max-w-xl text-[15px] leading-6 text-ink-2">
                        {{ headline.text }}
                    </p>

                    <dl
                        class="mt-5 grid grid-cols-2 gap-x-4 gap-y-3 sm:flex sm:flex-wrap sm:gap-x-0"
                    >
                        <div class="col-span-2 sm:pr-4">
                            <dt
                                class="text-[12.5px] leading-[18px] font-semibold text-muted-foreground"
                            >
                                Deliver to
                            </dt>
                            <dd
                                class="text-[17px] leading-6 font-bold text-ink"
                            >
                                {{ order.city }} {{ order.postcode }}
                            </dd>
                        </div>
                        <div class="sm:border-l sm:border-line sm:px-4">
                            <dt
                                class="text-[12.5px] leading-[18px] font-semibold text-muted-foreground"
                            >
                                {{
                                    order.measured_weight_g
                                        ? 'Chargeable weight'
                                        : 'Declared weight'
                                }}
                            </dt>
                            <dd
                                class="text-[17px] leading-6 font-bold text-ink tabular-nums"
                            >
                                {{
                                    formatWeight(
                                        order.measured_weight_g
                                            ? order.chargeable_weight_g
                                            : order.declared_weight_g,
                                    )
                                }}
                            </dd>
                        </div>
                        <div class="sm:border-l sm:border-line sm:pl-4">
                            <dt
                                class="text-[12.5px] leading-[18px] font-semibold text-muted-foreground"
                            >
                                {{
                                    order.final_price_sen !== null
                                        ? 'Final price'
                                        : 'Online estimate'
                                }}
                            </dt>
                            <dd
                                class="text-[17px] leading-6 font-bold text-ink tabular-nums"
                            >
                                {{
                                    formatMoney(
                                        order.final_price_sen ??
                                            order.estimated_price_sen,
                                    )
                                }}
                            </dd>
                        </div>
                    </dl>
                </div>

                <div
                    class="min-w-0 border-t border-line-soft pt-5 xl:border-0 xl:pt-0"
                >
                    <JourneyConveyor
                        :status="order.status.value"
                        compact
                        :times="journeyTimes(events)"
                        :expected-delivery="order.scheduled_for"
                        swipe-hint="Swipe to see every stage"
                    />
                </div>
            </div>
        </section>

        <!--
            Phones and tablets: next step, details, history.
            Desktops: next step and history on the left, details on the right.
        -->
        <div
            class="grid gap-5 lg:gap-6 xl:grid-cols-[minmax(0,1fr)_minmax(0,380px)] xl:grid-rows-[auto_1fr] xl:items-start"
        >
            <div class="grid min-w-0 gap-5 empty:hidden lg:gap-6">
                <!-- Step 1: weigh -->
                <section
                    v-if="order.status.value === 'created'"
                    aria-labelledby="weigh-title"
                    :class="cardClass"
                >
                    <header
                        class="flex items-center gap-3 border-b border-line px-4 py-4 sm:px-6"
                    >
                        <span
                            class="flex size-10 flex-none items-center justify-center rounded-lg bg-brand-tint text-brand"
                        >
                            <Scale aria-hidden="true" class="size-5" />
                        </span>
                        <div>
                            <p
                                class="text-[12.5px] leading-[18px] font-bold text-brand-strong"
                            >
                                Step 1 of 2
                            </p>
                            <h2
                                id="weigh-title"
                                class="text-lg leading-6 font-extrabold tracking-heading text-ink"
                            >
                                Weigh and measure
                            </h2>
                        </div>
                    </header>
                    <div class="@container p-4 sm:p-6">
                        <WeighParcelForm :order="order" :pricing="pricing" />
                    </div>
                </section>

                <!-- Step 2: payment, or the customer refuses the price -->
                <template v-else-if="order.status.value === 'dropped_off'">
                    <section
                        aria-labelledby="payment-step-title"
                        :class="[cardClass, 'scroll-mt-20']"
                    >
                        <header
                            class="flex items-center gap-3 border-b border-line px-4 py-4 sm:px-6"
                        >
                            <span
                                class="flex size-10 flex-none items-center justify-center rounded-lg bg-brand-tint text-brand"
                            >
                                <CreditCard aria-hidden="true" class="size-5" />
                            </span>
                            <div>
                                <p
                                    class="text-[12.5px] leading-[18px] font-bold text-brand-strong"
                                >
                                    Step 2 of 2
                                </p>
                                <h2
                                    id="payment-step-title"
                                    class="text-lg leading-6 font-extrabold tracking-heading text-ink"
                                >
                                    Take payment
                                </h2>
                            </div>
                        </header>
                        <!-- The price moves beside the form only from 50rem
                             (like the weigh step), when the form still has
                             about 470px: enough for one-line payment tiles. -->
                        <div class="@container p-4 sm:p-6">
                            <div
                                class="grid gap-6 @[50rem]:grid-cols-[minmax(0,1fr)_minmax(0,300px)] @[50rem]:gap-8"
                            >
                                <TakePaymentForm
                                    :order="order"
                                    :payment-methods="paymentMethods"
                                />
                                <PriceBreakdown
                                    :pricing="pricing"
                                    :size="parcelSize"
                                    :price-sen="order.final_price_sen"
                                    :estimate-sen="order.estimated_price_sen"
                                    title="Price to pay"
                                    placeholder="The parcel has no measured weight."
                                    class="self-start"
                                />
                            </div>
                        </div>
                    </section>

                    <RefusePriceDialog :order="order" />
                </template>

                <!-- Paid: the receipt -->
                <section
                    v-else-if="order.payment"
                    aria-labelledby="payment-title"
                    :class="cardClass"
                >
                    <div
                        class="flex flex-col gap-4 p-4 sm:flex-row sm:items-center sm:justify-between sm:p-6"
                    >
                        <div class="flex min-w-0 items-start gap-4">
                            <span
                                class="flex size-11 flex-none items-center justify-center rounded-full bg-status-delivered-tint text-status-delivered"
                            >
                                <ReceiptText
                                    aria-hidden="true"
                                    class="size-5"
                                />
                            </span>
                            <div class="min-w-0">
                                <h2
                                    id="payment-title"
                                    class="text-lg leading-6 font-extrabold tracking-heading text-ink"
                                >
                                    Paid
                                    {{ formatMoney(order.payment.amount_sen) }}
                                    by
                                    {{
                                        order.payment.method.label.toLowerCase()
                                    }}
                                </h2>
                                <!-- "taken by" and the name wrap as one part,
                                     so a name is never split over two lines. -->
                                <p
                                    class="mt-0.5 text-sm leading-5 text-muted-foreground"
                                >
                                    <DateTime :value="order.payment.paid_at" />
                                    <template v-if="order.payment.received_by">
                                        ·
                                        <span class="inline-block">
                                            taken by
                                            {{ order.payment.received_by.name }}
                                        </span>
                                    </template>
                                </p>
                                <!-- Two parts that wrap whole, so a narrow
                                     column never leaves a code's last
                                     letters alone on a line. -->
                                <p
                                    class="mt-1 flex flex-wrap gap-x-3 font-mono text-[13px] leading-5 font-semibold break-all text-ink-2"
                                >
                                    <span>
                                        {{ order.payment.receipt_number }}
                                    </span>
                                    <span v-if="order.payment.reference">
                                        approval
                                        {{ order.payment.reference }}
                                    </span>
                                </p>
                            </div>
                        </div>
                        <Button
                            as-child
                            class="h-12 flex-none rounded-lg px-5 text-[15px] font-bold hover:bg-brand-strong"
                        >
                            <Link :href="receipt(order.payment.id)">
                                <Printer aria-hidden="true" />
                                Print receipt
                            </Link>
                        </Button>
                    </div>
                </section>

                <Notice
                    v-if="order.status.value === 'cancelled'"
                    title="This order is closed"
                    tone="warning"
                >
                    Cancelled on {{ formatDateTime(order.cancelled_at) }}.
                    <template v-if="cancelReason">
                        Reason: {{ cancelReason }}
                    </template>
                </Notice>
            </div>

            <CounterOrderDetails
                :order="order"
                class="xl:col-start-2 xl:row-span-2 xl:row-start-1 xl:self-stretch"
            />

            <!-- History -->
            <section
                ref="historyCard"
                aria-labelledby="history-title"
                class="min-w-0 rounded-xl border border-line bg-white p-4 sm:p-6 xl:top-[88px] xl:col-start-1"
                :class="historyFits && 'xl:sticky'"
            >
                <div
                    class="flex flex-wrap items-baseline justify-between gap-x-4 gap-y-1"
                >
                    <h2
                        id="history-title"
                        class="text-lg leading-7 font-extrabold tracking-heading text-ink sm:text-xl"
                    >
                        Parcel history
                    </h2>
                    <p class="text-[13px] leading-[18px] text-muted-foreground">
                        Malaysia time (GMT+8)
                    </p>
                </div>
                <Timeline :events="events" class="mt-5" />
            </section>
        </div>
    </div>
</template>
