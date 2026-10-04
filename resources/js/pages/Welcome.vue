<script setup lang="ts">
import { Head, Link, usePage } from '@inertiajs/vue3';
import { ArrowRight, Banknote, Package, RotateCcw, Tag } from '@lucide/vue';
import { computed } from 'vue';
import DoorstepScene from '@/components/brand/DoorstepScene.vue';
import JourneyConveyor from '@/components/brand/JourneyConveyor.vue';
import KotakTape from '@/components/brand/KotakTape.vue';
import HomeBranches from '@/components/public/HomeBranches.vue';
import PriceEstimator from '@/components/public/PriceEstimator.vue';
import PriceRules from '@/components/public/PriceRules.vue';
import SectionHeading from '@/components/SectionHeading.vue';
import TrackingSearch from '@/components/TrackingSearch.vue';
import { Button } from '@/components/ui/button';
import { useCanSendParcels } from '@/composables/useCanSendParcels';
import { formatMoney } from '@/lib/format';
import { lowestPriceSen } from '@/lib/pricing';
import { pricing as pricingPage, track } from '@/routes';
import { create as createOrder } from '@/routes/orders';
import type { WelcomePageProps } from '@/types';

// The branch strip sits right above the footer, so the footer skips its tape.
defineOptions({ layout: { footerTape: false } });

const props = defineProps<WelcomePageProps>();

const canSend = useCanSendParcels();
const maxAttempts = usePage().props.maxFailedAttempts;

/*
 * Three short promises, kept to one line from 1024px (about 565px of text
 * in a 580px column); on phones they stack.
 */
const promises = computed(() => [
    { icon: Tag, text: `From ${formatMoney(lowestPriceSen(props.pricing))}` },
    { icon: Banknote, text: 'Pay at the branch, cash or card' },
    { icon: RotateCcw, text: `Up to ${maxAttempts} delivery attempts` },
]);

const whereToFind = `${track.url()}#where-to-find`;

const sceneTitle =
    'The red Kotak van pulls up outside No. 12, a terrace house. The courier carries a taped parcel to the open gate and hands it to the smiling customer. A green tick appears over the parcel and the status changes to Delivered.';
</script>

