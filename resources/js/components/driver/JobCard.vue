<script setup lang="ts">
import { Link } from '@inertiajs/vue3';
import {
    ChevronRight,
    Clock,
    Package,
    Store,
    TriangleAlert,
} from '@lucide/vue';
import { computed } from 'vue';
import StatusChip from '@/components/StatusChip.vue';
import {
    formatDimensions,
    formatShortDate,
    formatTrackingNumber,
    formatWeight,
} from '@/lib/format';
import { show } from '@/routes/driver/jobs';
import type { DriverJob } from '@/types';

/**
 * One stop on the driver's list: stop number, receiver area, address,
 * parcel size and status. The whole card opens the job; the link is the
 * area heading, stretched over the card for a big touch target.
 */
const props = defineProps<{
    job: DriverJob;
    stop: number;
}>();

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
            'relative flex gap-3 rounded-2xl border bg-white p-4 transition-colors hover:border-line-strong has-focus-visible:outline-3 has-focus-visible:outline-offset-2 has-focus-visible:outline-brand sm:gap-4 sm:p-5',
            job.is_overdue ? 'border-status-failed-pip/60' : 'border-line',
        ]"
    >
        <span
            aria-hidden="true"
            :class="[
                'flex size-9 flex-none items-center justify-center rounded-full font-mono text-sm font-bold',
                job.status.value === 'picked_up'
                    ? 'bg-brand text-white'
                    : 'bg-status-neutral-tint text-status-neutral',
            ]"
        >
            {{ stop }}
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
                        class="min-w-0 text-[17px] leading-6 font-extrabold tracking-heading text-ink"
                    >
                        <Link
                            :href="show(job.id)"
                            class="after:absolute after:inset-0 after:rounded-2xl focus-visible:outline-none"
                        >
                            <span class="sr-only">Stop {{ stop }}: </span>
                            {{ job.city }} {{ job.postcode }}
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

            <p
                class="mt-2.5 font-mono text-[12.5px] leading-5 font-bold tracking-[0.02em] text-ink-2"
            >
                <span class="sr-only">Tracking number </span>
                {{ formatTrackingNumber(job.tracking_number) }}
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
                    Collect from {{ job.branch.name }}
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
                    Overdue, was due {{ formatShortDate(job.scheduled_for) }}
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
    </article>
</template>
