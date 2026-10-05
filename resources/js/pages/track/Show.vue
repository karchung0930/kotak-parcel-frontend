<script setup lang="ts">
import { Head, Link, router, usePage } from '@inertiajs/vue3';
import {
    ArrowRight,
    Info,
    Lock,
    Mail,
    Package,
    Receipt,
    Store,
} from '@lucide/vue';
import { computed, useTemplateRef } from 'vue';
import BranchName from '@/components/BranchName.vue';
import DeliveryScene from '@/components/brand/DeliveryScene.vue';
import EmptyParcel from '@/components/brand/EmptyParcel.vue';
import JourneyConveyor from '@/components/brand/JourneyConveyor.vue';
import ParcelBox from '@/components/brand/ParcelBox.vue';
import DescriptionItem from '@/components/DescriptionItem.vue';
import DescriptionList from '@/components/DescriptionList.vue';
import PublicPageBand from '@/components/public/PublicPageBand.vue';
import StatusChip from '@/components/StatusChip.vue';
import StopCount from '@/components/StopCount.vue';
import TextLink from '@/components/TextLink.vue';
import Timeline from '@/components/Timeline.vue';
import TrackingNumber from '@/components/TrackingNumber.vue';
import TrackingSearch from '@/components/TrackingSearch.vue';
import { Button } from '@/components/ui/button';
import { useDeliveryProgress } from '@/composables/useDeliveryProgress';
import { useFitsViewport } from '@/composables/useFitsViewport';
import {
    formatDate,
    formatDateTime,
    formatDeliveryArea,
    formatTrackingNumber,
    formatWeekdayDate,
    formatWeight,
    normalizeTrackingNumber,
} from '@/lib/format';
import { journeyTimes } from '@/lib/journey';
import { canSendParcels } from '@/lib/navigation';
import { home, login, track } from '@/routes';
import { index as branchesIndex } from '@/routes/branches';
import { index as myOrders, create as createOrder } from '@/routes/orders';
import { counter } from '@/routes/staff';
import type { OrderStatusValue, TrackShowPageProps, User } from '@/types';

const props = defineProps<TrackShowPageProps>();

const page = usePage();
const user = computed(() => page.props.auth.user as User | null);

const breadcrumbs = [
    { title: 'Home', href: home() },
    { title: 'Track', href: track() },
];

/** The big line on the status card, in plain words. */
const HEADLINES: Record<OrderStatusValue, string> = {
    created: 'Waiting for drop-off',
    dropped_off: 'Received at the branch',
    paid: 'Waiting for a delivery date',
    assigned: 'Scheduled for delivery',
    picked_up: 'Out for delivery',
    delivered: 'Delivered',
    delivery_failed: 'Delivery attempt failed',
    returned_to_sender: 'Returned to the sender',
    cancelled: 'Order cancelled',
};

const displayNumber = computed(() =>
    props.result ? formatTrackingNumber(props.result.tracking_number) : '',
);

const headline = computed(() =>
    props.result ? HEADLINES[props.result.status.value] : '',
);

/*
 * Out for delivery: how many stops before this parcel, kept up to date
 * over Reverb on the parcel's public channel. A new status fetches the
 * result again, so the whole page moves on with it.
 */
const { progress, asOf: progressAsOf } = useDeliveryProgress({
    channel: () =>
        props.result?.live_channel
            ? { name: props.result.live_channel, private: false }
            : null,
    status: () => props.result?.status.value ?? 'created',
    progress: () => props.result?.progress ?? null,
    reload: (callbacks) => router.reload({ only: ['result'], ...callbacks }),
});

const lastUpdate = computed(() => {
    const events = props.result?.events ?? [];

    return events.length > 0
        ? events[events.length - 1].created_at
        : (props.result?.created_at ?? null);
});

/**
 * The delivery date still to come. After a failed attempt the old date
 * has passed and a new one is not set yet, so there is none.
 */
const expectedDelivery = computed(() => {
    const result = props.result;

    if (
        !result ||
        result.is_final ||
        result.status.value === 'delivery_failed'
    ) {
        return null;
    }

    return result.expected_delivery;
});

