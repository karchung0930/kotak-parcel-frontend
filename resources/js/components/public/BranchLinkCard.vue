<script setup lang="ts">
import { Link } from '@inertiajs/vue3';
import { ChevronRight, Store } from '@lucide/vue';
import BranchName from '@/components/BranchName.vue';
import BranchOpenStatus from '@/components/public/BranchOpenStatus.vue';
import { branchAnchor, formatDistance } from '@/lib/branches';
import { index as branchesIndex } from '@/routes/branches';
import type { Branch } from '@/types';

/**
 * A branch in the home page strip: name, open now or not, and the
 * distance once the visitor shares a location. Links to the branch's card
 * on the branches page.
 */
withDefaults(
    defineProps<{
        branch: Branch;
        now: Date | null;
        distanceKm?: number | null;
        nearest?: boolean;
    }>(),
    {
        distanceKm: null,
        nearest: false,
    },
);
</script>

<template>
    <Link
        :href="`${branchesIndex.url()}#${branchAnchor(branch)}`"
        :class="[
            'group flex h-full min-h-16 items-center gap-3 rounded-xl border bg-white px-3.5 py-3 text-ink transition-[border-color,box-shadow] hover:border-line-strong hover:shadow-card',
            nearest ? 'border-brand-edge' : 'border-line',
        ]"
    >
        <span
            class="flex size-9 flex-none items-center justify-center rounded-lg bg-brand-tint text-brand"
        >
            <Store aria-hidden="true" class="size-5" />
        </span>
        <span class="flex min-w-0 flex-1 flex-col">
            <span class="flex flex-wrap items-center gap-x-2 gap-y-0.5">
                <span class="text-sm leading-5 font-bold">
                    <BranchName :name="branch.name" />
                </span>
                <span
                    v-if="nearest"
                    class="rounded-[4px] bg-highlight px-1.5 text-[11px] leading-[18px] font-bold text-ink"
                >
                    Nearest
                </span>
            </span>
            <span class="text-[12.5px] leading-[18px] text-muted-foreground">
                <BranchOpenStatus :hours="branch.opening_hours" :now="now" />
            </span>
        </span>
        <span
            v-if="distanceKm !== null"
            class="flex-none font-mono text-[12.5px] font-semibold whitespace-nowrap text-ink-2"
        >
            {{ formatDistance(distanceKm) }}
            <span class="sr-only">away</span>
        </span>
        <ChevronRight
            aria-hidden="true"
            class="size-[18px] flex-none text-subtle transition-colors group-hover:text-brand-strong"
        />
    </Link>
</template>
