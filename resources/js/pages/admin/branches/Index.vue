<script setup lang="ts">
import { Head, Link } from '@inertiajs/vue3';
import { Clock, MapPin, Pencil, Phone, Plus } from '@lucide/vue';
import { computed } from 'vue';
import ActiveStatus from '@/components/admin/ActiveStatus.vue';
import EmptyState from '@/components/EmptyState.vue';
import PageHeader from '@/components/PageHeader.vue';
import { Button } from '@/components/ui/button';
import { parseOpeningHours } from '@/lib/branches';
import { pluralize, telHref } from '@/lib/format';
import { create, edit } from '@/routes/admin/branches';
import type { AdminBranchesIndexPageProps } from '@/types';

const props = defineProps<AdminBranchesIndexPageProps>();

const activeCount = computed(
    () => props.branches.filter((branch) => branch.is_active).length,
);

/** One line per period ("Mon–Sat 9:00–21:00"), or the hours as typed. */
function hoursLines(hours: string): string[] {
    return (
        parseOpeningHours(hours)?.map(
            (period) => `${period.days} ${period.hours}`,
        ) ?? [hours]
    );
}
</script>

<template>
    <Head title="Branches" />

    <div class="space-y-5">
        <PageHeader
            title="Branches"
            description="Drop-off points. A deactivated branch takes no new orders but keeps its history."
        >
            <template v-if="branches.length > 0" #meta>
                <p class="text-[13px] font-semibold text-ink-2">
                    {{ pluralize(branches.length, 'branch', 'branches') }} ·
                    {{ activeCount }} open for new orders
                </p>
            </template>
            <template #actions>
                <Button as-child class="h-11 rounded-lg px-4 font-bold">
                    <Link :href="create()">
                        <Plus aria-hidden="true" />
                        Add branch
                    </Link>
                </Button>
            </template>
        </PageHeader>

        <section
            v-if="branches.length > 0"
            aria-labelledby="branches-title"
            class="@container overflow-hidden rounded-xl border border-line bg-white"
        >
            <h2 id="branches-title" class="sr-only">All branches</h2>

            <!-- A table (.data-table in app.css) once the card is 36rem
                 wide, the cards below that; opening hours join at 56rem.
                 Container queries, so an open sidebar counts too. -->
            <div class="hidden overflow-x-auto @[36rem]:block">
                <table
                    role="table"
                    class="data-table text-[13.5px] [--columns:5] @4xl:[--columns:6]"
                >
                    <caption class="sr-only">
                        Branches, by name
                    </caption>
                    <thead
                        role="rowgroup"
                        class="data-table__head border-b border-line bg-surface/70 text-[12.5px] leading-5 font-bold whitespace-nowrap text-muted-foreground"
                    >
                        <tr role="row" class="data-table__row">
                            <th scope="col" role="columnheader" class="py-2.5">
                                Code
                            </th>
                            <th scope="col" role="columnheader" class="py-2.5">
                                Branch
                            </th>
                            <th scope="col" role="columnheader" class="py-2.5">
                                Phone
                            </th>
                            <th
                                scope="col"
                                role="columnheader"
                                class="hidden py-2.5 @4xl:block"
                            >
                                Opening hours
                            </th>
                            <th scope="col" role="columnheader" class="py-2.5">
                                Status
                            </th>
                            <th scope="col" role="columnheader" class="py-2.5">
                                Actions
                            </th>
                        </tr>
                    </thead>
                    <tbody
                        role="rowgroup"
                        class="data-table__body divide-y divide-line-soft"
                    >
                        <tr
                            v-for="branch in branches"
                            :key="branch.id"
                            role="row"
                            class="data-table__row transition-colors hover:bg-surface/70"
                        >
                            <td role="cell" class="py-3">
                                <span
                                    class="inline-block rounded-sm bg-surface px-2 py-0.5 font-mono text-[12.5px] font-bold whitespace-nowrap text-ink"
                                >
                                    {{ branch.code }}
                                </span>
                            </td>
                            <!-- The address on two lines, as on a label: the
                                 street, then postcode, city and state. -->
                            <td role="cell" class="max-w-80 py-3">
                                <p class="leading-[19px] font-bold text-ink">
                                    {{ branch.name }}
                                </p>
                                <p
                                    class="text-[12.5px] leading-[17px] text-muted-foreground"
                                >
                                    <span class="block text-pretty">{{
                                        branch.address
                                    }}</span>
                                    <span class="block">
                                        {{ branch.postcode }} {{ branch.city }},
                                        {{ branch.state }}
                                    </span>
                                </p>
                            </td>
                            <td role="cell" class="py-3 whitespace-nowrap">
                                <a
                                    :href="telHref(branch.phone)"
                                    class="-my-3 inline-flex min-h-11 items-center font-mono text-[13px] text-ink-2 underline-offset-4 hover:text-brand-strong hover:underline"
                                >
                                    {{ branch.phone }}
                                </a>
                            </td>
                            <td
                                role="cell"
                                class="hidden max-w-64 py-3 text-[13px] leading-[18px] text-ink-2 @4xl:block"
                            >
                                <span
                                    v-for="line in hoursLines(
                                        branch.opening_hours,
                                    )"
                                    :key="line"
                                    class="block"
                                >
                                    {{ line }}
                                </span>
                            </td>
                            <td role="cell" class="py-3">
                                <ActiveStatus
                                    :active="branch.is_active"
                                    inactive-label="Closed to new orders"
                                />
                            </td>
                            <td role="cell" class="py-3">
                                <Button variant="outline" size="row" as-child>
                                    <Link :href="edit(branch.id)">
                                        <Pencil aria-hidden="true" />
                                        Edit
                                        <span class="sr-only">{{
                                            branch.name
                                        }}</span>
                                    </Link>
                                </Button>
                            </td>
                        </tr>
                    </tbody>
                </table>
            </div>

            <ul class="divide-y divide-line-soft @[36rem]:hidden">
                <li
                    v-for="branch in branches"
                    :key="branch.id"
                    class="px-4 py-4"
                >
                    <div class="flex items-start justify-between gap-3">
                        <!-- The name alone on the first line and the code
                             with the status, so every card has a two-line
                             header however long the name -->
                        <div class="min-w-0">
                            <p class="font-bold text-ink">{{ branch.name }}</p>
                            <div
                                class="mt-1.5 flex flex-wrap items-center gap-1.5"
                            >
                                <span
                                    class="inline-flex h-6 items-center rounded-sm bg-surface px-2 font-mono text-xs font-bold text-ink-2"
                                >
                                    {{ branch.code }}
                                </span>
                                <ActiveStatus
                                    :active="branch.is_active"
                                    inactive-label="Closed to new orders"
                                />
                            </div>
                        </div>
                        <Button
                            variant="outline"
                            as-child
                            class="h-11 flex-none rounded-lg px-4 font-bold"
                        >
                            <Link :href="edit(branch.id)">
                                Edit
                                <span class="sr-only">{{ branch.name }}</span>
                            </Link>
                        </Button>
                    </div>
                    <ul
                        class="mt-3 space-y-1.5 text-[13px] leading-5 text-ink-2"
                    >
                        <li class="flex gap-2">
                            <MapPin
                                aria-hidden="true"
                                class="mt-0.5 size-4 flex-none text-brand"
                            />
                            <span>
                                {{ branch.address }}, {{ branch.postcode }}
                                {{ branch.city }}
                            </span>
                        </li>
                        <li class="flex gap-2">
                            <Clock
                                aria-hidden="true"
                                class="mt-0.5 size-4 flex-none text-brand"
                            />
                            <span>{{ branch.opening_hours }}</span>
                        </li>
                        <li class="flex gap-2">
                            <Phone
                                aria-hidden="true"
                                class="mt-0.5 size-4 flex-none text-brand"
                            />
                            <a
                                :href="telHref(branch.phone)"
                                class="-my-3 inline-flex min-h-11 items-center font-mono underline-offset-4 hover:underline"
                            >
                                {{ branch.phone }}
                            </a>
                        </li>
                    </ul>
                </li>
            </ul>
        </section>

        <EmptyState
            v-else
            title="No branches yet"
            description="Add the first branch so customers have somewhere to drop off parcels."
        >
            <Button as-child class="h-11 px-5 font-bold">
                <Link :href="create()">
                    <Plus aria-hidden="true" />
                    Add branch
                </Link>
            </Button>
        </EmptyState>
    </div>
</template>
