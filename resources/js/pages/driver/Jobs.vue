<script setup lang="ts">
import { Head, Link, router } from '@inertiajs/vue3';
import {
    ArrowUpDown,
    CalendarDays,
    Check,
    ChevronLeft,
    ChevronRight,
    PackageCheck,
    Store,
    TriangleAlert,
    Truck,
} from '@lucide/vue';
import {
    computed,
    nextTick,
    onBeforeUnmount,
    onMounted,
    ref,
    useTemplateRef,
    watch,
} from 'vue';
import { toast } from 'vue-sonner';
import BranchName from '@/components/BranchName.vue';
import KotakVan from '@/components/brand/KotakVan.vue';
import JobCard from '@/components/driver/JobCard.vue';
import EmptyState from '@/components/EmptyState.vue';
import Notice from '@/components/Notice.vue';
import TextLink from '@/components/TextLink.vue';
import TrackingScanner from '@/components/TrackingScanner.vue';
import { Button } from '@/components/ui/button';
import type { ScanOutcome } from '@/composables/useTrackingScanner';
import {
    formatDeliveryArea,
    formatShortDate,
    formatWeekdayDate,
    normalizeTrackingNumber,
    pluralize,
    todayInKualaLumpur,
} from '@/lib/format';
import { jobs as jobsRoute } from '@/routes/driver';
import { move, show } from '@/routes/driver/jobs';
import type { DriverJob, DriverJobsPageProps } from '@/types';

/**
 * The driver's round for a day (today by default): how far along it is,
 * where to collect parcels and every stop in delivery order. Today's list
 * also has the overdue jobs carried over from earlier days, first until
 * the driver moves them among today's stops. Each parcel on the van shows
 * its stop as the server works it out for its customer (`stops`).
 */
const props = defineProps<DriverJobsPageProps>();

// Today comes from the server with the list, so a page left open past
// midnight moves on to the new day with its next visit.
const isToday = computed(() => props.date === props.today);

/*
 * A tab left open overnight (a phone restored in the morning) catches up
 * as soon as it is looked at again: once the browser's day has moved on
 * since the list came, it asks for the list again.
 */
let dayOfList = todayInKualaLumpur();

watch(
    () => props.today,
    () => (dayOfList = todayInKualaLumpur()),
);

function catchUp(): void {
    if (
        document.visibilityState === 'visible' &&
        todayInKualaLumpur() !== dayOfList
    ) {
        dayOfList = todayInKualaLumpur();
        router.reload();
    }
}

onMounted(() => document.addEventListener('visibilitychange', catchUp));
onBeforeUnmount(() =>
    document.removeEventListener('visibilitychange', catchUp),
);

/** A "YYYY-MM-DD" day moved by a number of days. */
function shiftDay(day: string, days: number): string {
    const [year, month, date] = day.split('-').map(Number);

    return new Date(Date.UTC(year, month - 1, date + days))
        .toISOString()
        .slice(0, 10);
}

function dayHref(day: string) {
    return day === props.today
        ? jobsRoute()
        : jobsRoute({ query: { date: day } });
}

const previousDay = computed(() => shiftDay(props.date, -1));
const nextDay = computed(() => shiftDay(props.date, 1));

