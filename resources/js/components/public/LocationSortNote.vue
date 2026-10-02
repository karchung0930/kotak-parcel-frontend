<script setup lang="ts">
import { CircleCheck, TriangleAlert } from '@lucide/vue';
import { computed } from 'vue';
import type { LocateStatus } from '@/composables/useNearestBranches';

/**
 * The live note for "Use my location": what happened (finding, sorted,
 * denied, failed). It is always in the page, empty while idle, so screen
 * readers announce each change. LocationSort shows it under its buttons;
 * a page that lays the note out itself (the branches page, where it runs
 * full width under the search row) uses this directly.
 */
const props = defineProps<{
    status: LocateStatus;
    message: string;
}>();

const problem = computed(() =>
    ['denied', 'failed', 'unsupported'].includes(props.status),
);
</script>

<template>
    <p
        role="status"
        aria-live="polite"
        :class="[
            'text-sm leading-5',
            message ? 'flex items-start gap-2' : '',
            problem
                ? 'text-status-failed'
                : status === 'located'
                  ? 'font-semibold text-status-delivered'
                  : 'text-muted-foreground',
        ]"
    >
        <template v-if="message">
            <TriangleAlert
                v-if="problem"
                aria-hidden="true"
                class="mt-0.5 size-4 flex-none"
            />
            <CircleCheck
                v-else-if="status === 'located'"
                aria-hidden="true"
                class="mt-0.5 size-4 flex-none"
            />
            <span>{{ message }}</span>
        </template>
    </p>
</template>
