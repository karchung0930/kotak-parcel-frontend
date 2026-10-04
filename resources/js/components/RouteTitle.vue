<script setup lang="ts">
import { computed } from 'vue';

/**
 * A route's name as routeName() writes it ("Peninsular Malaysia → Sabah &
 * Labuan", "Within Sarawak"), wrapping after the arrow or after "Within"
 * rather than inside a zone name, so "Sabah & Labuan" stays together. A
 * name too long for its column still wraps within itself, but the arrow
 * keeps to the zone before it (a no-break space), so it is never left on a
 * line alone. Inline: the parent sets the type.
 */
const props = defineProps<{
    title: string;
}>();

const WITHIN = 'Within ';

const parts = computed(() => {
    if (props.title.startsWith(WITHIN)) {
        return [WITHIN.trim(), props.title.slice(WITHIN.length)];
    }

    const [from, ...rest] = props.title.split(' → ');

    return rest.length > 0 ? [`${from}\u00a0→`, rest.join(' → ')] : [from];
});
</script>

<template>
    <span>
        <template v-for="(part, index) in parts" :key="index">
            <template v-if="index > 0">{{ ' ' }}</template>
            <span class="inline-block">{{ part }}</span>
        </template>
    </span>
</template>
