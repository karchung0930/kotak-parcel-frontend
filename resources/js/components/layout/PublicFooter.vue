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

/*
 * The link lists: 26px rows with a mouse. On touch screens each link is a
 * 44px row instead, so the tap areas never overlap; the list starts 12px
 * higher and ends 12px lower, so the names keep their distance from the
 * heading above and the section below.
 */
const listClass =
    'mt-3 space-y-2 pointer-coarse:-mb-3 pointer-coarse:mt-0 pointer-coarse:space-y-0';
const linkClass =
    'text-sm font-semibold text-ink-2 hover:text-brand-strong pointer-coarse:flex pointer-coarse:min-h-11 pointer-coarse:w-fit pointer-coarse:min-w-11 pointer-coarse:items-center';
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
                    class="tap-target relative inline-flex"
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
                <ul :class="listClass">
                    <li v-for="item in services" :key="item.title">
                        <Link :href="item.href" :class="linkClass">
                            {{ item.title }}
                        </Link>
                    </li>
                </ul>
            </nav>

            <div class="max-sm:col-span-2 max-sm:row-start-3">
                <h2 class="text-sm font-extrabold tracking-heading text-ink">
                    Branches
                </h2>
                <ul v-if="listedBranches.length > 0" :class="listClass">
                    <li v-for="branch in listedBranches" :key="branch.id">
                        <Link :href="branchesIndex()" :class="linkClass">
                            {{ branch.name }}
                        </Link>
                    </li>
                </ul>
                <p v-else class="mt-3 text-sm leading-6 text-muted-foreground">
                    Branches across Kuala Lumpur and Selangor. Opening hours
                    vary by branch.
                    <Link
                        :href="branchesIndex()"
                        class="mt-1 block w-fit font-semibold text-brand-strong hover:text-brand-deep pointer-coarse:mt-0 pointer-coarse:flex pointer-coarse:min-h-11 pointer-coarse:items-center"
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
                <ul :class="listClass">
                    <li v-for="item in account" :key="item.title">
                        <Link :href="item.href" :class="linkClass">
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
