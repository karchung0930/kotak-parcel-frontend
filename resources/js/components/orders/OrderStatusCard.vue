<script setup lang="ts">
import { computed } from 'vue';
import DeliveryScene from '@/components/brand/DeliveryScene.vue';
import JourneyConveyor from '@/components/brand/JourneyConveyor.vue';
import ParcelBox from '@/components/brand/ParcelBox.vue';
import DateTime from '@/components/DateTime.vue';
import StatusChip from '@/components/StatusChip.vue';
import StopCount from '@/components/StopCount.vue';
import TrackingNumber from '@/components/TrackingNumber.vue';
import {
    formatDateTime,
    formatDeliveryArea,
    formatWeekdayDate,
    formatWeight,
} from '@/lib/format';
import { journeyTimes } from '@/lib/journey';
import type { Order, OrderStatusValue, StopProgress } from '@/types';

/**
 * The top of a customer's order page (the D1 tracking status card): the
 * tracking number with copy, the status as a big headline with the
 * server's explanation, out for delivery how many stops come before it,
 * three key facts, a picture of where the parcel is and the journey
 * conveyor with the current stage highlighted.
 */
const props = withDefaults(
    defineProps<{
        order: Order;
        /** Out for delivery: the parcel's stop on the driver's round. */
        progress?: StopProgress | null;
        /** The time of the last update while the stop count is not live. */
        progressAsOf?: string | null;
    }>(),
    { progress: null, progressAsOf: null },
);

const HEADLINES: Record<OrderStatusValue, string> = {
    created: 'Ready for drop-off',
    dropped_off: 'Weighed at the branch',
    paid: 'Waiting for a delivery date',
    assigned: 'Delivery scheduled',
    picked_up: 'Out for delivery',
    delivered: 'Delivered',
    delivery_failed: 'Delivery attempt failed',
    returned_to_sender: 'Returned to sender',
    cancelled: 'Order cancelled',
};

const status = computed(() => props.order.status.value);
const events = computed(() => props.order.status_events ?? []);

const lastUpdate = computed(
    () => events.value.at(-1)?.created_at ?? props.order.updated_at,
);

/** The first fact: when it was (or will be) delivered, or why not; before drop-off, the deadline. */
const when = computed((): { label: string; value: string } => {
    const order = props.order;

    switch (status.value) {
        case 'delivered':
            return {
                label: 'Delivered',
                value: formatDateTime(order.delivered_at),
            };
        case 'cancelled':
            return {
                label: 'Cancelled',
                value: formatDateTime(order.cancelled_at),
            };
        case 'returned_to_sender':
            return {
                label: 'Returned',
                value: formatDateTime(lastUpdate.value),
            };
        case 'delivery_failed':
            return { label: 'Delivery date', value: 'Being rescheduled' };
        case 'assigned':
        case 'picked_up':
            return {
                label: 'Delivery date',
                value: formatWeekdayDate(order.expected_delivery),
            };
        case 'created':
            // The most urgent fact while it waits: the server's deadline.
            return order.drop_off_deadline
                ? {
                      label: 'Drop off by',
                      value: formatWeekdayDate(order.drop_off_deadline),
                  }
                : { label: 'Delivery date', value: 'Set after drop-off' };
        default:
            return { label: 'Delivery date', value: 'Being scheduled' };
    }
});

const facts = computed(() => [
    when.value,
    {
        label: 'Destination',
        value: formatDeliveryArea(props.order.city, props.order.postcode),
    },
    {
        label: 'Weight',
        value: `${formatWeight(props.order.chargeable_weight_g)} chargeable`,
    },
]);

/** On the road: the van scene. Otherwise: the parcel itself. */
const scene = computed(() => {
    if (status.value === 'delivered') {
        return 'arrived';
    }

    return ['assigned', 'picked_up', 'delivery_failed'].includes(status.value)
        ? 'road'
        : 'parcel';
});
</script>

<template>
    <section
        aria-labelledby="status-title"
        class="rounded-2xl border border-line bg-white p-5 shadow-card sm:p-8"
    >
        <!-- The picture joins from 1280px: beside it at 1024px the three
             facts would each wrap onto two lines. Below that the conveyor
             carries the picture. -->
        <div class="grid gap-8 xl:grid-cols-[minmax(0,1fr)_400px] xl:gap-10">
            <div class="min-w-0">
                <p
                    class="text-[13px] leading-[18px] font-semibold text-muted-foreground"
                >
                    Tracking number
                </p>
                <div class="mt-1">
                    <TrackingNumber :value="order.tracking_number" size="lg" />
                </div>

                <div aria-live="polite" aria-atomic="true">
                    <div
                        class="mt-4 flex flex-wrap items-center gap-x-3 gap-y-2 sm:mt-[18px]"
                    >
                        <StatusChip :status="order.status" />
                        <span
                            class="text-[13px] leading-[18px] text-muted-foreground"
                        >
                            Last update
                            <DateTime :value="lastUpdate" />
                        </span>
                    </div>
                    <h2
                        id="status-title"
                        class="mt-2.5 text-[32px] leading-[38px] font-extrabold tracking-display text-ink sm:text-[44px] sm:leading-[50px] xl:text-[52px] xl:leading-[58px]"
                    >
                        {{ HEADLINES[status] }}
                    </h2>
                    <p
                        class="mt-2 max-w-xl text-[15px] leading-6 text-pretty text-muted-foreground"
                    >
                        {{ order.status_description }}
                    </p>
                </div>
                <!-- Its own live region: a new count is read out on its own -->
                <StopCount :progress="progress" :as-of="progressAsOf" />

                <!-- No rule under the last fact on phones: the conveyor's
                     own rule follows it. -->
                <dl
                    class="mt-5 divide-y divide-line-soft border-t border-line-soft sm:flex sm:divide-x sm:divide-y-0 sm:divide-line sm:border-0"
                >
                    <div
                        v-for="fact in facts"
                        :key="fact.label"
                        class="flex items-baseline justify-between gap-4 py-2.5 sm:block sm:px-7 sm:py-0 sm:first:pl-0 sm:last:pr-0"
                    >
                        <dt
                            class="text-[13px] leading-[18px] font-semibold text-muted-foreground sm:text-[12.5px]"
                        >
                            {{ fact.label }}
                        </dt>
                        <dd
                            class="text-right text-[15px] leading-6 font-bold text-ink sm:text-left sm:text-[17px]"
                        >
                            {{ fact.value }}
                        </dd>
                    </div>
                </dl>
            </div>

            <div
                class="hidden self-start overflow-hidden rounded-[14px] bg-surface xl:block"
            >
                <DeliveryScene
                    v-if="scene !== 'parcel'"
                    :arrived="scene === 'arrived'"
                    class="w-full"
                />
                <div
                    v-else
                    class="flex aspect-[400/236] items-center justify-center"
                >
                    <ParcelBox
                        :tape="status === 'cancelled' ? 'none' : 'vertical'"
                        :label="status !== 'cancelled'"
                        :class="[
                            'w-52',
                            status === 'cancelled'
                                ? 'opacity-50 grayscale'
                                : '',
                        ]"
                    />
                </div>
            </div>
        </div>

        <div class="mt-7 border-t border-line pt-6 sm:mt-8 sm:pt-8">
            <JourneyConveyor
                :status="status"
                compact
                :times="journeyTimes(events)"
                :expected-delivery="order.expected_delivery"
            />
        </div>
    </section>
</template>