const dayName = computed(() => {
    if (props.date === props.today) {
        return 'Today';
    }

    if (props.date === shiftDay(props.today, 1)) {
        return 'Tomorrow';
    }

    return props.date === shiftDay(props.today, -1) ? 'Yesterday' : null;
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

/** A scanned label opens its job, if it is on the list shown. */
function openScanned(number: string): Promise<ScanOutcome> {
    const job = props.jobs.find(
        (item) =>
            normalizeTrackingNumber(item.tracking_number) ===
            normalizeTrackingNumber(number),
    );

    if (!job) {
        return Promise.resolve({
            found: false,
            message: `${number} is not on ${isToday.value ? "today's list" : 'the list for this day'}.`,
        });
    }

    router.visit(show(job.id));

    return Promise.resolve({ found: true });
}

/*
 * Reordering today's stops. Any stop on today's list moves, the jobs
 * carried over from earlier days too: the first move puts the whole list
 * on today's run. Each move is saved straight away, and customers following
 * a parcel on the van see its new place over Reverb.
 */
type Direction = 'up' | 'down';

/** Whether the stop has another one before or after it to swap places with. */
function canMove(index: number, direction: Direction): boolean {
    return (
        isToday.value &&
        props.jobs[index + (direction === 'up' ? -1 : 1)] !== undefined
    );
}

const canReorder = computed(() => isToday.value && props.jobs.length > 1);

const reordering = ref(false);
/** The move being saved; the Move buttons wait until it is. */
const saving = ref<{ id: number; direction: Direction } | null>(null);
const busy = computed(() => saving.value !== null);
/** Read out after each move (the list itself changes silently). */
const announcement = ref('');

watch(canReorder, (can) => {
    if (!can) {
        reordering.value = false;
    }
});

function toggleReordering(): void {
    reordering.value = !reordering.value;
    announcement.value = reordering.value
        ? 'Each stop now has Move up and Move down.'
        : '';
}

/** The stop just moved, highlighted for a moment so the eye finds it. */
const movedId = ref<number | null>(null);
let movedTimer: ReturnType<typeof setTimeout> | undefined;

function highlight(id: number): void {
    clearTimeout(movedTimer);
    movedId.value = id;
    movedTimer = setTimeout(() => (movedId.value = null), 1500);
}

onBeforeUnmount(() => clearTimeout(movedTimer));

function moveButton(job: DriverJob, direction: Direction): HTMLElement | null {
    return document.getElementById(`move-${direction}-${job.id}`);
}

function announceMove(job: DriverJob): void {
    const index = props.jobs.findIndex((item) => item.id === job.id);
    const area = formatDeliveryArea(job.city, job.postcode);
    const stop = props.stops[index];

    announcement.value =
        stop !== null && stop !== undefined
            ? `${area} is now stop ${stop}.`
            : `${area} is now ${index + 1} of ${props.jobs.length} on your list.`;
}

function refuseMove(message: string): void {
    announcement.value = message;
    toast.error(message);
}

/*
 * The page keeps its scroll, so after a swap the other stop's button would
 * sit under the thumb, and a second tap would undo the move. The page
 * scrolls by as much as the pressed button moved instead: it stays under
 * the thumb, keeps the focus, and each tap moves the same stop again.
 */
function moveStop(job: DriverJob, direction: Direction): void {
    if (saving.value) {
        return;
    }

    const before = moveButton(job, direction)?.getBoundingClientRect().top;
    saving.value = { id: job.id, direction };

    router.post(
        move.url(job.id),
        { direction },
        {
            preserveScroll: true,
            preserveState: true,
            onSuccess: () => {
                announceMove(job);
                highlight(job.id);
                void nextTick(() => {
                    const button = moveButton(job, direction);

                    if (button && before !== undefined) {
                        window.scrollBy({
                            top: button.getBoundingClientRect().top - before,
                            behavior: 'instant',
                        });
                    }

                    button?.focus({ preventScroll: true });
                });
            },
            onError: (errors) =>
                refuseMove(
                    errors.direction ??
                        'The stop could not be moved. Try again.',
                ),
            onHttpException: (response) => {
                if (response.status !== 429) {
                    return;
                }

                refuseMove(
                    'That is a lot of moves in a minute. Wait a moment, then try again.',
                );

                return false;
            },
            onFinish: () => (saving.value = null),
        },
    );
}

const navButton =
    'inline-flex size-11 flex-none items-center justify-center rounded-xl text-ink-2 transition-colors hover:bg-surface hover:text-ink';
</script>

<template>
    <Head :title="isToday ? 'My jobs' : `My jobs, ${formatShortDate(date)}`" />

    <div class="grid grid-cols-1 gap-5">
        <!-- The scan button sits beside the title, so the intro keeps
             its one line. Where both do not fit (320px), it goes under
             the intro (a container query on the header). -->
        <header class="@container">
            <div
                class="grid grid-cols-1 items-center gap-x-4 @[19.5rem]:grid-cols-[minmax(0,1fr)_auto]"
            >
                <h1
                    class="text-[28px] leading-[34px] font-extrabold tracking-display text-ink sm:text-[32px] sm:leading-10"
                >
                    My jobs
                </h1>
                <TrackingScanner
                    v-if="jobs.length > 0"
                    :resolve="openScanned"
                    action-label="Open job"
                    size="touch"
                    class="order-last mt-3 justify-self-start @[19.5rem]:order-none @[19.5rem]:mt-0"
                />
                <p
                    class="mt-1 text-[15px] leading-6 text-muted-foreground @[19.5rem]:col-span-2"
                >
                    Your deliveries in the order to do them.
                </p>
            </div>
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
            {{ overdue.length === 1 ? 'is' : 'are' }} on your list, marked
            Overdue.<template v-if="canReorder">
                Use Reorder stops to fit
                {{ overdue.length === 1 ? 'it' : 'them' }} into today's
                round.</template
            >
        </Notice>

        <!-- An earlier day: what is still open of it is on today's list,
             listed here in today's order with today's stop numbers. -->
        <Notice
            v-else-if="overdue.length > 0"
            :icon="TriangleAlert"
            tone="warning"
            title="Carried over to today"
        >
            {{ overdue.length === 1 ? 'This job is' : 'These jobs are' }}
            still open, so {{ overdue.length === 1 ? 'it is' : 'they are' }} on
            <TextLink :href="jobsRoute()">today's list</TextLink> now. The stop
            numbers are today's.
        </Notice>

        <!-- Stops -->
        <section v-if="jobs.length > 0" aria-labelledby="stops-title">
            <div class="mb-3 flex items-center justify-between gap-3">
                <div class="min-w-0">
                    <h2
                        id="stops-title"
                        class="text-lg leading-7 font-extrabold tracking-heading text-ink"
                    >
                        Stops
                    </h2>
                    <!-- Where it wraps (320px), it wraps after the comma. -->
                    <p class="text-[13px] leading-5 text-muted-foreground">
                        {{ pluralize(jobs.length, 'stop') }},
                        <span class="whitespace-nowrap">in delivery order</span>
                    </p>
                </div>
                <!-- A switch: the same label on and off (so the header
                     never reflows), pressed and pale red while on, like
                     the other switches. -->
                <Button
                    v-if="canReorder"
                    type="button"
                    variant="outline"
                    size="touch"
                    :aria-pressed="reordering"
                    :class="[
                        'flex-none',
                        reordering &&
                            'border-brand bg-brand-tint text-brand-strong hover:border-brand hover:text-brand-strong',
                    ]"
                    @click="toggleReordering"
                >
                    <component
                        :is="reordering ? Check : ArrowUpDown"
                        aria-hidden="true"
                    />
                    Reorder stops
                </Button>
            </div>
            <p class="sr-only" role="status" aria-live="polite">
                {{ announcement }}
            </p>
            <ol class="grid grid-cols-1 gap-3" :aria-busy="busy">
                <li v-for="(job, index) in jobs" :key="job.id">
                    <JobCard
                        :job="job"
                        :stop="stops[index] ?? null"
                        :reorder="
                            reordering
                                ? {
                                      up: canMove(index, 'up'),
                                      down: canMove(index, 'down'),
                                  }
                                : null
                        "
                        :busy="busy"
                        :saving="
                            saving?.id === job.id ? saving.direction : null
                        "
                        :moved="movedId === job.id"
                        @move="moveStop(job, $event)"
                    />
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
