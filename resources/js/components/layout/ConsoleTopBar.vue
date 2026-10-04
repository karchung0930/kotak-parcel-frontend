<script setup lang="ts">
import { Link, usePage } from '@inertiajs/vue3';
import { CalendarDays, MapPin, Menu, ScanLine } from '@lucide/vue';
import { unrefElement } from '@vueuse/core';
import type { ComponentPublicInstance } from 'vue';
import { computed, nextTick, ref, useId, useTemplateRef, watch } from 'vue';
import KotakLogo from '@/components/brand/KotakLogo.vue';
import TrackingSearch from '@/components/TrackingSearch.vue';
import { Button } from '@/components/ui/button';
import { useSidebar } from '@/components/ui/sidebar';
import { useClock } from '@/composables/useClock';
import { formatWeekdayDate } from '@/lib/format';
import { roleHome } from '@/lib/navigation';
import { counter } from '@/routes/staff';

/**
 * The console top bar for staff and admins: menu button, a "find a
 * parcel" box (opens the parcel at the counter), today's date and the
 * user's branch. The logo shows while the menu is a sheet (below 1024px).
 * On phones the box does not fit in the bar: a button opens it in a row
 * under the bar instead.
 */
const page = usePage();
const user = computed(() => page.props.auth.user);
const home = computed(() => roleHome(user.value.role.value));
// The layout persists between visits, so the date refreshes with the clock
// (a counter tab left open overnight shows the new day).
const now = useClock();
const today = computed(() => formatWeekdayDate(now.value ?? new Date()));

const branchLabel = computed(
    () =>
        user.value.branch_name ??
        (user.value.role.value === 'admin' ? 'All branches' : 'No branch'),
);

const { toggleSidebar } = useSidebar();

const searchOpen = ref(false);
const searchRowId = `${useId()}-search`;
const searchRow = useTemplateRef<HTMLElement>('searchRow');
const searchToggle = useTemplateRef<ComponentPublicInstance>('searchToggle');

async function toggleSearch(): Promise<void> {
    searchOpen.value = !searchOpen.value;

    if (searchOpen.value) {
        await nextTick();
        searchRow.value?.querySelector('input')?.focus();
    }
}

function closeSearch(): void {
    searchOpen.value = false;
    unrefElement(searchToggle)?.focus();
}

// The layout persists between visits, so the row closes when a search (or
// anything else) opens another page.
watch(
    () => page.url,
    () => (searchOpen.value = false),
);
</script>

<template>
    <header class="sticky top-0 z-30 flex-none bg-white print:hidden">
        <div
            class="flex h-16 items-center gap-2 border-b border-line px-3 sm:gap-3 sm:px-6"
        >
            <Button
                variant="ghost"
                size="icon"
                class="size-11 text-ink-2 lg:size-10 pointer-coarse:size-11"
                @click="toggleSidebar"
            >
                <Menu aria-hidden="true" class="size-5" />
                <span class="sr-only">Toggle menu</span>
            </Button>

            <Link
                :href="home.href"
                aria-label="Kotak console home"
                class="tap-target relative rounded-md lg:hidden"
            >
                <KotakLogo size="sm" />
            </Link>

            <TrackingSearch
                :action="counter.form()"
                size="sm"
                hide-label
                label="Find a parcel by tracking number"
                class="hidden w-full max-w-sm min-w-0 sm:block"
            />

            <div class="ml-auto flex items-center gap-2">
                <p
                    class="hidden h-10 items-center gap-2 rounded-md bg-surface px-3 text-[13.5px] font-semibold whitespace-nowrap text-ink-2 xl:inline-flex"
                >
                    <CalendarDays aria-hidden="true" class="size-4" />
                    {{ today }}
                </p>
                <p
                    class="hidden h-10 items-center gap-2 rounded-md border border-line px-3 text-[13.5px] font-semibold whitespace-nowrap text-ink-2 lg:inline-flex"
                >
                    <MapPin aria-hidden="true" class="size-4 text-brand" />
                    <span class="sr-only">Branch:</span>
                    {{ branchLabel }}
                </p>
                <Button
                    ref="searchToggle"
                    variant="ghost"
                    size="icon"
                    aria-label="Find a parcel"
                    :aria-expanded="searchOpen"
                    :aria-controls="searchRowId"
                    :class="[
                        'size-11 sm:hidden',
                        searchOpen
                            ? 'bg-brand-tint text-brand-strong'
                            : 'text-ink-2',
                    ]"
                    @click="toggleSearch"
                >
                    <ScanLine aria-hidden="true" class="size-5" />
                </Button>
            </div>
        </div>

        <!-- Phones: the same box, full width under the bar -->
        <div
            v-show="searchOpen"
            :id="searchRowId"
            ref="searchRow"
            class="border-b border-line px-3 py-3 sm:hidden"
            @keydown.esc="closeSearch"
        >
            <TrackingSearch
                :action="counter.form()"
                size="sm"
                hide-label
                label="Find a parcel by tracking number"
            />
        </div>
    </header>
</template>
