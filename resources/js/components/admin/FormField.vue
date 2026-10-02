<script setup lang="ts">
import { computed } from 'vue';
import InputError from '@/components/InputError.vue';

/**
 * One form field: its label, the control (default slot), a hint and the
 * server's error message. The slot receives `describedby` (for the
 * control's aria-describedby) and `invalid` (for aria-invalid), so the
 * hint and the error are read out with the field.
 */
const props = withDefaults(
    defineProps<{
        /** The control's id. */
        id: string;
        label: string;
        hint?: string | null;
        error?: string;
        optional?: boolean;
    }>(),
    {
        hint: null,
        error: undefined,
        optional: false,
    },
);

const hintId = computed(() => `${props.id}-hint`);
const errorId = computed(() => `${props.id}-error`);

const describedby = computed(
    () =>
        [props.hint ? hintId.value : null, props.error ? errorId.value : null]
            .filter(Boolean)
            .join(' ') || undefined,
);
</script>

<template>
    <div class="grid min-w-0 content-start gap-1.5">
        <label :for="id" class="text-sm leading-5 font-bold text-ink">
            {{ label }}
            <span v-if="optional" class="font-medium text-muted-foreground">
                (optional)
            </span>
        </label>
        <slot :describedby="describedby" :invalid="error ? true : undefined" />
        <p
            v-if="hint"
            :id="hintId"
            class="text-[13px] leading-5 text-muted-foreground"
        >
            {{ hint }}
        </p>
        <InputError :id="errorId" :message="error" />
    </div>
</template>
