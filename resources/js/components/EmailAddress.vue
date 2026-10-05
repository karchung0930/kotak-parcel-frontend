<script setup lang="ts">
import { computed } from 'vue';
import { emailAddressParts } from '@/lib/format';

/**
 * An email address that wraps after its @ and before its dots (<wbr>), so
 * a long address breaks between its parts on a narrow screen instead of
 * widening the card or being cut off. A part of usual length stays whole,
 * so "company-holdings" does not break at its hyphen either; only a part
 * too long for a phone's line may wrap inside itself. Copying the address
 * copies it unchanged.
 */
const props = defineProps<{
    value: string;
}>();

// Fits on a 320px phone's line in the order pages' text sizes.
const KEEP_WHOLE = 24;

const parts = computed(() => emailAddressParts(props.value));
</script>

<template>
    <span class="wrap-anywhere"
        ><template v-for="(part, index) in parts" :key="index"
            ><wbr v-if="index > 0" /><span
                :class="part.length <= KEEP_WHOLE && 'whitespace-nowrap'"
                >{{ part }}</span
            ></template
        ></span
    >
</template>
