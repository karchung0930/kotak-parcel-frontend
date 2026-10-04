<script setup lang="ts">
import { Head, Link, router } from '@inertiajs/vue3';
import {
    CalendarDays,
    ChevronLeft,
    ChevronRight,
    PackageCheck,
    Store,
    TriangleAlert,
    Truck,
} from '@lucide/vue';
import { computed, useTemplateRef } from 'vue';
import BranchName from '@/components/BranchName.vue';
import KotakVan from '@/components/brand/KotakVan.vue';
import JobCard from '@/components/driver/JobCard.vue';
import EmptyState from '@/components/EmptyState.vue';
import Notice from '@/components/Notice.vue';
import TextLink from '@/components/TextLink.vue';
import { Button } from '@/components/ui/button';
import {
    formatShortDate,
    formatWeekdayDate,
    pluralize,
    todayInKualaLumpur,
} from '@/lib/format';
import { jobs as jobsRoute } from '@/routes/driver';
import type { DriverJobsPageProps } from '@/types';

/**
 * The driver's round for a day (today by default): how far along it is,
 * where to collect parcels and every stop in delivery order. Today's list
 * starts with overdue jobs carried over from earlier days.
 */
const props = defineProps<DriverJobsPageProps>();

const today = todayInKualaLumpur();
const isToday = computed(() => props.date === today);

/** A "YYYY-MM-DD" day moved by a number of days. */
function shiftDay(day: string, days: number): string {
    const [year, month, date] = day.split('-').map(Number);

    return new Date(Date.UTC(year, month - 1, date + days))
        .toISOString()
        .slice(0, 10);
}

function dayHref(day: string) {
    return day === today ? jobsRoute() : jobsRoute({ query: { date: day } });
}

const previousDay = computed(() => shiftDay(props.date, -1));
const nextDay = computed(() => shiftDay(props.date, 1));

const dayName = computed(() => {
    if (props.date === today) {
        return 'Today';
    }

    if (props.date === shiftDay(today, 1)) {
        return 'Tomorrow';
    }

    return props.date === shiftDay(today, -1) ? 'Yesterday' : null;
});

// The day picker: the native date input sits over the day label.
const dayInput = useTemplateRef<HTMLInputElement>('dayInput');

function openPicker(): void {
    try {
        dayInput.value?.showPicker();
    } catch {
        // Older browsers: the focused input still takes typing.
    }
}

function pickDay(event: Event): void {
    const value = (event.target as HTMLInputElement).value;

    if (/^\d{4}-\d{2}-\d{2}$/.test(value) && value !== props.date) {
        // Keeps focus on the picker while the list changes.
        router.visit(dayHref(value), {
            preserveState: true,
            preserveScroll: true,
        });
    }
}

const finished = computed(() => props.counts.delivered + props.counts.failed);
const open = computed(() => props.counts.assigned + props.counts.picked_up);
const total = computed(() => finished.value + open.value);
const progress = computed(() =>
    total.value === 0 ? 0 : Math.round((finished.value / total.value) * 100),
);

/** Parcels still to collect, grouped by branch. */
const pickups = computed(() => {
    const byBranch = new Map<string, { name: string; count: number }>();

    for (const job of props.jobs) {
        if (job.status.value !== 'assigned' || !job.branch) {
            continue;
        }

        const entry = byBranch.get(job.branch.code) ?? {
            name: job.branch.name,
            count: 0,
        };
        entry.count++;
        byBranch.set(job.branch.code, entry);
    }

    return [...byBranch.values()];
});

const overdue = computed(() => props.jobs.filter((job) => job.is_overdue));

const COUNTS = [
    { key: 'assigned', label: 'To collect', icon: Store, tone: 'text-ink-2' },
    {
        key: 'picked_up',
        label: 'On the van',
        icon: Truck,
        tone: 'text-brand',
    },
    {
        key: 'delivered',
        label: 'Delivered',
        icon: PackageCheck,
        tone: 'text-status-delivered',
    },
    {
        key: 'failed',
        label: 'Failed',
        icon: TriangleAlert,
        tone: 'text-status-failed',
    },
] as const;

