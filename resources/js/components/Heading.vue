<script setup lang="ts">
/** A settings-style section heading (h2) with an optional description. */
type Props = {
    title: string;
    description?: string;
    variant?: 'default' | 'small';
};

withDefaults(defineProps<Props>(), {
    variant: 'default',
});
</script>

<template>
    <header :class="variant === 'small' ? '' : 'mb-8 space-y-1'">
        <h2
            :class="
                variant === 'small'
                    ? 'mb-0.5 text-lg leading-7 font-extrabold tracking-heading text-ink'
                    : 'text-xl font-extrabold tracking-heading text-ink'
            "
        >
            {{ title }}
        </h2>
        <p v-if="description" class="text-sm text-pretty text-muted-foreground">
            {{ description }}
        </p>
    </header>
</template>
