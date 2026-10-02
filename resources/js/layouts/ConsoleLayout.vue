<script setup lang="ts">
import { usePage } from '@inertiajs/vue3';
import { computed } from 'vue';
import ConsoleSidebar from '@/components/layout/ConsoleSidebar.vue';
import ConsoleTopBar from '@/components/layout/ConsoleTopBar.vue';
import DriverTopBar from '@/components/layout/DriverTopBar.vue';
import SkipLink from '@/components/layout/SkipLink.vue';
import { SidebarProvider } from '@/components/ui/sidebar';
import { Toaster } from '@/components/ui/sonner';

/**
 * The work console (staff/*, admin/*, driver/*, and settings/* for those
 * roles), on the light grey surface.
 *
 * - Staff and admins: a sidebar with their role's menu (a sheet below
 *   1024px, so tablets keep the full width) and a top bar. <main> is
 *   padded (16px, 24px from sm); pages use the full width and white cards.
 * - Drivers: a phone-first top bar and a single centred column (max 48rem).
 */
const page = usePage();
const isDriver = computed(() => page.props.auth.user.role.value === 'driver');
const sidebarOpen = computed(() => page.props.sidebarOpen);
</script>

<template>
    <div v-if="isDriver" class="flex min-h-svh flex-col bg-surface">
        <SkipLink />
        <DriverTopBar />
        <main id="main" tabindex="-1" class="flex-1 outline-none">
            <div
                class="mx-auto w-full max-w-3xl px-4 pt-5 pb-16 sm:px-6 sm:pt-8"
            >
                <slot />
            </div>
        </main>
        <Toaster position="top-center" />
    </div>

    <SidebarProvider
        v-else
        :default-open="sidebarOpen"
        class="bg-surface print:bg-white"
    >
        <SkipLink />
        <ConsoleSidebar />
        <div class="flex min-w-0 flex-1 flex-col bg-surface print:bg-white">
            <ConsoleTopBar />
            <main
                id="main"
                tabindex="-1"
                class="flex-1 p-4 pb-16 outline-none sm:p-6 sm:pb-16 print:p-0"
            >
                <slot />
            </main>
        </div>
        <Toaster />
    </SidebarProvider>
</template>
