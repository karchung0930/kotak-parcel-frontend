<script setup lang="ts">
import { Head, Link } from '@inertiajs/vue3';
import { Banknote, Info, PackagePlus, Receipt } from '@lucide/vue';
import { computed, useTemplateRef } from 'vue';
import ActionDivider from '@/components/ActionDivider.vue';
import DateTime from '@/components/DateTime.vue';
import DescriptionItem from '@/components/DescriptionItem.vue';
import DescriptionList from '@/components/DescriptionList.vue';
import Money from '@/components/Money.vue';
import Notice from '@/components/Notice.vue';
import BranchDetails from '@/components/orders/BranchDetails.vue';
import CancelOrderDialog from '@/components/orders/CancelOrderDialog.vue';
import CounterPass from '@/components/orders/CounterPass.vue';
import DeliveryAttempts from '@/components/orders/DeliveryAttempts.vue';
import OrderStatusCard from '@/components/orders/OrderStatusCard.vue';
import PageHeader from '@/components/PageHeader.vue';
import Timeline from '@/components/Timeline.vue';
import { Button } from '@/components/ui/button';
import Weight from '@/components/Weight.vue';
import { useFitsViewport } from '@/composables/useFitsViewport';
import {
    formatDateTime,
    formatDimensions,
    formatPhone,
    formatTrackingNumber,
    formatWeekdayDate,
    telHref,
} from '@/lib/format';
import { create, index, show } from '@/routes/orders';
import type { OrdersShowPageProps } from '@/types';

/**
 * One of the customer's parcels: where it is (status card and journey
 * conveyor), what to do next (the counter pass before drop-off), its
 * history, delivery attempts, details, price and payment.
 */
const props = defineProps<OrdersShowPageProps>();

const trackingNumber = computed(() =>
    formatTrackingNumber(props.order.tracking_number),
);
const status = computed(() => props.order.status.value);
const events = computed(() => props.order.status_events ?? []);

const breadcrumbs = computed(() => [
    { title: 'My parcels', href: index() },
    { title: trackingNumber.value, href: show(props.order.id) },
]);

/** The dashed "not yet" step on top of the history. */
const pending = computed(() => {
    const order = props.order;

    if (order.is_final) {
        return null;
    }

    let description =
        "Not yet. We'll set a delivery date once the parcel is paid for at the branch.";

    if (status.value === 'delivery_failed') {
        description = 'Not yet. Our team is arranging the next delivery day.';
    } else if (order.scheduled_for) {
        description = `Not yet. Expected on ${formatWeekdayDate(order.scheduled_for)}.`;
    }

    return {
        title: 'Delivered',
        description,
        date: status.value === 'delivery_failed' ? null : order.scheduled_for,
    };
});

const priceChanged = computed(
    () =>
        props.order.final_price_sen !== null &&
        props.order.final_price_sen !== props.order.estimated_price_sen,
);

const awaitingPayment = computed(() =>
    ['created', 'dropped_off'].includes(status.value),
);

/** Before drop-off the counter pass shows the branch instead. */
const showBranchCard = computed(
    () => !!props.order.branch && status.value !== 'created',
);

/*
 * On desktops the history card sticks 24px under the site header while
 * the taller details column scrolls: the same gap as between the cards
 * (sm:space-y-6), so lg:top-[101px] is the header's 77px (with its
 * border) plus 24px. It only sticks while it fits on screen with 24px
 * free under it too; a longer history stays in place so its end is never
 * out of reach.
 */
const historyCard = useTemplateRef<HTMLElement>('historyCard');
const historyFits = useFitsViewport(historyCard, 24);
</script>

