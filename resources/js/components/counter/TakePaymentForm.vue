<script setup lang="ts">
import { Form } from '@inertiajs/vue3';
import type { LucideIcon } from '@lucide/vue';
import { Banknote, CreditCard, Lock } from '@lucide/vue';
import { refDebounced } from '@vueuse/core';
import { computed, ref } from 'vue';
import ChoiceCard from '@/components/ChoiceCard.vue';
import InputError from '@/components/InputError.vue';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Spinner } from '@/components/ui/spinner';
import { formatMoney } from '@/lib/format';
import { payment } from '@/routes/staff/orders';
import type { Option, Order, PaymentMethodValue } from '@/types';

/**
 * Step 2 at the counter: collect the final price by cash or card. The
 * amount is fixed (the price set when weighing). Card payments need the
 * terminal's approval code; for cash, an optional "cash received" box
 * works out the change.
 */
const props = defineProps<{
    order: Order;
    paymentMethods: Option<PaymentMethodValue>[];
}>();

const method = ref<PaymentMethodValue>(
    props.paymentMethods[0]?.value ?? 'cash',
);

const amountSen = computed(() => props.order.final_price_sen ?? 0);

const METHOD_DETAILS: Record<
    PaymentMethodValue,
    { icon: LucideIcon; hint: string }
> = {
    cash: { icon: Banknote, hint: 'Count the notes' },
    card: { icon: CreditCard, hint: 'Use the card terminal' },
};

const methodLabel = computed(
    () =>
        props.paymentMethods.find((option) => option.value === method.value)
            ?.label ?? '',
);

// Cash helper: works out the change. Never sent to the server.
const cashReceived = ref('');

const change = computed(() => {
    const typed = cashReceived.value.trim().replace(',', '.');

    if (typed === '' || !Number.isFinite(Number(typed))) {
        return null;
    }

    return Math.round(Number(typed) * 100) - amountSen.value;
});

/** Read out once typing pauses, not on every keystroke. */
const announcedChange = refDebounced(
    computed(() => {
        if (change.value === null) {
            return '';
        }

        return change.value >= 0
            ? `Change to give: ${formatMoney(change.value)}`
            : `Still to pay: ${formatMoney(-change.value)}`;
    }),
    800,
);
</script>

