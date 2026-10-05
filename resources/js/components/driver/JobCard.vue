<script setup lang="ts">
import { Link } from '@inertiajs/vue3';
import {
    ArrowDown,
    ArrowUp,
    ChevronRight,
    Clock,
    Package,
    Store,
    TriangleAlert,
} from '@lucide/vue';
import { computed } from 'vue';
import BranchName from '@/components/BranchName.vue';
import StatusChip from '@/components/StatusChip.vue';
import TrackingNumber from '@/components/TrackingNumber.vue';
import { Button } from '@/components/ui/button';
import { Spinner } from '@/components/ui/spinner';
import {
    formatDeliveryArea,
    formatDimensions,
    formatShortDate,
    formatWeight,
} from '@/lib/format';
import { show } from '@/routes/driver/jobs';
import type { DriverJob } from '@/types';

type Direction = 'up' | 'down';

/**
 * One job on the driver's list: its stop number, receiver area, address,
 * parcel size and status. The whole card opens the job; the link is the
 * area heading, stretched over the card for a big touch target.
 *
 * Only parcels on the van have a stop number, the one the server works
 * out for the customer's "Your parcel is stop 3", so both say the same
 * number; a parcel still to collect shows the branch icon instead.
 *
 * While the driver reorders the stops (`reorder`), the card also has Move
 * up and Move down, above the link, overdue jobs included. One that cannot
 * move that way (the first or the last stop) stays focusable but
 * unavailable (aria-disabled), so the focus never jumps to the other
 * button. While a move is saved (`busy`) every Move button waits, and the
 * pressed one (`saving`) shows a spinner.
 */
const props = withDefaults(
    defineProps<{
        job: DriverJob;
        /** Its stop among the parcels on the van; null while still to collect. */
        stop: number | null;
        reorder?: { up: boolean; down: boolean } | null;
        busy?: boolean;
        saving?: Direction | null;
        /** Just moved: a short highlight shows where it went. */
        moved?: boolean;
    }>(),
    { reorder: null, busy: false, saving: null, moved: false },
);

const emit = defineEmits<{
    move: [direction: Direction];
}>();

const area = computed(() =>
    formatDeliveryArea(props.job.city, props.job.postcode),
);

/** How the Move buttons name the job: "stop 2, Kuala Lumpur 60000". */
const moveName = computed(() =>
    props.stop === null
        ? `${area.value}, to collect`
        : `stop ${props.stop}, ${area.value}`,
);

function canMove(direction: Direction): boolean {
    return Boolean(props.reorder?.[direction]) && !props.busy;
}

function press(direction: Direction): void {
    if (canMove(direction)) {
        emit('move', direction);
    }
}

// "40 × 30 × 25 cm · 4.2 kg". The no-break space keeps each dot at the
// end of a line, never at the start of the next.
const size = computed(() =>
    [
        formatDimensions(
            props.job.length_cm,
            props.job.width_cm,
            props.job.height_cm,
        ),
        props.job.measured_weight_g
            ? formatWeight(props.job.measured_weight_g)
            : null,
    ]
        .filter(Boolean)
        .join('\u00a0· '),
);

const failed = computed(() => props.job.failed_attempts ?? 0);
</script>

