<script setup lang="ts">
import { Head, Link } from '@inertiajs/vue3';
import { Printer, ScanLine } from '@lucide/vue';
import { computed, onMounted, ref } from 'vue';
import ActionDivider from '@/components/ActionDivider.vue';
import BranchName from '@/components/BranchName.vue';
import KotakLogo from '@/components/brand/KotakLogo.vue';
import PageHeader from '@/components/PageHeader.vue';
import ReceiptNumber from '@/components/ReceiptNumber.vue';
import TrackingNumber from '@/components/TrackingNumber.vue';
import { Button } from '@/components/ui/button';
import {
    formatDateTime,
    formatDeliveryArea,
    formatDimensions,
    formatMoney,
    formatPhone,
    formatPostcodeCity,
    formatTrackingNumber,
    formatWeight,
} from '@/lib/format';
import { track } from '@/routes';
import { counter } from '@/routes/staff';
import { show } from '@/routes/staff/orders';
import type { StaffReceiptPageProps } from '@/types';

/**
 * The customer's payment receipt, laid out like a till slip. On screen the
 * slip lies on a print preview tray across the page, exactly as it will
 * print, with the actions (print it, then serve the next customer) in the
 * page header. Printed, only the slip remains, 80 mm wide for receipt
 * rolls; it also fits on one A4 or Letter page.
 */
const props = defineProps<StaffReceiptPageProps>();

const order = computed(() => props.payment.order ?? null);
const branch = computed(() => props.payment.branch ?? null);

const trackingNumber = computed(() =>
    order.value ? formatTrackingNumber(order.value.tracking_number) : null,
);

// Where the customer can follow the parcel, e.g. "kotak.my/track".
// Only known in the browser, so it is filled in after the page loads.
const trackAddress = ref<string | null>(null);

onMounted(() => {
    trackAddress.value = `${window.location.host}${track.url()}`;
});

function printReceipt(): void {
    window.print();
}

// Printed, the rows close up to an 8px gap so the widest one (the receipt
// number) stays on one line down to a 60 mm printable width: an 80 mm roll
// with the browser's default margins.
const rowClass = 'flex items-baseline justify-between gap-4 py-1 print:gap-2';
// A value that cannot break (the receipt number, a town with its postcode,
// an approval code) moves under its label whole on a narrow phone, still on
// the right, instead of squeezing the label onto two lines.
const wrapRowClass = `${rowClass} flex-wrap gap-y-0`;
const labelClass = 'text-muted-foreground print:text-black';
</script>

