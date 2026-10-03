<script setup lang="ts">
import { CalendarClock, CircleCheck, FilePen, History } from '@lucide/vue';
import { computed } from 'vue';
import ToneChip from '@/components/ToneChip.vue';
import type { StatusTone } from '@/lib/status';
import type { Option, RateCardPhaseValue } from '@/types';

/**
 * Where a rate card version stands, in the order status colours: a grey
 * Draft, a blue Scheduled, a green Current and an outlined Past.
 */
const props = withDefaults(
    defineProps<{
        phase: Option<RateCardPhaseValue>;
        size?: 'sm' | 'md';
    }>(),
    { size: 'sm' },
);

const META = {
    draft: { icon: FilePen, tone: 'neutral' },
    scheduled: { icon: CalendarClock, tone: 'paid' },
    current: { icon: CircleCheck, tone: 'delivered' },
    past: { icon: History, tone: 'returned' },
} as const satisfies Record<
    RateCardPhaseValue,
    { icon: unknown; tone: StatusTone }
>;

const meta = computed(() => META[props.phase.value]);
</script>

<template>
    <ToneChip
        :icon="meta.icon"
        :label="phase.label"
        :tone="meta.tone"
        :size="size"
    />
</template>