<template>
    <article
        :class="[
            'relative rounded-2xl border bg-white p-4 transition-[border-color,box-shadow] duration-500 hover:border-line-strong has-[a:focus-visible]:outline-3 has-[a:focus-visible]:outline-offset-2 has-[a:focus-visible]:outline-brand sm:p-5',
            job.is_overdue ? 'border-status-failed-pip/60' : 'border-line',
            moved && 'ring-2 ring-brand/40',
        ]"
    >
        <div class="flex gap-3 sm:gap-4">
            <span
                aria-hidden="true"
                :class="[
                    'flex size-9 flex-none items-center justify-center rounded-full font-mono text-sm font-bold',
                    stop !== null
                        ? 'bg-brand text-white'
                        : 'bg-status-neutral-tint text-status-neutral',
                ]"
            >
                <template v-if="stop !== null">{{ stop }}</template>
                <Store v-else class="size-4" />
            </span>

            <div class="min-w-0 flex-1">
                <!-- The status sits under the area on phones and beside it from
                 640px, the same on every card whatever the area's length.
                 On phones the chevron sits beside the area, so the lines
                 below get the card's full width. -->
                <div
                    class="flex flex-col items-start gap-1.5 sm:flex-row sm:justify-between sm:gap-3"
                >
                    <div
                        class="flex w-full min-w-0 items-start justify-between gap-2 sm:w-auto"
                    >
                        <h3
                            class="min-w-0 text-[17px] leading-6 font-extrabold tracking-heading wrap-anywhere text-ink"
                        >
                            <Link
                                :href="show(job.id)"
                                class="after:absolute after:inset-0 after:rounded-2xl focus-visible:outline-none"
                            >
                                <span class="sr-only">{{
                                    stop !== null
                                        ? `Stop ${stop}: `
                                        : 'To collect: '
                                }}</span>
                                {{ area }}
                            </Link>
                        </h3>
                        <ChevronRight
                            aria-hidden="true"
                            class="mt-0.5 size-5 flex-none text-muted-foreground sm:hidden"
                        />
                    </div>
                    <StatusChip :status="job.status" size="sm" />
                </div>

                <p
                    class="mt-1 text-[15px] leading-[22px] font-semibold text-ink-2 sm:mt-0.5"
                >
                    {{ job.receiver_name }}
                </p>
                <p class="mt-1 text-sm leading-5 text-muted-foreground">
                    {{ job.address_line1
                    }}<template v-if="job.address_line2"
                        >, {{ job.address_line2 }}</template
                    >
                </p>

                <p class="mt-2.5 text-[12.5px] leading-5 text-ink-2">
                    <span class="sr-only">Tracking number </span>
                    <TrackingNumber
                        :value="job.tracking_number"
                        size="inline"
                    />
                </p>
                <!-- Wraps rather than truncates: drivers need the size and weight.
                 The size is one inline block, so it moves to the next line
                 as a whole, and the dot stays after the item name. -->
                <p
                    class="mt-0.5 flex items-start gap-1.5 text-[13px] leading-5 text-ink-2"
                >
                    <Package
                        aria-hidden="true"
                        class="mt-0.5 size-4 flex-none text-muted-foreground"
                    />
                    <span class="min-w-0">
                        {{ job.item_name
                        }}<span class="text-muted-foreground">&nbsp;· </span
                        ><span class="inline-block text-muted-foreground">{{
                            size
                        }}</span>
                    </span>
                </p>

                <p
                    v-if="job.status.value === 'assigned' && job.branch"
                    class="mt-1 flex items-start gap-1.5 text-[13px] leading-5 text-ink-2"
                >
                    <Store
                        aria-hidden="true"
                        class="mt-0.5 size-4 flex-none text-brand"
                    />
                    <span class="min-w-0">
                        Collect from <BranchName :name="job.branch.name" />
                    </span>
                </p>

                <div
                    v-if="job.is_overdue || failed > 0"
                    class="mt-3 flex flex-wrap gap-2"
                >
                    <span
                        v-if="job.is_overdue"
                        class="inline-flex h-6 items-center gap-1 rounded-sm bg-status-failed-tint px-2 text-xs font-bold text-status-failed"
                    >
                        <Clock aria-hidden="true" class="size-3.5" />
                        Overdue, was due
                        {{ formatShortDate(job.scheduled_for) }}
                    </span>
                    <span
                        v-if="failed > 0"
                        class="inline-flex h-6 items-center gap-1 rounded-sm bg-status-neutral-tint px-2 text-xs font-bold text-status-neutral"
                    >
                        <TriangleAlert aria-hidden="true" class="size-3.5" />
                        Attempt {{ failed + 1 }}
                    </span>
                </div>
            </div>

            <ChevronRight
                aria-hidden="true"
                class="mt-1.5 hidden size-5 flex-none self-start text-muted-foreground sm:block"
            />
        </div>

        <!-- Over the stretched link (z-10), so a tap moves the stop
             rather than opening it. 44px tall for a thumb, the two the
             same width: side by side where both labels fit with their
             padding, one above the other on the narrowest phones (320px). -->
        <div
            v-if="reorder"
            class="@container relative z-10 mt-4 border-t border-line-soft pt-4"
        >
            <div
                class="grid grid-cols-1 gap-2.5 sm:flex @[17.5rem]:grid-cols-2"
            >
                <Button
                    :id="`move-up-${job.id}`"
                    type="button"
                    variant="outline"
                    size="touch"
                    class="min-w-0 px-3 aria-disabled:delay-200 sm:w-36 sm:px-4"
                    :aria-disabled="!canMove('up')"
                    :aria-label="`Move up: ${moveName}`"
                    @click="press('up')"
                >
                    <Spinner v-if="saving === 'up'" />
                    <ArrowUp v-else aria-hidden="true" />
                    Move up
                </Button>
                <Button
                    :id="`move-down-${job.id}`"
                    type="button"
                    variant="outline"
                    size="touch"
                    class="min-w-0 px-3 aria-disabled:delay-200 sm:w-36 sm:px-4"
                    :aria-disabled="!canMove('down')"
                    :aria-label="`Move down: ${moveName}`"
                    @click="press('down')"
                >
                    <Spinner v-if="saving === 'down'" />
                    <ArrowDown v-else aria-hidden="true" />
                    Move down
                </Button>
            </div>
        </div>
    </article>
</template>
