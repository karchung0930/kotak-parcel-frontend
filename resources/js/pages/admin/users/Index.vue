<script setup lang="ts">
import { Head, Link, useForm, usePage } from '@inertiajs/vue3';
import { Pencil, Search, UserPlus, X } from '@lucide/vue';
import { computed } from 'vue';
import ActiveStatus from '@/components/admin/ActiveStatus.vue';
import BranchName from '@/components/BranchName.vue';
import EmptyState from '@/components/EmptyState.vue';
import PageHeader from '@/components/PageHeader.vue';
import Pagination from '@/components/Pagination.vue';
import PlateBadge from '@/components/PlateBadge.vue';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Spinner } from '@/components/ui/spinner';
import { getInitials } from '@/composables/useInitials';
import { formatPhone, pluralize } from '@/lib/format';
import { create, edit, index } from '@/routes/admin/users';
import type { AdminUsersIndexPageProps, RoleValue } from '@/types';

const props = defineProps<AdminUsersIndexPageProps>();

const page = usePage();
const currentUserId = computed(() => page.props.auth.user.id);

const ROLE_TABS: Record<RoleValue, string> = {
    customer: 'Customers',
    staff: 'Branch staff',
    admin: 'Admins',
    driver: 'Drivers',
};

/*
 * A tint pair per role (text on tint, 4.5:1 or more). Green is left to the
 * Active status beside it, so admins take the amber pair.
 */
const ROLE_CHIP: Record<RoleValue, string> = {
    customer: 'bg-status-neutral-tint text-status-neutral',
    staff: 'bg-status-paid-tint text-status-paid',
    admin: 'bg-status-failed-tint text-status-failed',
    driver: 'bg-brand-tint text-brand-strong',
};

/** "All" plus one link per role; each keeps the search. */
const roleTabs = computed(() =>
    [null, ...props.roles.map((role) => role.value)].map((role) => ({
        role,
        label: role ? (ROLE_TABS[role] ?? role) : 'All',
        href: index({
            query: {
                role: role ?? undefined,
                q: props.filters.q ?? undefined,
            },
        }),
    })),
);

const filtered = computed(
    () => props.filters.role !== null || props.filters.q !== null,
);

/*
 * useForm rather than <Form>: a GET <Form> moves its fields into the URL
 * before its transform runs, so an empty search could not be left out.
 */
const form = useForm({ q: props.filters.q ?? '' });

/** Search within the current role, leaving an empty search out of the URL. */
function submit(): void {
    form.transform(({ q }) => ({
        role: props.filters.role ?? undefined,
        q: q.trim() === '' ? undefined : q,
    })).get(index.url(), { preserveScroll: true, preserveState: true });
}
</script>