/** The first detail on the status card: when it arrives (or arrived). */
const arrival = computed(() => {
    const result = props.result;

    if (!result) {
        return null;
    }

    if (result.status.value === 'delivered') {
        return {
            label: 'Delivered',
            value: formatDateTime(result.delivered_at ?? lastUpdate.value),
        };
    }

    if (result.is_final) {
        return null;
    }

    if (result.status.value === 'delivery_failed') {
        return { label: 'Next delivery', value: 'To be rescheduled' };
    }

    return {
        label: 'Estimated delivery',
        value: expectedDelivery.value
            ? formatWeekdayDate(expectedDelivery.value)
            : 'Not scheduled yet',
    };
});

/** The dashed "not yet" step on top of the history. */
const pending = computed(() => {
    const result = props.result;

    if (!result || result.is_final) {
        return null;
    }

    const status = result.status.value;
    let description: string;

    if (status === 'delivery_failed') {
        description =
            'Not yet. Our team will arrange another attempt or return it to the sender.';
    } else if (expectedDelivery.value) {
        description = `Not yet. Expected on ${formatWeekdayDate(expectedDelivery.value)}.`;
    } else if (status === 'created') {
        description =
            'Not yet. The delivery date is set after the parcel is dropped off and paid for.';
    } else {
        description =
            'Not yet. The delivery date is set once a driver is scheduled.';
    }

    return {
        title: 'Delivered',
        description,
        date: expectedDelivery.value,
    };
});

const signInLink = computed(() => {
    const role = user.value?.role.value;

    if (!user.value) {
        return { href: login(), text: 'Sender? Log in for full details' };
    }

    if (role === 'customer') {
        return { href: myOrders(), text: 'See your parcels' };
    }

    if ((role === 'staff' || role === 'admin') && props.result) {
        return {
            href: counter({ query: { number: displayNumber.value } }),
            text: 'Open at the counter',
        };
    }

    return null;
});

const queryLooksValid = computed(
    () => normalizeTrackingNumber(props.query) !== null,
);

const pageTitle = computed(() => {
    if (props.result) {
        return `${displayNumber.value}: ${headline.value}`;
    }

    return props.query ? 'Parcel not found' : 'Track a parcel';
});

/** Read out after a new search on this page (titles change silently). */
const liveSummary = computed(() => {
    if (props.result) {
        return `${displayNumber.value}: ${headline.value}.`;
    }

    return props.query ? `No parcel found for ${props.query}.` : '';
});

const whereToFind = [
    {
        icon: Mail,
        title: 'Your order confirmation',
        text: 'Shown as soon as you create an order online.',
    },
    {
        icon: Receipt,
        title: 'Your drop-off receipt',
        text: 'Printed at the branch counter when you pay.',
    },
    {
        icon: Package,
        title: 'My parcels',
        text: 'Every order you send is listed in your account.',
    },
];

/*
 * On desktops, whichever card is shorter (history or details) sticks 24px
 * under the site header while the other one scrolls, so neither side is
 * left blank. 24px is the gap between the cards (mt-6 and gap-6), so
 * lg:top-[101px] is the header's 77px (with its border) plus 24px. Each
 * sticks only while it fits on screen with 24px free under it too, and
 * it stops at the end of the other card.
 */
const historyCard = useTemplateRef<HTMLElement>('historyCard');
const historyFits = useFitsViewport(historyCard, 24);
const detailsCard = useTemplateRef<HTMLElement>('detailsCard');
const detailsFits = useFitsViewport(detailsCard, 24);
</script>

