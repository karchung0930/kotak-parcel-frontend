<script setup lang="ts">
import { computed } from 'vue';
import KotakVan from '@/components/brand/KotakVan.vue';
import PlateBadge from '@/components/PlateBadge.vue';
import TextLink from '@/components/TextLink.vue';
import { formatShortDate, pluralize } from '@/lib/format';
import { create as createUser } from '@/routes/admin/users';
import type { Driver } from '@/types';

/**
 * The docked panel before a parcel is picked: the van, a line on how to
 * start, and each driver's jobs on the day being planned (so the least
 * busy driver is easy to spot). As tall as its content: with many drivers
 * the page scrolls it, never the panel itself.
 */
const props = defineProps<{
    drivers: Driver[];
    date: string;
    today: string;
}>();

const dayLabel = computed(() =>
    props.date === props.today ? 'Today' : formatShortDate(props.date),
);

const busiest = computed(() =>
    Math.max(1, ...props.drivers.map((driver) => driver.jobs_count)),
);
</script>

<template>
    <section aria-labelledby="workload-title" class="bg-white">
        <div class="border-b border-line px-6 pt-6 pb-5 text-center">
            <KotakVan compact class="mx-auto w-44" />
            <h2
                id="workload-title"
                class="mt-4 text-lg leading-6 font-extrabold tracking-heading text-ink"
            >
                Pick a parcel to plan
            </h2>
            <p class="mt-1 text-[13px] leading-5 text-muted-foreground">
                Choose Assign, Reschedule, Reassign or Return in the queue. The
                driver and the day are set here.
            </p>
        </div>

        <div class="px-6 py-5">
            <h3
                class="flex items-baseline justify-between gap-3 text-[13px] leading-5 font-bold text-ink"
            >
                Driver workload
                <span class="font-medium text-muted-foreground">
                    {{ dayLabel }}
                </span>
            </h3>

            <ul v-if="drivers.length > 0" class="mt-3 space-y-3.5">
                <li v-for="driver in drivers" :key="driver.id">
                    <div
                        class="flex items-center justify-between gap-3 text-[13px] leading-5"
                    >
                        <span class="flex min-w-0 items-center gap-2">
                            <span class="truncate font-bold text-ink">
                                {{ driver.name }}
                            </span>
                            <PlateBadge
                                v-if="driver.vehicle_plate"
                                :plate="driver.vehicle_plate"
                            />
                        </span>
                        <span class="flex-none font-semibold text-ink-2">
                            {{ pluralize(driver.jobs_count, 'job') }}
                        </span>
                    </div>
                    <div
                        aria-hidden="true"
                        class="mt-1.5 h-1.5 overflow-hidden rounded-full bg-line-soft"
                    >
                        <div
                            class="h-full rounded-full bg-brand"
                            :style="{
                                width: `${(driver.jobs_count / busiest) * 100}%`,
                            }"
                        />
                    </div>
                </li>
            </ul>

            <p v-else class="mt-3 text-[13px] leading-5 text-muted-foreground">
                No drivers on duty.
                <TextLink :href="createUser()">Add a driver</TextLink>
            </p>
        </div>
    </section>
</template>
