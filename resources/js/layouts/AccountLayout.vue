<script setup lang="ts">
import { usePage } from '@inertiajs/vue3';
import { computed } from 'vue';
import ConsoleLayout from '@/layouts/ConsoleLayout.vue';
import CustomerLayout from '@/layouts/CustomerLayout.vue';

/**
 * Pages every role shares (settings/*): customers see them inside
 * CustomerLayout, staff, admins and drivers inside ConsoleLayout.
 */
const page = usePage();
const shell = computed(() =>
    page.props.auth.user.role.value === 'customer'
        ? CustomerLayout
        : ConsoleLayout,
);
</script>

<template>
    <component :is="shell">
        <slot />
    </component>
</template>
