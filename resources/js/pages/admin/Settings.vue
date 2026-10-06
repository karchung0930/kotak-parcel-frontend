<script setup lang="ts">
import { Head, useForm } from '@inertiajs/vue3';
import {
    BellRing,
    CalendarClock,
    Hourglass,
    Lightbulb,
    MoonStar,
    PackageCheck,
    PackageX,
    Percent,
    RotateCcw,
    Timer,
} from '@lucide/vue';
import { computed, nextTick } from 'vue';
import FormField from '@/components/admin/FormField.vue';
import FormGroup from '@/components/admin/FormGroup.vue';
import FormRow from '@/components/admin/FormRow.vue';
import FormSection from '@/components/admin/FormSection.vue';
import EmptyState from '@/components/EmptyState.vue';
import Notice from '@/components/Notice.vue';
import PageHeader from '@/components/PageHeader.vue';
import StatCard from '@/components/StatCard.vue';
import { Button } from '@/components/ui/button';
import { Spinner } from '@/components/ui/spinner';
import UnitInput from '@/components/UnitInput.vue';
import { formatDecimal, formatPercent, pluralize } from '@/lib/format';
import { update } from '@/routes/admin/settings';
import type { AdminSettingsPageProps, BusinessSettings } from '@/types';

/**
 * Site settings (admins only): how long an order may wait for drop-off,
 * when the customer is reminded, and how many delivery attempts a parcel
 * gets. Under the form, how long customers really take to drop parcels
 * off, so the limit can be set from data.
 */
const props = defineProps<AdminSettingsPageProps>();

const form = useForm({
    unclaimed_order_days: String(props.settings.unclaimed_order_days),
    drop_off_reminder_days_before: String(
        props.settings.drop_off_reminder_days_before,
    ),
    max_failed_attempts: String(props.settings.max_failed_attempts),
});

const errors = computed(
    () => form.errors as Partial<Record<keyof BusinessSettings, string>>,
);

/** A typed whole number within the setting's limits, or null. */
function whole(key: keyof BusinessSettings): number | null {
    const value = form[key].trim();
    const { min, max } = props.limits[key];

    if (!/^\d{1,3}$/.test(value)) {
        return null;
    }

    const number = Number(value);

    return number >= min && number <= max ? number : null;
}

/**
 * The typed values as the customer's timeline: the reminder some days
 * before the deadline, then the cancellation after it. A new limit only
 * applies to orders placed from now on, which is said when it changes.
 */
const timeline = computed(() => {
    const days = whole('unclaimed_order_days');
    const lead = whole('drop_off_reminder_days_before');

    if (days === null || lead === null || lead >= days) {
        return null;
    }

    return {
        days,
        lead,
        limitChanged: days !== props.settings.unclaimed_order_days,
    };
});

const attempts = computed(() => whole('max_failed_attempts'));

function hint(key: keyof BusinessSettings, unit: string): string {
    const { min, max } = props.limits[key];

    return `From ${min} to ${max} ${unit}.`;
}

function submit(): void {
    form.submit(update(), {
        preserveScroll: true,
        onError: () =>
            void nextTick(() =>
                document
                    .querySelector<HTMLElement>('main [aria-invalid="true"]')
                    ?.focus(),
            ),
    });
}

/*
|--------------------------------------------------------------------------
| Drop-off timing
|--------------------------------------------------------------------------
*/

const hasTiming = computed(() => props.timing.dropped_off > 0);

const remindersOn = computed(
    () => props.settings.drop_off_reminder_days_before > 0,
);

/** Green while 95% drop off within the limit, amber when the advice is to allow longer. */
const suggestionTone = computed(() =>
    (props.timing.p95_days ?? 0) > props.timing.limit_days
        ? 'warning'
        : 'success',
);
</script>

