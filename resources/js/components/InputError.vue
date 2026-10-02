<script setup lang="ts">
import { CircleAlert } from '@lucide/vue';
import { computed } from 'vue';

/**
 * A field's validation message. Give it an `id` and point the field's
 * aria-describedby at it so screen readers read the error with the field.
 * Numbers in the message ("12-345 6789", "30.0 kg") never break across
 * lines.
 */
const props = defineProps<{
    message?: string;
    id?: string;
}>();

/** The message split so that odd entries are the runs of digits to keep whole. */
const parts = computed(() => (props.message ?? '').split(/(\d[\d.,\- ]*\d)/));
</script>

<template>
    <p
        v-if="message"
        :id="id"
        class="flex items-start gap-1.5 text-sm leading-5 font-medium text-brand-strong"
    >
        <CircleAlert aria-hidden="true" class="mt-0.5 size-4 flex-none" />
        <span>
            <template v-for="(part, index) in parts" :key="index">
                <span v-if="index % 2 === 1" class="whitespace-nowrap">{{
                    part
                }}</span>
                <template v-else>{{ part }}</template>
            </template>
        </span>
    </p>
</template>
