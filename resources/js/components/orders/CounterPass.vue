<script setup lang="ts">
import { CalendarClock, ScanBarcode } from '@lucide/vue';
import KotakTape from '@/components/brand/KotakTape.vue';
import Notice from '@/components/Notice.vue';
import BranchDetails from '@/components/orders/BranchDetails.vue';
import TrackingBarcode from '@/components/TrackingBarcode.vue';
import TrackingNumber from '@/components/TrackingNumber.vue';
import { formatWeekdayDate } from '@/lib/format';
import type { Branch } from '@/types';

/**
 * "Show this at the counter": the next step for an order waiting to be
 * dropped off. A label-like card with the tracking number as a barcode
 * (staff scan it into the counter search) and in large type (to read
 * out), next to the chosen branch's address and hours, with the last
 * day to drop it off (worked out by the server).
 */
defineProps<{
    trackingNumber: string;
    branch?: Branch | null;
    /** "YYYY-MM-DD" (Malaysia): after this day the order is cancelled. */
    deadline?: string | null;
}>();
</script>

<template>
    <section
        aria-labelledby="counter-title"
        class="overflow-hidden rounded-2xl border border-line bg-white shadow-card"
    >
        <KotakTape :height="34" :repeat="16" :shadow="false" />

        <div class="grid lg:grid-cols-[minmax(0,1fr)_380px]">
            <div class="min-w-0 p-5 sm:p-7">
                <p
                    class="flex items-center gap-2 text-sm leading-5 font-bold text-brand-strong"
                >
                    <ScanBarcode aria-hidden="true" class="size-[18px]" />
                    Next step
                </p>
                <h2
                    id="counter-title"
                    class="mt-2 text-2xl leading-8 font-extrabold tracking-heading text-ink sm:text-[26px]"
                >
                    Show this at the counter
                </h2>
                <p
                    class="mt-1.5 max-w-xl text-[15px] leading-6 text-muted-foreground"
                >
                    Bring the sealed parcel to the branch. Staff scan this code
                    or type the number, weigh the parcel and take payment by
                    cash or card.
                </p>
                <Notice v-if="deadline" :icon="CalendarClock" class="mt-4">
                    Drop off by
                    <strong class="font-bold text-ink">{{
                        formatWeekdayDate(deadline)
                    }}</strong>
                    or this order is cancelled automatically.
                </Notice>

                <div
                    class="mt-5 rounded-xl border-2 border-dashed border-line-strong bg-white px-3 pt-4 pb-3 text-center sm:px-6 sm:pt-5"
                >
                    <TrackingBarcode
                        :value="trackingNumber"
                        class="mx-auto h-16 w-full max-w-[440px] sm:h-20"
                    />
                    <p
                        class="mt-3 text-[26px] leading-9 text-ink sm:text-[34px] sm:leading-[44px]"
                    >
                        <TrackingNumber :value="trackingNumber" size="inline" />
                    </p>
                </div>
                <p
                    class="mt-2.5 text-[12.5px] leading-[18px] text-muted-foreground"
                >
                    Tip: turn your screen brightness up if the scanner can't
                    read it.
                </p>
            </div>

            <div
                v-if="branch"
                class="border-t border-line bg-surface p-5 sm:p-7 lg:border-t-0 lg:border-l"
            >
                <h3
                    class="text-[13px] leading-[18px] font-bold text-muted-foreground"
                >
                    Your drop-off branch
                </h3>
                <BranchDetails :branch="branch" class="mt-3" />
            </div>
        </div>
    </section>
</template>
