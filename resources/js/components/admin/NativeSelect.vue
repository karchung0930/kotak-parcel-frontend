<script setup lang="ts">
import { ChevronDown } from '@lucide/vue';
import type { HTMLAttributes } from 'vue';
import { cn } from '@/lib/utils';

/**
 * A styled native <select>: dependable on phones and with screen readers.
 * Put the <option>s in the default slot. Attributes (id, name,
 * aria-describedby, disabled...) go on the <select>; `class` on the wrapper.
 *
 * size: sm for filter bars (40px), md for forms (44px). Below md the text
 * is 16px at either size, as in Input, or iOS zooms the page in when the
 * select is focused.
 */
defineOptions({ inheritAttrs: false });

const props = withDefaults(
    defineProps<{
        size?: 'sm' | 'md';
        class?: HTMLAttributes['class'];
    }>(),
    {
        size: 'md',
        class: undefined,
    },
);

const model = defineModel<string | number | null>();
</script>

<template>
    <div :class="cn('relative min-w-0', props.class)">
        <select
            v-model="model"
            v-bind="$attrs"
            :class="[
                'w-full min-w-0 cursor-pointer appearance-none truncate rounded-md border border-field bg-white pr-9 pl-3 font-semibold text-ink transition-[color,box-shadow] outline-none focus-visible:border-ring focus-visible:ring-[3px] focus-visible:ring-ring/50 disabled:cursor-not-allowed disabled:bg-surface disabled:text-muted-foreground aria-invalid:border-brand-strong',
                size === 'sm'
                    ? 'h-10 text-base md:text-[13.5px]'
                    : 'h-11 text-base md:text-[15px]',
            ]"
        >
            <slot />
        </select>
        <ChevronDown
            aria-hidden="true"
            class="pointer-events-none absolute top-1/2 right-3 size-4 -translate-y-1/2 text-muted-foreground"
        />
    </div>
</template>
