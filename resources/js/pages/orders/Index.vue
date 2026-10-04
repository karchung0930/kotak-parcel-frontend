<script setup lang="ts">
import { Head, Link } from '@inertiajs/vue3';
import { ChevronRight, Package, PackagePlus } from '@lucide/vue';
import { computed } from 'vue';
import JourneyConveyor from '@/components/brand/JourneyConveyor.vue';
import DateTime from '@/components/DateTime.vue';
import EmptyState from '@/components/EmptyState.vue';
import Money from '@/components/Money.vue';
import PageHeader from '@/components/PageHeader.vue';
import Pagination from '@/components/Pagination.vue';
import SectionHeading from '@/components/SectionHeading.vue';
import StatusChip from '@/components/StatusChip.vue';
import TrackingNumber from '@/components/TrackingNumber.vue';
import { Button } from '@/components/ui/button';
import Weight from '@/components/Weight.vue';
import { formatDeliveryArea, formatShortDate, pluralize } from '@/lib/format';
import { pricing } from '@/routes';
import { create, index, show } from '@/routes/orders';
import type { OrderSummary, OrdersIndexPageProps } from '@/types';

/**
 * "My parcels": the customer's orders, newest first, 10 a page. Cards on
 * phones, a table from tablets up. With no orders yet, a designed empty
 * state and the "How it works" conveyor.
 */
const props = defineProps<OrdersIndexPageProps>();

const total = computed(() => props.orders.meta.total);

const description = computed(() =>
    total.value > 0
        ? `${pluralize(total.value, 'parcel')} sent with Kotak, newest first.`
        : 'Everything you send with Kotak shows up here, step by step.',
);

/** The branch's final price once weighed, otherwise the estimate. */
const price = (order: OrderSummary): number =>
    order.final_price_sen ?? order.estimated_price_sen;

const th = 'py-2.5 font-bold';
</script>

