<script setup lang="ts">
import { House } from '@lucide/vue';
import { computed } from 'vue';
import { formatShortDate, formatTime } from '@/lib/format';
import { statusMeta } from '@/lib/status';
import type { Option, OrderStatusValue, RoleValue } from '@/types';

/**
 * A parcel's status history, newest first, with Kuala Lumpur times.
 * Accepts StatusEvent[] (orders) and TrackingEvent[] (public tracking) as
 * the server sends them, oldest first.
 *
 * `pending` adds a dashed "not yet" step on top, e.g. { title: 'Delivered',
 * description: 'Expected on Wed, 30 Sep 2026.', date: order.scheduled_for }.
 *
 * On phones there is no time column: the time sits under each title, so the
 * text gets the width. The pending step's description already says when.
 */
export type TimelineEvent = {
    status: Option<OrderStatusValue>;
    description: string;
    created_at: string;
    note?: string | null;
    city?: string | null;
    branch?: { name: string } | null;
    actor?: { name: string; role?: Option<RoleValue> } | null;
};

const props = withDefaults(
    defineProps<{
        events: readonly TimelineEvent[];
        pending?: {
            title: string;
            description?: string | null;
            date?: string | null;
        } | null;
    }>(),
    { pending: null },
);

const items = computed(() =>
    [...props.events].reverse().map((event, index) => ({
        ...event,
        meta: statusMeta(event.status),
        latest: index === 0,
        place: event.branch?.name ?? event.city ?? null,
    })),
);
</script>

<template>
    <ol class="list-none">
        <li
            v-if="pending"
            class="grid grid-cols-[32px_minmax(0,1fr)] gap-x-3 sm:grid-cols-[84px_40px_minmax(0,1fr)] sm:gap-x-3.5"
        >
            <div class="hidden pt-1.5 text-right sm:block">
                <p
                    class="text-[13px] leading-5 font-bold text-muted-foreground"
                >
                    Expected
                </p>
                <p
                    v-if="pending.date"
                    class="text-xs leading-4 text-muted-foreground"
                >
                    {{ formatShortDate(pending.date) }}
                </p>
            </div>
            <div class="relative flex justify-center">
                <span
                    class="relative z-10 flex size-8 items-center justify-center rounded-full border-2 border-dashed border-status-returned-edge bg-white text-subtle"
                >
                    <House
                        aria-hidden="true"
                        class="size-4"
                        :stroke-width="2.2"
                    />
                </span>
                <span
                    aria-hidden="true"
                    class="absolute top-[34px] bottom-0.5 border-l-2 border-dashed border-line-strong"
                />
            </div>
            <div class="pb-6">
                <p class="text-base leading-[22px] font-bold text-ink-2">
                    {{ pending.title }}
                    <span class="sr-only">(not yet)</span>
                </p>
                <p
                    v-if="pending.description"
                    class="mt-0.5 text-sm leading-5 text-pretty text-muted-foreground sm:text-balance lg:max-xl:text-pretty"
                >
                    {{ pending.description }}
                </p>
            </div>
        </li>

        <li
            v-for="(item, index) in items"
            :key="`${item.status.value}-${item.created_at}-${index}`"
            class="grid grid-cols-[32px_minmax(0,1fr)] gap-x-3 sm:grid-cols-[84px_40px_minmax(0,1fr)] sm:gap-x-3.5"
        >
            <div class="hidden pt-1.5 text-right sm:block">
                <time :datetime="item.created_at" class="block">
                    <span
                        class="block font-mono text-sm leading-5 font-bold text-ink"
                    >
                        {{ formatTime(item.created_at) }}
                    </span>
                    <span class="block text-xs leading-4 text-muted-foreground">
                        {{ formatShortDate(item.created_at) }}
                    </span>
                </time>
            </div>
            <div class="relative flex justify-center">
                <span
                    :class="[
                        'relative z-10 flex size-8 items-center justify-center rounded-full',
                        item.latest
                            ? 'bg-brand text-white ring-4 ring-brand-tint'
                            : 'border-2 border-brand bg-white text-brand',
                    ]"
                >
                    <component
                        :is="item.meta.icon"
                        aria-hidden="true"
                        class="size-4"
                        :stroke-width="2.2"
                    />
                </span>
                <span
                    v-if="index < items.length - 1"
                    aria-hidden="true"
                    class="absolute top-[34px] bottom-0.5 w-0.5 bg-brand"
                />
            </div>
            <div :class="index < items.length - 1 ? 'pb-6' : 'pb-1'">
                <p class="flex flex-wrap items-center gap-x-2.5 gap-y-1">
                    <span
                        :class="[
                            'text-base leading-[22px]',
                            item.latest
                                ? 'font-extrabold text-brand-strong'
                                : 'font-bold text-ink',
                        ]"
                    >
                        {{ item.meta.label }}
                    </span>
                    <span
                        v-if="item.latest"
                        class="rounded-[4px] bg-brand-tint px-1.5 text-xs leading-5 font-bold text-brand-strong"
                    >
                        Latest
                    </span>
                </p>
                <!-- Phones: the time column's time and date, under the
                     title. Only one of the two is ever displayed. -->
                <time
                    :datetime="item.created_at"
                    class="mt-0.5 block text-[13px] leading-5 text-muted-foreground sm:hidden"
                >
                    <span class="font-mono font-bold text-ink">{{
                        formatTime(item.created_at)
                    }}</span>
                    · {{ formatShortDate(item.created_at) }}
                </time>
                <p
                    class="mt-0.5 text-sm leading-5 text-pretty text-muted-foreground sm:text-balance lg:max-xl:text-pretty"
                >
                    {{ item.description }}
                </p>
                <p
                    v-if="item.place || item.actor"
                    class="mt-1 text-[13px] leading-5 text-ink-2"
                >
                    <span v-if="item.place">{{ item.place }}</span>
                    <span v-if="item.place && item.actor" aria-hidden="true">
                        ·
                    </span>
                    <!-- keeps "by <name>" on one line when this wraps -->
                    <span v-if="item.actor" class="inline-block">
                        by {{ item.actor.name }}
                    </span>
                </p>
                <p
                    v-if="item.note"
                    class="mt-2 rounded-lg bg-surface px-3 py-2 text-[13px] leading-5 text-balance text-ink-2 sm:text-pretty"
                >
                    {{ item.note }}
                </p>
            </div>
        </li>
    </ol>
</template>
