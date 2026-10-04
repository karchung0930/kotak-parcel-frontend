<script setup lang="ts">
import { ArrowRight } from '@lucide/vue';
import { useId } from 'vue';
import {
    DISPATCH_ACTION_LABELS,
    QUEUE_TONE_TEXT,
} from '@/components/admin/dispatch';
import type { QueueGroup } from '@/components/admin/dispatch';
import AttemptPips from '@/components/AttemptPips.vue';
import BranchName from '@/components/BranchName.vue';
import Pagination from '@/components/Pagination.vue';
import PlateBadge from '@/components/PlateBadge.vue';
import StatusChip from '@/components/StatusChip.vue';
import TrackingNumber from '@/components/TrackingNumber.vue';
import { Button } from '@/components/ui/button';
import Weight from '@/components/Weight.vue';
import { formatDeliveryArea } from '@/lib/format';
import { show } from '@/routes/admin/orders';
import type { OrderSummary } from '@/types';

/**
 * The dispatch queue on phones (a queue card under 44rem, where QueueTable
 * does not fit): each group under a heading, each parcel as a card with a
 * button for its next step.
 */
withDefaults(
    defineProps<{
        groups: QueueGroup[];
        maxFailedAttempts: number;
        selectedId?: number | null;
    }>(),
    { selectedId: null },
);

const emit = defineEmits<{
    select: [order: OrderSummary];
}>();

const idPrefix = useId();
</script>

<template>
    <div>
        <section
            v-for="group in groups"
            :key="group.key"
            :aria-labelledby="`${idPrefix}-${group.key}`"
            class="border-b border-line last:border-b-0"
        >
            <h3
                :id="`${idPrefix}-${group.key}`"
                :class="[
                    'flex min-h-10 flex-wrap items-center gap-2 border-b border-line-soft bg-surface/70 px-4 py-2 text-[12.5px] font-bold',
                    QUEUE_TONE_TEXT[group.tone],
                ]"
            >
                <component
                    :is="group.icon"
                    aria-hidden="true"
                    class="size-[15px]"
                    :stroke-width="2.2"
                />
                {{ group.title }}
                <PlateBadge v-if="group.plate" :plate="group.plate" />
                <span class="font-semibold text-muted-foreground">
                    ({{ group.total }})
                </span>
            </h3>

            <ul class="divide-y divide-line-soft">
                <li
                    v-for="row in group.rows"
                    :key="row.order.id"
                    :class="[
                        'px-4 py-3.5',
                        selectedId === row.order.id ? 'bg-brand-tint/60' : '',
                    ]"
                >
                    <div class="flex items-start justify-between gap-3">
                        <TrackingNumber
                            :value="row.order.tracking_number"
                            :href="show(row.order.id)"
                            size="sm"
                            :copyable="false"
                        />
                        <span
                            v-if="selectedId === row.order.id"
                            class="sr-only"
                        >
                            (open in the panel)
                        </span>
                        <StatusChip :status="row.order.status" size="sm" />
                    </div>
                    <p class="mt-2 text-sm leading-5 font-bold text-ink">
                        {{
                            formatDeliveryArea(
                                row.order.city,
                                row.order.postcode,
                            )
                        }}
                        <span class="font-medium text-muted-foreground">
                            · {{ row.order.receiver_name }}
                        </span>
                    </p>
                    <p class="mt-0.5 text-[13px] leading-5 text-ink-2">
                        <Weight :grams="row.order.chargeable_weight_g" />
                        <template v-if="row.order.branch">
                            · from <BranchName :name="row.order.branch.name" />
                        </template>
                    </p>
                    <p
                        v-if="row.detail"
                        class="mt-0.5 text-xs leading-4 text-muted-foreground"
                    >
                        {{ row.detail }}
                    </p>
                    <div class="mt-3 flex items-center justify-between gap-3">
                        <span
                            v-if="row.attempts !== null"
                            class="flex flex-wrap items-center gap-x-2.5 gap-y-1"
                        >
                            <AttemptPips
                                :used="row.attempts"
                                :max="maxFailedAttempts"
                            />
                            <span
                                v-if="row.action === 'return'"
                                class="text-xs font-bold text-status-failed"
                            >
                                Limit reached
                            </span>
                        </span>
                        <!-- As in QueueTable: while the parcel is open in
                             the panel, a plain marker the size of the
                             button stands in for it, and data-order-id
                             lets the page find the button again to give
                             it focus back when the panel closes. -->
                        <span
                            v-if="selectedId === row.order.id"
                            class="ml-auto inline-flex h-11 min-w-32 items-center justify-center gap-1.5 px-4 text-sm font-bold text-brand-strong"
                        >
                            In panel
                            <ArrowRight
                                aria-hidden="true"
                                class="size-4"
                                :stroke-width="2.4"
                            />
                        </span>
                        <Button
                            v-else-if="row.action"
                            type="button"
                            variant="outline"
                            :data-order-id="row.order.id"
                            class="ml-auto h-11 min-w-32 rounded-lg px-4 text-sm font-bold"
                            @click="emit('select', row.order)"
                        >
                            {{ DISPATCH_ACTION_LABELS[row.action] }}
                            <span class="sr-only">{{
                                row.order.tracking_number
                            }}</span>
                        </Button>
                        <!-- In the van: nothing to plan, as in QueueTable. -->
                        <span
                            v-else
                            class="ml-auto text-xs font-semibold text-muted-foreground"
                        >
                            Out for delivery
                        </span>
                    </div>
                </li>
                <li
                    v-if="group.rows.length === 0"
                    class="px-4 py-3.5 text-[13px] text-muted-foreground"
                >
                    No parcels in this group match the filters.
                </li>
            </ul>

            <div
                v-if="group.pagination && group.pagination.meta.last_page > 1"
                class="border-t border-line-soft px-4 py-3"
            >
                <Pagination
                    :meta="group.pagination.meta"
                    :only="group.pagination.only"
                    noun="parcels"
                />
            </div>
        </section>
    </div>
</template>
