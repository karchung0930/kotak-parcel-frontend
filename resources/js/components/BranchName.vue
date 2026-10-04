<script setup lang="ts">
import { computed } from 'vue';
import { branchNameParts } from '@/lib/format';

/**
 * A branch name wherever it is shown as text that may wrap, such as a
 * narrow table cell or a details row: a long name wraps after its dash
 * ("Cheras - / Taman Connaught"), never before the dash or inside a short
 * town ("Petaling Jaya"). The area's name moves to the next line whole;
 * only where it is too long for a line of its own (a 320px phone) does it
 * wrap between its words, so it never spills out of its box. One inline
 * box, so in a flex row it stays one item and keeps the space after the
 * dash. Text built outside a template (a dialog's sentence) and
 * line-clamped boxes use formatBranchName() instead.
 */
const props = defineProps<{
    name: string;
}>();

const parts = computed(() => branchNameParts(props.name));
</script>

<template>
    <span
        >{{ parts[0] }}<span class="inline-block">{{ parts[1] }}</span></span
    >
</template>
