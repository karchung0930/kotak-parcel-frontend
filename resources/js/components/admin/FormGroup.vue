<script setup lang="ts">
import { useId } from 'vue';

/**
 * A labelled group of rows inside a FormSection (e.g. "Unclaimed orders"
 * in Site settings): its heading on white, then its rows on a pale
 * brand-tinted panel inset in the card, so the heading reads as a section
 * and the fields as its contents. Every group has the same 24px above and
 * below, so the rule between two groups sits midway and the first group
 * starts 24px under the card's header.
 */
defineProps<{
    title: string;
    description?: string | null;
}>();

const headingId = `group-${useId()}`;
</script>

<template>
    <section :aria-labelledby="headingId" data-form-group class="min-w-0 py-6">
        <div class="pb-3">
            <h3
                :id="headingId"
                class="text-base leading-6 font-extrabold tracking-heading text-ink"
            >
                {{ title }}
            </h3>
            <p
                v-if="description"
                class="mt-0.5 text-[13px] leading-5 text-pretty text-muted-foreground"
            >
                {{ description }}
            </p>
        </div>
        <div
            class="min-w-0 rounded-xl bg-brand-tint/35 px-3 max-sm:-mx-2 sm:px-5 [&>*]:py-5 [&>*+*]:border-t [&>*+*]:border-brand-tint"
        >
            <slot />
        </div>
    </section>
</template>
