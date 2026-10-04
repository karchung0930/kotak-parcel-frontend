<script setup lang="ts">
import type { LinkComponentBaseProps, Method } from '@inertiajs/core';
import { Link } from '@inertiajs/vue3';

/**
 * An inline text link in Kotak red (underlined on hover). Its ::after
 * makes the target 44px tall without moving anything. It grows mostly
 * upwards, and only 4px down, so a field right under a link (the password
 * field, 8px under "Forgot your password?") stays clear of it.
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
        class="relative font-semibold text-brand-strong underline decoration-brand-edge underline-offset-4 transition-colors after:absolute after:-inset-x-1 after:top-[min(0px,calc(100%-2.5rem))] after:-bottom-1 hover:text-brand-deep hover:decoration-current"
    >
        <slot />
    </Link>
</template>
