<script setup lang="ts">
import { Link, usePage } from '@inertiajs/vue3';
import { computed } from 'vue';
import KotakLogo from '@/components/brand/KotakLogo.vue';
import { todayInKualaLumpur } from '@/lib/format';
import { canSendParcels, customerNav, roleHome } from '@/lib/navigation';
import { home, login, pricing, register, track } from '@/routes';
import { index as branchesIndex } from '@/routes/branches';
import { create as createOrder } from '@/routes/orders';
import { edit as editProfile } from '@/routes/profile';
import type { Branch, NavItem, User } from '@/types';

/**
 * The public footer: brand line, links, branches (listed when the page
 * has them, e.g. the home and branches pages) and the legal line.
 */
const props = withDefaults(defineProps<{ branches?: Branch[] }>(), {
    branches: () => [],
});

const page = usePage();
const user = computed(() => page.props.auth.user as User | null);
const year = todayInKualaLumpur().slice(0, 4);

const services = computed<NavItem[]>(() => [
    ...(canSendParcels(user.value)
        ? [{ title: 'Send a parcel', href: createOrder() }]
        : []),
    { title: 'Track a parcel', href: track() },
    { title: 'Pricing', href: pricing() },
    { title: 'Branches', href: branchesIndex() },
]);

const account = computed<NavItem[]>(() => {
    if (!user.value) {
        return [
            { title: 'Log in', href: login() },
            { title: 'Sign up', href: register() },
        ];
    }

    return user.value.role.value === 'customer'
        ? customerNav()
        : [
              roleHome(user.value.role.value),
              { title: 'Settings', href: editProfile() },
          ];
});

const listedBranches = computed(() =>
    props.branches.filter((branch) => branch.is_active).slice(0, 6),
);
</script>

<template>
    <footer class="border-t border-line bg-white">
        <!-- Phones: the brand across the top, the two short link lists side
             by side under it, then the branches (longer names) full width. -->
        <div
            class="container-page grid grid-cols-2 gap-x-6 gap-y-10 pt-14 pb-10 sm:gap-10 lg:grid-cols-[1.5fr_1fr_1fr_1fr] lg:gap-8"
        >
            <div class="col-span-2 max-w-sm sm:col-span-1">
                <Link
                    :href="home()"
                    aria-label="Kotak home"
                    class="inline-flex"
                >
                    <KotakLogo size="sm" />
                </Link>
                <p class="mt-4 text-sm leading-6 text-muted-foreground">
                    Parcel delivery across the Klang Valley. Drop off at any
                    Kotak branch, pay by cash or card, and follow every step
                    with your KT- tracking number.
                </p>
            </div>

            <nav aria-labelledby="footer-services">
                <h2
                    id="footer-services"
                    class="text-sm font-extrabold tracking-heading text-ink"
                >
                    Send and track
                </h2>
                <ul class="mt-3 space-y-2">
                    <li v-for="item in services" :key="item.title">
                        <Link
                            :href="item.href"
                            class="text-sm font-semibold text-ink-2 hover:text-brand-strong"
                        >
                            {{ item.title }}
                        </Link>
                    </li>
                </ul>
            </nav>

            <div class="max-sm:col-span-2 max-sm:row-start-3">
                <h2 class="text-sm font-extrabold tracking-heading text-ink">
                    Branches
                </h2>
                <ul v-if="listedBranches.length > 0" class="mt-3 space-y-2">
                    <li v-for="branch in listedBranches" :key="branch.id">
                        <Link
                            :href="branchesIndex()"
                            class="text-sm font-semibold text-ink-2 hover:text-brand-strong"
                        >
                            {{ branch.name }}
                        </Link>
                    </li>
                </ul>
                <p v-else class="mt-3 text-sm leading-6 text-muted-foreground">
                    Branches across Kuala Lumpur and Selangor. Opening hours
                    vary by branch.
                    <Link
                        :href="branchesIndex()"
                        class="mt-1 block font-semibold text-brand-strong hover:text-brand-deep"
                    >
                        Find a branch
                    </Link>
                </p>
            </div>

            <nav
                aria-labelledby="footer-account"
                class="max-sm:col-start-2 max-sm:row-start-2"
            >
                <h2
                    id="footer-account"
                    class="text-sm font-extrabold tracking-heading text-ink"
                >
                    Your account
                </h2>
                <ul class="mt-3 space-y-2">
                    <li v-for="item in account" :key="item.title">
                        <Link
                            :href="item.href"
                            class="text-sm font-semibold text-ink-2 hover:text-brand-strong"
                        >
                            {{ item.title }}
                        </Link>
                    </li>
                </ul>
            </nav>
        </div>

        <div class="border-t border-line">
            <p
                class="container-page py-5 text-center text-[13px] leading-5 text-balance text-muted-foreground max-sm:text-left"
            >
                © {{ year }} Kotak Parcel Sdn. Bhd. All prices in Malaysian
                ringgit (RM).
            </p>
        </div>
    </footer>
</template>
