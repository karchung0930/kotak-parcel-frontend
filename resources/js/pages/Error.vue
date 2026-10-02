<script setup lang="ts">
import { Head, Link } from '@inertiajs/vue3';
import { ArrowLeft, House, RotateCcw, ScanLine, Store, Tag } from '@lucide/vue';
import { computed } from 'vue';
import EmptyParcel from '@/components/brand/EmptyParcel.vue';
import KotakLogo from '@/components/brand/KotakLogo.vue';
import KotakTape from '@/components/brand/KotakTape.vue';
import TrackingSearch from '@/components/TrackingSearch.vue';
import { Button } from '@/components/ui/button';
import { home, pricing, track } from '@/routes';
import { index as branchesIndex } from '@/routes/branches';

const year = new Date().getFullYear();

/**
 * The branded error page, rendered by bootstrap/app.php for 403, 404, 419,
 * 429, 500 and 503 outside local development. It can render before the
 * Inertia middleware runs (an unknown URL), so it uses no shared props and
 * no layout.
 */
const props = defineProps<{
    status: number;
}>();

type ErrorCopy = {
    title: string;
    message: string;
    illustration: 'empty' | 'search' | 'done';
    retry?: boolean;
};

const copy: Record<number, ErrorCopy> = {
    403: {
        title: 'This page is not for you',
        message:
            'Your account does not have access to this page. If you think it should, sign in with the right account or ask your Kotak admin.',
        illustration: 'empty',
    },
    404: {
        title: 'We could not find that page',
        message:
            'The link may be old or mistyped. If you are looking for a parcel, enter its tracking number below.',
        illustration: 'search',
    },
    419: {
        title: 'This page has expired',
        message:
            'For your security, the page timed out. Go back, refresh the page and try again.',
        illustration: 'empty',
        retry: true,
    },
    429: {
        title: 'Too many requests',
        message:
            'You have made a lot of requests in a short time. Please wait a minute, then try again.',
        illustration: 'empty',
        retry: true,
    },
    500: {
        title: 'Something went wrong on our side',
        message:
            'Sorry, we could not finish that. Please try again in a moment. Your parcels and orders are safe.',
        illustration: 'empty',
        retry: true,
    },
    503: {
        title: 'Kotak is being updated',
        message:
            'We are doing some quick maintenance. Please try again in a few minutes.',
        illustration: 'done',
        retry: true,
    },
};

const content = computed(() => copy[props.status] ?? copy[500]);

const helpfulLinks = [
    { title: 'Track a parcel', href: track(), icon: ScanLine },
    { title: 'Branches', href: branchesIndex(), icon: Store },
    { title: 'Pricing', href: pricing(), icon: Tag },
];

function goBack(): void {
    window.history.back();
}

function reload(): void {
    window.location.reload();
}
</script>

<template>
    <Head :title="content.title" />

    <div class="flex min-h-svh flex-col bg-surface">
        <header class="border-b border-line bg-white">
            <div class="container-page flex h-16 items-center md:h-[76px]">
                <Link :href="home()" aria-label="Kotak home" class="rounded-md">
                    <KotakLogo />
                </Link>
            </div>
        </header>

        <main id="main" class="flex flex-1 items-center py-12 sm:py-16">
            <div class="container-page flex flex-col items-center text-center">
                <div
                    class="flex size-48 items-center justify-center rounded-full bg-white shadow-card sm:size-56"
                >
                    <EmptyParcel
                        :variant="content.illustration"
                        class="w-36 sm:w-44"
                    />
                </div>
                <p
                    class="mt-7 inline-flex h-7 items-center rounded-sm bg-brand-tint px-2.5 font-mono text-[13px] font-bold tracking-[0.06em] text-brand-strong"
                >
                    Error {{ status }}
                </p>
                <h1
                    class="mt-2 max-w-xl text-[32px] leading-10 font-extrabold tracking-display text-ink sm:text-[40px] sm:leading-[48px]"
                >
                    {{ content.title }}
                </h1>
                <p
                    class="mt-3 max-w-lg text-base leading-[26px] text-muted-foreground"
                >
                    {{ content.message }}
                </p>

                <div
                    class="mt-8 flex flex-col items-stretch gap-3 sm:flex-row sm:items-center"
                >
                    <Button as-child class="h-12 px-5 text-[15px] font-bold">
                        <Link :href="home()">
                            <House aria-hidden="true" />
                            Go to the home page
                        </Link>
                    </Button>
                    <Button
                        v-if="content.retry"
                        variant="outline"
                        class="h-12 px-5 text-[15px] font-bold"
                        @click="reload"
                    >
                        <RotateCcw aria-hidden="true" />
                        Try again
                    </Button>
                    <Button
                        v-else
                        variant="outline"
                        class="h-12 px-5 text-[15px] font-bold"
                        @click="goBack"
                    >
                        <ArrowLeft aria-hidden="true" />
                        Go back
                    </Button>
                </div>

                <div
                    v-if="status === 404"
                    class="mt-10 w-full max-w-lg rounded-2xl border border-line bg-white p-5 text-left shadow-card"
                >
                    <TrackingSearch label="Track a parcel" />
                </div>

                <nav
                    v-if="status === 403 || status === 404"
                    aria-label="Helpful pages"
                    class="mt-8"
                >
                    <ul
                        class="flex flex-wrap items-center justify-center gap-x-6 gap-y-2 text-sm font-semibold"
                    >
                        <li v-for="link in helpfulLinks" :key="link.title">
                            <Link
                                :href="link.href"
                                class="inline-flex min-h-11 items-center gap-1.5 text-ink-2 hover:text-brand-strong"
                            >
                                <component
                                    :is="link.icon"
                                    aria-hidden="true"
                                    class="size-4 text-brand"
                                />
                                {{ link.title }}
                            </Link>
                        </li>
                    </ul>
                </nav>
            </div>
        </main>

        <KotakTape :height="40" />
        <footer class="bg-white">
            <p
                class="container-page py-5 text-center text-[13px] text-muted-foreground"
            >
                © {{ year }} Kotak Parcel Sdn. Bhd.
            </p>
        </footer>
    </div>
</template>
