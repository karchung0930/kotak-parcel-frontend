<script setup lang="ts">
import { computed } from 'vue';

/**
 * A file name that wraps after its separators ("_", "-", "."), so a long
 * name such as Kotak_Rate_Card_2027_v2.xlsx breaks between its parts and
 * never inside one. Copying the name still copies it unchanged.
 */
const props = defineProps<{
    name: string;
}>();

const parts = computed(() => props.name.split(/(?<=[_.-])/));
</script>

<template>
    <span
        ><template v-for="(part, index) in parts" :key="index"
            >{{ part }}<wbr v-if="index < parts.length - 1" /></template
    ></span>
</template>
