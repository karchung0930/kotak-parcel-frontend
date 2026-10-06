<script setup lang="ts">
import { computed, inject } from 'vue';
import { formRowsKey, rowGrid } from '@/components/admin/formRows';
import InputError from '@/components/InputError.vue';
import KeepTogether from '@/components/KeepTogether.vue';

/**
 * One form field: its label, the control (default slot), a hint and the
 * server's error message. The slot receives `describedby` (for the
 * control's aria-describedby) and `invalid` (for aria-invalid), so the
 * hint and the error are read out with the field. Inside a FormSection
 * it is a row: label and hint left, control and error right. A date in the hint
 * ("e.g. Rates from 1 January 2027") stays on one line.
 */
const props = withDefaults(
    defineProps<{
        /** The control's id. */
        id: string;
        label: string;
        hint?: string | null;
        error?: string;
        optional?: boolean;
        /** Label over control even inside a FormSection (part of a row). */
        stacked?: boolean;
    }>(),
    {
        hint: null,
        error: undefined,
        optional: false,
        stacked: false,
    },
);

const asRow = inject(formRowsKey, false) && !props.stacked;

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
    <div v-if="asRow" :class="rowGrid">
        <div class="min-w-0 @2xl:pt-3">
            <label :for="id" class="text-sm leading-5 font-bold text-ink">
                {{ label }}
                <span v-if="optional" class="font-medium text-muted-foreground">
                    (optional)
                </span>
            </label>
            <p
                v-if="hint"
                :id="hintId"
                class="mt-1 text-[13px] leading-5 text-pretty text-muted-foreground"
            >
                <KeepTogether :text="hint" />
            </p>
        </div>
        <div class="grid min-w-0 content-start gap-1.5">
            <slot
                :describedby="describedby"
                :invalid="error ? true : undefined"
            />
            <InputError :id="errorId" :message="error" />
        </div>
    </div>
    <div v-else class="grid min-w-0 content-start gap-1.5">
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
            <KeepTogether :text="hint" />
        </p>
        <InputError :id="errorId" :message="error" />
    </div>
</template>
