<script setup lang="ts">
import { Link } from '@inertiajs/vue3';
import KotakLogo from '@/components/brand/KotakLogo.vue';
import WarehouseScene from '@/components/brand/WarehouseScene.vue';
import SkipLink from '@/components/layout/SkipLink.vue';
import { Toaster } from '@/components/ui/sonner';
import { todayInKualaLumpur } from '@/lib/format';
import { home } from '@/routes';

/**
 * Sign in, sign up and the other account screens (auth/*). The logo, the
 * heading and the form share one narrow column, so they line up on the
 * same left edge; the footer runs the full width of that half under a
 * full-width rule. On desktop the other half is the Kotak Klang Valley
 * hub, edge to edge and full height, pinned while a long form scrolls.
 * It is only a picture, with nothing to read on it, so the eye goes to
 * the form: WarehouseScene keeps the sign, the docks, the vans and the
 * colleague whole and low in the panel, filling most of it, under a
 * calm band of sky, at any window size. On phones and tablets the hub
 * is a band above the form, framed on the sign and the van, and never
 * more than a quarter of the screen's height, so the form's button and
 * the footer still fit on the first screen.
 *
 * Pages pass their heading through the layout props:
 * defineOptions({ layout: { title: 'Choose a new password', description: '…' } }).
 * Log in and sign up start the form right under the logo: they pass
 * `hideTitle: true`, which keeps the title as a visually hidden h1 for
 * screen readers and leaves the description out.
 */
withDefaults(
    defineProps<{
        title?: string;
        description?: string;
        /** Keep the title for screen readers only; no description. */
        hideTitle?: boolean;
    }>(),
    {
        title: '',
        description: '',
        hideTitle: false,
    },
);

const year = todayInKualaLumpur().slice(0, 4);
</script>

<template>
    <SkipLink />
    <div
        class="grid min-h-dvh grid-cols-1 bg-white lg:grid-cols-[minmax(0,1fr)_minmax(0,1.05fr)]"
    >
        <div class="flex min-h-dvh min-w-0 flex-col">
            <!-- phones and tablets: the hub as a compact band above the
                 form, framed on the Kotak sign and the van under a thin
                 strip of sky; at most 25% of the screen's height, so on a
                 tall tablet or a landscape phone it turns into a strip.
                 Wider on phones, so the form starts higher up. -->
            <div
                aria-hidden="true"
                class="flex aspect-[2/1] max-h-[min(440px,25svh)] w-full flex-none flex-col overflow-hidden border-b border-line bg-surface sm:aspect-[8/5] lg:hidden"
            >
                <WarehouseScene compact class="min-h-0 flex-1" />
            </div>

            <div class="flex flex-1 flex-col px-6 sm:px-10">
                <!-- Less padding on short desktop screens (e.g. 1024x768),
                     so the longest form and the footer still fit. -->
                <div
                    class="mx-auto flex w-full max-w-sm flex-1 flex-col justify-center py-8 sm:py-10 lg:py-14 [@media(min-width:1024px)_and_(max-height:820px)]:py-8"
                >
                    <header class="mb-6 sm:mb-10">
                        <Link
                            :href="home()"
                            aria-label="Kotak home"
                            class="inline-flex rounded-md"
                        >
                            <KotakLogo />
                        </Link>
                    </header>

                    <main id="main" tabindex="-1" class="outline-none">
                        <h1 v-if="title && hideTitle" class="sr-only">
                            {{ title }}
                        </h1>
                        <div v-else-if="title || description" class="mb-8">
                            <h1
                                v-if="title"
                                class="text-[28px] leading-9 font-extrabold tracking-display text-ink"
                            >
                                {{ title }}
                            </h1>
                            <p
                                v-if="description"
                                class="mt-2 text-[15px] leading-6 text-pretty text-muted-foreground"
                            >
                                {{ description }}
                            </p>
                        </div>
                        <slot />
                    </main>
                </div>
            </div>

            <footer
                class="border-t border-line px-6 py-6 text-center text-[13px] leading-5 text-muted-foreground sm:px-10"
            >
                © {{ year }} Kotak Parcel Sdn. Bhd.
            </footer>
        </div>

        <!-- desktop: full-height panel, pinned while the form scrolls; the
             scene alone, edge to edge, nothing over it -->
        <aside
            aria-hidden="true"
            class="relative hidden h-dvh flex-col overflow-hidden border-l border-line bg-surface lg:sticky lg:top-0 lg:flex"
        >
            <WarehouseScene class="min-h-0 flex-1" />
        </aside>
    </div>
    <Toaster />
</template>
