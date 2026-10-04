<script setup lang="ts">
import { Link } from '@inertiajs/vue3';
import KeepTogether from '@/components/KeepTogether.vue';
import {
    Breadcrumb,
    BreadcrumbItem,
    BreadcrumbLink,
    BreadcrumbList,
    BreadcrumbPage,
    BreadcrumbSeparator,
} from '@/components/ui/breadcrumb';
import type { BreadcrumbItem as BreadcrumbItemType } from '@/types';

/**
 * Breadcrumb trail; the last item is the current page. A tracking number
 * in a title (a parcel's page) is shown as everywhere else, and it and any
 * date (a rate card's name) stay on one line.
 */
defineProps<{
    breadcrumbs: BreadcrumbItemType[];
}>();
</script>

<template>
    <Breadcrumb>
        <BreadcrumbList class="text-[13px] text-muted-foreground">
            <template v-for="(item, index) in breadcrumbs" :key="index">
                <!-- The current page may be a long file name: cut short
                     rather than pushing the page sideways. -->
                <BreadcrumbItem
                    :class="
                        index === breadcrumbs.length - 1 ? 'max-w-full' : ''
                    "
                >
                    <BreadcrumbPage
                        v-if="index === breadcrumbs.length - 1"
                        class="min-w-0 truncate font-semibold text-ink"
                        :title="item.title"
                    >
                        <KeepTogether :text="item.title" />
                    </BreadcrumbPage>
                    <!-- A 44px target on touch screens without moving
                         anything: often the only way back on a phone. -->
                    <BreadcrumbLink v-else as-child>
                        <Link
                            :href="item.href"
                            class="tap-target relative hover:text-brand-strong"
                        >
                            <KeepTogether :text="item.title" />
                        </Link>
                    </BreadcrumbLink>
                </BreadcrumbItem>
                <BreadcrumbSeparator v-if="index !== breadcrumbs.length - 1" />
            </template>
        </BreadcrumbList>
    </Breadcrumb>
</template>
