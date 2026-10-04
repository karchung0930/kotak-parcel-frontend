<script setup lang="ts">
/**
 * One row of a DescriptionList: the label on the left, the value (default
 * slot) on the right. `stacked` puts the value under the label, for long
 * values such as addresses; `stacked="sm"` does that from 640px only, so a
 * wide card does not leave a long gap between each label and its value.
 * The label keeps its one line: a long value wraps instead. `wrap` is for
 * a value that should not break where it can stay whole (a receipt
 * number): when it does not fit beside the label it moves under it, still
 * on the right.
 */
withDefaults(
    defineProps<{
        label: string;
        stacked?: boolean | 'sm';
        wrap?: boolean;
    }>(),
    { stacked: false, wrap: false },
);
</script>

<template>
    <div
        :class="[
            'py-3 text-sm leading-5',
            stacked === true
                ? 'flex flex-col gap-0.5'
                : 'flex items-baseline justify-between gap-4',
            stacked === 'sm' &&
                'sm:flex-col sm:items-stretch sm:justify-start sm:gap-0.5',
            wrap && stacked !== true && 'flex-wrap gap-y-0',
        ]"
    >
        <dt class="shrink-0 text-muted-foreground">{{ label }}</dt>
        <dd
            :class="[
                'min-w-0 font-bold wrap-anywhere text-ink',
                stacked === true
                    ? ''
                    : stacked === 'sm'
                      ? 'text-right sm:text-left'
                      : 'text-right',
                wrap && stacked === false && 'ml-auto',
            ]"
        >
            <slot />
        </dd>
    </div>
</template>
