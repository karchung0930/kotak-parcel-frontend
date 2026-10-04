<script setup lang="ts">
import { computed } from 'vue';
import TrackingNumber from '@/components/TrackingNumber.vue';
import { keepTogetherParts } from '@/lib/format';

/**
 * A sentence from the server (a toast, a history note) or one built from
 * strings (a title, a dialog's description), in which tracking numbers,
 * dates and amounts never break across lines. The text around them wraps
 * as usual. A tracking number in it is a TrackingNumber, so it looks the
 * same as everywhere else.
 */
const props = defineProps<{
    text: string;
}>();

const parts = computed(() => keepTogetherParts(props.text));
</script>

<template>
    <template v-for="(part, index) in parts" :key="index">
        <TrackingNumber
            v-if="part.kind === 'tracking'"
            :value="part.text"
            size="inline"
        />
        <span v-else-if="part.kind" class="whitespace-nowrap">{{
            part.text
        }}</span>
        <template v-else>{{ part.text }}</template>
    </template>
</template>
