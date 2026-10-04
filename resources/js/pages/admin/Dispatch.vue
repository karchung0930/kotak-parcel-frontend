<script setup lang="ts">
import { Head, router } from '@inertiajs/vue3';
import {
    CalendarDays,
    ClipboardCheck,
    Clock,
    Info,
    Receipt,
    TriangleAlert,
    Truck,
    X,
} from '@lucide/vue';
import { useDebounceFn, useElementSize } from '@vueuse/core';
import { TabsContent, TabsList, TabsRoot, TabsTrigger } from 'reka-ui';
import { computed, nextTick, onMounted, ref, useTemplateRef } from 'vue';
import { queueRow } from '@/components/admin/dispatch';
import type { QueueGroup } from '@/components/admin/dispatch';
import DispatchPanel from '@/components/admin/DispatchPanel.vue';
import DriverWorkload from '@/components/admin/DriverWorkload.vue';
import NativeSelect from '@/components/NativeSelect.vue';
import QueueList from '@/components/admin/QueueList.vue';
import QueueTable from '@/components/admin/QueueTable.vue';
import EmptyState from '@/components/EmptyState.vue';
import PageHeader from '@/components/PageHeader.vue';
import Pagination from '@/components/Pagination.vue';
import StatCard from '@/components/StatCard.vue';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Sheet, SheetContent } from '@/components/ui/sheet';
import { Spinner } from '@/components/ui/spinner';
import { useFitsViewport } from '@/composables/useFitsViewport';
import { formatShortDate, pluralize } from '@/lib/format';
import type { AdminDispatchPageProps, OrderSummary } from '@/types';

const props = defineProps<AdminDispatchPageProps>();

/*
|--------------------------------------------------------------------------
| The day being planned
|--------------------------------------------------------------------------
|
| "date" drives the "Assigned for" tab and the drivers' job counts. The
| header picker and the panel's delivery date both change it, with a
| partial reload of just what depends on it.
|
*/

const DAY = /^\d{4}-\d{2}-\d{2}$/;
const loadingDay = ref(false);

function loadDay(day: string): void {
    if (!DAY.test(day) || day < props.today || day === props.date) {
        return;
    }

    router.reload({
        data: { date: day, scheduled_page: undefined },
        only: ['date', 'drivers', 'scheduled'],
        onStart: () => (loadingDay.value = true),
        onFinish: () => (loadingDay.value = false),
    });
}

const loadDaySoon = useDebounceFn(loadDay, 400);

const dayLabel = computed(() =>
    props.date === props.today ? 'today' : formatShortDate(props.date),
);

/*
|--------------------------------------------------------------------------
| Filters (on the parcels loaded on this page)
|--------------------------------------------------------------------------
*/

const branchFilter = ref<number | ''>('');
const areaFilter = ref('');

const filtering = computed(
    () => branchFilter.value !== '' || areaFilter.value !== '',
);

const loaded = computed(() => [
    ...props.awaiting.data,
    ...props.failed.data,
    ...props.overdue.data,
    ...props.scheduled.data,
]);

const branchOptions = computed(() => {
    const names = new Map<number, string>();

    for (const order of loaded.value) {
        if (order.branch) {
            names.set(order.branch.id, order.branch.name);
        }
    }

    return [...names]
        .map(([id, name]) => ({ id, name }))
        .sort((a, b) => a.name.localeCompare(b.name));
});

const areaOptions = computed(() =>
    [...new Set(loaded.value.map((order) => order.city))].sort((a, b) =>
        a.localeCompare(b),
    ),
);

const morePages = computed(() =>
    [props.awaiting, props.failed, props.overdue, props.scheduled].some(
        (queue) => queue.meta.last_page > 1,
    ),
);

function matches(order: OrderSummary): boolean {
    return (
        (branchFilter.value === '' ||
            order.branch?.id === branchFilter.value) &&
        (areaFilter.value === '' || order.city === areaFilter.value)
    );
}

