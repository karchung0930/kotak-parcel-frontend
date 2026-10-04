<script setup lang="ts">
import { Link } from '@inertiajs/vue3';
import { ChevronLeft, ChevronRight } from '@lucide/vue';
import { computed } from 'vue';
import type { Pagination } from '@/types';

/**
 * Page links for a Laravel paginated resource (`orders.meta`). Renders
 * nothing when everything fits on one page. Pass `only` to reload just the
 * paginated prop (e.g. ['failed'] on the dispatch board, whose queues each
 * have their own page parameter). The links are 44px tall on touch
 * screens, 36px with a mouse from 640px.
 */
const props = withDefaults(
    defineProps<{
        meta: Pagination<unknown>['meta'];
        only?: string[];
        /** What is being paged, for the summary: "orders", "users"... */
        noun?: string;
    }>(),
    {
        only: () => [],
        noun: 'results',
    },
);

const links = computed(() => props.meta.links);
const previous = computed(() => links.value[0]?.url ?? null);
const next = computed(() => links.value[links.value.length - 1]?.url ?? null);
const pages = computed(() => links.value.slice(1, -1));

const linkOptions = computed(() =>
    props.only.length > 0
        ? { only: props.only, preserveScroll: true, preserveState: true }
        : {},
);
</script>

<template>
    <nav
        v-if="meta.last_page > 1"
        aria-label="Pagination"
        class="flex flex-col items-center justify-between gap-3 sm:flex-row"
    >
        <p class="text-[13px] text-muted-foreground">
            Showing
            <span class="font-semibold text-ink">{{ meta.from }}</span>
            to
            <span class="font-semibold text-ink">{{ meta.to }}</span>
            of
            <span class="font-semibold text-ink">{{ meta.total }}</span>
            {{ noun }}
        </p>

        <ul class="flex items-center gap-1">
            <li>
                <Link
                    v-if="previous"
                    :href="previous"
                    v-bind="linkOptions"
                    class="inline-flex h-11 items-center gap-1 rounded-md px-2.5 text-sm font-semibold text-ink hover:bg-accent hover:text-accent-foreground sm:h-9 pointer-coarse:h-11"
                >
                    <ChevronLeft aria-hidden="true" class="size-4" />
                    <span>Previous</span>
                </Link>
                <span
                    v-else
                    aria-disabled="true"
                    class="inline-flex h-11 items-center gap-1 px-2.5 text-sm font-semibold text-subtle sm:h-9 pointer-coarse:h-11"
                >
                    <ChevronLeft aria-hidden="true" class="size-4" />
                    Previous
                </span>
            </li>
            <li
                v-for="(page, index) in pages"
                :key="`${page.label}-${index}`"
                class="hidden sm:block"
            >
                <span
                    v-if="!page.url"
                    class="inline-flex h-9 min-w-9 items-center justify-center text-sm text-muted-foreground pointer-coarse:h-11"
                    >…</span
                >
                <Link
                    v-else
                    :href="page.url"
                    v-bind="linkOptions"
                    :aria-current="page.active ? 'page' : undefined"
                    :aria-label="`Page ${page.page ?? page.label}`"
                    :class="[
                        'inline-flex h-9 min-w-9 items-center justify-center rounded-md px-2 font-mono text-sm font-semibold pointer-coarse:h-11 pointer-coarse:min-w-11',
                        page.active
                            ? 'bg-brand text-white'
                            : 'text-ink hover:bg-accent hover:text-accent-foreground',
                    ]"
                >
                    {{ page.page ?? page.label }}
                </Link>
            </li>
            <li class="px-2 text-[13px] text-muted-foreground sm:hidden">
                Page {{ meta.current_page }} of {{ meta.last_page }}
            </li>
            <li>
                <Link
                    v-if="next"
                    :href="next"
                    v-bind="linkOptions"
                    class="inline-flex h-11 items-center gap-1 rounded-md px-2.5 text-sm font-semibold text-ink hover:bg-accent hover:text-accent-foreground sm:h-9 pointer-coarse:h-11"
                >
                    <span>Next</span>
                    <ChevronRight aria-hidden="true" class="size-4" />
                </Link>
                <span
                    v-else
                    aria-disabled="true"
                    class="inline-flex h-11 items-center gap-1 px-2.5 text-sm font-semibold text-subtle sm:h-9 pointer-coarse:h-11"
                >
                    Next
                    <ChevronRight aria-hidden="true" class="size-4" />
                </span>
            </li>
        </ul>
    </nav>
</template>