<template>
    <Head :title="pageTitle">
        <meta
            head-key="description"
            name="description"
            content="Track a Kotak parcel with its KT- tracking number. See where it is, every scan so far and when it is expected. No sign-in needed."
        />
    </Head>

    <PublicPageBand
        title="Track a parcel"
        description="Anyone with the tracking number can see its progress. No sign-in needed."
        :breadcrumbs="breadcrumbs"
    >
        <TrackingSearch
            :key="query ?? ''"
            :label="
                result || query ? 'Track another parcel' : 'Tracking number'
            "
            :default-value="query"
            :autofocus="!query"
        />
    </PublicPageBand>

    <p class="sr-only" role="status" aria-live="polite">{{ liveSummary }}</p>

    <div class="container-page pt-12 pb-16 sm:pt-14 sm:pb-20">
        <!-- Found: status, progress, history and details -->
        <template v-if="result">
            <!-- Below 1024px the three cards stack, so they share one
                 padding (sm:p-7) and their text starts on one edge. -->
            <section
                aria-labelledby="status-title"
                class="rounded-2xl border border-line bg-white p-5 shadow-card sm:p-7 lg:p-8"
            >
                <!-- The picture joins the text from 768px: 240px wide there
                     (the details go two by two), 280px at 1024px, so the
                     three details beside it still fit on one line each. -->
                <div
                    class="grid gap-8 md:grid-cols-[minmax(0,1fr)_240px] lg:grid-cols-[minmax(0,1fr)_280px] lg:gap-10 xl:grid-cols-[minmax(0,1fr)_400px]"
                >
                    <div class="min-w-0">
                        <p
                            class="text-[13px] leading-[18px] font-semibold text-muted-foreground"
                        >
                            Tracking number
                        </p>
                        <TrackingNumber
                            :value="result.tracking_number"
                            size="lg"
                            class="mt-1"
                        />
                        <div
                            class="mt-4 flex flex-wrap items-center gap-x-3 gap-y-2"
                        >
                            <StatusChip :status="result.status" />
                            <p
                                v-if="lastUpdate"
                                class="text-[13px] leading-[18px] text-muted-foreground"
                            >
                                Last update {{ formatDateTime(lastUpdate) }}
                            </p>
                        </div>
                        <h2
                            id="status-title"
                            class="mt-3 text-[34px] leading-10 font-extrabold tracking-display text-ink sm:text-[44px] sm:leading-[50px] xl:text-[52px] xl:leading-[58px]"
                        >
                            {{ headline }}
                        </h2>
                        <p
                            class="mt-2 max-w-xl text-[15px] leading-6 text-ink-2"
                        >
                            {{ result.description }}
                        </p>
                        <StopCount :progress="progress" :as-of="progressAsOf" />

                        <!-- Two by two at 768px, one row from 1024px. In the
                             row each column is as wide as its text plus an
                             equal share of the spare room, so a long value
                             is not squeezed onto two lines. -->
                        <dl
                            class="mt-5 grid gap-4 md:grid-cols-2 md:gap-x-6 lg:grid-flow-col lg:grid-cols-none lg:gap-0 lg:divide-x lg:divide-line"
                        >
                            <div
                                v-if="arrival"
                                class="min-w-0 lg:px-5 lg:first:pl-0 xl:px-7"
                            >
                                <dt
                                    class="text-[12.5px] leading-[18px] font-semibold text-muted-foreground"
                                >
                                    {{ arrival.label }}
                                </dt>
                                <dd
                                    class="text-[17px] leading-6 font-bold text-ink"
                                >
                                    {{ arrival.value }}
                                </dd>
                            </div>
                            <div class="min-w-0 lg:px-5 lg:first:pl-0 xl:px-7">
                                <dt
                                    class="text-[12.5px] leading-[18px] font-semibold text-muted-foreground"
                                >
                                    Destination
                                </dt>
                                <dd
                                    class="text-[17px] leading-6 font-bold wrap-anywhere text-ink"
                                >
                                    {{
                                        formatDeliveryArea(
                                            result.destination.city,
                                            result.destination.postcode,
                                        )
                                    }}
                                </dd>
                            </div>
                            <div class="min-w-0 lg:px-5 lg:last:pr-0 xl:px-7">
                                <dt
                                    class="text-[12.5px] leading-[18px] font-semibold text-muted-foreground"
                                >
                                    Weight
                                </dt>
                                <dd
                                    class="text-[17px] leading-6 font-bold text-ink"
                                >
                                    {{
                                        formatWeight(result.chargeable_weight_g)
                                    }}
                                    chargeable
                                </dd>
                            </div>
                        </dl>
                    </div>

                    <div
                        class="flex items-center justify-center overflow-hidden rounded-[14px] bg-surface md:max-lg:self-center"
                    >
                        <EmptyParcel
                            v-if="result.status.value === 'cancelled'"
                            class="w-40 py-10"
                        />
                        <DeliveryScene
                            v-else
                            :arrived="result.status.value === 'delivered'"
                            class="w-full"
                        />
                    </div>
                </div>

                <div
                    class="mt-8 border-t border-line-soft pt-6 sm:mt-10 sm:pt-8"
                >
                    <h3 class="sr-only">Delivery progress</h3>
                    <JourneyConveyor
                        :status="result.status.value"
                        compact
                        :times="journeyTimes(result.events)"
                        :expected-delivery="expectedDelivery"
                    />
                </div>
            </section>

            <!-- Each card's grid area runs the row's full height, so the shorter card has room to stick -->
            <div
                class="mt-6 grid items-start gap-6 lg:grid-cols-[minmax(0,1fr)_400px]"
            >
                <section
                    ref="historyCard"
                    aria-labelledby="history-title"
                    class="rounded-2xl border border-line bg-white p-5 sm:p-7 lg:top-[101px]"
                    :class="historyFits && 'lg:sticky'"
                >
                    <div
                        class="flex flex-wrap items-baseline justify-between gap-x-4 gap-y-1"
                    >
                        <h2
                            id="history-title"
                            class="text-xl leading-7 font-extrabold tracking-heading text-ink"
                        >
                            Parcel history
                        </h2>
                        <p
                            class="text-[13px] leading-[18px] text-muted-foreground"
                        >
                            Malaysia time (GMT+8)
                        </p>
                    </div>
                    <Timeline
                        class="mt-6"
                        :events="result.events"
                        :pending="pending"
                    />
                    <div
                        class="mt-5 flex gap-3 border-t border-line pt-5 text-[13.5px] leading-5 text-ink-2"
                    >
                        <Info
                            aria-hidden="true"
                            class="mt-px size-[18px] flex-none text-brand"
                        />
                        <p>
                            Not home? The driver records the attempt and we
                            deliver again on another day. After
                            {{ page.props.maxFailedAttempts }} failed attempts
                            the parcel is returned to the sender.
                        </p>
                    </div>
                </section>

                <!-- At 768-1023px the card runs full width, so the facts and
                     the privacy note sit side by side instead of each label
                     being far from its value. -->
                <aside
                    ref="detailsCard"
                    aria-labelledby="details-title"
                    class="rounded-2xl border border-line bg-white p-5 sm:p-7 md:max-lg:grid md:max-lg:grid-cols-2 md:max-lg:items-start md:max-lg:gap-x-8 lg:top-[101px] lg:p-6"
                    :class="detailsFits && 'lg:sticky'"
                >
                    <h2
                        id="details-title"
                        class="text-xl leading-7 font-extrabold tracking-heading text-ink md:max-lg:col-span-2 lg:text-lg lg:leading-[26px]"
                    >
                        Parcel details
                    </h2>
                    <DescriptionList class="mt-2">
                        <DescriptionItem label="Chargeable weight">
                            {{ formatWeight(result.chargeable_weight_g) }}
                        </DescriptionItem>
                        <DescriptionItem label="Drop-off branch">
                            <BranchName :name="result.branch.name" />
                        </DescriptionItem>
                        <DescriptionItem label="Destination">
                            {{
                                formatDeliveryArea(
                                    result.destination.city,
                                    result.destination.postcode,
                                )
                            }}
                        </DescriptionItem>
                        <DescriptionItem label="Ordered">
                            {{ formatDate(result.created_at) }}
                        </DescriptionItem>
                        <DescriptionItem
                            v-if="result.delivered_at"
                            label="Delivered"
                        >
                            {{ formatDateTime(result.delivered_at) }}
                        </DescriptionItem>
                    </DescriptionList>

                    <div class="md:max-lg:mt-3">
                        <div
                            class="mt-4 flex gap-3 rounded-xl bg-surface px-4 py-3.5 md:max-lg:mt-0"
                        >
                            <span
                                class="flex size-8 flex-none items-center justify-center rounded-lg bg-white text-ink"
                            >
                                <Lock aria-hidden="true" class="size-[17px]" />
                            </span>
                            <div>
                                <p class="text-sm leading-5 font-bold text-ink">
                                    Kept private
                                </p>
                                <p
                                    class="mt-0.5 text-[13px] leading-5 text-pretty text-muted-foreground"
                                >
                                    This public page shows the destination area
                                    only. Names, phone numbers and street
                                    addresses are never shown here.
                                </p>
                            </div>
                        </div>

                        <Button
                            v-if="signInLink"
                            as-child
                            variant="outline"
                            class="mt-3.5 h-11 w-full text-sm font-bold"
                        >
                            <Link :href="signInLink.href">
                                {{ signInLink.text }}
                                <ArrowRight aria-hidden="true" />
                            </Link>
                        </Button>
                    </div>
                </aside>
            </div>
        </template>

        <!-- Searched, nothing matched -->
        <section v-else-if="query" aria-labelledby="not-found-title">
            <div
                class="rounded-2xl border border-line bg-white px-5 py-10 text-center shadow-card sm:px-10 sm:py-14"
            >
                <EmptyParcel variant="search" class="mx-auto w-36 sm:w-44" />
                <h2
                    id="not-found-title"
                    class="mx-auto mt-5 max-w-xl text-2xl leading-8 font-extrabold tracking-heading text-ink sm:text-[28px] sm:leading-9"
                >
                    We could not find that parcel
                </h2>
                <p class="mt-2 text-[15px] leading-6 text-ink-2">
                    No parcel matches
                    <TrackingNumber
                        :value="query"
                        size="inline"
                        class="text-ink"
                    />.
                </p>
                <p
                    class="mx-auto mt-3 max-w-lg text-sm leading-[22px] text-muted-foreground"
                >
                    <template v-if="queryLooksValid">
                        Check each character against your order confirmation or
                        drop-off receipt. A new order can be tracked as soon as
                        it is created.
                    </template>
                    <template v-else>
                        Kotak tracking numbers start with KT- followed by 8
                        letters and numbers, for example KT-7Q4M92XD.
                    </template>
                </p>
                <div
                    class="mt-7 flex flex-col items-stretch justify-center gap-2.5 sm:flex-row sm:items-center"
                >
                    <Button
                        as-child
                        variant="outline"
                        class="h-12 px-5 text-[15px] font-bold"
                    >
                        <Link :href="branchesIndex()">
                            <Store aria-hidden="true" />
                            Contact a branch
                        </Link>
                    </Button>
                    <Button
                        v-if="canSendParcels(user)"
                        as-child
                        variant="outline"
                        class="h-12 px-5 text-[15px] font-bold"
                    >
                        <Link :href="createOrder()">
                            <Package aria-hidden="true" />
                            Send a parcel
                        </Link>
                    </Button>
                </div>
            </div>
        </section>

        <!-- No search yet -->
        <template v-else>
            <!-- The box picture joins from 1280px: at 1024px it would
                 squeeze the three places into narrow three-line cards. -->
            <section
                id="where-to-find"
                aria-labelledby="where-title"
                class="grid items-center gap-8 rounded-2xl border border-line bg-white p-5 sm:p-8 xl:grid-cols-[minmax(0,1fr)_320px] xl:gap-12"
            >
                <div>
                    <h2
                        id="where-title"
                        class="text-2xl leading-8 font-extrabold tracking-heading text-ink sm:text-[26px]"
                    >
                        Where is my tracking number?
                    </h2>
                    <p
                        class="mt-2 text-[15px] leading-6 text-pretty text-muted-foreground"
                    >
                        It starts with KT- followed by 8 letters and numbers,
                        such as KT-7Q4M92XD. You will find it in three places.
                    </p>
                    <!-- Phones: the icon beside the text, so each place
                         takes a short row -->
                    <ul class="mt-6 grid gap-4 sm:grid-cols-3">
                        <li
                            v-for="place in whereToFind"
                            :key="place.title"
                            class="flex items-start gap-3 rounded-xl bg-surface p-4 sm:block"
                        >
                            <span
                                class="flex size-10 flex-none items-center justify-center rounded-lg bg-white text-brand"
                            >
                                <component
                                    :is="place.icon"
                                    aria-hidden="true"
                                    class="size-5"
                                />
                            </span>
                            <div class="min-w-0">
                                <h3
                                    class="mt-0.5 text-[15px] leading-5 font-bold text-ink sm:mt-3"
                                >
                                    {{ place.title }}
                                </h3>
                                <p
                                    class="mt-1 text-[13.5px] leading-5 text-pretty text-muted-foreground"
                                >
                                    {{ place.text }}
                                </p>
                            </div>
                        </li>
                    </ul>
                    <p
                        v-if="user?.role.value === 'customer'"
                        class="mt-5 text-sm text-ink-2"
                    >
                        <TextLink :href="myOrders()">Open My parcels</TextLink>
                        to see every order with its tracking number.
                    </p>
                </div>
                <ParcelBox class="mx-auto hidden w-full max-w-80 xl:block" />
            </section>

            <section aria-labelledby="journey-title" class="mt-14 sm:mt-16">
                <h2
                    id="journey-title"
                    class="text-2xl leading-8 font-extrabold tracking-heading text-ink sm:text-[26px]"
                >
                    How your parcel travels
                </h2>
                <p
                    class="mt-2 max-w-2xl text-[15px] leading-6 text-muted-foreground"
                >
                    Each step is recorded as it happens, so the tracking page
                    always shows the latest scan.
                </p>
                <JourneyConveyor class="mt-8" />
            </section>
        </template>
    </div>
</template>
