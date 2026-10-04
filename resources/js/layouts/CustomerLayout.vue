<script setup lang="ts">
import { Link } from '@inertiajs/vue3';
import KotakTape from '@/components/brand/KotakTape.vue';
import PublicFooter from '@/components/layout/PublicFooter.vue';
import PublicHeader from '@/components/layout/PublicHeader.vue';
import SkipLink from '@/components/layout/SkipLink.vue';
import { Toaster } from '@/components/ui/sonner';
import { useCurrentUrl } from '@/composables/useCurrentUrl';
import { customerNav, isNavActive } from '@/lib/navigation';

/**
 * A signed-in customer's pages (orders/*, and settings/* for customers):
 * the public header, the account tabs (My parcels, Send a parcel,
 * Settings) and the page on the light grey surface inside the content
 * width. Pages start with a PageHeader and use white cards.
 */
const tabs = customerNav();
const { currentUrl } = useCurrentUrl();
</script>

<template>
    <div class="flex min-h-svh flex-col bg-surface public-surface">
        <SkipLink />
        <PublicHeader />

        <div class="border-b border-line bg-white">
            <nav aria-label="Your account" class="container-page">
                <!-- Phones: three equal tabs, text only, so all of them fit. -->
                <ul class="-mb-px flex overflow-x-auto sm:gap-1">
                    <li
                        v-for="tab in tabs"
                        :key="tab.title"
                        class="min-w-0 flex-1 sm:flex-none"
                    >
                        <Link
                            :href="tab.href"
                            :aria-current="
                                isNavActive(tab.href, currentUrl)
                                    ? 'page'
                                    : undefined
                            "
                            :class="[
                                'flex h-12 w-full items-center justify-center gap-2 border-b-2 px-2 text-sm whitespace-nowrap transition-colors sm:w-auto sm:justify-start sm:px-3 sm:text-[15px]',
                                isNavActive(tab.href, currentUrl)
                                    ? 'border-brand font-bold text-brand-strong'
                                    : 'border-transparent font-semibold text-ink-2 hover:border-line-strong hover:text-ink',
                            ]"
                        >
                            <component
                                :is="tab.icon"
                                aria-hidden="true"
                                class="hidden size-[18px] shrink-0 sm:block"
                            />
                            {{ tab.title }}
                        </Link>
                    </li>
                </ul>
            </nav>
        </div>

        <main id="main" tabindex="-1" class="flex-1 outline-none">
            <div class="container-page pt-6 pb-16 sm:pt-8 lg:pt-10">
                <slot />
            </div>
        </main>

        <KotakTape :height="40" overlap />
        <PublicFooter />
        <Toaster />
    </div>
</template>
