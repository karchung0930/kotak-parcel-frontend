<script setup lang="ts">
import { provide, useId } from 'vue';
import { formRowsKey } from '@/components/admin/formRows';

/**
 * A white card for a form or a block of help. Its header holds the title
 * and a line of explanation on the left and the card's own buttons (the
 * `actions` slot: Cancel, then the one primary) at the top right, above a
 * rule. On phones the buttons drop under the title at full width.
 *
 * The body is a list of rows split by thin rules: every direct child is a
 * row. FormField, SwitchField and FormRow inside lay out label left (a
 * third) and control right (two thirds) from md, stacked below that.
 * FormGroup gathers rows under a small heading. `plain` gives a body of
 * free content (e.g. examples in columns) one padded block instead.
 */
defineProps<{
    title: string;
    description?: string | null;
    plain?: boolean;
}>();

const headingId = `section-${useId()}`;

provide(formRowsKey, true);
</script>

<template>
    <section
        :aria-labelledby="headingId"
        class="@container min-w-0 rounded-2xl border border-line bg-white"
    >
        <div
            :class="[$slots.default && 'border-b border-line']"
            class="flex flex-col gap-4 px-5 py-4 sm:px-6 sm:py-5 @xl:flex-row @xl:items-center @xl:justify-between @xl:gap-6"
        >
            <div class="min-w-0">
                <h2
                    :id="headingId"
                    class="text-lg leading-[26px] font-extrabold tracking-heading text-ink"
                >
                    {{ title }}
                </h2>
                <p
                    v-if="description"
                    class="mt-1 text-[13.5px] leading-5 text-pretty text-muted-foreground"
                >
                    {{ description }}
                </p>
            </div>
            <div
                v-if="$slots.actions"
                class="flex flex-none flex-col-reverse gap-2.5 min-[420px]:flex-row min-[420px]:flex-wrap min-[420px]:[&>*]:flex-1 @xl:[&>*]:flex-none"
            >
                <slot name="actions" />
            </div>
        </div>
        <div v-if="plain" class="min-w-0 p-5 sm:p-6">
            <slot />
        </div>
        <div
            v-else
            class="min-w-0 px-5 sm:px-6 [&>*+*]:border-t [&>*+*]:border-line-soft [&>*+[data-form-group]]:border-line [&>:not([data-form-group])]:py-5"
        >
            <slot />
        </div>
    </section>
</template>