const navButton =
    'inline-flex size-11 flex-none items-center justify-center rounded-xl text-ink-2 transition-colors hover:bg-surface hover:text-ink';
</script>

<template>
    <Head :title="isToday ? 'My jobs' : `My jobs, ${formatShortDate(date)}`" />

    <div class="grid grid-cols-1 gap-5">
        <header>
            <h1
                class="text-[28px] leading-[34px] font-extrabold tracking-display text-ink sm:text-[32px] sm:leading-10"
            >
                My jobs
            </h1>
            <p class="mt-1 text-[15px] leading-6 text-muted-foreground">
                Your deliveries in the order to do them.
            </p>
        </header>

        <!-- Day switcher -->
        <nav
            aria-label="Choose a day"
            class="flex items-center gap-1 rounded-2xl border border-line bg-white p-1.5"
        >
            <Link
                :href="dayHref(previousDay)"
                preserve-state
                preserve-scroll
                :class="navButton"
                :aria-label="`Previous day, ${formatWeekdayDate(previousDay)}`"
            >
                <ChevronLeft aria-hidden="true" class="size-6" />
            </Link>

            <div
                class="relative flex min-h-11 min-w-0 flex-1 items-center justify-center gap-2.5 rounded-xl px-2 hover:bg-surface has-focus-visible:outline-3 has-focus-visible:outline-offset-2 has-focus-visible:outline-brand"
            >
                <CalendarDays
                    aria-hidden="true"
                    class="size-5 flex-none text-brand"
                />
                <p class="min-w-0 truncate text-center" aria-hidden="true">
                    <span class="text-base font-extrabold text-ink">
                        {{ dayName ?? formatWeekdayDate(date) }}
                    </span>
                    <span
                        v-if="dayName"
                        class="ml-1.5 text-sm font-semibold text-muted-foreground"
                    >
                        <!-- The short date on phones: "Yesterday" and the
                             full date do not fit between the arrows. -->
                        <span class="sm:hidden">{{
                            formatShortDate(date)
                        }}</span
                        ><span class="max-sm:hidden">{{
                            formatWeekdayDate(date)
                        }}</span>
                    </span>
                </p>
                <input
                    ref="dayInput"
                    type="date"
                    :value="date"
                    :aria-label="`Day shown: ${formatWeekdayDate(date)}. Choose another day`"
                    class="absolute inset-0 size-full cursor-pointer opacity-0"
                    @click="openPicker"
                    @change="pickDay"
                />
            </div>

            <Link
                :href="dayHref(nextDay)"
                preserve-state
                preserve-scroll
                :class="navButton"
                :aria-label="`Next day, ${formatWeekdayDate(nextDay)}`"
            >
                <ChevronRight aria-hidden="true" class="size-6" />
            </Link>
        </nav>

        <!-- The round so far -->
        <section
            aria-labelledby="round-title"
            class="overflow-hidden rounded-2xl border border-line bg-white"
        >
            <div class="flex items-center gap-4 p-4 sm:p-5">
                <div class="min-w-0 flex-1">
                    <h2
                        id="round-title"
                        class="text-[13px] leading-[18px] font-bold text-muted-foreground"
                    >
                        {{ isToday ? "Today's round" : 'The round' }}
                    </h2>
                    <p
                        class="mt-0.5 text-2xl leading-8 font-extrabold tracking-heading text-ink"
                    >
                        <template v-if="open > 0">
                            {{ pluralize(open, 'stop') }} to go
                        </template>
                        <template v-else-if="finished > 0"> All done </template>
                        <template v-else>No stops</template>
                    </p>
                    <div
                        v-if="total > 0"
                        class="mt-3 h-2 max-w-xs overflow-hidden rounded-full bg-line-soft"
                        role="progressbar"
                        :aria-valuenow="finished"
                        aria-valuemin="0"
                        :aria-valuemax="total"
                        :aria-valuetext="`${finished} of ${total} finished`"
                        aria-label="Round progress"
                    >
                        <div
                            class="h-full rounded-full bg-brand transition-[width]"
                            :style="{ width: `${progress}%` }"
                        />
                    </div>
                    <p
                        v-if="total > 0"
                        class="mt-1.5 text-[13px] leading-5 text-muted-foreground"
                    >
                        {{ finished }} of {{ total }} finished
                    </p>
                </div>
                <KotakVan compact class="w-28 flex-none sm:w-44" />
            </div>

            <dl
                class="grid grid-cols-4 divide-x divide-line-soft border-t border-line-soft"
            >
                <div
                    v-for="item in COUNTS"
                    :key="item.key"
                    class="flex flex-col-reverse items-center gap-0.5 px-1 py-3 text-center"
                >
                    <dt
                        class="flex items-center gap-1 text-[12px] leading-4 font-semibold text-muted-foreground sm:text-[12.5px]"
                    >
                        <component
                            :is="item.icon"
                            aria-hidden="true"
                            :class="['hidden size-3.5 sm:block', item.tone]"
                        />
                        {{ item.label }}
                    </dt>
                    <dd
                        class="text-[22px] leading-7 font-extrabold text-ink tabular-nums"
                    >
                        {{ counts[item.key] }}
                    </dd>
                </div>
            </dl>
        </section>

        <Notice
            v-if="pickups.length > 0"
            :icon="Store"
            tone="brand"
            title="Collect before you set off"
        >
            <ul>
                <li v-for="pickup in pickups" :key="pickup.name">
                    {{ pluralize(pickup.count, 'parcel') }} from
                    <strong class="font-bold text-ink">
                        <BranchName :name="pickup.name" />
                    </strong>
                </li>
            </ul>
        </Notice>

        <Notice
            v-if="isToday && overdue.length > 0"
            :icon="TriangleAlert"
            tone="warning"
            title="Carried over from earlier days"
        >
            {{ pluralize(overdue.length, 'job') }} left open before today
            {{ overdue.length === 1 ? 'is' : 'are' }} at the top of your list.
        </Notice>

        <!-- Stops -->
        <section v-if="jobs.length > 0" aria-labelledby="stops-title">
            <div class="mb-3 flex items-baseline justify-between gap-3">
                <h2
                    id="stops-title"
                    class="text-lg leading-7 font-extrabold tracking-heading text-ink"
                >
                    Stops
                </h2>
                <p class="text-[13px] leading-5 text-muted-foreground">
                    {{ pluralize(jobs.length, 'stop') }}, in delivery order
                </p>
            </div>
            <ol class="grid grid-cols-1 gap-3">
                <li v-for="(job, index) in jobs" :key="job.id">
                    <JobCard :job="job" :stop="index + 1" />
                </li>
            </ol>
        </section>

        <EmptyState
            v-else-if="isToday && finished > 0"
            illustration="done"
            title="All done for today"
            :description="`You finished ${pluralize(finished, 'delivery', 'deliveries')} today. Nothing is left on your list.`"
        />

        <EmptyState
            v-else
            title="No deliveries for this day"
            description="Jobs appear here as soon as the office assigns parcels to you."
        >
            <Button
                v-if="!isToday"
                as-child
                class="h-12 rounded-lg px-5 text-[15px] font-bold hover:bg-brand-strong"
            >
                <Link :href="jobsRoute()">Back to today</Link>
            </Button>
        </EmptyState>

        <p
            v-if="jobs.length > 0 && !isToday"
            class="text-center text-sm leading-5"
        >
            <TextLink :href="jobsRoute()">Back to today's jobs</TextLink>
        </p>
    </div>
</template>
