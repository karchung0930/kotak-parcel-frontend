<script setup lang="ts">
import { Camera, ExternalLink, PackageCheck, TriangleAlert } from '@lucide/vue';
import { computed } from 'vue';
import DateTime from '@/components/DateTime.vue';
import Notice from '@/components/Notice.vue';
import { Button } from '@/components/ui/button';
import { pluralize } from '@/lib/format';
import { proof } from '@/routes/orders';
import type { Order } from '@/types';

/**
 * A customer's view of the delivery attempts, from the order's history:
 * each failed attempt with its reason (the customer-safe label; drivers'
 * notes stay internal) and the successful one with who received it and
 * the proof of delivery photo. Renders nothing before the first attempt.
 */
const props = defineProps<{
    order: Order;
}>();

type Attempt = {
    id: number;
    number: number;
    delivered: boolean;
    at: string;
    reason: string | null;
};

const attempts = computed<Attempt[]>(() =>
    (props.order.status_events ?? [])
        .filter(
            (event) =>
                event.status.value === 'delivery_failed' ||
                event.status.value === 'delivered',
        )
        .map((event, index) => ({
            id: event.id,
            number: index + 1,
            delivered: event.status.value === 'delivered',
            at: event.created_at,
            reason:
                event.status.value === 'delivery_failed' ? event.note : null,
        }))
        .reverse(),
);

const failedCount = computed(
    () => attempts.value.filter((attempt) => !attempt.delivered).length,
);

const latest = computed(() => props.order.latest_attempt ?? null);

const recipient = computed(() =>
    latest.value?.outcome.value === 'delivered'
        ? latest.value.recipient_name
        : null,
);

const hasPhoto = computed(
    () =>
        props.order.status.value === 'delivered' &&
        latest.value?.has_photo === true,
);
</script>

<template>
    <section
        v-if="attempts.length > 0"
        aria-labelledby="attempts-title"
        class="rounded-2xl border border-line bg-white p-5 sm:p-7"
    >
        <div class="flex flex-wrap items-center justify-between gap-2">
            <h2
                id="attempts-title"
                class="text-lg leading-7 font-extrabold tracking-heading text-ink sm:text-xl"
            >
                Delivery attempts
            </h2>
            <span
                v-if="failedCount > 0"
                class="text-[13px] leading-[18px] font-semibold text-status-failed"
            >
                {{ pluralize(failedCount, 'failed attempt') }}
            </span>
        </div>

        <ol class="mt-4 space-y-2.5">
            <li
                v-for="attempt in attempts"
                :key="attempt.id"
                :class="[
                    'flex gap-3 rounded-xl p-3.5 sm:p-4',
                    attempt.delivered
                        ? 'bg-status-delivered-tint'
                        : 'border border-line bg-white',
                ]"
            >
                <span
                    :class="[
                        'flex size-9 flex-none items-center justify-center rounded-lg',
                        attempt.delivered
                            ? 'bg-white text-status-delivered'
                            : 'bg-status-failed-tint text-status-failed',
                    ]"
                >
                    <PackageCheck
                        v-if="attempt.delivered"
                        aria-hidden="true"
                        class="size-5"
                    />
                    <TriangleAlert v-else aria-hidden="true" class="size-5" />
                </span>

                <div class="min-w-0 flex-1">
                    <p class="text-[13px] leading-[18px] text-muted-foreground">
                        Attempt {{ attempt.number }} ·
                        <DateTime :value="attempt.at" />
                    </p>
                    <p
                        class="mt-0.5 text-[15px] leading-[22px] font-bold text-ink"
                    >
                        <!-- On phones the recipient gets a line of its own,
                             and the name moves under "received by" whole
                             rather than being broken in two. -->
                        <template v-if="attempt.delivered">
                            Delivered
                            <template v-if="recipient">
                                <span
                                    class="font-semibold text-ink-2 max-sm:hidden"
                                >
                                    ·
                                </span>
                                <span
                                    class="block font-semibold text-ink-2 sm:inline"
                                >
                                    received by
                                    <span class="inline-block">{{
                                        recipient
                                    }}</span>
                                </span>
                            </template>
                        </template>
                        <template v-else>
                            Not delivered<span v-if="attempt.reason"
                                >: {{ attempt.reason }}</span
                            >
                        </template>
                    </p>

                    <!-- A green edge, as the parcel was delivered; it still
                         lifts on hover like every outline button. Phones
                         get a shorter label that fits on one line, down to
                         320px; it may still wrap, so the button grows. -->
                    <Button
                        v-if="attempt.delivered && hasPhoto"
                        variant="outline"
                        as-child
                        class="mt-3 h-auto min-h-11 rounded-lg border-status-delivered/30 py-2 font-bold whitespace-normal hover:border-status-delivered"
                    >
                        <a
                            :href="proof.url(order.id)"
                            target="_blank"
                            rel="noopener"
                        >
                            <Camera
                                aria-hidden="true"
                                class="text-status-delivered"
                            />
                            <span class="sm:hidden">View photo</span>
                            <span class="max-sm:hidden">
                                View proof of delivery photo
                            </span>
                            <ExternalLink aria-hidden="true" />
                            <span class="sr-only">(opens in a new tab)</span>
                        </a>
                    </Button>
                </div>
            </li>
        </ol>

        <Notice v-if="order.status.value === 'delivery_failed'" class="mt-4">
            Our team will arrange another delivery day, or return the parcel to
            you if it still can't be delivered. This page updates as soon as
            it's decided.
        </Notice>
    </section>
</template>
