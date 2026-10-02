<script setup lang="ts">
import { ArrowRight } from '@lucide/vue';
import {
    DISPATCH_ACTION_LABELS,
    QUEUE_TONE_TEXT,
} from '@/components/admin/dispatch';
import type { QueueGroup } from '@/components/admin/dispatch';
import AttemptPips from '@/components/AttemptPips.vue';
import DateTime from '@/components/DateTime.vue';
import Pagination from '@/components/Pagination.vue';
import PlateBadge from '@/components/PlateBadge.vue';
import StatusChip from '@/components/StatusChip.vue';
import TrackingNumber from '@/components/TrackingNumber.vue';
import { Button } from '@/components/ui/button';
import Weight from '@/components/Weight.vue';
import { show } from '@/routes/admin/orders';
import type { OrderSummary } from '@/types';

/**
 * The dispatch queue as a table (.data-table in app.css): one <tbody> per
 * group under a row-group heading, and a row per parcel with its next
 * step. Phones get QueueList instead (the page shows this table from a
 * 44rem queue card, which includes both iPad widths).
 *
 * Sized by the queue card (a @container): below 49rem the weight and the
 * pickup branch go under the receiver, Pickup branch gets its own column
 * at 49rem and Chargeable at 60rem, so the table still fits beside the
 * docked panel. The wrapper scrolls sideways if long names ever make the
 * columns too wide.
 */
withDefaults(
    defineProps<{
        caption: string;
        groups: QueueGroup[];
        maxFailedAttempts: number;
        selectedId?: number | null;
    }>(),
    { selectedId: null },
);

const emit = defineEmits<{
    select: [order: OrderSummary];
}>();
</script>