function clearFilters(): void {
    branchFilter.value = '';
    areaFilter.value = '';
}

/*
|--------------------------------------------------------------------------
| Queues
|--------------------------------------------------------------------------
*/

const tab = ref<'queue' | 'scheduled'>('queue');

const toAction = computed(
    () =>
        props.awaiting.meta.total +
        props.failed.meta.total +
        props.overdue.meta.total,
);

function rows(orders: OrderSummary[], withDriver = true) {
    return orders
        .filter(matches)
        .map((order) =>
            queueRow(order, props.maxFailedAttempts, { withDriver }),
        );
}

const queueGroups = computed<QueueGroup[]>(() =>
    [
        {
            key: 'awaiting',
            title: 'Paid · awaiting assignment',
            icon: Receipt,
            tone: 'paid' as const,
            rows: rows(props.awaiting.data),
            total: props.awaiting.meta.total,
            pagination: { meta: props.awaiting.meta, only: ['awaiting'] },
        },
        {
            key: 'failed',
            title: 'Delivery failed · reschedule or return',
            icon: TriangleAlert,
            tone: 'failed' as const,
            rows: rows(props.failed.data),
            total: props.failed.meta.total,
            pagination: { meta: props.failed.meta, only: ['failed'] },
        },
        {
            key: 'overdue',
            title: 'Overdue · still open from an earlier day',
            icon: Clock,
            tone: 'brand' as const,
            rows: rows(props.overdue.data),
            total: props.overdue.meta.total,
            pagination: { meta: props.overdue.meta, only: ['overdue'] },
        },
    ].filter((group) => group.total > 0),
);

/**
 * The day's deliveries as one group per driver (the server sorts them by
 * driver). A group's total is the driver's jobs that day, on every page.
 */
const scheduledGroups = computed<QueueGroup[]>(() => {
    const groups = new Map<number, QueueGroup>();

    for (const order of props.scheduled.data) {
        const driver = order.driver ?? null;
        const key = driver?.id ?? 0;

        if (!groups.has(key)) {
            const onThisPage = props.scheduled.data.filter(
                (other) => (other.driver?.id ?? 0) === key,
            ).length;

            groups.set(key, {
                key: `driver-${key}`,
                title: driver?.name ?? 'No driver',
                icon: Truck,
                tone: 'neutral',
                plate: driver?.vehicle_plate ?? null,
                rows: [],
                total:
                    props.drivers.find((d) => d.id === key)?.jobs_count ??
                    onThisPage,
            });
        }

        const group = groups.get(key)!;

        if (matches(order)) {
            group.rows.push(
                queueRow(order, props.maxFailedAttempts, { withDriver: false }),
            );
        }
    }

    return [...groups.values()];
});

/*
|--------------------------------------------------------------------------
| The assign panel
|--------------------------------------------------------------------------
|
| Docked beside the queue when the page itself is at least 74rem wide
| (the queue table keeps its Pickup branch column, 49rem, next to the
| panel), in a sheet otherwise. That depends on the sidebar as well as
| the window, so it is measured on the page (a container query in the
| template, the same width here). Below 1024px the sidebar is a sheet
| and the page has the whole window, but that is 61rem at most, so the
| panel is a sheet there too. "mounted" keeps the first render identical
| to the server's.
|
| Docked, the panel is as tall as its content and never scrolls on its
| own. While the queue scrolls it sticks 24px under the console's top
| bar, the same gap as between it and the queue (gap-6), so its top is
| the bar's 64px plus 24px. It only sticks while it fits on screen with
| 24px free under it too; a parcel's form is often taller than that, and
| then the panel stays at the top of the page and scrolls with it, while
| the form's action bar sticks to the bottom of the screen until the
| panel's end comes into view (see DispatchPanel).
|
*/

const DOCK_WIDTH = 74 * 16;

