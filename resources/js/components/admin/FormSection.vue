<script setup lang="ts">
import { useId } from 'vue';

/**
 * A white card grouping related form fields under a title. From xl the
 * title and explanation sit in a column on the left (at lg the sidebar
 * would leave the fields too narrow for that).
 */
defineProps<{
    title: string;
    description?: string | null;
}>();

const headingId = `section-${useId()}`;
</script>

<template>
    <section
        :aria-labelledby="headingId"
        class="rounded-2xl border border-line bg-white p-5 sm:p-6 xl:grid xl:grid-cols-[minmax(0,15rem)_minmax(0,1fr)] xl:gap-10"
    >
        <div>
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
        <div class="mt-5 grid min-w-0 gap-5 xl:mt-0">
            <slot />
        </div>
    </section>
</template>