<template>
    <div class="overflow-x-auto">
        <table
            role="table"
            class="data-table text-[13.5px] [--columns:5] @[49rem]:[--columns:6] @[60rem]:[--columns:7]"
        >
            <caption class="sr-only">
                {{
                    caption
                }}
            </caption>
            <thead
                role="rowgroup"
                class="data-table__head border-b border-line bg-surface/70 text-[12.5px] leading-5 font-bold whitespace-nowrap text-muted-foreground"
            >
                <tr role="row" class="data-table__row">
                    <th scope="col" role="columnheader" class="py-2.5">
                        Tracking no.
                    </th>
                    <th scope="col" role="columnheader" class="py-2.5">
                        Receiver area
                    </th>
                    <th
                        scope="col"
                        role="columnheader"
                        class="hidden py-2.5 @[60rem]:block"
                    >
                        Chargeable
                    </th>
                    <th
                        scope="col"
                        role="columnheader"
                        class="hidden py-2.5 @[49rem]:block"
                    >
                        Pickup branch
                    </th>
                    <th scope="col" role="columnheader" class="py-2.5">
                        Status
                    </th>
                    <th scope="col" role="columnheader" class="py-2.5">
                        Attempts
                    </th>
                    <th scope="col" role="columnheader" class="py-2.5">
                        Actions
                    </th>
                </tr>
            </thead>

            <!-- Only the branch name may wrap (at its max width). -->
            <tbody
                v-for="(group, index) in groups"
                :key="group.key"
                role="rowgroup"
                :class="[
                    'data-table__body divide-y divide-line-soft whitespace-nowrap',
                    { 'border-t border-line-soft': index > 0 },
                ]"
            >
                <tr role="row" class="data-table__row data-table__row--full">
                    <th
                        colspan="7"
                        scope="rowgroup"
                        role="rowheader"
                        :class="[
                            'py-2.5 text-[12.5px] leading-[18px] font-bold',
                            QUEUE_TONE_TEXT[group.tone],
                        ]"
                    >
                        <span class="flex flex-wrap items-center gap-2">
                            <component
                                :is="group.icon"
                                aria-hidden="true"
                                class="size-[15px]"
                                :stroke-width="2.2"
                            />
                            {{ group.title }}
                            <PlateBadge
                                v-if="group.plate"
                                :plate="group.plate"
                            />
                            <span class="font-semibold text-muted-foreground">
                                ({{ group.total }})
                            </span>
                        </span>
                    </th>
                </tr>

                <tr
                    v-for="row in group.rows"
                    :key="row.order.id"
                    role="row"
                    :class="[
                        'data-table__row',
                        selectedId === row.order.id
                            ? 'bg-brand-tint/60'
                            : 'transition-colors hover:bg-surface/70',
                    ]"
                >
                    <td role="cell" class="py-2.5">
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
                    </td>
                    <!-- Below 49rem Pickup branch has no column either, so
                         the weight and the branch join the receiver here,
                         as in QueueList. The branch may wrap at its max
                         width. -->
                    <td role="cell" class="py-2.5">
                        <p class="leading-[19px] font-bold text-ink">
                            {{ row.order.city }} {{ row.order.postcode }}
                        </p>
                        <p
                            class="text-[12.5px] leading-[17px] text-muted-foreground"
                        >
                            {{ row.order.receiver_name }}
                            <span class="@[49rem]:hidden">
                                ·
                                <Weight
                                    :grams="row.order.chargeable_weight_g"
                                />
                            </span>
                        </p>
                        <p
                            v-if="row.order.branch"
                            class="max-w-40 text-[12.5px] leading-[17px] text-balance whitespace-normal text-muted-foreground @[49rem]:hidden"
                        >
                            from {{ row.order.branch.name }}
                        </p>
                    </td>
                    <td
                        role="cell"
                        class="hidden py-2.5 font-bold text-ink @[60rem]:block"
                    >
                        <Weight :grams="row.order.chargeable_weight_g" />
                    </td>
                    <td
                        role="cell"
                        class="hidden max-w-48 py-2.5 text-[13px] leading-[17px] whitespace-normal text-ink-2 @[49rem]:block"
                    >
                        {{ row.order.branch?.name }}
                    </td>
                    <td role="cell" class="py-2.5">
                        <StatusChip :status="row.order.status" size="sm" />
                        <!-- A failed delivery puts the time of its last try
                             on a line of its own, so this column stays about
                             as wide as its chip. Below 49rem a long reason
                             or driver name wraps as well, so the table fits
                             an iPad. -->
                        <p
                            v-if="
                                row.order.status.value === 'delivery_failed' &&
                                row.order.latest_attempt
                            "
                            class="mt-1 max-w-36 text-xs leading-4 whitespace-normal text-muted-foreground @[49rem]:max-w-none @[49rem]:whitespace-nowrap"
                        >
                            {{
                                row.order.latest_attempt.failure_reason
                                    ?.label ?? 'Not delivered'
                            }}
                            <DateTime
                                :value="row.order.latest_attempt.attempted_at"
                                format="shortDateTime"
                                class="block"
                            />
                        </p>
                        <p
                            v-else-if="row.detail"
                            class="mt-1 max-w-36 text-xs leading-4 whitespace-normal text-muted-foreground @[49rem]:max-w-none @[49rem]:whitespace-nowrap"
                        >
                            {{ row.detail }}
                        </p>
                    </td>
                    <td role="cell" class="py-2.5">
                        <AttemptPips
                            v-if="row.attempts !== null"
                            :used="row.attempts"
                            :max="maxFailedAttempts"
                        />
                        <span v-else class="text-muted-foreground">—</span>
                        <p
                            v-if="row.action === 'return'"
                            class="mt-1 text-xs leading-4 font-bold text-status-failed"
                        >
                            Limit reached
                        </p>
                    </td>
                    <!-- Every action button is one width, fitted to
                         "Reschedule", so they line up with the label
                         centred. They only open the panel, so they all
                         look alike, Return too: its warning and the step
                         that cannot be undone are in the panel. The "row"
                         size is 32px tall for a mouse and 44px on touch
                         screens (iPads).

                         The row whose parcel is open gets the tint, like
                         the active tab, and a plain "In panel" marker the
                         size of a button in place of its button, as
                         pressing that again would do nothing. When the
                         panel closes, the page finds the button again by
                         its data-order-id to give it focus back. -->
                    <td role="cell" class="py-2.5">
                        <span
                            v-if="selectedId === row.order.id"
                            class="inline-flex h-8 w-26 items-center justify-center gap-1.5 text-[13px] font-bold text-brand-strong pointer-coarse:h-11"
                        >
                            In panel
                            <ArrowRight
                                aria-hidden="true"
                                class="size-3.5"
                                :stroke-width="2.4"
                            />
                        </span>
                        <Button
                            v-else-if="row.action"
                            type="button"
                            size="row"
                            variant="outline"
                            :data-order-id="row.order.id"
                            class="w-26"
                            @click="emit('select', row.order)"
                        >
                            {{ DISPATCH_ACTION_LABELS[row.action] }}
                            <span class="sr-only">{{
                                row.order.tracking_number
                            }}</span>
                        </Button>
                        <span
                            v-else
                            class="text-xs font-semibold text-muted-foreground"
                        >
                            Out for delivery
                        </span>
                    </td>
                </tr>

                <tr
                    v-if="group.rows.length === 0"
                    role="row"
                    class="data-table__row data-table__row--full"
                >
                    <td
                        role="cell"
                        colspan="7"
                        class="py-3.5 text-[13px] text-muted-foreground"
                    >
                        No parcels in this group match the filters.
                    </td>
                </tr>

                <tr
                    v-if="
                        group.pagination && group.pagination.meta.last_page > 1
                    "
                    role="row"
                    class="data-table__row data-table__row--full"
                >
                    <td role="cell" colspan="7" class="py-2.5">
                        <Pagination
                            :meta="group.pagination.meta"
                            :only="group.pagination.only"
                            noun="parcels"
                        />
                    </td>
                </tr>
            </tbody>
        </table>
    </div>
</template>
