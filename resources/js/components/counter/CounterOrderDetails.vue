<script setup lang="ts">
import { Camera, ExternalLink, Phone } from '@lucide/vue';
import { computed, useTemplateRef } from 'vue';
import DateTime from '@/components/DateTime.vue';
import DescriptionItem from '@/components/DescriptionItem.vue';
import DescriptionList from '@/components/DescriptionList.vue';
import Money from '@/components/Money.vue';
import PlateBadge from '@/components/PlateBadge.vue';
import { Button } from '@/components/ui/button';
import Weight from '@/components/Weight.vue';
import { useFitsViewport } from '@/composables/useFitsViewport';
import { formatDimensions, formatPhone, telHref } from '@/lib/format';
import type { Order } from '@/types';

/**
 * The facts column of a parcel at the counter: the parcel itself, who sent
 * it and where it goes, and (once dispatched) its delivery.
 */
const props = defineProps<{
    order: Order;
}>();

const address = computed(() =>
    [
        props.order.address_line1,
        props.order.address_line2,
        `${props.order.postcode} ${props.order.city}`,
        props.order.state,
    ].filter((line): line is string => Boolean(line)),
);

const attempt = computed(() => props.order.latest_attempt ?? null);

const showDelivery = computed(
    () =>
        Boolean(props.order.driver) ||
        Boolean(props.order.scheduled_for) ||
        attempt.value !== null,
);

/*
 * On desktops the page stretches this column to the end of its grid, so
 * next to a longer history the cards after the parcel card can stick 24px
 * under the console's top bar while the parcel card scrolls away: the same
 * gap as between the cards (lg:gap-6), so xl:top-[88px] is the top bar's
 * 64px plus 24px. What sticks must fit on screen with 24px free under it
 * too, so its end is never out of reach:
 *
 * - The sender and receiver card, and the delivery card once there is
 *   one, stick together when they fit: their wrapper sticks.
 * - On a shorter screen only the delivery card sticks. The wrapper then
 *   runs to the end of the column to give it room to move, so it cannot
 *   measure the two cards itself; an invisible box under them does.
 */
const lastCardsSize = useTemplateRef<HTMLElement>('lastCardsSize');
const lastCardsFit = useFitsViewport(lastCardsSize, 24);

const deliveryCard = useTemplateRef<HTMLElement>('deliveryCard');
const deliveryFits = useFitsViewport(deliveryCard, 24);

const cardClass = 'rounded-xl border border-line bg-white px-4 py-4 sm:px-5';
const headingClass =
    'text-[17px] leading-6 font-extrabold tracking-heading text-ink';

// On touch screens the number is a 44px target, without moving anything
// (tap-target in app.css).
const phoneClass =
    'tap-target relative mt-0.5 inline-flex items-center gap-1.5 text-sm leading-5 font-semibold text-brand-strong hover:text-brand-deep hover:underline';
</script>