const selected = ref<OrderSummary | null>(null);
const mounted = ref(false);
const layout = useTemplateRef<HTMLElement>('layout');
const { width: layoutWidth } = useElementSize(layout);
const wide = computed(() => layoutWidth.value >= DOCK_WIDTH);
const docked = computed(() => mounted.value && wide.value);
const panel = useTemplateRef<InstanceType<typeof DispatchPanel>>('panel');
const sheetPanel =
    useTemplateRef<InstanceType<typeof DispatchPanel>>('sheetPanel');
const panelBox = useTemplateRef<HTMLElement>('panelBox');
const panelFits = useFitsViewport(panelBox, 24);
const queueCard = useTemplateRef<HTMLElement>('queueCard');
let returnFocusTo: number | null = null;

onMounted(() => (mounted.value = true));

function select(order: OrderSummary): void {
    selected.value = order;

    if (docked.value) {
        // Focus the title once the next frame is drawn. By then the panel's
        // new height has been measured, so a panel now too tall to stick is
        // back at the top of the page, and focusing scrolls it into view.
        requestAnimationFrame(() =>
            requestAnimationFrame(() => panel.value?.focusTitle()),
        );
    }
}

/**
 * Close the panel and give focus back to the row's action button. While
 * its parcel is open the row shows an "In panel" marker instead (in
 * QueueTable and QueueList), so the button is drawn anew and is found
 * by its order id. Docked, that is once the page has updated; a sheet
 * moves focus itself when it has slid shut (see returnFocusFromSheet).
 */
function closePanel(): void {
    returnFocusTo = selected.value?.id ?? null;
    selected.value = null;

    if (docked.value) {
        void nextTick(focusRowButton);
    }
}

/**
 * Focus the action button of the parcel the panel showed last, if its
 * row is still here: an assigned parcel moves to the other tab. The
 * table and the list both have the button, but only one is on screen.
 */
function focusRowButton(): void {
    const orderId = returnFocusTo;

    returnFocusTo = null;

    if (orderId === null) {
        return;
    }

    const buttons =
        queueCard.value?.querySelectorAll<HTMLElement>(
            `[data-order-id="${orderId}"]`,
        ) ?? [];

    [...buttons].find((button) => button.checkVisibility())?.focus();
}

/**
 * Runs when the sheet opens. On its own the sheet would focus the first
 * thing in it that takes focus (the close button). Like the docked
 * panel, it focuses the panel title instead.
 */
function focusSheetTitle(event: Event): void {
    event.preventDefault();
    sheetPanel.value?.focusTitle();
}

/**
 * Runs when the sheet has slid shut. On its own the sheet would give
 * focus back to the button that opened it, but the marker replaced that
 * button, so focus would be lost. The row's new button gets it instead.
 */
function returnFocusFromSheet(event: Event): void {
    event.preventDefault();
    focusRowButton();
}

const sheetOpen = computed({
    get: () => selected.value !== null && !docked.value,
    set: (open: boolean) => {
        if (!open) {
            closePanel();
        }
    },
});
</script>

