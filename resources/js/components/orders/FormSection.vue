<script setup lang="ts">
/**
 * One numbered step of the "Send a parcel" form: a white card whose header
 * (red step number, <h2>, optional line of help) sits above a rule, as in
 * the admin form cards. The fields stay stacked, not label-left rows: the
 * column beside the price summary is too narrow for that, and address and
 * box-size fields share lines.
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
        class="rounded-2xl border border-line bg-white"
    >
        <div class="border-b border-line px-4 py-4 sm:px-6 sm:py-5">
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
        </div>
        <div class="px-4 py-[18px] sm:p-6">
            <slot />
        </div>
    </section>
</template>
