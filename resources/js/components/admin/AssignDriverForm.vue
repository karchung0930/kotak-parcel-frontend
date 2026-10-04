<script setup lang="ts">
import { useForm } from '@inertiajs/vue3';
import { CalendarDays, Truck } from '@lucide/vue';
import { useDebounceFn } from '@vueuse/core';
import { computed, nextTick, onMounted, useId, watch } from 'vue';
import BranchName from '@/components/BranchName.vue';
import InputError from '@/components/InputError.vue';
import PlateBadge from '@/components/PlateBadge.vue';
import TextLink from '@/components/TextLink.vue';
import TrackingNumber from '@/components/TrackingNumber.vue';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Spinner } from '@/components/ui/spinner';
import { getInitials } from '@/composables/useInitials';
import {
    formatDate,
    formatShortDate,
    formatWeekdayDate,
    pluralize,
} from '@/lib/format';
import { assign } from '@/routes/admin/orders';
import { create as createUser } from '@/routes/admin/users';
import type { Driver, OrderSummary } from '@/types';

/**
 * Choose a driver and a delivery day for a parcel: its first assignment,
 * a reschedule after a failed attempt, or a reassignment before the driver
 * collects it.
 *
 * `date` is the day the drivers' job counts are for. Changing the delivery
 * date asks the page to reload the counts for that day ("change-date"), and
 * the field follows `date` whenever the page reloads it, so the counts
 * always match the chosen day.
 */
const props = defineProps<{
    order: OrderSummary;
    drivers: Driver[];
    date: string;
    today: string;
    mode: 'assign' | 'reschedule' | 'reassign';
    /** The action bar is stuck over the fields (docked panel): lift it. */
    barStuck?: boolean;
}>();

const emit = defineEmits<{
    'change-date': [date: string];
    /** Switch the panel to "Return to sender" (failed deliveries only). */
    return: [];
    cancel: [];
    done: [];
}>();

const id = useId();
const dateId = `${id}-date`;
const driverName = `${id}-driver`;

const DAY = /^\d{4}-\d{2}-\d{2}$/;

function addDays(day: string, days: number): string {
    const [year, month, date] = day.split('-').map(Number);

    return new Date(Date.UTC(year, month - 1, date + days))
        .toISOString()
        .slice(0, 10);
}

/** A reassignment starts on the parcel's own day; anything else on the day being planned. */
function initialDay(): string {
    const scheduled = props.order.scheduled_for;

    if (props.mode === 'reassign' && scheduled && scheduled >= props.today) {
        return scheduled;
    }

    return props.date >= props.today ? props.date : props.today;
}

const form = useForm({
    driver_id: null as number | null,
    scheduled_for: initialDay(),
});

const errors = computed(() => form.errors as Partial<Record<string, string>>);

const quickDays = computed(() => [
    { label: 'Today', day: props.today },
    { label: 'Tomorrow', day: addDays(props.today, 1) },
]);

function isPlannable(day: string): boolean {
    return DAY.test(day) && day >= props.today;
}

function requestCounts(day: string): void {
    if (isPlannable(day) && day !== props.date) {
        emit('change-date', day);
    }
}

const requestCountsSoon = useDebounceFn(requestCounts, 400);

function onDateInput(value: string | number): void {
    form.clearErrors('scheduled_for');
    void requestCountsSoon(String(value));
}

function pickDay(day: string): void {
    form.scheduled_for = day;
    form.clearErrors('scheduled_for');
    requestCounts(day);
}

onMounted(() => requestCounts(form.scheduled_for));

watch(
    () => props.date,
    (day) => {
        if (isPlannable(day)) {
            form.scheduled_for = day;
        }
    },
);

watch(
    () => form.driver_id,
    () => form.clearErrors('driver_id'),
);

const selectedDriver = computed(
    () => props.drivers.find((driver) => driver.id === form.driver_id) ?? null,
);

const countsDay = computed(() =>
    props.date === props.today ? 'today' : `on ${formatShortDate(props.date)}`,
);

const currentTag = computed(() =>
    props.mode === 'reassign'
        ? 'Current'
        : props.mode === 'reschedule'
          ? 'Tried last'
          : null,
);

const submitLabel = {
    assign: 'Assign driver',
    reschedule: 'Reschedule delivery',
    reassign: 'Reassign delivery',
};

