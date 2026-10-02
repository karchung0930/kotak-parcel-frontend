<script setup lang="ts">
import { Link, router, usePage } from '@inertiajs/vue3';
import { LogOut } from '@lucide/vue';
import { computed } from 'vue';
import KotakLogo from '@/components/brand/KotakLogo.vue';
import {
    Sidebar,
    SidebarContent,
    SidebarFooter,
    SidebarGroup,
    SidebarGroupContent,
    SidebarGroupLabel,
    SidebarHeader,
    SidebarMenu,
    SidebarMenuButton,
    SidebarMenuItem,
    useSidebar,
} from '@/components/ui/sidebar';
import UserInfo from '@/components/UserInfo.vue';
import { useCurrentUrl } from '@/composables/useCurrentUrl';
import { consoleNav, isNavActive, roleHome } from '@/lib/navigation';
import { logout } from '@/routes';

/**
 * The console sidebar for staff and admins: logo with the role tag, the
 * role's menu groups and the signed-in user with a log out button. Below
 * 1024px (phones and tablets) it becomes a sheet, opened from the top bar
 * and closed with the sheet's own close button.
 */
const page = usePage();
const user = computed(() => page.props.auth.user);
const groups = computed(() => consoleNav(user.value.role.value));
const home = computed(() => roleHome(user.value.role.value));
const badge = computed(() =>
    user.value.role.value === 'admin' ? 'Admin' : 'Staff',
);

const { currentUrl } = useCurrentUrl();
const { isMobile, setOpenMobile } = useSidebar();

function closeSheet(): void {
    if (isMobile.value) {
        setOpenMobile(false);
    }
}
</script>

<template>
    <Sidebar collapsible="offcanvas" class="print:hidden">
        <!-- Docked, the header is as tall as the top bar (64px). In the
             sheet it has the sheet's padding around a 36px row, so the logo
             is level with the close button, which sits at that padding in
             the top right corner. -->
        <SidebarHeader
            :class="[
                'flex-row items-center border-b border-sidebar-border',
                isMobile
                    ? 'h-[calc(2.25rem+2*var(--sheet-padding))] px-(--sheet-padding)'
                    : 'h-16 px-4',
            ]"
        >
            <Link
                :href="home.href"
                :aria-label="`Kotak ${badge.toLowerCase()} console home`"
                class="rounded-md"
                @click="closeSheet"
            >
                <KotakLogo size="sm" :badge="badge" />
            </Link>
        </SidebarHeader>

        <SidebarContent class="gap-0 px-2 py-3">
            <SidebarGroup
                v-for="group in groups"
                :key="group.label"
                class="py-1.5"
            >
                <SidebarGroupLabel
                    class="px-2.5 text-xs font-semibold text-subtle"
                >
                    {{ group.label }}
                </SidebarGroupLabel>
                <SidebarGroupContent>
                    <SidebarMenu class="gap-0.5">
                        <SidebarMenuItem
                            v-for="item in group.items"
                            :key="item.title"
                        >
                            <SidebarMenuButton
                                as-child
                                :is-active="isNavActive(item.href, currentUrl)"
                                class="h-11 gap-3 px-2.5 text-[14.5px] font-semibold text-ink-2 data-[active=true]:font-bold [&>svg]:size-5 [&>svg]:text-muted-foreground data-[active=true]:[&>svg]:text-brand"
                            >
                                <Link
                                    :href="item.href"
                                    :aria-current="
                                        isNavActive(item.href, currentUrl)
                                            ? 'page'
                                            : undefined
                                    "
                                    @click="closeSheet"
                                >
                                    <component
                                        :is="item.icon"
                                        aria-hidden="true"
                                    />
                                    <span>{{ item.title }}</span>
                                </Link>
                            </SidebarMenuButton>
                        </SidebarMenuItem>
                    </SidebarMenu>
                </SidebarGroupContent>
            </SidebarGroup>
        </SidebarContent>

        <SidebarFooter class="p-3">
            <div
                class="flex items-center gap-2.5 rounded-xl border border-sidebar-border p-2.5"
            >
                <UserInfo :user="user" show-role />
                <Link
                    :href="logout()"
                    as="button"
                    aria-label="Log out"
                    title="Log out"
                    data-test="logout-button"
                    class="inline-flex size-11 flex-none items-center justify-center rounded-md text-muted-foreground hover:bg-accent hover:text-accent-foreground lg:size-9"
                    @click="router.flushAll()"
                >
                    <LogOut aria-hidden="true" class="size-[18px]" />
                </Link>
            </div>
        </SidebarFooter>
    </Sidebar>
</template>
