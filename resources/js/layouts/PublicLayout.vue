<script setup lang="ts">
import KotakTape from '@/components/brand/KotakTape.vue';
import PublicFooter from '@/components/layout/PublicFooter.vue';
import PublicHeader from '@/components/layout/PublicHeader.vue';
import SkipLink from '@/components/layout/SkipLink.vue';
import { Toaster } from '@/components/ui/sonner';
import type { Branch } from '@/types';

/**
 * The public site (home, tracking, branches, pricing, errors): header,
 * full-width <main> and footer. Pages lay out their own sections and use
 * `container-page` for the content width.
 *
 * Layout props (set from a page with defineOptions({ layout: { … } })):
 * - footerTape: the tape across the top of the footer (default true).
 * The page's `branches` prop, when it has one, lists them in the footer.
 */
withDefaults(
    defineProps<{
        branches?: Branch[];
        footerTape?: boolean;
    }>(),
    {
        branches: () => [],
        footerTape: true,
    },
);
</script>

<template>
    <div class="flex min-h-svh flex-col bg-white">
        <SkipLink />
        <PublicHeader />
        <main id="main" tabindex="-1" class="flex-1 outline-none">
            <slot />
        </main>
        <KotakTape v-if="footerTape" :height="40" overlap />
        <PublicFooter :branches="branches" />
        <Toaster />
    </div>
</template>
