<script setup lang="ts">
import { Head, Link, useForm } from '@inertiajs/vue3';
import { Search, X } from '@lucide/vue';
import { computed } from 'vue';
import NativeSelect from '@/components/NativeSelect.vue';
import DateTime from '@/components/DateTime.vue';
import EmptyState from '@/components/EmptyState.vue';
import Money from '@/components/Money.vue';
import PageHeader from '@/components/PageHeader.vue';
import Pagination from '@/components/Pagination.vue';
import StatusChip from '@/components/StatusChip.vue';
import TrackingNumber from '@/components/TrackingNumber.vue';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Spinner } from '@/components/ui/spinner';
import { formatShortDate, pluralize } from '@/lib/format';
import { index, show } from '@/routes/admin/orders';
import type { AdminOrdersIndexPageProps, OrderSummary } from '@/types';

const props = defineProps<AdminOrdersIndexPageProps>();

/*
 * useForm rather than <Form>: a GET <Form> moves its fields into the URL
 * before its transform runs, so empty filters could not be left out.
 */
const form = useForm({
    q: props.filters.q ?? '',
    status: props.filters.status ?? '',
    branch: (props.filters.branch ?? '') as number | '',
});

const filtered = computed(
    () =>
        props.filters.status !== null ||
        props.filters.branch !== null ||
        props.filters.q !== null,
);

/** Search, leaving empty filters out of the URL. */
function submit(): void {
    form.transform((data) =>
        Object.fromEntries(
            Object.entries(data).filter(([, value]) => value !== ''),
        ),
    ).get(index.url(), { preserveScroll: true, preserveState: true });
}

/** Under the status: the driver and the delivery day, once scheduled. */
function statusDetail(order: OrderSummary): string | null {
    if (order.driver && order.scheduled_for) {
        return `${order.driver.name}, ${formatShortDate(order.scheduled_for)}`;
    }

    return null;
}
</script>

