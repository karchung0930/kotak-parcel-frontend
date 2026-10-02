<script setup lang="ts">
import { Link, usePage } from '@inertiajs/vue3';
import { Route } from '@lucide/vue';
import { computed } from 'vue';
import KotakLogo from '@/components/brand/KotakLogo.vue';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { Button } from '@/components/ui/button';
import {
    DropdownMenu,
    DropdownMenuContent,
    DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import UserMenuContent from '@/components/UserMenuContent.vue';
import { useCurrentUrl } from '@/composables/useCurrentUrl';
import { getInitials } from '@/composables/useInitials';
import { isNavActive } from '@/lib/navigation';
import { jobs } from '@/routes/driver';

/**
 * The drivers' phone-friendly top bar: logo, "My jobs" and the account
 * menu, all with 44px touch targets. No sidebar.
 */
const page = usePage();
const user = computed(() => page.props.auth.user);
const { currentUrl } = useCurrentUrl();
const onJobs = computed(() => isNavActive(jobs(), currentUrl.value));
</script>

<template>
    <header
        class="sticky top-0 z-30 border-b border-line bg-white print:hidden"
    >
        <div
            class="mx-auto flex h-16 w-full max-w-3xl items-center gap-2 px-4 sm:px-6"
        >
            <Link
                :href="jobs()"
                aria-label="Kotak driver home"
                class="rounded-md"
            >
                <KotakLogo size="sm" badge="Driver" />
            </Link>

            <nav aria-label="Driver" class="ml-auto">
                <Link
                    :href="jobs()"
                    :aria-current="onJobs ? 'page' : undefined"
                    :class="[
                        'inline-flex h-11 items-center gap-2 rounded-md px-3 text-[15px] whitespace-nowrap',
                        onJobs
                            ? 'bg-brand-tint font-bold text-brand-strong'
                            : 'font-semibold text-ink hover:bg-surface',
                    ]"
                >
                    <Route aria-hidden="true" class="size-5" />
                    <!-- Below 360px (320px phones) the row has no room for
                         the words: a 44px icon button with the same name. -->
                    <span class="max-[360px]:sr-only">My jobs</span>
                </Link>
            </nav>

            <DropdownMenu>
                <DropdownMenuTrigger as-child>
                    <Button
                        variant="ghost"
                        class="size-11 rounded-full p-0"
                        :aria-label="`Account menu for ${user.name}`"
                    >
                        <Avatar class="size-9">
                            <AvatarFallback
                                class="bg-brand-tint text-[13px] font-bold text-brand-strong"
                            >
                                {{ getInitials(user.name) }}
                            </AvatarFallback>
                        </Avatar>
                    </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end" class="w-60">
                    <UserMenuContent :user="user" />
                </DropdownMenuContent>
            </DropdownMenu>
        </div>
    </header>
</template>