<template>
    <Head title="Site settings" />

    <div class="max-w-5xl space-y-6">
        <PageHeader
            title="Site settings"
            description="Drop-off limit, reminders and attempts."
        />

        <!-- One card, as Save settings saves both groups: the button sits
             in the card's header, the groups are rows under small headings.
             The day and attempt boxes share one short width. -->
        <form novalidate @submit.prevent="submit">
            <FormSection
                title="Delivery rules"
                description="How long orders wait and how often a delivery is tried."
            >
                <template #actions>
                    <Button
                        type="submit"
                        :disabled="form.processing"
                        class="h-11 rounded-lg px-5 text-[15px] font-bold hover:bg-brand-strong"
                    >
                        <Spinner v-if="form.processing" />
                        Save settings
                    </Button>
                </template>
                <FormGroup
                    title="Unclaimed orders"
                    description="Orders not dropped off in time are cancelled at midnight."
                >
                    <FormField
                        id="unclaimed-order-days"
                        label="Days to drop off"
                        :hint="hint('unclaimed_order_days', 'days')"
                        :error="errors.unclaimed_order_days"
                    >
                        <template #default="{ describedby, invalid }">
                            <UnitInput
                                class="max-w-56"
                                id="unclaimed-order-days"
                                v-model="form.unclaimed_order_days"
                                unit="days"
                                required
                                inputmode="numeric"
                                pattern="[0-9]*"
                                maxlength="3"
                                autocomplete="off"
                                :aria-describedby="describedby"
                                :aria-invalid="invalid"
                            />
                        </template>
                    </FormField>
                    <FormField
                        id="drop-off-reminder"
                        label="Reminder before the deadline"
                        hint="0 turns the reminder email off."
                        :error="errors.drop_off_reminder_days_before"
                    >
                        <template #default="{ describedby, invalid }">
                            <UnitInput
                                class="max-w-56"
                                id="drop-off-reminder"
                                v-model="form.drop_off_reminder_days_before"
                                unit="days"
                                required
                                inputmode="numeric"
                                pattern="[0-9]*"
                                maxlength="3"
                                autocomplete="off"
                                :aria-describedby="describedby"
                                :aria-invalid="invalid"
                            />
                        </template>
                    </FormField>
                    <FormRow v-if="timeline" attached>
                        <Notice :icon="CalendarClock">
                            <template v-if="timeline.lead > 0">
                                Customers get a reminder email
                                <strong class="font-bold text-ink">{{
                                    pluralize(timeline.lead, 'day')
                                }}</strong>
                                before their drop-off deadline.
                            </template>
                            <template v-else>No reminder email.</template>
                            Orders still not dropped off are cancelled at
                            midnight after day
                            <strong class="font-bold text-ink">{{
                                timeline.days
                            }}</strong
                            >.
                            <template v-if="timeline.limitChanged">
                                The new limit applies to orders placed from now
                                on; orders already waiting keep their deadline.
                            </template>
                        </Notice>
                    </FormRow>
                </FormGroup>
                <FormGroup
                    title="Failed deliveries"
                    description="A failed delivery can be rescheduled until this limit."
                >
                    <FormField
                        id="max-failed-attempts"
                        label="Delivery attempts"
                        :hint="hint('max_failed_attempts', 'attempts')"
                        :error="errors.max_failed_attempts"
                    >
                        <template #default="{ describedby, invalid }">
                            <UnitInput
                                class="max-w-56"
                                id="max-failed-attempts"
                                v-model="form.max_failed_attempts"
                                unit="attempts"
                                required
                                inputmode="numeric"
                                pattern="[0-9]*"
                                maxlength="2"
                                autocomplete="off"
                                :aria-describedby="describedby"
                                :aria-invalid="invalid"
                            />
                        </template>
                    </FormField>
                    <FormRow v-if="attempts" attached>
                        <Notice :icon="RotateCcw">
                            After
                            <strong class="font-bold text-ink">{{
                                pluralize(attempts, 'failed attempt')
                            }}</strong>
                            the parcel can only be returned to the sender.
                        </Notice>
                    </FormRow>
                </FormGroup>
            </FormSection>
        </form>

        <section
            aria-labelledby="timing-title"
            class="@container rounded-2xl border border-line bg-white"
        >
            <!-- The same header as the form card: title, then a rule. -->
            <div
                class="flex flex-wrap items-baseline justify-between gap-x-4 gap-y-1 border-b border-line px-5 py-4 sm:px-6 sm:py-5"
            >
                <h2
                    id="timing-title"
                    class="text-lg leading-[26px] font-extrabold tracking-heading text-ink"
                >
                    Drop-off timing
                </h2>
                <span class="text-[13px] leading-[18px] text-muted-foreground">
                    Last {{ timing.window_days }} days
                </span>
            </div>

            <div class="p-5 sm:p-6 [&>*:first-child]:mt-0">
                <Notice
                    v-if="hasTiming && timing.suggestion"
                    :icon="Lightbulb"
                    :tone="suggestionTone"
                    class="mt-4"
                >
                    {{ timing.suggestion }}
                </Notice>

                <EmptyState
                    v-if="!hasTiming"
                    bare
                    as="h3"
                    :title="`No drop-offs in the last ${timing.window_days} days`"
                    description="Timing appears here once parcels are dropped off at a branch."
                />

                <!-- Two across on phones, four from a 36rem card (tablets
                 already): the spread first, then what it means for the
                 limit and the orders still waiting. Without drop-offs
                 only the last three remain: one row of three, or on
                 phones the first across the card so no slot is empty. -->
                <ul
                    aria-label="Drop-off timing summary"
                    :class="[
                        'grid grid-cols-2 gap-3',
                        hasTiming ? 'mt-4 @xl:grid-cols-4' : '@xl:grid-cols-3',
                    ]"
                >
                    <template v-if="hasTiming">
                        <li>
                            <StatCard
                                class="h-full"
                                label="Dropped off"
                                :value="timing.dropped_off"
                                :icon="PackageCheck"
                                tone="delivered"
                                hint="orders"
                            />
                        </li>
                        <li>
                            <StatCard
                                class="h-full"
                                label="Median"
                                :value="formatDecimal(timing.median_days)"
                                :icon="Timer"
                                tone="brand"
                                hint="days to drop off"
                            />
                        </li>
                        <li>
                            <StatCard
                                class="h-full"
                                label="90% within"
                                :value="formatDecimal(timing.p90_days)"
                                :icon="Timer"
                                hint="days"
                            />
                        </li>
                        <li>
                            <StatCard
                                class="h-full"
                                label="95% within"
                                :value="formatDecimal(timing.p95_days)"
                                :icon="Timer"
                                hint="days"
                            />
                        </li>
                        <li>
                            <StatCard
                                class="h-full"
                                :label="`Within ${timing.limit_days} days`"
                                :value="
                                    formatPercent(timing.within_limit_percent)
                                "
                                :icon="Percent"
                                tone="paid"
                                hint="of drop-offs"
                            />
                        </li>
                    </template>
                    <li :class="hasTiming ? '' : 'col-span-2 @xl:col-span-1'">
                        <StatCard
                            class="h-full"
                            label="Never dropped off"
                            :value="timing.cancelled_unclaimed"
                            :icon="PackageX"
                            tone="failed"
                            hint="cancelled"
                        />
                    </li>
                    <li>
                        <StatCard
                            class="h-full"
                            label="Waiting now"
                            :value="timing.waiting"
                            :icon="Hourglass"
                            hint="for drop-off"
                        />
                    </li>
                    <li>
                        <StatCard
                            class="h-full"
                            label="Last day"
                            :value="timing.expiring_tonight"
                            :icon="MoonStar"
                            tone="failed"
                            hint="cancelled at midnight unless dropped off"
                        />
                    </li>
                </ul>

                <p
                    class="mt-4 flex items-start gap-2 text-[13px] leading-5 text-muted-foreground"
                >
                    <component
                        :is="remindersOn ? BellRing : MoonStar"
                        aria-hidden="true"
                        class="mt-px size-4 flex-none text-brand"
                    />
                    <template v-if="remindersOn">
                        Reminder emails go out at 9:00 and unclaimed orders are
                        cancelled at midnight, Malaysia time.
                    </template>
                    <template v-else>
                        Unclaimed orders are cancelled at midnight, Malaysia
                        time.
                    </template>
                </p>
            </div>
        </section>
    </div>
</template>
