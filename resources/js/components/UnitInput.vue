<script setup lang="ts">
import type { HTMLAttributes } from 'vue';
import { Input } from '@/components/ui/input';
import { cn } from '@/lib/utils';

/**
 * A short number field with its unit inside on the right, e.g. "7 days".
 * Attributes (id, aria-*, inputmode, maxlength …) go to the input; `class`
 * sizes the whole field (e.g. a max width). The right padding grows with
 * the unit, so a long value never runs under it.
 */
defineOptions({ inheritAttrs: false });

const props = defineProps<{
    /** Shown after the number, e.g. "days" or "kg". */
    unit: string;
    class?: HTMLAttributes['class'];
}>();

const model = defineModel<string>({ required: true });
</script>

<template>
    <div :class="cn('relative', props.class)">
        <Input
            v-bind="$attrs"
            v-model="model"
            class="h-11 rounded-lg bg-white font-mono text-base md:text-[15px]"
            :style="{ paddingRight: `calc(${unit.length}ch + 1.75rem)` }"
        />
        <span
            aria-hidden="true"
            class="pointer-events-none absolute top-1/2 right-3.5 -translate-y-1/2 text-sm font-semibold text-muted-foreground"
        >
            {{ unit }}
        </span>
    </div>
</template>
