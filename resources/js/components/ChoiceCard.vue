<script setup lang="ts" generic="T extends string | number | null">
import type { Component, HTMLAttributes } from 'vue';
import { cn } from '@/lib/utils';

/**
 * One option of a radio group shown as a card: the radio, an optional
 * icon, a title and an optional hint. The chosen card takes a pale tint
 * (red by default; green or amber for a delivery outcome), and the whole
 * card shows the keyboard focus ring. Bind the group's value with v-model
 * and give every card of the group the same name.
 *
 * Attributes (aria-invalid, aria-describedby …) go to the radio; `class`
 * to the card. The default slot replaces the title and hint.
 */
defineOptions({ inheritAttrs: false });

const props = withDefaults(
    defineProps<{
        value: T;
        name: string;
        title?: string;
        hint?: string;
        /** A lucide icon between the radio and the text. */
        icon?: Component | null;
        tone?: 'brand' | 'delivered' | 'failed';
        class?: HTMLAttributes['class'];
    }>(),
    {
        title: undefined,
        hint: undefined,
        icon: null,
        tone: 'brand',
        class: undefined,
    },
);

const model = defineModel<T>();

const CHECKED = {
    brand: 'has-checked:border-brand has-checked:bg-brand-tint/50',
    delivered:
        'has-checked:border-status-delivered has-checked:bg-status-delivered-tint',
    failed: 'has-checked:border-status-failed-pip has-checked:bg-status-failed-tint',
};
</script>

<template>
    <label
        :class="
            cn(
                'flex cursor-pointer items-start gap-3 rounded-xl border-[1.5px] border-line bg-white p-3.5 transition-colors hover:border-line-strong has-focus-visible:outline-3 has-focus-visible:outline-offset-2 has-focus-visible:outline-brand has-disabled:cursor-not-allowed has-disabled:opacity-70',
                CHECKED[tone],
                props.class,
            )
        "
    >
        <input
            v-model="model"
            v-bind="$attrs"
            type="radio"
            :name="name"
            :value="value"
            class="mt-0.5 size-[18px] flex-none accent-brand outline-none"
        />
        <component
            :is="icon"
            v-if="icon"
            aria-hidden="true"
            class="size-5 flex-none text-ink-2"
        />
        <span class="flex min-w-0 flex-col gap-0.5">
            <slot>
                <span class="text-[15px] leading-5 font-bold text-ink">
                    {{ title }}
                </span>
                <span
                    v-if="hint"
                    class="text-[13px] leading-5 text-balance text-muted-foreground"
                >
                    {{ hint }}
                </span>
            </slot>
        </span>
    </label>
</template>
