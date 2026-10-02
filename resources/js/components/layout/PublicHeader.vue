<script setup lang="ts">
import { Link, router, usePage } from '@inertiajs/vue3';
import { Menu, ScanLine } from '@lucide/vue';
import { computed } from 'vue';
import KotakLogo from '@/components/brand/KotakLogo.vue';
import TrackingSearch from '@/components/TrackingSearch.vue';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { Button } from '@/components/ui/button';
import {
    DropdownMenu,
    DropdownMenuContent,
    DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import {
    Sheet,
    SheetClose,
    SheetContent,
    SheetDescription,
    SheetHeader,
    SheetTitle,
    SheetTrigger,
} from '@/components/ui/sheet';
import UserMenuContent from '@/components/UserMenuContent.vue';
import { useCurrentUrl } from '@/composables/useCurrentUrl';
import { getInitials } from '@/composables/useInitials';
import { publicNav, roleHome } from '@/lib/navigation';
import { home, login, logout, register, track } from '@/routes';
import type { User } from '@/types';

/**
 * The public site header: the logo, main navigation and account actions.
 * On phones the navigation, search and account links move into a menu
 * sheet. Branch opening hours live on the Branches page (in the nav).
 */
const page = usePage();
// Guests have no user, whatever the shared Auth type says.
const user = computed(() => page.props.auth.user as User | null);
const accountHome = computed(() =>
    user.value ? roleHome(user.value.role.value) : null,
);
const nav = computed(() => publicNav(user.value));
const { isCurrentOrParentUrl } = useCurrentUrl();

/** Pages with their own big tracking form don't need the header one. */
const showHeaderSearch = computed(
    () => !['Welcome', 'track/Show'].includes(page.component),
);
</script>

<template>
    <header class="sticky top-0 z-40 border-b border-line bg-white">
        <div class="container-page flex h-16 items-center gap-2 md:h-[76px]">
            <Link
                :href="home()"
                aria-label="Kotak home"
                class="-ml-1 rounded-md p-1"
            >
                <KotakLogo />
            </Link>

            <nav aria-label="Main" class="ml-6 hidden lg:ml-12 lg:block">
                <ul class="flex items-center gap-1">
                    <li v-for="item in nav" :key="item.title">
                        <Link
                            :href="item.href"
                            :aria-current="
                                isCurrentOrParentUrl(item.href)
                                    ? 'page'
                                    : undefined
                            "
                            :class="[
                                'inline-flex h-11 items-center rounded-md px-3.5 text-[15px] transition-colors',
                                isCurrentOrParentUrl(item.href)
                                    ? 'bg-brand-tint font-bold text-brand-strong'
                                    : 'font-semibold text-ink hover:bg-surface',
                            ]"
                        >
                            {{ item.title }}
                        </Link>
                    </li>
                </ul>
            </nav>

            <div class="ml-auto flex items-center gap-2">
                <TrackingSearch
                    v-if="showHeaderSearch"
                    size="sm"
                    hide-label
                    label="Track a parcel"
                    class="hidden w-64 xl:block"
                />

                <template v-if="user && accountHome">
                    <Button
                        as-child
                        variant="ghost"
                        class="hidden h-11 px-3.5 text-[15px] font-semibold md:inline-flex"
                    >
                        <Link :href="accountHome.href">{{
                            accountHome.title
                        }}</Link>
                    </Button>
                    <DropdownMenu>
                        <DropdownMenuTrigger as-child>
                            <Button
                                variant="ghost"
                                class="hidden size-11 rounded-full p-0 lg:inline-flex"
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
                </template>
                <template v-else>
                    <Button
                        as-child
                        variant="ghost"
                        class="hidden h-11 px-4 text-[15px] font-semibold text-ink md:inline-flex"
                    >
                        <Link :href="login()">Log in</Link>
                    </Button>
                    <Button
                        as-child
                        class="hidden h-11 px-5 text-[15px] font-bold sm:inline-flex"
                    >
                        <Link :href="register()">Sign up</Link>
                    </Button>
                </template>

                <!-- Until 768px, where Log in (or My parcels) joins the bar -->
                <Button
                    as-child
                    variant="ghost"
                    class="h-11 gap-1.5 px-3 text-[14.5px] font-bold text-ink md:hidden"
                >
                    <Link :href="track()">
                        <ScanLine aria-hidden="true" class="size-[18px]" />
                        Track
                    </Link>
                </Button>

                <Sheet>
                    <SheetTrigger as-child>
                        <Button
                            variant="ghost"
                            size="icon"
                            class="-mr-2 size-11 text-ink lg:hidden"
                        >
                            <Menu aria-hidden="true" class="size-[22px]" />
                            <span class="sr-only">Open menu</span>
                        </Button>
                    </SheetTrigger>
                    <!-- The sheet's padding and close button, as in every
                         sheet: the close button sits level with the logo's
                         top, and the logo row leaves room for it (pr-12). -->
                    <SheetContent
                        side="right"
                        class="w-[88vw] max-w-sm gap-0 overflow-y-auto"
                    >
                        <SheetHeader class="border-b border-line">
                            <SheetTitle class="pr-12 text-left">
                                <KotakLogo size="sm" />
                            </SheetTitle>
                            <SheetDescription class="sr-only">
                                Site menu
                            </SheetDescription>
                        </SheetHeader>

                        <div class="flex flex-col gap-6 p-(--sheet-padding)">
                            <TrackingSearch size="sm" label="Track a parcel" />

                            <!-- -mx-3: the link text lines up with the field
                                 and buttons; the pill reaches into the padding -->
                            <nav aria-label="Main">
                                <ul class="-mx-3 flex flex-col">
                                    <li v-for="item in nav" :key="item.title">
                                        <SheetClose as-child>
                                            <Link
                                                :href="item.href"
                                                :aria-current="
                                                    isCurrentOrParentUrl(
                                                        item.href,
                                                    )
                                                        ? 'page'
                                                        : undefined
                                                "
                                                :class="[
                                                    'flex h-12 items-center rounded-md px-3 text-base',
                                                    isCurrentOrParentUrl(
                                                        item.href,
                                                    )
                                                        ? 'bg-brand-tint font-bold text-brand-strong'
                                                        : 'font-semibold text-ink hover:bg-surface',
                                                ]"
                                            >
                                                {{ item.title }}
                                            </Link>
                                        </SheetClose>
                                    </li>
                                </ul>
                            </nav>

                            <div
                                v-if="user && accountHome"
                                class="flex flex-col gap-2 border-t border-line pt-5"
                            >
                                <p class="text-sm text-muted-foreground">
                                    Signed in as
                                    <span class="font-bold text-ink">{{
                                        user.name
                                    }}</span>
                                </p>
                                <Button
                                    as-child
                                    class="h-12 text-base font-bold"
                                >
                                    <Link :href="accountHome.href">{{
                                        accountHome.title
                                    }}</Link>
                                </Button>
                                <Button
                                    as-child
                                    variant="outline"
                                    class="h-12 text-base font-bold"
                                >
                                    <Link
                                        :href="logout()"
                                        as="button"
                                        @click="router.flushAll()"
                                        >Log out</Link
                                    >
                                </Button>
                            </div>
                            <div
                                v-else
                                class="flex flex-col gap-2 border-t border-line pt-5"
                            >
                                <Button
                                    as-child
                                    class="h-12 text-base font-bold"
                                >
                                    <Link :href="register()">Sign up</Link>
                                </Button>
                                <Button
                                    as-child
                                    variant="outline"
                                    class="h-12 text-base font-bold"
                                >
                                    <Link :href="login()">Log in</Link>
                                </Button>
                            </div>
                        </div>
                    </SheetContent>
                </Sheet>
            </div>
        </div>
    </header>
</template>
