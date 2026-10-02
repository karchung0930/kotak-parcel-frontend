<script setup lang="ts">
import { unrefElement, useIntersectionObserver } from '@vueuse/core';
import { computed, ref, useId, useTemplateRef, watch } from 'vue';
import type { ComponentPublicInstance } from 'vue';
import AssignDriverForm from '@/components/admin/AssignDriverForm.vue';
import { dispatchAction } from '@/components/admin/dispatch';
import ParcelSummary from '@/components/admin/ParcelSummary.vue';
import ReturnToSenderForm from '@/components/admin/ReturnToSenderForm.vue';
import CloseButton from '@/components/CloseButton.vue';
import { SheetDescription, SheetTitle } from '@/components/ui/sheet';
import { formatShortDate } from '@/lib/format';
import type { Driver, OrderSummary } from '@/types';

/**
 * The "Assign driver" panel: the parcel at the top, then the form for its
 * next step. Assign (paid), reschedule or return (failed), or reassign
 * (scheduled, not collected yet).
 *
 * Docked beside the dispatch queue on wide screens, as tall as its content
 * (the page scrolls it, never the panel itself). Inside a Sheet on smaller
 * ones and on the order page (`in-sheet`, which names the sheet with its
 * title), where the body scrolls under the header instead. The header and
 * its close button are the same either way, so the sheet hides its own.
 * Either way the form's action bar sticks to the bottom of what scrolls
 * (the screen or the sheet), so its main button is always in reach.
 */
const props = withDefaults(
    defineProps<{
        order: OrderSummary;
        drivers: Driver[];
        /** The day the drivers' job counts are for. */
        date: string;
        today: string;
        maxFailedAttempts: number;
        inSheet?: boolean;
        /** Open on "Return to sender" rather than rescheduling. */
        startReturning?: boolean;
    }>(),
    {
        inSheet: false,
        startReturning: false,
    },
);

const emit = defineEmits<{
    close: [];
    /** The delivery date changed: reload the drivers' job counts for it. */
    'change-date': [date: string];
}>();

const titleId = `${useId()}-title`;
// The title is an <h2>, or the SheetTitle component in a sheet.
const title = useTemplateRef<HTMLElement | ComponentPublicInstance>('title');

const returning = ref(props.startReturning);

watch(
    () => [props.order.id, props.startReturning] as const,
    () => (returning.value = props.startReturning),
);

const action = computed(() =>
    dispatchAction(props.order, props.maxFailedAttempts),
);

const atLimit = computed(() => action.value === 'return');

const mode = computed(() =>
    returning.value || atLimit.value ? 'return' : action.value,
);

const heading = computed(() => {
    const failed = props.order.failed_attempts ?? 0;

    switch (mode.value) {
        case 'assign':
            return {
                title: 'Assign driver',
                subtitle: 'A paid parcel waiting for a driver',
            };
        case 'reschedule':
            return {
                title: 'Reschedule delivery',
                subtitle: `${failed} of ${props.maxFailedAttempts} attempts failed, ${props.maxFailedAttempts - failed} left`,
            };
        case 'reassign':
            return {
                title: 'Reassign delivery',
                subtitle: `With ${props.order.driver?.name ?? 'a driver'} on ${formatShortDate(props.order.scheduled_for)}, not collected yet`,
            };
        case 'return':
            return {
                title: 'Return to sender',
                subtitle: atLimit.value
                    ? 'No delivery attempts left'
                    : 'Close this delivery',
            };
        default:
            return {
                title: 'Nothing to plan',
                subtitle: props.order.status.label,
            };
    }
});

/*
 * Docked, a form taller than the screen keeps its action bar stuck to the
 * bottom of the screen, over the fields, until the page scrolls the
 * panel's end into view, where the bar comes to rest. "end" is an empty
 * element at that spot: while it is below the screen the bar is stuck,
 * and gets the phone bars' shadow. A sheet's bar stays as it is.
 */
const end = useTemplateRef<HTMLElement>('end');
const barStuck = ref(false);

useIntersectionObserver(end, (entries) => {
    // The last entry is the current state. Off screen with its top below
    // the screen's top edge means below the screen, not scrolled past it.
    const entry = entries.at(-1);

    if (entry) {
        barStuck.value =
            !entry.isIntersecting && entry.boundingClientRect.top > 0;
    }
});

/**
 * Move focus to the panel title when the panel opens, docked or in a
 * sheet, so a screen reader starts by reading what the panel is for.
 */
function focusTitle(): void {
    unrefElement(title)?.focus();
}

defineExpose({ focusTitle });
</script>

<template>
    <!-- The panel has one padding, --panel-padding (20px on phones, 24px
         from sm), docked or in a sheet. Every section, the forms' included,
         is padded with it, and the close button is fixed in the top right
         corner at that padding, so it lines up with the content's top and
         right edges whatever the heading says. -->
    <section
        :aria-labelledby="inSheet ? undefined : titleId"
        :class="[
            'flex flex-col bg-white [--panel-padding:1.25rem] sm:[--panel-padding:1.5rem]',
            inSheet && 'h-full min-h-0',
        ]"
    >
        <header
            class="relative flex-none border-b border-line p-(--panel-padding)"
        >
            <!-- pr-12 leaves room for the close button. -->
            <div class="min-w-0 pr-12">
                <component
                    :is="inSheet ? SheetTitle : 'h2'"
                    :id="inSheet ? undefined : titleId"
                    ref="title"
                    tabindex="-1"
                    class="text-lg leading-6 font-extrabold tracking-heading text-ink outline-none"
                >
                    {{ heading.title }}
                </component>
                <component
                    :is="inSheet ? SheetDescription : 'p'"
                    class="mt-0.5 text-[13px] leading-[18px] text-muted-foreground"
                >
                    {{ heading.subtitle }}
                </component>
            </div>
            <CloseButton
                label="Close panel"
                class="absolute top-(--panel-padding) right-(--panel-padding)"
                @click="emit('close')"
            />
        </header>

        <div
            :class="
                inSheet && 'min-h-0 flex-1 overflow-y-auto overscroll-contain'
            "
        >
            <div class="px-(--panel-padding) pt-5">
                <ParcelSummary
                    :order="order"
                    :max-failed-attempts="maxFailedAttempts"
                />
            </div>

            <ReturnToSenderForm
                v-if="mode === 'return'"
                :key="`return-${order.id}`"
                :order="order"
                :at-limit="atLimit"
                :max-failed-attempts="maxFailedAttempts"
                :bar-stuck="barStuck"
                @back="returning = false"
                @cancel="emit('close')"
                @done="emit('close')"
            />
            <AssignDriverForm
                v-else-if="mode"
                :key="`assign-${order.id}`"
                :order="order"
                :drivers="drivers"
                :date="date"
                :today="today"
                :mode="mode"
                :bar-stuck="barStuck"
                @change-date="emit('change-date', $event)"
                @return="returning = true"
                @cancel="emit('close')"
                @done="emit('close')"
            />
            <p
                v-else
                class="px-(--panel-padding) py-6 text-sm leading-6 text-muted-foreground"
            >
                This parcel is out for delivery. Its driver records the delivery
                or a failed attempt from their phone.
            </p>

            <!-- Where the action bar comes to rest (see barStuck). -->
            <div v-if="!inSheet" ref="end" />
        </div>
    </section>
</template>
