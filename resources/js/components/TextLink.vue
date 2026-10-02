<script setup lang="ts">
import type { LinkComponentBaseProps, Method } from '@inertiajs/core';
import { Link } from '@inertiajs/vue3';

/**
 * An inline text link in Kotak red (underlined on hover). Its ::after
 * makes the target taller without moving anything. It grows upwards only,
 * so a field right under a link (the password field, 8px under "Forgot
 * your password?") keeps its 8px gap.
 */
type Props = {
    href: LinkComponentBaseProps['href'];
    tabindex?: number;
    method?: Method;
    as?: string;
};

defineProps<Props>();
</script>

<template>
    <Link
        :href="href"
        :tabindex="tabindex"
        :method="method"
        :as="as"
        class="relative font-semibold text-brand-strong underline decoration-brand-edge underline-offset-4 transition-colors after:absolute after:-inset-x-1 after:-top-3 after:bottom-0 hover:text-brand-deep hover:decoration-current"
    >
        <slot />
    </Link>
</template>