<template>
    <Head title="Users" />

    <div class="space-y-6">
        <PageHeader
            title="Users"
            description="Staff, driver, admin and customer accounts. They are deactivated, never deleted."
        >
            <template #actions>
                <Button as-child class="h-11 rounded-lg px-4 font-bold">
                    <Link :href="create()">
                        <UserPlus aria-hidden="true" />
                        Add user
                    </Link>
                </Button>
            </template>
        </PageHeader>

        <section
            aria-labelledby="users-title"
            class="@container overflow-hidden rounded-xl border border-line bg-white"
        >
            <h2 id="users-title" class="sr-only">User accounts</h2>

            <div
                class="flex flex-col gap-3 border-b border-line px-4 py-3 @[42rem]:px-5 @4xl:flex-row @4xl:items-center @4xl:justify-between"
            >
                <nav
                    aria-label="Filter by role"
                    class="-mx-1 overflow-x-auto px-1 py-0.5"
                >
                    <ul class="flex flex-wrap gap-1.5 sm:flex-nowrap">
                        <li v-for="tab in roleTabs" :key="tab.label">
                            <Link
                                :href="tab.href"
                                :aria-current="
                                    filters.role === tab.role
                                        ? 'page'
                                        : undefined
                                "
                                preserve-scroll
                                :class="[
                                    'inline-flex h-9 items-center justify-center rounded-md px-3 text-[13.5px] whitespace-nowrap transition-colors pointer-coarse:h-11 pointer-coarse:min-w-11',
                                    filters.role === tab.role
                                        ? 'bg-brand-tint font-bold text-brand-strong'
                                        : 'font-semibold text-ink-2 hover:bg-surface',
                                ]"
                            >
                                {{ tab.label }}
                            </Link>
                        </li>
                    </ul>
                </nav>

                <form
                    :action="index.url()"
                    method="get"
                    role="search"
                    aria-label="Search users"
                    class="flex gap-2 @4xl:w-[26rem]"
                    @submit.prevent="submit"
                >
                    <label for="users-q" class="sr-only">
                        Search by name or email
                    </label>
                    <div class="relative min-w-0 flex-1">
                        <Search
                            aria-hidden="true"
                            class="pointer-events-none absolute top-1/2 left-3 size-[18px] -translate-y-1/2 text-muted-foreground"
                        />
                        <Input
                            id="users-q"
                            name="q"
                            type="search"
                            v-model="form.q"
                            maxlength="100"
                            autocomplete="off"
                            placeholder="Name or email"
                            class="h-10 rounded-md bg-white pl-10 pointer-coarse:h-11 pointer-coarse:text-base"
                        />
                    </div>
                    <Button
                        type="submit"
                        :disabled="form.processing"
                        class="h-10 rounded-md px-4 font-bold pointer-coarse:h-11"
                    >
                        <Spinner v-if="form.processing" />
                        Search
                    </Button>
                </form>
            </div>

            <div aria-live="polite" class="sr-only">
                {{ pluralize(users.meta.total, 'account') }} found.
            </div>

            <template v-if="users.data.length > 0">
                <!-- A table (.data-table in app.css) once the card is 42rem
                     wide, the cards below that; the Mobile column joins at
                     56rem. Container queries, so an open sidebar counts too. -->
                <div class="hidden overflow-x-auto @[42rem]:block">
                    <table
                        role="table"
                        class="data-table text-[13.5px] [--columns:5] @4xl:[--columns:6]"
                    >
                        <caption class="sr-only">
                            User accounts, by name
                        </caption>
                        <thead
                            role="rowgroup"
                            class="data-table__head border-b border-line bg-surface/70 text-[12.5px] leading-5 font-bold whitespace-nowrap text-muted-foreground"
                        >
                            <tr role="row" class="data-table__row">
                                <th
                                    scope="col"
                                    role="columnheader"
                                    class="py-2.5"
                                >
                                    Name
                                </th>
                                <th
                                    scope="col"
                                    role="columnheader"
                                    class="py-2.5"
                                >
                                    Role
                                </th>
                                <th
                                    scope="col"
                                    role="columnheader"
                                    class="py-2.5"
                                >
                                    Works at
                                </th>
                                <th
                                    scope="col"
                                    role="columnheader"
                                    class="hidden py-2.5 @4xl:block"
                                >
                                    Mobile
                                </th>
                                <th
                                    scope="col"
                                    role="columnheader"
                                    class="py-2.5"
                                >
                                    Status
                                </th>
                                <th
                                    scope="col"
                                    role="columnheader"
                                    class="py-2.5"
                                >
                                    Actions
                                </th>
                            </tr>
                        </thead>
                        <tbody
                            role="rowgroup"
                            class="data-table__body divide-y divide-line-soft"
                        >
                            <tr
                                v-for="user in users.data"
                                :key="user.id"
                                role="row"
                                class="data-table__row transition-colors hover:bg-surface/70"
                            >
                                <td role="cell" class="py-2.5">
                                    <div class="flex items-center gap-3">
                                        <!-- The brand tint, as on every
                                             avatar; grey once deactivated. -->
                                        <span
                                            aria-hidden="true"
                                            :class="[
                                                'flex size-9 flex-none items-center justify-center rounded-full text-[12.5px] font-bold',
                                                user.is_active
                                                    ? 'bg-brand-tint text-brand-strong'
                                                    : 'bg-status-neutral-tint text-status-neutral',
                                            ]"
                                        >
                                            {{ getInitials(user.name) }}
                                        </span>
                                        <div class="min-w-0">
                                            <p
                                                class="flex items-center gap-2 leading-[19px] font-bold text-ink"
                                            >
                                                {{ user.name }}
                                                <span
                                                    v-if="
                                                        user.id ===
                                                        currentUserId
                                                    "
                                                    class="rounded-[4px] bg-highlight px-1.5 text-[11px] leading-[17px] font-bold text-ink"
                                                >
                                                    You
                                                </span>
                                            </p>
                                            <p
                                                class="max-w-64 truncate text-[12.5px] leading-[17px] text-muted-foreground"
                                            >
                                                {{ user.email }}
                                            </p>
                                        </div>
                                    </div>
                                </td>
                                <td role="cell" class="py-2.5">
                                    <span
                                        :class="[
                                            'inline-flex h-6 items-center rounded-sm px-2 text-xs font-bold whitespace-nowrap',
                                            ROLE_CHIP[user.role.value],
                                        ]"
                                    >
                                        {{ user.role.label }}
                                    </span>
                                </td>
                                <td
                                    role="cell"
                                    class="py-2.5 text-[13px] leading-[17px] text-ink-2"
                                >
                                    <PlateBadge
                                        v-if="user.vehicle_plate"
                                        :plate="user.vehicle_plate"
                                    />
                                    <BranchName
                                        v-else-if="user.branch"
                                        :name="user.branch.name"
                                    />
                                    <span v-else class="text-muted-foreground"
                                        >—</span
                                    >
                                </td>
                                <td
                                    role="cell"
                                    class="hidden py-2.5 font-mono text-[13px] whitespace-nowrap text-ink-2 @4xl:block"
                                >
                                    {{ formatPhone(user.phone) }}
                                </td>
                                <td role="cell" class="py-2.5">
                                    <ActiveStatus :active="user.is_active" />
                                </td>
                                <td role="cell" class="py-2.5">
                                    <Button
                                        variant="outline"
                                        size="row"
                                        as-child
                                    >
                                        <Link :href="edit(user.id)">
                                            <Pencil aria-hidden="true" />
                                            Edit
                                            <span class="sr-only">{{
                                                user.name
                                            }}</span>
                                        </Link>
                                    </Button>
                                </td>
                            </tr>
                        </tbody>
                    </table>
                </div>

                <ul class="divide-y divide-line-soft @[42rem]:hidden">
                    <li
                        v-for="user in users.data"
                        :key="user.id"
                        class="flex items-center gap-3 px-4 py-3.5"
                    >
                        <span
                            aria-hidden="true"
                            :class="[
                                'flex size-10 flex-none items-center justify-center rounded-full text-[13px] font-bold',
                                user.is_active
                                    ? 'bg-brand-tint text-brand-strong'
                                    : 'bg-status-neutral-tint text-status-neutral',
                            ]"
                        >
                            {{ getInitials(user.name) }}
                        </span>
                        <div class="min-w-0 flex-1">
                            <p
                                class="flex items-center gap-2 text-sm leading-5 font-bold text-ink"
                            >
                                <span class="truncate">{{ user.name }}</span>
                                <span
                                    v-if="user.id === currentUserId"
                                    class="flex-none rounded-[4px] bg-highlight px-1.5 text-[11px] leading-[17px] font-bold text-ink"
                                >
                                    You
                                </span>
                            </p>
                            <p
                                class="truncate text-[13px] leading-5 text-muted-foreground"
                            >
                                {{ user.email }}
                            </p>
                            <div
                                class="mt-1.5 flex flex-wrap items-center gap-1.5"
                            >
                                <span
                                    :class="[
                                        'inline-flex h-6 items-center rounded-sm px-2 text-xs font-bold',
                                        ROLE_CHIP[user.role.value],
                                    ]"
                                >
                                    {{ user.role.label }}
                                </span>
                                <ActiveStatus :active="user.is_active" />
                                <PlateBadge
                                    v-if="user.vehicle_plate"
                                    :plate="user.vehicle_plate"
                                />
                            </div>
                        </div>
                        <Button
                            variant="outline"
                            as-child
                            class="h-11 flex-none rounded-lg px-4 font-bold"
                        >
                            <Link :href="edit(user.id)">
                                Edit
                                <span class="sr-only">{{ user.name }}</span>
                            </Link>
                        </Button>
                    </li>
                </ul>

                <div
                    v-if="users.meta.last_page > 1"
                    class="border-t border-line px-4 py-3 @[42rem]:px-5"
                >
                    <Pagination :meta="users.meta" noun="users" />
                </div>
            </template>

            <EmptyState
                v-else-if="filtered"
                bare
                as="h3"
                illustration="search"
                title="No accounts match"
                description="Try another name or email, or look in all roles."
            >
                <Button variant="outline" as-child class="h-11 px-5 font-bold">
                    <Link :href="index()">
                        <X aria-hidden="true" />
                        Clear filters
                    </Link>
                </Button>
            </EmptyState>

            <EmptyState
                v-else
                bare
                as="h3"
                title="No accounts yet"
                description="Add the branch staff and drivers who run Kotak day to day."
            >
                <Button as-child class="h-11 px-5 font-bold">
                    <Link :href="create()">Add user</Link>
                </Button>
            </EmptyState>
        </section>
    </div>
</template>
