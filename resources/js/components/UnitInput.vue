<script setup lang="ts">
import type { Component, HTMLAttributes } from 'vue';
import { computed } from 'vue';
import { Input } from '@/components/ui/input';
import { cn } from '@/lib/utils';

/**
 * A short number field, with its unit inside on the right ("7 days",
 * "4.2 kg") or none where the label already says it (three box sides under
 * "Box size in cm"). Attributes (id, aria-*, inputmode, maxlength …) go to
 * the input; `class` sizes the whole field (e.g. a max width). The right
 * padding grows with the unit, so a long value never runs under it.
 *
 * size: md (44px, monospaced) for admin forms; lg (48px, the text face,
 * as NativeSelect's lg) for the public forms and the counter's box sides;
 * xl (64px, monospaced) for the counter's scale reading. The text is 16px
 * or more on phones at every size, or iOS zooms in when the field is
 * focused.
 */
defineOptions({ inheritAttrs: false });

const props = withDefaults(
    defineProps<{
        /** Shown after the number, e.g. "days" or "kg"; empty for none. */
        unit?: string;
        size?: 'md' | 'lg' | 'xl';
        /** Centre the number, e.g. in narrow boxes set side by side. */
        align?: 'start' | 'center';
        /** A lucide icon inside on the left, e.g. the counter's scale. */
        icon?: Component | null;
        class?: HTMLAttributes['class'];
    }>(),
    {
        unit: '',
        size: 'md',
        align: 'start',
        icon: null,
        class: undefined,
    },
);

const model = defineModel<string>({ required: true });

const sizeClass = {
    md: 'h-11 rounded-lg font-mono text-base md:text-[15px]',
    lg: 'h-12 rounded-lg border-[1.5px] text-base font-bold shadow-none md:text-base',
    xl: 'h-16 rounded-xl border-[1.5px] font-mono text-[26px] font-bold shadow-none md:text-[26px]',
};

// The unit sits 12px (16px at xl) from the edge, with a small gap before it.
const padding = computed(() => ({
    paddingRight: props.unit
        ? `calc(${props.unit.length}ch + ${props.size === 'xl' ? '1.5rem' : '1.125rem'})`
        : undefined,
    paddingLeft: props.icon
        ? props.size === 'xl'
            ? '3.5rem'
            : '2.5rem'
        : undefined,
}));
</script>

<template>
    <div :class="cn('relative', props.class)">
        <component
            :is="icon"
            v-if="icon"
            aria-hidden="true"
            :class="[
                'pointer-events-none absolute top-1/2 -translate-y-1/2 text-muted-foreground',
                size === 'xl' ? 'left-4 size-6' : 'left-3 size-[18px]',
            ]"
        />
        <Input
            v-bind="$attrs"
            v-model="model"
            :class="[
                'bg-white px-3 tabular-nums',
                sizeClass[size],
                align === 'center' ? 'px-2 text-center' : '',
            ]"
            :style="padding"
        />
        <span
            v-if="unit"
            aria-hidden="true"
            :class="[
                'pointer-events-none absolute top-1/2 -translate-y-1/2 font-semibold text-muted-foreground',
                size === 'xl'
                    ? 'right-4 text-base font-bold'
                    : 'right-3 text-sm',
            ]"
        >
            {{ unit }}
        </span>
    </div>
</template>
