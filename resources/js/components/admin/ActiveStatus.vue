<script setup lang="ts">
import { CircleCheck, CircleMinus } from '@lucide/vue';

/** Whether an account or branch is in use: a green "Active" or a grey outlined label. */
withDefaults(
    defineProps<{
        active: boolean;
        inactiveLabel?: string;
    }>(),
    { inactiveLabel: 'Deactivated' },
);
</script>

<template>
    <span
        :class="[
            'inline-flex h-6 items-center gap-1.5 rounded-sm border pr-2 pl-1.5 text-xs font-bold whitespace-nowrap',
            active
                ? 'border-transparent bg-status-delivered-tint text-status-delivered'
                : 'border-status-returned-edge bg-white text-status-neutral',
        ]"
    >
        <component
            :is="active ? CircleCheck : CircleMinus"
            aria-hidden="true"
            class="size-[13px]"
            :stroke-width="2.4"
        />
        {{ active ? 'Active' : inactiveLabel }}
    </span>
</template>
