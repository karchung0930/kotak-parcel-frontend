<script setup lang="ts">
import { computed } from 'vue';
import { receiptNumberParts } from '@/lib/format';

/**
 * A receipt number ("RCPT-20261003-00000025") in mono. It stays whole
 * wherever it fits. In a box too narrow for it, it breaks only after one of
 * its hyphens (a <wbr>, so a copied number has nothing extra in it), never
 * inside the date or the number, whatever the box around it allows.
 */
const props = defineProps<{
    value: string;
}>();

const parts = computed(() => receiptNumberParts(props.value));
</script>

<template>
    <span class="font-mono break-normal wrap-normal"
        ><template v-for="(part, index) in parts" :key="index"
            ><wbr v-if="index > 0" />{{ part }}</template
        ></span
    >
</template>