<template>
    <Head title="Parcel delivery across the Klang Valley">
        <meta
            head-key="description"
            name="description"
            content="Book online, drop your parcel at any Kotak branch and we deliver it to the door across the Klang Valley. Track every step with your KT- tracking number."
        />
    </Head>

    <!-- Hero -->
    <section
        aria-labelledby="hero-title"
        class="relative overflow-hidden bg-surface"
    >
        <!-- From 1024px: text on the left, the picture centred beside it and
             running out to the right edge. Below that they stack. -->
        <div
            class="container-page grid items-center gap-8 pt-10 pb-10 sm:gap-10 sm:pt-12 sm:pb-14 lg:grid-cols-[580px_minmax(0,1fr)] lg:gap-8 lg:pt-14 lg:pb-16 xl:gap-12"
        >
            <div class="relative z-10">
                <h1
                    id="hero-title"
                    class="text-[40px] leading-[42px] font-extrabold tracking-display text-ink sm:text-[52px] sm:leading-[54px] xl:text-[60px] xl:leading-[60px]"
                >
                    <span class="sm:block">Parcel delivery</span>
                    {{ ' ' }}
                    <span class="sm:block">across the</span>
                    {{ ' ' }}
                    <span class="block text-brand">Klang Valley.</span>
                </h1>
                <!-- One line from 640px up: about 520px of text in the 580px column. -->
                <p
                    class="mt-5 max-w-[580px] text-base leading-[26px] text-muted-foreground sm:text-lg sm:leading-7"
                >
                    Book online, drop it at any branch and we deliver it to the
                    door.
                </p>

                <div
                    class="mt-7 rounded-[14px] border border-line bg-white p-4 shadow-float sm:px-[18px] sm:pt-[18px] sm:pb-4 lg:max-w-[600px]"
                >
                    <TrackingSearch
                        size="lg"
                        label="Track a parcel"
                        hint="Starts with KT- and is printed on your order confirmation and drop-off receipt."
                    >
                        <template #label-aside>
                            <!-- A 44px target on touch screens without
                                 moving the text. -->
                            <Link
                                :href="whereToFind"
                                class="tap-target relative text-[13px] leading-5 font-semibold text-brand-strong underline decoration-brand-edge underline-offset-4 hover:text-brand-deep hover:decoration-current"
                            >
                                Where is my tracking number?
                            </Link>
                        </template>
                    </TrackingSearch>
                </div>

                <div
                    class="mt-6 flex flex-col gap-2 sm:flex-row sm:items-center sm:gap-6"
                >
                    <!-- Track is the red step here; this opens the order
                         form, so it is a white outline button. -->
                    <Button
                        v-if="canSend"
                        as-child
                        variant="outline"
                        class="h-12 rounded-lg px-5 text-[15px] font-bold"
                    >
                        <Link :href="createOrder()">
                            <Package aria-hidden="true" class="size-5" />
                            Send a parcel
                        </Link>
                    </Button>
                    <Link
                        :href="pricingPage()"
                        class="inline-flex h-12 items-center gap-1.5 self-start rounded-md text-[15px] font-bold text-ink hover:text-brand-strong"
                    >
                        See pricing
                        <ArrowRight aria-hidden="true" class="size-[18px]" />
                    </Link>
                </div>

                <ul
                    class="mt-5 flex flex-col gap-2.5 text-[13.5px] leading-[22px] font-semibold text-ink-2 sm:flex-row sm:flex-wrap sm:gap-x-[18px] sm:gap-y-2 lg:flex-nowrap"
                >
                    <li
                        v-for="promise in promises"
                        :key="promise.text"
                        class="flex items-center gap-[7px] sm:whitespace-nowrap"
                    >
                        <component
                            :is="promise.icon"
                            aria-hidden="true"
                            class="size-[18px] flex-none text-brand"
                        />
                        {{ promise.text }}
                    </li>
                </ul>
            </div>

            <!-- The delivery story, animated. Under 640px and at 1024-1279px
                 the picture is under ~640px wide, so it uses the compact
                 drawing (less detail, a bigger Delivered seal and status). From 1024px
                 it runs out to the right edge of the window. -->
            <div class="relative">
                <DoorstepScene
                    compact
                    :title="sceneTitle"
                    class="w-full sm:hidden lg:block lg:w-[calc(100%_+_2rem)] xl:hidden"
                />
                <DoorstepScene
                    :title="sceneTitle"
                    class="mx-auto w-full max-w-[680px] max-sm:hidden lg:hidden xl:mx-0 xl:block xl:w-[calc(100%_+_2rem_+_max(0px,_(100vw_-_84rem)_/_2))] xl:max-w-[820px]"
                />
            </div>
        </div>
    </section>
    <!-- The tape runs level along the hero's bottom edge. -->
    <KotakTape :height="44" overlap class="sm:hidden" />
    <KotakTape :height="60" overlap class="max-sm:hidden" />

    <!-- Pricing and the quick estimate -->
    <section
        id="pricing"
        aria-labelledby="pricing-title"
        class="bg-white pt-16 sm:pt-20 lg:pt-24"
    >
        <!-- Side by side from 1280px. Narrower, the estimator runs full
             width under the rules (beside them it would be too squeezed
             to lay out its fields in a row); at 1024-1279px the three
             rules sit in a row. -->
        <div
            class="container-page grid gap-10 xl:grid-cols-[480px_minmax(0,1fr)] xl:gap-16"
        >
            <div>
                <SectionHeading
                    id="pricing-title"
                    eyebrow="Pricing"
                    :icon="Tag"
                    title="Priced by weight and where it goes."
                    description="We charge by the higher of your parcel's actual weight and its size weight. Staff confirm it when they weigh it."
                />
                <PriceRules
                    :pricing="pricing"
                    class="mt-7 lg:max-xl:grid lg:max-xl:grid-cols-3 lg:max-xl:gap-6"
                />
                <Link
                    :href="pricingPage()"
                    class="mt-6 inline-flex min-h-11 items-center gap-1.5 text-[15px] font-bold text-brand-strong hover:text-brand-deep"
                >
                    Pricing examples and parcel limits
                    <ArrowRight aria-hidden="true" class="size-[18px]" />
                </Link>
            </div>
            <PriceEstimator
                :pricing="pricing"
                :branches="branches"
                :states="states"
                class="self-start"
            />
        </div>
    </section>

    <!-- How it works: the parcel journey conveyor -->
    <section
        aria-labelledby="how-title"
        class="bg-white pt-16 pb-20 sm:pt-20 sm:pb-24"
    >
        <div class="container-page">
            <SectionHeading
                id="how-title"
                eyebrow="How it works"
                :icon="Package"
                title="Four steps from your door to theirs."
            >
                <template v-if="canSend" #actions>
                    <Link
                        :href="createOrder()"
                        class="inline-flex h-11 items-center gap-1.5 text-[15px] font-bold text-brand-strong hover:text-brand-deep"
                    >
                        Start an order
                        <ArrowRight aria-hidden="true" class="size-[18px]" />
                    </Link>
                </template>
            </SectionHeading>
            <JourneyConveyor class="mt-8 sm:mt-10" />
        </div>
    </section>
    <KotakTape :height="44" overlap />

    <HomeBranches :branches="branches" />
</template>