<template>
    <Form
        v-bind="payment.form(order.id)"
        v-slot="{ errors, processing }"
        class="grid gap-6"
    >
        <input type="hidden" name="amount_sen" :value="amountSen" />

        <div class="grid gap-2">
            <Label
                for="payment-amount"
                class="text-sm leading-5 font-bold text-ink"
            >
                Amount to collect
            </Label>
            <div class="relative">
                <input
                    id="payment-amount"
                    type="text"
                    readonly
                    :value="formatMoney(amountSen)"
                    aria-describedby="payment-amount-hint"
                    class="h-16 w-full rounded-xl border-[1.5px] border-line bg-surface pr-12 pl-4 text-[28px] font-extrabold tracking-heading text-ink tabular-nums outline-none focus-visible:border-brand focus-visible:ring-[3px] focus-visible:ring-brand/25"
                />
                <Lock
                    aria-hidden="true"
                    class="pointer-events-none absolute top-1/2 right-4 size-5 -translate-y-1/2 text-muted-foreground"
                />
            </div>
            <p
                id="payment-amount-hint"
                class="text-[13px] leading-5 text-pretty text-muted-foreground"
            >
                The final price set when the parcel was weighed. It cannot be
                changed here.
            </p>
            <InputError :message="errors.amount_sen" />
        </div>

        <fieldset class="min-w-0">
            <legend class="text-sm leading-5 font-bold text-ink">
                Payment method
            </legend>
            <!-- Side by side once the step card is 32rem wide, where each
                 tile still has room for its icon and a one-line hint. -->
            <div class="mt-2 grid gap-3 @lg:grid-cols-2">
                <ChoiceCard
                    v-for="option in paymentMethods"
                    :key="option.value"
                    v-model="method"
                    name="method"
                    :value="option.value"
                    :title="option.label"
                    :hint="METHOD_DETAILS[option.value].hint"
                    :icon="METHOD_DETAILS[option.value].icon"
                />
            </div>
            <InputError :message="errors.method" class="mt-2" />
        </fieldset>

        <div v-if="method === 'card'" class="grid gap-2">
            <Label
                for="payment-reference"
                class="text-sm leading-5 font-bold text-ink"
            >
                Approval code
            </Label>
            <input
                id="payment-reference"
                name="reference"
                type="text"
                required
                minlength="4"
                maxlength="12"
                pattern="[A-Za-z0-9]{4,12}"
                title="4 to 12 letters and numbers from the terminal slip"
                autocomplete="off"
                autocapitalize="characters"
                spellcheck="false"
                placeholder="e.g. 084512"
                :aria-invalid="errors.reference ? 'true' : undefined"
                :aria-describedby="
                    errors.reference
                        ? 'payment-reference-hint payment-reference-error'
                        : 'payment-reference-hint'
                "
                class="h-12 w-full max-w-xs rounded-lg border-[1.5px] border-field bg-white px-3.5 font-mono text-lg font-bold tracking-[0.06em] text-ink uppercase outline-none placeholder:font-sans placeholder:text-base placeholder:font-medium placeholder:tracking-normal placeholder:normal-case focus-visible:border-brand focus-visible:ring-[3px] focus-visible:ring-brand/25 aria-invalid:border-brand-strong"
            />
            <p
                id="payment-reference-hint"
                class="text-[13px] leading-5 text-pretty text-muted-foreground"
            >
                The 4 to 12 letters and numbers printed on the terminal slip.
                Never type the card number.
            </p>
            <InputError
                id="payment-reference-error"
                :message="errors.reference"
            />
        </div>

        <div v-else class="grid gap-2">
            <Label
                for="cash-received"
                class="text-sm leading-5 font-bold text-ink"
            >
                Cash received
                <span class="font-medium text-muted-foreground">
                    (optional)
                </span>
            </Label>
            <!-- Beside the hint, the box keeps a fixed width and the hint
                 gets the rest of the row, so it wraps to two lines at most. -->
            <div
                class="flex flex-col gap-2 sm:flex-row sm:items-center sm:gap-4"
            >
                <div class="relative w-full max-w-xs sm:w-56 sm:flex-none">
                    <span
                        aria-hidden="true"
                        class="pointer-events-none absolute top-1/2 left-3.5 -translate-y-1/2 text-base font-bold text-muted-foreground"
                    >
                        RM
                    </span>
                    <input
                        id="cash-received"
                        v-model="cashReceived"
                        type="text"
                        inputmode="decimal"
                        autocomplete="off"
                        placeholder="0.00"
                        aria-describedby="cash-change"
                        class="h-12 w-full rounded-lg border-[1.5px] border-field bg-white pr-3.5 pl-12 text-lg font-bold text-ink tabular-nums outline-none placeholder:text-subtle focus-visible:border-brand focus-visible:ring-[3px] focus-visible:ring-brand/25"
                    />
                </div>
                <p
                    id="cash-change"
                    class="text-[15px] leading-6 text-pretty text-ink-2"
                >
                    <template v-if="change === null">
                        Type what the customer hands over to work out the
                        change.
                    </template>
                    <template v-else-if="change >= 0">
                        Change to give:
                        <strong
                            class="text-lg font-extrabold text-status-delivered tabular-nums"
                        >
                            {{ formatMoney(change) }}
                        </strong>
                    </template>
                    <template v-else>
                        Still to pay:
                        <strong
                            class="text-lg font-extrabold text-brand-strong tabular-nums"
                        >
                            {{ formatMoney(-change) }}
                        </strong>
                    </template>
                </p>
                <p aria-live="polite" class="sr-only">
                    {{ announcedChange }}
                </p>
            </div>
        </div>

        <div>
            <Button
                type="submit"
                :disabled="processing"
                class="h-12 w-full rounded-lg px-6 text-[15px] font-bold sm:w-auto"
            >
                <Spinner v-if="processing" />
                Confirm {{ formatMoney(amountSen) }}
                {{ methodLabel.toLowerCase() }} payment
            </Button>
            <p class="mt-2 text-[13px] leading-5 text-muted-foreground">
                Then print the receipt and hand it to the customer.
            </p>
        </div>
    </Form>
</template>
