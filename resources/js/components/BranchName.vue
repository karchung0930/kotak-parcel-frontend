<script setup lang="ts">
import { computed } from 'vue';
import { branchNameParts } from '@/lib/format';

/**
 * A branch name inside text that may wrap, such as a narrow table cell:
 * a long name wraps after its dash ("Cheras - / Taman Connaught"), never
 * before the dash and never inside the area's name.
 */
const props = defineProps<{
    name: string;
}>();

const parts = computed(() => branchNameParts(props.name));
</script>

<template>
    {{ parts[0] }}<span class="whitespace-nowrap">{{ parts[1] }}</span>
</template>
