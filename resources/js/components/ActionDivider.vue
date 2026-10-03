<script setup lang="ts">
/**
 * A short upright line between two kinds of page actions, e.g. cancelling
 * this parcel and sending a new one. On phones only the button gaps flank
 * it, so two buttons still share a line from 375px; narrower they wrap,
 * and it goes.
 */
</script>

<template>
    <span
        aria-hidden="true"
        class="h-7 w-px flex-none bg-line-strong max-[374px]:hidden sm:mx-1"
    />
</template>