<template>
    <Head title="Orders" />

    <div class="space-y-5">
        <PageHeader
            title="Orders"
            description="Every parcel, newest first. Search by tracking number or by sender or receiver name."
        />

        <section
            aria-labelledby="orders-title"
            class="@container overflow-hidden rounded-xl border border-line bg-white"
        >
            <h2 id="orders-title" class="sr-only">Order list</h2>

            <!-- Sized by the card (container queries): the two filters share
                 a row at every width (phones too, to keep the results in
                 view), the button joins them from 42rem, and everything is
                 one row from 56rem. -->
            <form
                :action="index.url()"
                method="get"
                role="search"
                aria-label="Filter orders"
                class="grid grid-cols-2 gap-3 border-b border-line p-4 md:px-5 @2xl:grid-cols-[minmax(0,1fr)_minmax(0,1fr)_auto] @2xl:items-end @4xl:grid-cols-[minmax(0,1fr)_12rem_14rem_auto]"
                @submit.prevent="submit"
            >
                <div
                    class="col-span-2 grid gap-1.5 @2xl:col-span-3 @4xl:col-span-1"
                >
                    <label
                        for="orders-q"
                        class="text-[13px] leading-5 font-semibold text-ink"
                    >
                        Search
                    </label>
                    <div class="relative">
                        <Search
                            aria-hidden="true"
                            class="pointer-events-none absolute top-1/2 left-3 size-[18px] -translate-y-1/2 text-muted-foreground"
                        />
                        <Input
                            id="orders-q"
                            name="q"
                            type="search"
                            v-model="form.q"
                            maxlength="100"
                            autocomplete="off"
                            placeholder="KT- number, sender or receiver"
                            class="h-10 rounded-md bg-white pl-10"
                        />
                    </div>
                </div>
                <div class="grid gap-1.5">
                    <label
                        for="orders-status"
                        class="text-[13px] leading-5 font-semibold text-ink"
                    >
                        Status
                    </label>
                    <NativeSelect
                        id="orders-status"
                        v-model="form.status"
                        name="status"
                        size="sm"
                        @change="submit"
                    >
                        <option value="">All statuses</option>
                        <option
                            v-for="option in statuses"
                            :key="option.value"
                            :value="option.value"
                        >
                            {{ option.label }}
                        </option>
                    </NativeSelect>
                </div>
                <div class="grid gap-1.5">
                    <label
                        for="orders-branch"
                        class="text-[13px] leading-5 font-semibold text-ink"
                    >
                        Branch
                    </label>
                    <NativeSelect
                        id="orders-branch"
                        v-model="form.branch"
                        name="branch"
                        size="sm"
                        @change="submit"
                    >
                        <option value="">All branches</option>
                        <option
                            v-for="option in branches"
                            :key="option.id"
                            :value="option.id"
                        >
                            {{ option.name }}
                        </option>
                    </NativeSelect>
                </div>
                <div class="col-span-2 flex gap-2 @2xl:col-span-1">
                    <Button
                        type="submit"
                        :disabled="form.processing"
                        class="h-10 flex-1 rounded-md px-4 font-bold @2xl:flex-none"
                    >
                        <Spinner v-if="form.processing" />
                        <Search v-else aria-hidden="true" />
                        Search
                    </Button>
                    <Button
                        v-if="filtered"
                        variant="ghost"
                        as-child
                        class="h-10 rounded-md px-3 font-bold"
                    >
                        <Link :href="index()">
                            <X aria-hidden="true" />
                            Clear
                        </Link>
                    </Button>
                </div>
            </form>

            <div aria-live="polite" class="sr-only">
                {{ pluralize(orders.meta.total, 'order') }} found.
            </div>

            <template v-if="orders.data.length > 0">
                <!-- Tablets and desktops: a table (.data-table in app.css).
                     Columns join as the card gets wider (container queries,
                     so a closed sidebar counts too): Branch from 56rem,
                     Customer from 64rem. -->
                <div class="hidden overflow-x-auto md:block">
                    <table
                        role="table"
                        class="data-table text-[13.5px] [--columns:5] @4xl:[--columns:6] @5xl:[--columns:7]"
                    >
                        <caption class="sr-only">
                            Orders, newest first
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
                                    Tracking no.
                                </th>
                                <th
                                    scope="col"
                                    role="columnheader"
                                    class="py-2.5"
                                >
                                    Receiver
                                </th>
                                <th
                                    scope="col"
                                    role="columnheader"
                                    class="hidden py-2.5 @5xl:block"
                                >
                                    Customer
                                </th>
                                <th
                                    scope="col"
                                    role="columnheader"
                                    class="hidden py-2.5 @4xl:block"
                                >
                                    Branch
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
                                    Price
                                </th>
                                <th
                                    scope="col"
                                    role="columnheader"
                                    class="py-2.5"
                                >
                                    Created
                                </th>
                            </tr>
                        </thead>
                        <tbody
                            role="rowgroup"
                            class="data-table__body divide-y divide-line-soft"
                        >
                            <tr
                                v-for="order in orders.data"
                                :key="order.id"
                                role="row"
                                class="data-table__row relative transition-colors hover:bg-surface/70"
                            >
                                <td role="cell" class="py-2.5">
                                    <!-- Copy button first, so the buttons form
                                         one column and the numbers all start
                                         at one x. The number's link covers
                                         the row (stretched), so a tap
                                         anywhere on it opens the order. -->
                                    <TrackingNumber
                                        :value="order.tracking_number"
                                        :href="show(order.id)"
                                        size="sm"
                                        copy-first
                                        stretched
                                    />
                                </td>
                                <td role="cell" class="py-2.5">
                                    <p
                                        class="leading-[19px] font-bold text-ink"
                                    >
                                        {{ order.receiver_name }}
                                    </p>
                                    <p
                                        class="text-[12.5px] leading-[17px] text-muted-foreground"
                                    >
                                        {{ order.postcode }} {{ order.city }}
                                    </p>
                                </td>
                                <td
                                    role="cell"
                                    class="hidden py-2.5 @5xl:block"
                                >
                                    <template v-if="order.customer">
                                        <p
                                            class="leading-[19px] font-semibold text-ink"
                                        >
                                            {{ order.customer.name }}
                                        </p>
                                        <p
                                            class="max-w-56 truncate text-[12.5px] leading-[17px] text-muted-foreground"
                                        >
                                            {{ order.customer.email }}
                                        </p>
                                    </template>
                                </td>
                                <td
                                    role="cell"
                                    class="hidden py-2.5 text-[13px] leading-[17px] text-ink-2 @4xl:block"
                                >
                                    {{ order.branch?.name }}
                                </td>
                                <td role="cell" class="py-2.5">
                                    <StatusChip
                                        :status="order.status"
                                        size="sm"
                                    />
                                    <p
                                        v-if="statusDetail(order)"
                                        class="mt-1 text-xs leading-4 text-muted-foreground"
                                    >
                                        {{ statusDetail(order) }}
                                    </p>
                                </td>
                                <td role="cell" class="py-2.5">
                                    <Money
                                        :sen="
                                            order.final_price_sen ??
                                            order.estimated_price_sen
                                        "
                                        mono
                                        class="text-[13px] font-semibold text-ink"
                                    />
                                    <p
                                        v-if="order.final_price_sen === null"
                                        class="text-xs leading-4 text-muted-foreground"
                                    >
                                        estimate
                                    </p>
                                </td>
                                <td
                                    role="cell"
                                    class="py-2.5 text-[13px] whitespace-nowrap text-ink-2"
                                >
                                    <DateTime
                                        :value="order.created_at"
                                        format="shortDateTime"
                                    />
                                </td>
                            </tr>
                        </tbody>
                    </table>
                </div>

                <!-- Phones: the number's link covers its whole card
                     (stretched), so a tap anywhere opens the order. The
                     copy button stays on top of it. -->
                <ul class="divide-y divide-line-soft md:hidden">
                    <li
                        v-for="order in orders.data"
                        :key="order.id"
                        class="relative px-4 py-3.5 transition-colors hover:bg-surface/70 active:bg-surface/70"
                    >
                        <div class="flex items-start justify-between gap-3">
                            <TrackingNumber
                                :value="order.tracking_number"
                                :href="show(order.id)"
                                size="sm"
                                stretched
                            />
                            <StatusChip :status="order.status" size="sm" />
                        </div>
                        <p class="mt-2 text-sm leading-5 font-bold text-ink">
                            {{ order.receiver_name }}
                            <span class="font-medium text-muted-foreground">
                                · {{ order.postcode }} {{ order.city }}
                            </span>
                        </p>
                        <p class="mt-0.5 text-[13px] leading-5 text-ink-2">
                            {{ order.branch?.name }} ·
                            <Money
                                :sen="
                                    order.final_price_sen ??
                                    order.estimated_price_sen
                                "
                            />
                            <template v-if="order.final_price_sen === null">
                                (estimate)
                            </template>
                        </p>
                        <p
                            class="mt-0.5 text-xs leading-4 text-muted-foreground"
                        >
                            <template v-if="statusDetail(order)">
                                {{ statusDetail(order) }} ·
                            </template>
                            Created
                            <DateTime
                                :value="order.created_at"
                                format="shortDateTime"
                            />
                        </p>
                    </li>
                </ul>

                <div
                    v-if="orders.meta.last_page > 1"
                    class="border-t border-line px-4 py-3 md:px-5"
                >
                    <Pagination :meta="orders.meta" noun="orders" />
                </div>
            </template>

            <EmptyState
                v-else-if="filtered"
                bare
                as="h3"
                illustration="search"
                title="No orders match"
                description="Check the tracking number or the spelling of the name, or clear the filters to see every order."
            >
                <Button variant="outline" as-child class="h-11 px-5 font-bold">
                    <Link :href="index()">Clear filters</Link>
                </Button>
            </EmptyState>

            <EmptyState
                v-else
                bare
                as="h3"
                title="No orders yet"
                description="Orders appear here as soon as customers create them online."
            />
        </section>
    </div>
</template>