<template>
    <Head :title="`Receipt ${payment.receipt_number}`" />

    <div class="grid w-full max-w-[1280px] gap-6 print:block print:max-w-none">
        <!-- Screen only. The breadcrumbs lead back to the parcel. -->
        <PageHeader
            title="Receipt ready"
            description="Print it and hand it to the customer."
            :breadcrumbs="[
                { title: 'Drop-off counter', href: counter() },
                ...(order && trackingNumber
                    ? [{ title: trackingNumber, href: show(order.id) }]
                    : []),
                { title: 'Receipt', href: '#receipt' },
            ]"
            class="print:hidden"
        >
            <template #actions>
                <Button
                    class="h-11 rounded-lg px-5 text-sm font-bold hover:bg-brand-strong"
                    @click="printReceipt"
                >
                    <Printer aria-hidden="true" />
                    Print receipt
                </Button>
                <!-- Finishing this receipt vs serving the next customer -->
                <ActionDivider />
                <Button
                    variant="outline"
                    as-child
                    class="h-11 rounded-lg px-4 text-sm font-bold"
                >
                    <Link :href="counter()">
                        <ScanLine aria-hidden="true" />
                        Next parcel
                    </Link>
                </Button>
            </template>
        </PageHeader>

        <!-- The tray: the slip as it will come out of the printer -->
        <section
            aria-labelledby="print-preview-title"
            class="flex flex-col items-center gap-6 rounded-2xl bg-line/70 px-4 pt-5 pb-11 sm:px-7 print:block print:rounded-none print:bg-transparent print:p-0"
        >
            <div
                class="flex w-full flex-wrap items-center justify-between gap-x-4 gap-y-1 text-[13px] leading-5 text-ink-2 print:hidden"
            >
                <span
                    id="print-preview-title"
                    class="flex items-center gap-2 font-bold"
                >
                    <Printer aria-hidden="true" class="size-4" />
                    Print preview
                </span>
                <span>80 mm receipt roll · prints on one page</span>
            </div>

            <div
                class="receipt-page__sheet w-full max-w-[400px] print:max-w-none"
            >
                <article
                    id="receipt"
                    aria-labelledby="receipt-title"
                    class="receipt-page__paper bg-white text-[13.5px] leading-5 text-ink print:mx-auto print:max-w-[80mm] print:text-[9pt] print:leading-[1.35] print:text-black"
                >
                    <div class="px-7 pt-7 pb-10 print:p-0">
                        <header class="text-center">
                            <KotakLogo size="md" />
                            <template v-if="branch">
                                <p class="mt-3 font-bold">
                                    <BranchName :name="branch.name" />
                                </p>
                                <p :class="labelClass">
                                    {{ branch.address }},
                                    {{
                                        formatPostcodeCity(
                                            branch.postcode,
                                            branch.city,
                                        )
                                    }}, {{ branch.state }}
                                </p>
                                <p :class="labelClass">
                                    Tel {{ formatPhone(branch.phone) }}
                                </p>
                            </template>
                            <h2
                                id="receipt-title"
                                class="mt-4 text-base font-extrabold tracking-[0.12em] uppercase print:text-[11pt]"
                            >
                                Payment receipt
                            </h2>
                        </header>

                        <dl
                            class="mt-4 border-t border-dashed border-line-strong pt-3 print:border-black"
                        >
                            <div :class="wrapRowClass">
                                <dt :class="labelClass">Receipt no.</dt>
                                <dd
                                    class="ml-auto text-right text-[12.5px] font-bold print:text-[8.5pt]"
                                >
                                    <ReceiptNumber
                                        :value="payment.receipt_number"
                                    />
                                </dd>
                            </div>
                            <div :class="rowClass">
                                <dt :class="labelClass">Date</dt>
                                <dd class="font-semibold">
                                    <time :datetime="payment.paid_at">{{
                                        formatDateTime(payment.paid_at)
                                    }}</time>
                                </dd>
                            </div>
                            <div v-if="payment.received_by" :class="rowClass">
                                <dt :class="labelClass">Served by</dt>
                                <dd class="text-right font-semibold">
                                    {{ payment.received_by.name }}
                                </dd>
                            </div>
                        </dl>

                        <template v-if="order">
                            <div
                                class="mt-3 border-t border-dashed border-line-strong pt-4 text-center print:border-black"
                            >
                                <p :class="[labelClass, 'text-[12.5px]']">
                                    Tracking number
                                </p>
                                <p
                                    class="mt-0.5 text-[26px] leading-9 print:text-[16pt]"
                                >
                                    <TrackingNumber
                                        :value="order.tracking_number"
                                        size="inline"
                                    />
                                </p>
                            </div>

                            <dl class="mt-3">
                                <div :class="rowClass">
                                    <dt :class="labelClass">Parcel</dt>
                                    <dd class="text-right font-semibold">
                                        {{ order.item_name }}
                                    </dd>
                                </div>
                                <div :class="wrapRowClass">
                                    <dt :class="labelClass">Deliver to</dt>
                                    <dd
                                        class="ml-auto text-right font-semibold"
                                    >
                                        {{ order.receiver_name }}<br />
                                        {{
                                            formatDeliveryArea(
                                                order.city,
                                                order.postcode,
                                            )
                                        }}
                                    </dd>
                                </div>
                                <div :class="rowClass">
                                    <dt :class="labelClass">Weighed</dt>
                                    <dd
                                        class="text-right font-semibold tabular-nums"
                                    >
                                        {{
                                            formatWeight(
                                                order.measured_weight_g,
                                            )
                                        }}
                                    </dd>
                                </div>
                                <div :class="rowClass">
                                    <dt :class="labelClass">Box size</dt>
                                    <dd
                                        class="text-right font-semibold tabular-nums"
                                    >
                                        {{
                                            formatDimensions(
                                                order.length_cm,
                                                order.width_cm,
                                                order.height_cm,
                                            )
                                        }}
                                    </dd>
                                </div>
                            </dl>
                        </template>

                        <dl
                            class="mt-3 border-t border-dashed border-line-strong pt-3 print:border-black"
                        >
                            <div :class="rowClass">
                                <dt>
                                    Delivery
                                    <span
                                        v-if="order"
                                        :class="[
                                            labelClass,
                                            'block text-[12.5px]',
                                        ]"
                                    >
                                        {{
                                            formatWeight(
                                                order.chargeable_weight_g,
                                            )
                                        }}
                                        chargeable
                                    </span>
                                </dt>
                                <dd class="font-semibold tabular-nums">
                                    {{ formatMoney(payment.amount_sen) }}
                                </dd>
                            </div>
                            <div
                                class="mt-2 flex items-baseline justify-between gap-4 border-t border-line pt-3 print:gap-2 print:border-black"
                            >
                                <dt
                                    class="text-base font-extrabold print:text-[11pt]"
                                >
                                    Total paid
                                </dt>
                                <dd
                                    class="text-2xl font-extrabold tracking-heading tabular-nums print:text-[14pt]"
                                >
                                    {{ formatMoney(payment.amount_sen) }}
                                </dd>
                            </div>
                            <div :class="rowClass">
                                <dt :class="labelClass">Paid by</dt>
                                <dd class="font-semibold">
                                    {{ payment.method.label }}
                                </dd>
                            </div>
                            <div v-if="payment.reference" :class="wrapRowClass">
                                <dt :class="labelClass">Approval code</dt>
                                <dd class="ml-auto font-mono font-bold">
                                    {{ payment.reference }}
                                </dd>
                            </div>
                        </dl>

                        <footer
                            class="mt-4 border-t border-dashed border-line-strong pt-4 text-center print:border-black"
                        >
                            <!-- Each line fits on one line of an 80 mm slip -->
                            <p class="font-semibold">
                                Track online
                                <template v-if="trackAddress">
                                    at
                                    <span class="font-bold break-words">{{
                                        trackAddress
                                    }}</span>
                                </template>
                            </p>
                            <p :class="[labelClass, 'mt-1']">
                                Please keep this receipt. Thank you!
                            </p>
                        </footer>
                    </div>
                </article>
            </div>
        </section>
    </div>
</template>

<style scoped>
/*
 * On screen the slip lies on the tray like a strip torn off a receipt
 * roll: a soft shadow under it and a zigzag bottom edge. The mask cuts the
 * zigzag, and a masked element clips its own shadow, so the shadow goes on
 * the wrapper. Printed, both go.
 */
.receipt-page__sheet {
    filter: drop-shadow(
            0 10px 18px color-mix(in srgb, var(--color-ink) 12%, transparent)
        )
        drop-shadow(
            0 1px 1px color-mix(in srgb, var(--color-ink) 8%, transparent)
        );
}

.receipt-page__paper {
    mask: conic-gradient(
            from -45deg at bottom,
            #0000,
            #000 1deg 89deg,
            #0000 90deg
        )
        50% / 14px 100%;
}

@media print {
    .receipt-page__sheet {
        filter: none;
    }

    .receipt-page__paper {
        mask: none;
    }
}
</style>
