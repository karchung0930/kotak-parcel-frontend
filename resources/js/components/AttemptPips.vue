<script setup lang="ts">
import { computed } from 'vue';

/**
 * Failed delivery attempts as dots plus "n/3": empty = unused, amber =
 * failed, charcoal = all used and returned to the sender.
 */
const props = withDefaults(
    defineProps<{
        used: number;
        max?: number;
        returned?: boolean;
    }>(),
    {
        max: 3,
        returned: false,
    },
);

const pips = computed(() =>
    Array.from({ length: props.max }, (_, index) => index < props.used),
);
</script>

<template>
    <span class="inline-flex items-center gap-[7px]">
        <span aria-hidden="true" class="inline-flex gap-[3px]">
            <span
                v-for="(filled, index) in pips"
                :key="index"
                :class="[
                    'size-2 rounded-full',
                    !filled
                        ? 'border-[1.5px] border-status-returned-edge'
                        : returned
                          ? 'bg-status-neutral'
                          : 'bg-status-failed-pip',
                ]"
            />
        </span>
        <span
            aria-hidden="true"
            :class="[
                'font-mono text-[12.5px] tabular-nums',
                used === 0
                    ? 'font-semibold text-ink-2'
                    : returned
                      ? 'font-bold text-status-neutral'
                      : 'font-bold text-status-failed',
            ]"
            >{{ used }}/{{ max }}</span
        >
        <span class="sr-only">
            {{ used }} of {{ max }} delivery attempts failed
        </span>
    </span>
</template>
