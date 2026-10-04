<script setup lang="ts">
import {
    CircleCheck,
    Columns3,
    FileCheck2,
    FileSearch,
    FileUp,
    ListChecks,
    TriangleAlert,
} from '@lucide/vue';
import { computed } from 'vue';
import ToneChip from '@/components/ToneChip.vue';
import type { StatusTone } from '@/lib/status';
import type { Option, RateImportStatusValue } from '@/types';

/**
 * Where a rate card import stands, in the order status colours: grey while
 * a job works on it, red tint when the admin has columns to check, green
 * when ready, amber with problems and blue once its draft is made.
 */
const props = withDefaults(
    defineProps<{
        status: Option<RateImportStatusValue>;
        size?: 'sm' | 'md';
    }>(),
    { size: 'sm' },
);

const META = {
    uploaded: { icon: FileUp, tone: 'neutral' },
    parsing: { icon: FileSearch, tone: 'neutral' },
    needs_mapping: { icon: Columns3, tone: 'transit' },
    validating: { icon: ListChecks, tone: 'neutral' },
    ready: { icon: CircleCheck, tone: 'delivered' },
    failed: { icon: TriangleAlert, tone: 'failed' },
    applied: { icon: FileCheck2, tone: 'paid' },
} as const satisfies Record<
    RateImportStatusValue,
    { icon: unknown; tone: StatusTone }
>;

const meta = computed(() => META[props.status.value]);
</script>

<template>
    <ToneChip
        :icon="meta.icon"
        :label="status.label"
        :tone="meta.tone"
        :size="size"
    />
</template>
