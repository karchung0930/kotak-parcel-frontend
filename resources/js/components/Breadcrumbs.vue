<script setup lang="ts">
import { Link } from '@inertiajs/vue3';
import {
    Breadcrumb,
    BreadcrumbItem,
    BreadcrumbLink,
    BreadcrumbList,
    BreadcrumbPage,
    BreadcrumbSeparator,
} from '@/components/ui/breadcrumb';
import type { BreadcrumbItem as BreadcrumbItemType } from '@/types';

/** Breadcrumb trail; the last item is the current page. */
defineProps<{
    breadcrumbs: BreadcrumbItemType[];
}>();
</script>

<template>
    <Breadcrumb>
        <BreadcrumbList class="text-[13px] text-muted-foreground">
            <template v-for="(item, index) in breadcrumbs" :key="index">
                <BreadcrumbItem>
                    <BreadcrumbPage
                        v-if="index === breadcrumbs.length - 1"
                        class="font-semibold text-ink"
                    >
                        {{ item.title }}
                    </BreadcrumbPage>
                    <!-- A 44px target on touch screens without moving
                         anything: often the only way back on a phone. -->
                    <BreadcrumbLink v-else as-child>
                        <Link
                            :href="item.href"
                            class="tap-target relative hover:text-brand-strong"
                        >
                            {{ item.title }}
                        </Link>
                    </BreadcrumbLink>
                </BreadcrumbItem>
                <BreadcrumbSeparator v-if="index !== breadcrumbs.length - 1" />
            </template>
        </BreadcrumbList>
    </Breadcrumb>
</template>