function submit(): void {
    if (form.driver_id === null) {
        form.setError('driver_id', 'Choose a driver.');

        void nextTick(() =>
            document
                .getElementById(`${driverName}-${props.drivers[0]?.id}`)
                ?.focus(),
        );

        return;
    }

    form.submit(assign(props.order.id), {
        preserveScroll: true,
        preserveState: true,
        onSuccess: () => emit('done'),
    });
}
</script>

<template>
    <form novalidate @submit.prevent="submit">
        <!-- Padded with the panel's padding (see DispatchPanel). Focus
             scrolls a field at least 208px above the bottom edge, clear of
             the action bar stuck there (160px at most). -->
        <div class="space-y-6 px-(--panel-padding) pt-5 pb-6 **:scroll-mb-52">
            <div class="grid gap-1.5">
                <label
                    :for="dateId"
                    class="text-[13px] leading-5 font-bold text-ink"
                >
                    Delivery date
                </label>
                <div class="relative">
                    <CalendarDays
                        aria-hidden="true"
                        class="pointer-events-none absolute top-1/2 left-3 size-[18px] -translate-y-1/2 text-brand"
                    />
                    <!-- 16px on phones: iOS zooms in on smaller fields. -->
                    <Input
                        :id="dateId"
                        v-model="form.scheduled_for"
                        type="date"
                        :min="today"
                        required
                        :aria-invalid="errors.scheduled_for ? true : undefined"
                        :aria-describedby="`${dateId}-hint${errors.scheduled_for ? ` ${dateId}-error` : ''}`"
                        class="h-11 rounded-lg bg-white pl-10 text-base font-bold text-ink sm:text-[15px] md:text-[15px]"
                        @update:model-value="onDateInput"
                    />
                </div>
                <div class="flex flex-wrap items-center justify-between gap-2">
                    <p
                        :id="`${dateId}-hint`"
                        class="text-[12.5px] leading-[18px] text-muted-foreground"
                    >
                        {{ formatWeekdayDate(form.scheduled_for) }}
                        <template v-if="order.branch">
                            · collected from
                            <BranchName :name="order.branch.name" />
                        </template>
                    </p>
                    <!-- Toggle chips, not outline Buttons: the chosen day is
                         pale red and the others turn grey on hover. The grey
                         is safe here, as no hovered row sits behind them.
                         32px with a mouse, 44px on touch screens. -->
                    <div class="flex gap-1.5 pointer-coarse:gap-2">
                        <button
                            v-for="quick in quickDays"
                            :key="quick.label"
                            type="button"
                            :aria-pressed="form.scheduled_for === quick.day"
                            :class="[
                                'h-8 rounded-md border px-2.5 text-xs font-bold transition-colors pointer-coarse:h-11 pointer-coarse:min-w-11 pointer-coarse:px-3',
                                form.scheduled_for === quick.day
                                    ? 'border-brand bg-brand-tint text-brand-strong'
                                    : 'border-line bg-white text-ink-2 hover:border-line-strong hover:bg-surface',
                            ]"
                            @click="pickDay(quick.day)"
                        >
                            {{ quick.label }}
                        </button>
                    </div>
                </div>
                <InputError
                    :id="`${dateId}-error`"
                    :message="errors.scheduled_for"
                />
            </div>

            <fieldset
                class="min-w-0"
                :aria-describedby="
                    errors.driver_id ? `${driverName}-error` : undefined
                "
            >
                <legend class="w-full">
                    <span
                        class="flex items-baseline justify-between gap-3 text-[13px] leading-5 font-bold text-ink"
                    >
                        Choose a driver
                        <span
                            class="text-[12.5px] font-medium text-muted-foreground"
                        >
                            Jobs {{ countsDay }}
                        </span>
                    </span>
                </legend>

                <InputError
                    :id="`${driverName}-error`"
                    :message="errors.driver_id"
                    class="mt-2"
                />

                <div
                    v-if="drivers.length === 0"
                    class="mt-2.5 rounded-xl border border-dashed border-line-strong px-4 py-5 text-center"
                >
                    <p class="text-sm font-bold text-ink">No drivers on duty</p>
                    <p class="mt-1 text-[13px] leading-5 text-muted-foreground">
                        Add a driver account, or reactivate one, to schedule
                        deliveries.
                    </p>
                    <TextLink
                        :href="createUser()"
                        class="mt-2 inline-block text-sm"
                    >
                        Add a driver
                    </TextLink>
                </div>

                <div v-else class="mt-2.5 grid gap-2">
                    <label
                        v-for="driver in drivers"
                        :key="driver.id"
                        :class="[
                            'flex min-h-[4.25rem] cursor-pointer items-center gap-3 rounded-xl border-[1.5px] px-3.5 py-3 transition-colors has-[:focus-visible]:outline-3 has-[:focus-visible]:outline-offset-2 has-[:focus-visible]:outline-brand',
                            form.driver_id === driver.id
                                ? 'border-brand bg-brand-tint/50'
                                : 'border-line bg-white hover:border-line-strong',
                        ]"
                    >
                        <span
                            aria-hidden="true"
                            :class="[
                                'flex size-10 flex-none items-center justify-center rounded-full text-[13.5px] font-bold',
                                form.driver_id === driver.id
                                    ? 'bg-brand text-white'
                                    : 'bg-status-neutral-tint text-status-neutral',
                            ]"
                        >
                            {{ getInitials(driver.name) }}
                        </span>
                        <span class="flex min-w-0 flex-1 flex-col gap-1">
                            <span
                                class="flex items-center gap-2 text-[14.5px] leading-5 font-bold text-ink"
                            >
                                <span class="truncate">{{ driver.name }}</span>
                                <span
                                    v-if="
                                        currentTag &&
                                        order.driver?.id === driver.id
                                    "
                                    class="flex-none rounded-[4px] bg-status-neutral-tint px-1.5 text-[11px] leading-[17px] font-bold text-status-neutral"
                                >
                                    {{ currentTag }}
                                </span>
                            </span>
                            <span
                                class="flex flex-wrap items-center gap-x-2 gap-y-1 text-[12.5px] leading-[18px] text-ink-2"
                            >
                                <PlateBadge
                                    v-if="driver.vehicle_plate"
                                    :plate="driver.vehicle_plate"
                                />
                                <span>
                                    {{ pluralize(driver.jobs_count, 'job') }}
                                    <span class="sr-only">{{ countsDay }}</span>
                                </span>
                            </span>
                        </span>
                        <input
                            :id="`${driverName}-${driver.id}`"
                            v-model="form.driver_id"
                            type="radio"
                            :name="driverName"
                            :value="driver.id"
                            class="size-[18px] flex-none accent-brand outline-none"
                        />
                    </label>
                </div>
            </fieldset>

            <p
                v-if="mode === 'reschedule'"
                class="text-[13px] leading-5 text-muted-foreground"
            >
                Not worth another try?
                <button
                    type="button"
                    class="tap-target relative font-semibold text-brand-strong underline decoration-brand-edge underline-offset-4 hover:text-brand-deep hover:decoration-current"
                    @click="emit('return')"
                >
                    Return it to the sender
                </button>
            </p>
        </div>

        <!-- Sticks to the bottom of the sheet or, docked, of the screen, and
             stops at the form's end. Stuck in the docked panel, it has the
             phone bars' shadow. -->
        <div
            :class="[
                'sticky bottom-0 border-t border-line bg-white px-(--panel-padding) pt-4 pb-5',
                barStuck && 'shadow-bar',
            ]"
        >
            <p aria-live="polite" class="text-[13px] leading-5 text-ink-2">
                <template v-if="selectedDriver">
                    <strong class="font-bold text-ink">{{
                        selectedDriver.name
                    }}</strong>
                    <template v-if="selectedDriver.vehicle_plate">
                        (<span class="whitespace-nowrap"
                            >van {{ selectedDriver.vehicle_plate }}</span
                        >)
                    </template>
                    will collect
                    <TrackingNumber
                        :value="order.tracking_number"
                        size="inline"
                        class="text-ink"
                    />
                    <template v-if="order.branch">
                        from <BranchName :name="order.branch.name" />
                    </template>
                    on {{ formatDate(form.scheduled_for) }}.
                </template>
                <template v-else>Choose a driver and a delivery date.</template>
            </p>
            <InputError :message="errors.status" class="mt-2" />
            <div class="mt-3 flex gap-2.5">
                <Button
                    type="button"
                    variant="outline"
                    class="h-12 rounded-lg px-5 text-[15px] font-bold"
                    @click="emit('cancel')"
                >
                    Cancel
                </Button>
                <Button
                    type="submit"
                    :disabled="form.processing"
                    class="h-12 flex-1 rounded-lg text-[15px] font-bold"
                >
                    <Spinner v-if="form.processing" />
                    <Truck v-else aria-hidden="true" class="size-[18px]" />
                    {{ submitLabel[mode] }}
                </Button>
            </div>
        </div>
    </form>
</template>
