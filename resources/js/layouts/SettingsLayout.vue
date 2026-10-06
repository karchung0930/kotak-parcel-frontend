<script setup lang="ts">
import { Link, usePage } from '@inertiajs/vue3';
import { ShieldCheck, UserRound } from '@lucide/vue';
import { computed, useTemplateRef } from 'vue';
import PageHeader from '@/components/PageHeader.vue';
import { useCurrentUrl } from '@/composables/useCurrentUrl';
import { useFitsViewport } from '@/composables/useFitsViewport';
import { edit as editProfile } from '@/routes/profile';
import { edit as editSecurity } from '@/routes/security';
import type { NavItem } from '@/types';

/**
 * The settings pages (nested inside AccountLayout): a "Settings" header,
 * the Profile / Security menu and the page in a white card. Left-aligned
 * like the other pages of both layouts, and at most 64rem wide.
 *
 * The menu is a row of tabs over the card until the layout itself is 56rem
 * wide, then a column beside it. It goes by the layout's own width, not
 * the screen's: beside the console sidebar on a 1024px screen, or in the
 * driver's narrow column, a menu column would squeeze the card.
 */
const items: NavItem[] = [
    { title: 'Profile', href: editProfile(), icon: UserRound },
    { title: 'Security', href: editSecurity(), icon: ShieldCheck },
];

const { isCurrentOrParentUrl } = useCurrentUrl();

/*
 * Beside the card, the menu sticks 40px under the site header or top bar
 * while the taller card scrolls: the same gap as between the menu and the
 * card (@4xl:gap-10). So its top is the bar's height plus 40px: the
 * customer header is 77px (76px and its border), the staff and admin top
 * bar 64px (border included) and the driver top bar 65px (64px and its
 * border). It only sticks while it fits on screen with 40px free under it
 * too.
 */
const page = usePage();
const navTop = computed(() => {
    const role = page.props.auth.user.role.value;

    if (role === 'customer') {
        return '@4xl:top-[117px]';
    }

    return role === 'driver' ? '@4xl:top-[105px]' : '@4xl:top-[104px]';
});

const settingsNav = useTemplateRef<HTMLElement>('settingsNav');
const navFits = useFitsViewport(settingsNav, 40);
</script>

<template>
    <div class="@container w-full max-w-5xl">
        <PageHeader
            title="Settings"
            description="Manage your profile, password and sign-in security."
        />

        <div class="mt-6 flex flex-col gap-6 @4xl:flex-row @4xl:gap-10">
            <!-- Starts at the top of the row, so it has room to stick -->
            <nav
                ref="settingsNav"
                aria-label="Settings"
                class="@4xl:w-52 @4xl:flex-none @4xl:self-start"
                :class="[navTop, navFits && '@4xl:sticky']"
            >
                <ul class="flex gap-1 overflow-x-auto @4xl:flex-col">
                    <li
                        v-for="item in items"
                        :key="item.title"
                        class="flex-none"
                    >
                        <Link
                            :href="item.href"
                            :aria-current="
                                isCurrentOrParentUrl(item.href)
                                    ? 'page'
                                    : undefined
                            "
                            :class="[
                                'flex h-11 items-center gap-2.5 rounded-md px-3 text-[14.5px]',
                                isCurrentOrParentUrl(item.href)
                                    ? 'bg-brand-tint font-bold text-brand-strong'
                                    : 'font-semibold text-ink-2 hover:bg-white hover:text-ink',
                            ]"
                        >
                            <component
                                :is="item.icon"
                                aria-hidden="true"
                                class="size-[18px]"
                            />
                            {{ item.title }}
                        </Link>
                    </li>
                </ul>
            </nav>

            <!-- The pages bring their own cards (FormSection), one per
                 thing to save, each laying out by its own width. -->
            <div class="min-w-0 flex-1 space-y-6">
                <slot />
            </div>
        </div>
    </div>
</template>
