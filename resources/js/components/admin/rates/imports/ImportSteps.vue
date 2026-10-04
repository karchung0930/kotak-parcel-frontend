<script setup lang="ts">
import { Check } from '@lucide/vue';
import { computed } from 'vue';
import { IMPORT_STEPS } from '@/lib/rateImport';
import type { ImportStep } from '@/lib/rateImport';

/**
 * The four steps of an import (upload, check columns, check rows, create
 * draft) with the one the import is at: done steps get a tick, the current
 * one the brand tint, later ones stay grey. `done` marks the last step as
 * finished too, once the draft is made. A row on tablets and up; on phones
 * the steps wrap two by two.
 */
const props = withDefaults(
    defineProps<{
        current: ImportStep;
        /** Every step is finished (the draft was made). */
        done?: boolean;
    }>(),
    { done: false },
);

const steps = computed(() => {
    const at = IMPORT_STEPS.findIndex((step) => step.step === props.current);

    return IMPORT_STEPS.map((step, index) => ({
        ...step,
        number: index + 1,
        state:
            index < at || props.done
                ? ('done' as const)
                : index === at
                  ? ('current' as const)
                  : ('todo' as const),
    }));
});
</script>

<template>
    <ol class="grid grid-cols-2 gap-2 sm:grid-cols-4" aria-label="Import steps">
        <li
            v-for="step in steps"
            :key="step.step"
            :aria-current="step.state === 'current' ? 'step' : undefined"
            :class="[
                'flex items-center gap-2.5 rounded-lg border px-3 py-2.5 text-[13.5px] leading-5 font-bold',
                step.state === 'current'
                    ? 'border-brand-edge bg-brand-tint/60 text-ink'
                    : step.state === 'done'
                      ? 'border-line bg-white text-ink-2'
                      : 'border-line bg-surface/60 text-muted-foreground',
            ]"
        >
            <span
                :class="[
                    'flex size-6 flex-none items-center justify-center rounded-full text-xs',
                    step.state === 'current'
                        ? 'bg-brand text-white'
                        : step.state === 'done'
                          ? 'bg-status-delivered-tint text-status-delivered'
                          : 'bg-white text-muted-foreground ring-1 ring-line',
                ]"
            >
                <Check
                    v-if="step.state === 'done'"
                    aria-hidden="true"
                    class="size-3.5"
                    :stroke-width="3"
                />
                <template v-else>{{ step.number }}</template>
            </span>
            <span class="min-w-0">
                {{ step.label }}
                <span v-if="step.state === 'done'" class="sr-only">
                    (done)
                </span>
            </span>
        </li>
    </ol>
</template>
