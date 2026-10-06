<script setup lang="ts">
import { provide } from 'vue';
import { formRowsKey, rowGrid } from '@/components/admin/formRows';

/**
 * One row of a FormSection for what is not a single FormField: a label
 * and hint on the left, anything on the right (several small fields, a
 * group of choices, a notice). `for` makes the label a <label>; without
 * it the label is a plain heading whose id (`labelId`) a fieldset can
 * point at. With no label the content sits in the right column, lined up
 * with the controls above it.
 */
const props = defineProps<{
    label?: string | null;
    hint?: string | null;
    for?: string;
    labelId?: string;
    /** Content takes the full row width (a wide table) under the label. */
    wide?: boolean;
    /** Belongs to the row above (a note on its fields): no rule, no gap. */
    attached?: boolean;
}>();

// Fields inside a row are its parts, stacked label over control.
provide(formRowsKey, false);
</script>

<template>
    <div
        :class="[
            rowGrid,
            wide && '@2xl:grid-cols-1',
            attached && 'border-t-0! pt-0!',
        ]"
    >
        <div v-if="label" class="min-w-0 @2xl:pt-3">
            <component
                :is="props.for ? 'label' : 'p'"
                :id="labelId"
                :for="props.for"
                class="text-sm leading-5 font-bold text-ink"
            >
                {{ label }}
            </component>
            <p
                v-if="hint"
                class="mt-1 text-[13px] leading-5 text-pretty text-muted-foreground"
            >
                {{ hint }}
            </p>
        </div>
        <div :class="['min-w-0', !label && !wide && '@2xl:col-start-2']">
            <slot />
        </div>
    </div>
</template>
