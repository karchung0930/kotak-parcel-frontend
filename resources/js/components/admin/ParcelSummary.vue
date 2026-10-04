<script setup lang="ts">
import AttemptPips from '@/components/AttemptPips.vue';
import BranchName from '@/components/BranchName.vue';
import DateTime from '@/components/DateTime.vue';
import Money from '@/components/Money.vue';
import PlateBadge from '@/components/PlateBadge.vue';
import StatusChip from '@/components/StatusChip.vue';
import TrackingNumber from '@/components/TrackingNumber.vue';
import Weight from '@/components/Weight.vue';
import { formatPostcodeCity } from '@/lib/format';
import { show } from '@/routes/admin/orders';
import type { OrderSummary } from '@/types';

/**
 * The parcel being dispatched, on a grey card at the top of the assign
 * panel: where it goes, what it is, where it is collected and, for
 * failed deliveries, how many attempts are left.
 */
defineProps<{
    order: OrderSummary;
    maxFailedAttempts: number;
}>();
</script>

<template>
    <div class="rounded-xl bg-surface p-4">
        <div class="flex flex-wrap items-center justify-between gap-2">
            <TrackingNumber
                :value="order.tracking_number"
                :href="show(order.id)"
            />
            <StatusChip :status="order.status" size="sm" class="ml-auto" />
        </div>

        <dl
            class="mt-3 grid grid-cols-[5.5rem_minmax(0,1fr)] gap-x-2.5 gap-y-2 text-[13px] leading-5"
        >
            <dt class="text-muted-foreground">Receiver</dt>
            <dd class="font-semibold text-ink">{{ order.receiver_name }}</dd>

            <dt class="text-muted-foreground">Deliver to</dt>
            <dd class="font-semibold text-ink">
                {{ order.address_line1 }},
                {{ formatPostcodeCity(order.postcode, order.city) }}
            </dd>

            <dt class="text-muted-foreground">Parcel</dt>
            <dd class="font-semibold text-ink">
                {{ order.item_name }} ·
                <Weight :grams="order.chargeable_weight_g" />
                <template v-if="order.final_price_sen !== null">
                    · <Money :sen="order.final_price_sen" />
                </template>
            </dd>

            <template v-if="order.branch">
                <dt class="text-muted-foreground">Pickup</dt>
                <dd class="font-semibold text-ink">
                    <BranchName :name="order.branch.name" />
                </dd>
            </template>

            <template v-if="order.driver">
                <dt class="text-muted-foreground">
                    {{
                        order.status.value === 'delivery_failed'
                            ? 'Last driver'
                            : 'Driver'
                    }}
                </dt>
                <dd
                    class="flex flex-wrap items-center gap-x-2 gap-y-1 font-semibold text-ink"
                >
                    {{ order.driver.name }}
                    <PlateBadge
                        v-if="order.driver.vehicle_plate"
                        :plate="order.driver.vehicle_plate"
                    />
                </dd>
            </template>

            <template
                v-if="order.scheduled_for && order.status.value !== 'paid'"
            >
                <dt class="text-muted-foreground">
                    {{
                        order.status.value === 'delivery_failed'
                            ? 'Was due'
                            : 'Delivery day'
                    }}
                </dt>
                <dd class="font-semibold text-ink">
                    <DateTime :value="order.scheduled_for" format="weekday" />
                </dd>
            </template>

            <template v-if="order.failed_attempts !== undefined">
                <dt class="text-muted-foreground">Attempts</dt>
                <dd>
                    <AttemptPips
                        :used="order.failed_attempts"
                        :max="maxFailedAttempts"
                    />
                </dd>
            </template>

            <template v-if="order.latest_attempt?.failure_reason">
                <dt class="text-muted-foreground">Last attempt</dt>
                <dd class="font-semibold text-ink">
                    {{ order.latest_attempt.failure_reason.label }},
                    <DateTime
                        :value="order.latest_attempt.attempted_at"
                        format="shortDateTime"
                    />
                    <span
                        v-if="order.latest_attempt.note"
                        class="mt-1 block font-normal text-ink-2"
                    >
                        “{{ order.latest_attempt.note }}”
                    </span>
                </dd>
            </template>
        </dl>
    </div>
</template>
