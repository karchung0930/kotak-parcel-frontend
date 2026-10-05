<script setup lang="ts">
import { Truck } from '@lucide/vue';
import { computed } from 'vue';
import Notice from '@/components/Notice.vue';
import { stopCountText } from '@/lib/deliveryProgress';
import type { StopProgress } from '@/types';

/**
 * A parcel's place on the driver's round while it is out for delivery:
 * "Your parcel is stop 3 — 2 stops before yours", or "You're next", in the
 * shared Notice. Only a count: never where the driver is. The track page
 * and the customer's order page keep it up to date (useDeliveryProgress);
 * while their connection is down, `asOf` adds the time of the last update.
 * Screen readers hear each change: the live region is there even while it
 * is empty.
 */
const props = withDefaults(
    defineProps<{
        progress: StopProgress | null;
        /** "09:42" while the count is not live; null while it is. */
        asOf?: string | null;
    }>(),
    { asOf: null },
);

const text = computed(() =>
    props.progress ? stopCountText(props.progress) : null,
);
</script>

<template>
    <div role="status" aria-live="polite" aria-atomic="true">
        <Notice
            v-if="text"
            :icon="Truck"
            tone="brand"
            size="lg"
            class="mt-4 w-fit max-w-xl"
        >
            <strong class="font-extrabold text-ink">{{ text.title }}</strong
            >&nbsp;— {{ text.detail
            }}<span v-if="asOf" class="whitespace-nowrap text-muted-foreground"
                >&nbsp;· as of {{ asOf }}</span
            >
        </Notice>
    </div>
</template>