<template>
    <Head title="My parcels" />

    <PageHeader title="My parcels" :description="description">
        <template v-if="total > 0" #actions>
            <Button as-child class="h-12 px-5 text-[15px] font-bold">
                <Link :href="create()">
                    <PackagePlus aria-hidden="true" class="size-[18px]" />
                    Send a parcel
                </Link>
            </Button>
        </template>
    </PageHeader>

    <!-- A page past the end (e.g. an old link after parcels were removed). -->
    <EmptyState
        v-if="orders.data.length === 0 && total > 0"
        class="mt-6"
        illustration="search"
        title="Nothing on this page"
        description="This page of your parcels is empty. Your latest parcels are on the first page."
    >
        <Button as-child class="h-12 px-5 text-[15px] font-bold">
            <Link :href="index()">Go to my latest parcels</Link>
        </Button>
    </EmptyState>

    <template v-else-if="orders.data.length === 0">
        <EmptyState
            class="mt-6"
            title="No parcels yet"
            description="Create an order online, drop the parcel off at any Kotak branch and follow every step here, from the counter to the receiver's door."
        >
            <Button as-child class="h-12 px-5 text-[15px] font-bold">
                <Link :href="create()">
                    <PackagePlus aria-hidden="true" class="size-[18px]" />
                    Send your first parcel
                </Link>
            </Button>
            <Button
                as-child
                variant="outline"
                class="h-12 px-5 text-[15px] font-bold"
            >
                <Link :href="pricing()">See prices</Link>
            </Button>
        </EmptyState>

        <section
            aria-labelledby="how-title"
            class="mt-6 rounded-2xl border border-line bg-white px-4 py-8 sm:px-8 sm:py-10"
        >
            <SectionHeading
                id="how-title"
                eyebrow="How it works"
                :icon="Package"
                title="Four steps from your door to theirs."
                size="md"
            />
            <JourneyConveyor class="mt-8 sm:mt-10" />
        </section>
    </template>

    <template v-else>
        <!-- Phones: one card per parcel; the whole card opens it. -->
        <ul class="mt-6 space-y-3 md:hidden">
            <li
                v-for="order in orders.data"
                :key="order.id"
                class="relative rounded-2xl border border-line bg-white p-4 transition-colors hover:border-line-strong"
            >
                <!-- A long status ("Returned to Sender") goes under the
                     number on a 320px phone rather than past the card,
                     still on the right like every other card's. -->
                <div
                    class="flex flex-wrap items-start justify-between gap-x-3 gap-y-1.5"
                >
                    <Link
                        :href="show(order.id)"
                        class="text-[15px] leading-6 text-brand-strong after:absolute after:inset-0 after:rounded-2xl"
                    >
                        <TrackingNumber
                            :value="order.tracking_number"
                            size="inline"
                        />
                        <span class="sr-only">
                            , parcel to {{ order.receiver_name }}
                        </span>
                    </Link>
                    <StatusChip
                        :status="order.status"
                        size="sm"
                        class="ml-auto"
                    />
                </div>
                <p class="mt-2 text-base leading-[22px] font-bold text-ink">
                    {{ order.receiver_name }}
                </p>
                <p class="text-sm leading-5 text-muted-foreground">
                    {{ formatDeliveryArea(order.city, order.postcode) }} ·
                    {{ order.item_name }}
                </p>
                <p
                    v-if="order.drop_off_deadline"
                    class="mt-1 text-[13px] leading-5 font-semibold text-brand-strong"
                >
                    Drop off by {{ formatShortDate(order.drop_off_deadline) }}
                </p>
                <div
                    class="mt-3 flex items-center justify-between gap-3 border-t border-line-soft pt-3 text-[13px] leading-5 text-ink-2"
                >
                    <span>
                        <DateTime :value="order.created_at" format="date" />
                        ·
                        <Weight :grams="order.chargeable_weight_g" />
                    </span>
                    <span class="flex items-center gap-1 font-bold text-ink">
                        <span
                            v-if="order.final_price_sen === null"
                            class="font-semibold text-muted-foreground"
                        >
                            Est.
                        </span>
                        <Money :sen="price(order)" />
                        <ChevronRight
                            aria-hidden="true"
                            class="size-4 text-subtle"
                        />
                    </span>
                </div>
            </li>
        </ul>

        <!-- Tablets and desktops: a table (.data-table in app.css). Item and
             Ordered join from 1024px, so the columns go from 5 to 7 there;
             below that the date sits under the tracking number. As on the
             phone cards, the whole row opens the parcel: the number's link
             is stretched over its row (the positioned box). -->
        <div
            class="mt-6 hidden overflow-hidden rounded-2xl border border-line bg-white md:block"
        >
            <table
                role="table"
                class="data-table text-[13.5px] leading-5 [--columns:5] lg:[--columns:7]"
            >
                <caption class="sr-only">
                    Your parcels, newest first
                </caption>
                <thead
                    role="rowgroup"
                    class="data-table__head border-b border-line bg-surface/70 text-[12.5px] text-muted-foreground"
                >
                    <tr role="row" class="data-table__row">
                        <th scope="col" role="columnheader" :class="th">
                            Tracking no.
                        </th>
                        <th scope="col" role="columnheader" :class="th">
                            Receiver
                        </th>
                        <th
                            scope="col"
                            role="columnheader"
                            :class="[th, 'hidden lg:block']"
                        >
                            Item
                        </th>
                        <th scope="col" role="columnheader" :class="th">
                            Chargeable
                        </th>
                        <th scope="col" role="columnheader" :class="th">
                            Price
                        </th>
                        <th scope="col" role="columnheader" :class="th">
                            Status
                        </th>
                        <th
                            scope="col"
                            role="columnheader"
                            :class="[th, 'hidden lg:block']"
                        >
                            Ordered
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
                        class="data-table__row relative transition-colors hover:bg-surface/60"
                    >
                        <td role="cell" class="py-3">
                            <!-- Copy button first, so the buttons form one
                                 column and the numbers all start at one x.
                                 Below 1024px its line is 20px tall, like the
                                 receiver's name (the 28px button overhangs
                                 it), so the date lines up with the city. -->
                            <TrackingNumber
                                :value="order.tracking_number"
                                size="sm"
                                :href="show(order.id)"
                                copy-first
                                stretched
                                class="max-lg:-my-1"
                            />
                            <p
                                class="pl-9 text-[12.5px] leading-[17px] text-muted-foreground lg:hidden"
                            >
                                <span class="sr-only">Ordered </span>
                                <DateTime
                                    :value="order.created_at"
                                    format="date"
                                />
                            </p>
                        </td>
                        <td role="cell" class="py-3">
                            <p class="font-bold text-ink">
                                {{ order.receiver_name }}
                            </p>
                            <p
                                class="text-[12.5px] leading-[17px] text-muted-foreground"
                            >
                                {{
                                    formatDeliveryArea(
                                        order.city,
                                        order.postcode,
                                    )
                                }}
                            </p>
                        </td>
                        <td
                            role="cell"
                            class="hidden max-w-[220px] py-3 text-ink-2 lg:block"
                        >
                            <span class="line-clamp-2">{{
                                order.item_name
                            }}</span>
                        </td>
                        <td role="cell" class="py-3 font-bold text-ink">
                            <Weight :grams="order.chargeable_weight_g" />
                        </td>
                        <td role="cell" class="py-3">
                            <Money
                                :sen="price(order)"
                                class="font-bold text-ink"
                            />
                            <span
                                v-if="order.final_price_sen === null"
                                class="block text-xs leading-4 text-muted-foreground"
                            >
                                Estimate
                            </span>
                        </td>
                        <td role="cell" class="py-3">
                            <StatusChip :status="order.status" size="sm" />
                            <span
                                v-if="order.drop_off_deadline"
                                class="mt-1 block text-xs leading-4 font-semibold text-brand-strong"
                            >
                                Drop off by
                                {{ formatShortDate(order.drop_off_deadline) }}
                            </span>
                        </td>
                        <td role="cell" class="hidden py-3 text-ink-2 lg:block">
                            <DateTime :value="order.created_at" format="date" />
                        </td>
                    </tr>
                </tbody>
            </table>
        </div>

        <Pagination class="mt-6" :meta="orders.meta" noun="parcels" />
    </template>
</template>