<template>
    <Head :title="trackingNumber" />

    <PageHeader
        :title="`Parcel to ${order.receiver_name}`"
        :description="`${order.item_name} · ordered ${formatDateTime(order.created_at)}`"
        :breadcrumbs="breadcrumbs"
    >
        <template #actions>
            <CancelOrderDialog
                v-if="canCancel"
                :order-id="order.id"
                :tracking-number="order.tracking_number"
            />
            <!-- Cancelling this parcel vs sending a new one -->
            <ActionDivider v-if="canCancel" />
            <Button as-child variant="secondary" class="h-11 px-4 font-bold">
                <Link :href="create()">
                    <PackagePlus aria-hidden="true" />
                    Send another parcel
                </Link>
            </Button>
        </template>
    </PageHeader>

    <div class="mt-6 flex flex-col gap-5 sm:gap-6">
        <OrderStatusCard :order="order" />

        <!-- On phones the pass comes first: the status card is long there,
             and the barcode is what the customer needs at the counter. -->
        <CounterPass
            v-if="status === 'created'"
            :tracking-number="order.tracking_number"
            :branch="order.branch"
            :deadline="order.drop_off_deadline"
            class="max-md:order-first"
        />

        <!-- Both columns stretch to the row's height, so the history card has room to stick -->
        <div
            class="grid gap-5 sm:gap-6 lg:grid-cols-[minmax(0,1fr)_360px] xl:grid-cols-[minmax(0,1fr)_400px]"
        >
            <div class="min-w-0 space-y-5 sm:space-y-6">
                <DeliveryAttempts :order="order" />

                <section
                    ref="historyCard"
                    aria-labelledby="history-title"
                    class="rounded-2xl border border-line bg-white p-5 sm:p-7 lg:top-[101px]"
                    :class="historyFits && 'lg:sticky'"
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
                        <span
                            class="text-[13px] leading-[18px] text-muted-foreground"
                        >
                            Malaysia time (GMT+8)
                        </span>
                    </div>

                    <Timeline
                        :events="events"
                        :pending="pending"
                        class="mt-5"
                    />

                    <div
                        v-if="!order.is_final"
                        class="mt-5 flex gap-3 border-t border-line pt-5 text-[13.5px] leading-5 text-ink-2"
                    >
                        <Info
                            aria-hidden="true"
                            class="mt-px size-[18px] flex-none text-brand"
                        />
                        <p>
                            Not home? The driver records the attempt and we
                            deliver again on another day. If it still can't be
                            delivered, the parcel comes back to you.
                        </p>
                    </div>
                </section>
            </div>

            <!-- Cards made for the 360px side column: in pairs on tablets
                 rather than stretched across the page, each as tall as its
                 content. content-start, as this column stretches to the
                 row's height from 1024px. -->
            <div
                class="grid content-start gap-5 sm:gap-6 md:grid-cols-2 md:items-start lg:grid-cols-1"
            >
                <section
                    aria-labelledby="details-title"
                    class="rounded-2xl border border-line bg-white p-5 sm:p-6"
                >
                    <h2
                        id="details-title"
                        class="text-lg leading-[26px] font-extrabold tracking-heading text-ink"
                    >
                        Parcel details
                    </h2>
                    <DescriptionList class="mt-1.5">
                        <DescriptionItem label="What's inside">
                            {{ order.item_name }}
                        </DescriptionItem>
                        <DescriptionItem label="Chargeable weight">
                            <Weight :grams="order.chargeable_weight_g" />
                        </DescriptionItem>
                        <DescriptionItem label="Your declared weight">
                            <Weight :grams="order.declared_weight_g" />
                        </DescriptionItem>
                        <DescriptionItem label="Weighed at the branch">
                            <Weight
                                v-if="order.measured_weight_g !== null"
                                :grams="order.measured_weight_g"
                            />
                            <span
                                v-else
                                class="font-semibold text-muted-foreground"
                            >
                                At drop-off
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
                    </DescriptionList>
                </section>

                <section
                    aria-labelledby="price-title"
                    class="rounded-2xl border border-line bg-white p-5 sm:p-6"
                >
                    <h2
                        id="price-title"
                        class="text-lg leading-[26px] font-extrabold tracking-heading text-ink"
                    >
                        Price
                    </h2>
                    <DescriptionList class="mt-1.5">
                        <DescriptionItem label="Estimate when ordered">
                            <Money :sen="order.estimated_price_sen" />
                        </DescriptionItem>
                        <DescriptionItem label="Final price">
                            <Money
                                v-if="order.final_price_sen !== null"
                                :sen="order.final_price_sen"
                                class="text-base font-extrabold"
                            />
                            <span
                                v-else
                                class="font-semibold text-muted-foreground"
                            >
                                Set when weighed
                            </span>
                        </DescriptionItem>
                    </DescriptionList>
                    <p
                        v-if="priceChanged"
                        class="mt-1 text-[13px] leading-5 text-muted-foreground"
                    >
                        The final price uses the weight and size measured at the
                        branch.
                    </p>

                    <div
                        v-if="order.payment"
                        class="mt-4 rounded-xl border border-line bg-surface px-4 pt-3.5 pb-1"
                    >
                        <h3
                            class="flex items-center gap-2 text-[15px] leading-[22px] font-bold text-ink"
                        >
                            <Receipt
                                aria-hidden="true"
                                class="size-[18px] text-status-paid"
                            />
                            Payment receipt
                        </h3>
                        <DescriptionList class="mt-1">
                            <DescriptionItem label="Receipt no.">
                                <span class="font-mono">{{
                                    order.payment.receipt_number
                                }}</span>
                            </DescriptionItem>
                            <DescriptionItem label="Amount paid">
                                <Money :sen="order.payment.amount_sen" />
                            </DescriptionItem>
                            <DescriptionItem label="Paid by">
                                {{ order.payment.method.label }}
                                <span
                                    v-if="order.payment.reference"
                                    class="block text-xs font-semibold text-muted-foreground"
                                >
                                    Approval code
                                    <span class="font-mono">{{
                                        order.payment.reference
                                    }}</span>
                                </span>
                            </DescriptionItem>
                            <DescriptionItem label="Paid on">
                                <DateTime :value="order.payment.paid_at" />
                            </DescriptionItem>
                            <DescriptionItem v-if="order.branch" label="Branch">
                                {{ order.branch.name }}
                            </DescriptionItem>
                        </DescriptionList>
                    </div>

                    <Notice
                        v-else-if="awaitingPayment"
                        :icon="Banknote"
                        class="mt-4"
                    >
                        Pay at the branch by cash or card when you drop the
                        parcel off. You'll get a receipt at the counter.
                    </Notice>
                </section>

                <!-- Without a branch card beside it on tablets, it takes the
                     whole row and puts the receiver and sender side by side. -->
                <section
                    aria-labelledby="addresses-title"
                    :class="[
                        'rounded-2xl border border-line bg-white p-5 sm:p-6',
                        !showBranchCard && 'md:col-span-2 lg:col-span-1',
                    ]"
                >
                    <h2
                        id="addresses-title"
                        class="text-lg leading-[26px] font-extrabold tracking-heading text-ink"
                    >
                        Receiver and sender
                    </h2>
                    <!-- Balanced by eye, not by line box: the phone's underline
                         sits at the very foot of its line, while "From" has
                         about 5px of leading above its letters. So the
                         receiver gets 18px under it (the list's usual 12px
                         below the divider stays), which leaves the same 17px
                         of white on both sides of the divider, as in the
                         other cards. -->
                    <DescriptionList
                        :class="[
                            'mt-1.5',
                            !showBranchCard &&
                                'md:grid md:grid-cols-2 md:gap-x-8 md:divide-y-0 lg:block lg:divide-y',
                        ]"
                    >
                        <DescriptionItem
                            label="Deliver to"
                            stacked
                            :class="[
                                'pb-4.5',
                                !showBranchCard && 'md:max-lg:pb-3',
                            ]"
                        >
                            {{ order.receiver_name }}
                            <span class="mt-0.5 block font-normal text-ink-2">
                                {{ order.address_line1 }}
                                <template v-if="order.address_line2">
                                    <br />{{ order.address_line2 }}
                                </template>
                                <br />{{ order.postcode }} {{ order.city }},
                                {{ order.state }}
                            </span>
                            <!-- after: makes the tap target 44px tall
                                 without moving anything -->
                            <a
                                :href="telHref(order.receiver_phone)"
                                class="relative mt-1 inline-block font-semibold text-brand-strong underline decoration-brand-edge underline-offset-4 after:absolute after:-inset-x-1 after:-inset-y-3 hover:text-brand-deep hover:decoration-current"
                            >
                                <span class="sr-only">Call the receiver:</span>
                                {{ formatPhone(order.receiver_phone) }}
                            </a>
                        </DescriptionItem>
                        <DescriptionItem label="From" stacked>
                            {{ order.sender_name }}
                            <span class="block font-normal text-ink-2">
                                {{ formatPhone(order.sender_phone) }}
                            </span>
                        </DescriptionItem>
                    </DescriptionList>
                </section>

                <section
                    v-if="showBranchCard && order.branch"
                    aria-labelledby="branch-title"
                    class="rounded-2xl border border-line bg-white p-5 sm:p-6"
                >
                    <h2
                        id="branch-title"
                        class="text-lg leading-[26px] font-extrabold tracking-heading text-ink"
                    >
                        Drop-off branch
                    </h2>
                    <BranchDetails :branch="order.branch" class="mt-3" />
                </section>
            </div>
        </div>
    </div>
</template>
