<script setup lang="ts">
import { computed } from 'vue';
import { openStatus, parseOpeningHours } from '@/lib/branches';

/**
 * "Open now · until 21:00" or "Closed now · opens tomorrow 9:00" for a
 * branch, in Kuala Lumpur time. Pass `now` from useClock(): while it is
 * null (server render) or when the hours cannot be read, the opening
 * hours are shown as typed instead.
 */
const props = defineProps<{
    hours: string;
    now: Date | null;
}>();

const status = computed(() => {
    const periods = parseOpeningHours(props.hours);

    return periods && props.now ? openStatus(periods, props.now) : null;
});
</script>

<template>
    <span v-if="status" class="inline-flex flex-wrap items-center gap-x-1.5">
        <span
            aria-hidden="true"
            :class="[
                'size-2 flex-none rounded-full',
                status.open ? 'bg-status-delivered' : 'bg-subtle',
            ]"
        />
        <span
            :class="[
                'font-bold',
                status.open ? 'text-status-delivered' : 'text-ink-2',
            ]"
            >{{ status.label }}</span
        >
        <template v-if="status.detail">
            <span aria-hidden="true">·</span>
            <span>{{ status.detail }}</span>
        </template>
    </span>
    <span v-else>{{ hours }}</span>
</template>