<template>
    <!-- Desktops: one column, the parcel card and then the wrapper, which
         may run to the end of the column -->
    <div
        class="grid content-start gap-5 md:grid-cols-2 lg:gap-6 xl:grid-cols-1 xl:grid-rows-[auto_1fr]"
    >
        <!-- self-start: on tablets the card beside it may be taller, and a
             stretched card would show empty white space inside -->
        <section
            aria-labelledby="parcel-title"
            :class="[cardClass, 'self-start']"
        >
            <h2 id="parcel-title" :class="headingClass">Parcel</h2>
            <DescriptionList class="mt-1">
                <DescriptionItem label="What's inside">
                    {{ order.item_name }}
                </DescriptionItem>
                <DescriptionItem label="Declared weight">
                    <Weight :grams="order.declared_weight_g" />
                </DescriptionItem>
                <DescriptionItem label="Measured weight">
                    <Weight
                        v-if="order.measured_weight_g"
                        :grams="order.measured_weight_g"
                    />
                    <span v-else class="font-semibold text-muted-foreground">
                        Not weighed yet
                    </span>
                </DescriptionItem>
                <DescriptionItem label="Box size">
                    {{
                        formatDimensions(
                            order.length_cm,
                            order.width_cm,
                            order.height_cm,
                        )
                    }}
                </DescriptionItem>
                <DescriptionItem label="Chargeable weight">
                    <Weight :grams="order.chargeable_weight_g" />
                </DescriptionItem>
                <DescriptionItem label="Online estimate">
                    <Money :sen="order.estimated_price_sen" />
                </DescriptionItem>
                <DescriptionItem label="Final price">
                    <Money
                        v-if="order.final_price_sen !== null"
                        :sen="order.final_price_sen"
                        class="text-brand-strong"
                    />
                    <span v-else class="font-semibold text-muted-foreground">
                        Set when weighed
                    </span>
                </DescriptionItem>
                <DescriptionItem
                    v-if="order.final_rate_card ?? order.estimated_rate_card"
                    label="Priced with"
                >
                    {{
                        (order.final_rate_card ?? order.estimated_rate_card)
                            ?.name
                    }}
                </DescriptionItem>
                <DescriptionItem v-if="order.branch" label="Branch">
                    {{ order.branch.name }}
                </DescriptionItem>
            </DescriptionList>
        </section>

        <!-- The cards after the parcel, in one wrapper so they stick
             together on desktops; the gap inside matches the gap outside.
             The size box lies under the cards in the same grid column,
             with the wrapper's top, so it measures what the wrapper needs.
             On tablets the wrapper steps aside (contents): the sender and
             receiver card sits beside the parcel, and the delivery card
             runs under both, so neither column is left blank. -->
        <div
            class="grid gap-5 md:max-xl:contents lg:gap-6 xl:top-[88px] xl:content-start"
            :class="lastCardsFit && 'xl:sticky xl:self-start'"
        >
            <div
                ref="lastCardsSize"
                aria-hidden="true"
                class="invisible hidden xl:top-[88px] xl:col-start-1 xl:row-start-1 xl:block"
                :class="showDelivery && 'xl:row-span-2'"
            />

            <section
                aria-labelledby="people-title"
                :class="[cardClass, 'xl:col-start-1 xl:row-start-1']"
            >
                <h2 id="people-title" class="sr-only">Sender and receiver</h2>

                <h3 :class="headingClass">Sender</h3>
                <p class="mt-2 text-[15px] leading-6 font-bold text-ink">
                    {{ order.sender_name }}
                </p>
                <a :href="telHref(order.sender_phone)" :class="phoneClass">
                    <Phone aria-hidden="true" class="size-3.5" />
                    {{ formatPhone(order.sender_phone) }}
                </a>
                <p
                    v-if="order.customer"
                    class="mt-1 truncate text-[13px] leading-5 text-muted-foreground"
                >
                    Account: {{ order.customer.email }}
                </p>

                <div class="mt-4 border-t border-line-soft pt-4">
                    <h3 :class="headingClass">Receiver</h3>
                    <p class="mt-2 text-[15px] leading-6 font-bold text-ink">
                        {{ order.receiver_name }}
                    </p>
                    <a
                        :href="telHref(order.receiver_phone)"
                        :class="phoneClass"
                    >
                        <Phone aria-hidden="true" class="size-3.5" />
                        {{ formatPhone(order.receiver_phone) }}
                    </a>
                    <address
                        class="mt-2 text-sm leading-[22px] text-ink-2 not-italic"
                    >
                        <span v-for="line in address" :key="line" class="block">
                            {{ line }}
                        </span>
                    </address>
                </div>
            </section>

            <section
                v-if="showDelivery"
                ref="deliveryCard"
                aria-labelledby="delivery-title"
                :class="[
                    cardClass,
                    'md:max-xl:col-span-2 xl:top-[88px] xl:col-start-1 xl:row-start-2',
                    !lastCardsFit && deliveryFits && 'xl:sticky',
                ]"
            >
                <h2 id="delivery-title" :class="headingClass">Delivery</h2>
                <!-- Two columns of rows across the tablet card; the rows in
                     the last line drop their divider, like the last row of
                     a single column. -->
                <DescriptionList
                    class="mt-1 md:max-xl:grid md:max-xl:grid-cols-2 md:max-xl:gap-x-8 md:max-xl:[&>:nth-last-child(2):nth-child(odd)]:border-b-0"
                >
                    <DescriptionItem
                        v-if="order.scheduled_for"
                        label="Delivery day"
                    >
                        <DateTime
                            :value="order.scheduled_for"
                            format="weekday"
                        />
                    </DescriptionItem>
                    <DescriptionItem v-if="order.driver" label="Driver">
                        <span
                            class="inline-flex flex-wrap items-center justify-end gap-2"
                        >
                            {{ order.driver.name }}
                            <PlateBadge
                                v-if="order.driver.vehicle_plate"
                                :plate="order.driver.vehicle_plate"
                            />
                        </span>
                    </DescriptionItem>
                    <DescriptionItem
                        v-if="order.delivered_at"
                        label="Delivered"
                    >
                        <DateTime :value="order.delivered_at" />
                    </DescriptionItem>
                    <template v-if="attempt">
                        <DescriptionItem
                            v-if="attempt.recipient_name"
                            label="Received by"
                        >
                            {{ attempt.recipient_name }}
                        </DescriptionItem>
                        <DescriptionItem
                            v-if="attempt.failure_reason"
                            label="Last attempt"
                        >
                            {{ attempt.failure_reason.label }}
                            <span
                                class="block text-xs font-medium text-muted-foreground"
                            >
                                <DateTime
                                    :value="attempt.attempted_at"
                                    format="shortDateTime"
                                />
                            </span>
                        </DescriptionItem>
                    </template>
                </DescriptionList>
                <p
                    v-if="attempt?.note"
                    class="mt-1 rounded-lg bg-surface px-3 py-2 text-[13px] leading-5 text-ink-2"
                >
                    Driver's note: {{ attempt.note }}
                </p>
                <Button
                    v-if="attempt?.photo_url"
                    variant="outline"
                    as-child
                    class="mt-3 h-10 rounded-lg font-bold pointer-coarse:h-11"
                >
                    <a :href="attempt.photo_url" target="_blank" rel="noopener">
                        <Camera aria-hidden="true" />
                        Proof of delivery photo
                        <ExternalLink
                            aria-hidden="true"
                            class="size-3.5 text-muted-foreground"
                        />
                        <span class="sr-only">(opens in a new tab)</span>
                    </a>
                </Button>
            </section>
        </div>
    </div>
</template>