<template>
    <Head title="Dispatch" />

    <div ref="layout" class="@container">
        <div
            class="@[74rem]:grid @[74rem]:grid-cols-[minmax(0,1fr)_23rem] @[74rem]:items-start @[74rem]:gap-6 @[86rem]:grid-cols-[minmax(0,1fr)_24.5rem]"
        >
            <div class="@container min-w-0 space-y-6">
                <PageHeader
                    title="Dispatch"
                    description="Assign drivers, reschedule failed deliveries, hand over rounds."
                >
                    <template #actions>
                        <div class="flex items-end gap-2">
                            <div class="grid gap-1">
                                <label
                                    for="dispatch-day"
                                    class="text-xs leading-4 font-semibold text-muted-foreground"
                                >
                                    Planning day
                                </label>
                                <div class="relative">
                                    <CalendarDays
                                        aria-hidden="true"
                                        class="pointer-events-none absolute top-1/2 left-3 size-4 -translate-y-1/2 text-brand"
                                    />
                                    <Input
                                        id="dispatch-day"
                                        type="date"
                                        :min="today"
                                        :model-value="date"
                                        class="h-10 w-44 rounded-md bg-white pl-9 font-semibold text-ink pointer-coarse:h-11 pointer-coarse:text-base"
                                        @update:model-value="
                                            loadDaySoon(String($event))
                                        "
                                    />
                                </div>
                            </div>
                            <Button
                                v-if="date !== today"
                                type="button"
                                variant="outline"
                                class="h-10 font-bold pointer-coarse:h-11"
                                @click="loadDay(today)"
                            >
                                Today
                            </Button>
                            <Spinner
                                v-if="loadingDay"
                                class="mb-3 text-muted-foreground"
                            />
                        </div>
                    </template>
                </PageHeader>

                <!-- Two across until this column is 42rem wide, then four
                     (both iPad widths get one row). Cards in a row share
                     one height, and while labels may wrap StatCard keeps
                     room for two lines, so the numbers line up. -->
                <ul
                    aria-label="Queue summary"
                    class="grid grid-cols-2 gap-3 @2xl:grid-cols-4"
                >
                    <li>
                        <StatCard
                            class="h-full"
                            label="To assign"
                            :value="awaiting.meta.total"
                            :icon="Receipt"
                            tone="paid"
                        />
                    </li>
                    <li>
                        <StatCard
                            class="h-full"
                            label="To reschedule"
                            :value="failed.meta.total"
                            :icon="TriangleAlert"
                            tone="failed"
                        />
                    </li>
                    <li>
                        <StatCard
                            class="h-full"
                            :label="`Assigned for ${dayLabel}`"
                            :value="scheduled.meta.total"
                            :icon="ClipboardCheck"
                            :hint="
                                overdue.meta.total > 0
                                    ? `${overdue.meta.total} overdue from earlier days`
                                    : null
                            "
                        />
                    </li>
                    <li>
                        <StatCard
                            class="h-full"
                            label="Drivers on duty"
                            :value="drivers.length"
                            :icon="Truck"
                            tone="brand"
                        />
                    </li>
                </ul>

                <section
                    ref="queueCard"
                    aria-labelledby="queue-title"
                    class="@container overflow-hidden rounded-xl border border-line bg-white"
                >
                    <h2 id="queue-title" class="sr-only">Dispatch queue</h2>

                    <TabsRoot v-model="tab">
                        <div
                            class="flex flex-col gap-3 border-b border-line p-3 sm:px-4 @[44rem]:px-5 @4xl:flex-row @4xl:items-center @4xl:justify-between"
                        >
                            <TabsList
                                aria-label="Queue views"
                                class="-mx-1 flex gap-1 overflow-x-auto px-1 py-0.5 sm:gap-1.5"
                            >
                                <TabsTrigger
                                    value="queue"
                                    class="group inline-flex h-9 flex-none items-center gap-2 rounded-md px-2 text-[13px] font-semibold whitespace-nowrap text-ink-2 transition-colors hover:bg-surface data-[state=active]:bg-brand-tint data-[state=active]:font-bold data-[state=active]:text-brand-strong sm:px-3 sm:text-[13.5px] pointer-coarse:h-11"
                                >
                                    Dispatch queue
                                    <span
                                        class="inline-flex h-5 min-w-[22px] items-center justify-center rounded-full bg-status-neutral-tint px-1.5 text-[11.5px] font-bold text-ink-2 group-data-[state=active]:bg-brand group-data-[state=active]:text-white"
                                    >
                                        {{ toAction }}
                                    </span>
                                </TabsTrigger>
                                <!-- In a card under 22rem (a phone of 375px
                                     or less) the day is left out of sight,
                                     so both tabs fit without scrolling; the
                                     stat card above names it. -->
                                <TabsTrigger
                                    value="scheduled"
                                    class="group inline-flex h-9 flex-none items-center gap-2 rounded-md px-2 text-[13px] font-semibold whitespace-nowrap text-ink-2 transition-colors hover:bg-surface data-[state=active]:bg-brand-tint data-[state=active]:font-bold data-[state=active]:text-brand-strong sm:px-3 sm:text-[13.5px] pointer-coarse:h-11"
                                >
                                    <span
                                        >Assigned<span
                                            class="@max-[22rem]:sr-only"
                                        >
                                            for {{ dayLabel }}</span
                                        ></span
                                    >
                                    <span
                                        class="inline-flex h-5 min-w-[22px] items-center justify-center rounded-full bg-status-neutral-tint px-1.5 text-[11.5px] font-bold text-ink-2 group-data-[state=active]:bg-brand group-data-[state=active]:text-white"
                                    >
                                        {{ scheduled.meta.total }}
                                    </span>
                                </TabsTrigger>
                            </TabsList>

                            <!-- Side by side from 375px; on a 320px phone
                                 the selects stack, so "All branches" is not
                                 cut short. -->
                            <div
                                role="group"
                                aria-label="Filter the queue"
                                class="grid gap-2 min-[375px]:grid-cols-2 sm:flex sm:items-center"
                            >
                                <label for="filter-branch" class="sr-only">
                                    Pickup branch
                                </label>
                                <NativeSelect
                                    id="filter-branch"
                                    v-model="branchFilter"
                                    size="sm"
                                    class="sm:w-52"
                                >
                                    <option value="">All branches</option>
                                    <option
                                        v-for="branch in branchOptions"
                                        :key="branch.id"
                                        :value="branch.id"
                                    >
                                        {{ branch.name }}
                                    </option>
                                </NativeSelect>
                                <label for="filter-area" class="sr-only">
                                    Receiver area
                                </label>
                                <NativeSelect
                                    id="filter-area"
                                    v-model="areaFilter"
                                    size="sm"
                                    class="sm:w-40"
                                >
                                    <option value="">All areas</option>
                                    <option
                                        v-for="area in areaOptions"
                                        :key="area"
                                        :value="area"
                                    >
                                        {{ area }}
                                    </option>
                                </NativeSelect>
                                <Button
                                    v-if="filtering"
                                    type="button"
                                    variant="ghost"
                                    class="h-10 font-bold min-[375px]:col-span-2 sm:col-span-1 pointer-coarse:h-11"
                                    @click="clearFilters"
                                >
                                    <X aria-hidden="true" />
                                    Clear filters
                                </Button>
                            </div>
                        </div>

                        <p
                            v-if="filtering && morePages"
                            class="border-b border-line-soft bg-surface/70 px-4 py-2 text-xs leading-4 text-muted-foreground @[44rem]:px-5"
                        >
                            Filters apply to the parcels on the pages shown.
                        </p>

                        <!-- The table from a 44rem queue card (both iPad
                             widths), the list on phones. -->
                        <TabsContent value="queue" class="outline-none">
                            <template v-if="queueGroups.length > 0">
                                <QueueTable
                                    caption="Parcels to assign, reschedule or return"
                                    :groups="queueGroups"
                                    :max-failed-attempts="maxFailedAttempts"
                                    :selected-id="selected?.id ?? null"
                                    class="hidden @[44rem]:block"
                                    @select="select"
                                />
                                <QueueList
                                    :groups="queueGroups"
                                    :max-failed-attempts="maxFailedAttempts"
                                    :selected-id="selected?.id ?? null"
                                    class="@[44rem]:hidden"
                                    @select="select"
                                />
                            </template>
                            <EmptyState
                                v-else
                                bare
                                as="h3"
                                illustration="done"
                                title="All caught up"
                                description="No paid parcels are waiting for a driver, and no deliveries have failed or run late."
                            />
                        </TabsContent>

                        <TabsContent value="scheduled" class="outline-none">
                            <template v-if="scheduledGroups.length > 0">
                                <QueueTable
                                    :caption="`Deliveries assigned for ${dayLabel}, by driver`"
                                    :groups="scheduledGroups"
                                    :max-failed-attempts="maxFailedAttempts"
                                    :selected-id="selected?.id ?? null"
                                    class="hidden @[44rem]:block"
                                    @select="select"
                                />
                                <QueueList
                                    :groups="scheduledGroups"
                                    :max-failed-attempts="maxFailedAttempts"
                                    :selected-id="selected?.id ?? null"
                                    class="@[44rem]:hidden"
                                    @select="select"
                                />
                                <div
                                    v-if="scheduled.meta.last_page > 1"
                                    class="border-t border-line px-4 py-3 @[44rem]:px-5"
                                >
                                    <Pagination
                                        :meta="scheduled.meta"
                                        :only="['scheduled']"
                                        noun="deliveries"
                                    />
                                </div>
                            </template>
                            <EmptyState
                                v-else
                                bare
                                as="h3"
                                illustration="empty"
                                :title="`Nothing assigned for ${dayLabel}`"
                                description="Deliveries scheduled for this day appear here, grouped by driver, so a round can be handed to someone else."
                            />
                        </TabsContent>
                    </TabsRoot>

                    <footer
                        class="flex flex-col gap-2 border-t border-line px-4 py-3 text-[13px] leading-5 text-muted-foreground sm:flex-row sm:items-center sm:justify-between @[44rem]:px-5"
                    >
                        <p class="flex items-start gap-2">
                            <Info
                                aria-hidden="true"
                                class="mt-0.5 size-[15px] flex-none"
                            />
                            After {{ maxFailedAttempts }} failed attempts a
                            parcel can only be returned to the sender.
                        </p>
                        <p class="font-semibold whitespace-nowrap text-ink-2">
                            {{ toAction }} to action ·
                            {{
                                pluralize(
                                    scheduled.meta.total,
                                    'delivery',
                                    'deliveries',
                                )
                            }}
                            {{
                                dayLabel === 'today'
                                    ? 'today'
                                    : `on ${dayLabel}`
                            }}
                        </p>
                    </footer>
                </section>
            </div>

            <!-- Sticks only while it fits on screen (see "The assign panel").
                 overflow-clip keeps the content inside the rounded corners.
                 Unlike overflow-hidden it does not make the box a scroll
                 container, so the forms' action bars can stick to the
                 bottom of the screen rather than of this box. -->
            <div
                ref="panelBox"
                class="hidden overflow-clip rounded-xl border border-line bg-white @[74rem]:top-[88px] @[74rem]:block"
                :class="panelFits && '@[74rem]:sticky'"
            >
                <DispatchPanel
                    v-if="docked && selected"
                    ref="panel"
                    :order="selected"
                    :drivers="drivers"
                    :date="date"
                    :today="today"
                    :max-failed-attempts="maxFailedAttempts"
                    @close="closePanel"
                    @change-date="loadDay"
                    @keydown.escape="closePanel"
                />
                <DriverWorkload
                    v-else
                    :drivers="drivers"
                    :date="date"
                    :today="today"
                />
            </div>
        </div>
    </div>

    <Sheet v-model:open="sheetOpen">
        <!-- The panel has its own close button, the one it has docked. -->
        <SheetContent
            side="right"
            class="w-full gap-0 sm:max-w-md"
            :show-close-button="false"
            @open-auto-focus="focusSheetTitle"
            @close-auto-focus="returnFocusFromSheet"
        >
            <DispatchPanel
                v-if="selected"
                ref="sheetPanel"
                in-sheet
                :order="selected"
                :drivers="drivers"
                :date="date"
                :today="today"
                :max-failed-attempts="maxFailedAttempts"
                @close="closePanel"
                @change-date="loadDay"
            />
        </SheetContent>
    </Sheet>
</template>
