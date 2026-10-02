<script setup lang="ts">
/**
 * One numbered step of the "Send a parcel" form: a white card with a red
 * step number, its <h2> and an optional line of help under it.
 */
defineProps<{
    step: number;
    title: string;
    /** The heading's id; the section is labelled by it. */
    id: string;
    description?: string | null;
}>();
</script>

<template>
    <section
        :aria-labelledby="id"
        class="rounded-2xl border border-line bg-white px-4 py-[18px] sm:p-6"
    >
        <h2
            :id="id"
            class="flex items-center gap-2.5 text-lg leading-6 font-extrabold tracking-heading text-ink"
        >
            <span
                aria-hidden="true"
                class="inline-flex size-6 flex-none items-center justify-center rounded-full bg-brand text-[13px] font-extrabold text-white"
            >
                {{ step }}
            </span>
            <span class="sr-only">Step {{ step }}:</span>
            {{ title }}
        </h2>
        <p
            v-if="description"
            class="mt-1.5 pl-[34px] text-[13.5px] leading-5 text-muted-foreground"
        >
            {{ description }}
        </p>
        <div class="mt-4 sm:mt-5">
            <slot />
        </div>
    </section>
</template>
