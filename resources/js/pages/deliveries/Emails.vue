<script setup lang="ts">
import { Head, Link, useForm } from '@inertiajs/vue3';
import { Mail, MailX, ScanLine } from '@lucide/vue';
import { nextTick, useTemplateRef } from 'vue';
import ActionDivider from '@/components/ActionDivider.vue';
import PublicPageBand from '@/components/public/PublicPageBand.vue';
import TrackingNumber from '@/components/TrackingNumber.vue';
import { Button } from '@/components/ui/button';
import { home, track } from '@/routes';
import type { DeliveriesEmailsPageProps } from '@/types';

/**
 * The page behind the link at the foot of each receiver email, where the
 * receiver stops the emails about their parcel. The receiver has no
 * account: the signed link is the permission, and the page shows only the
 * tracking number, which the email already gave.
 */
const props = defineProps<DeliveriesEmailsPageProps>();

const breadcrumbs = [
    { title: 'Home', href: home() },
    { title: 'Delivery emails', href: props.stopUrl },
];

const form = useForm({});
const heading = useTemplateRef<HTMLElement>('heading');

function stop(): void {
    form.post(props.stopUrl, {
        preserveScroll: true,
        // The button is gone: keep the keyboard on the new heading.
        onSuccess: () => nextTick(() => heading.value?.focus()),
    });
}
</script>

<template>
    <Head title="Delivery emails">
        <meta head-key="robots" name="robots" content="noindex" />
    </Head>

    <PublicPageBand
        title="Delivery emails"
        description="Updates about a parcel that is on its way to you."
        :breadcrumbs="breadcrumbs"
    />

    <div class="container-page pt-12 pb-16 sm:pt-14 sm:pb-20">
        <section
            aria-labelledby="emails-title"
            class="flex flex-col gap-5 rounded-2xl border border-line bg-white p-5 shadow-card sm:flex-row sm:gap-6 sm:p-8"
        >
            <span
                class="flex size-12 flex-none items-center justify-center rounded-xl bg-brand-tint text-brand-strong"
            >
                <component
                    :is="stopped ? MailX : Mail"
                    aria-hidden="true"
                    class="size-6"
                />
            </span>

            <div class="max-w-2xl min-w-0">
                <p
                    class="text-[13px] leading-[18px] font-semibold text-muted-foreground"
                >
                    Tracking number
                </p>
                <TrackingNumber :value="trackingNumber" class="mt-1" />

                <h2
                    id="emails-title"
                    ref="heading"
                    tabindex="-1"
                    class="mt-4 text-2xl leading-8 font-extrabold tracking-heading text-ink outline-none sm:text-[26px]"
                >
                    {{
                        stopped
                            ? 'Emails stopped'
                            : 'Stop the emails about this parcel?'
                    }}
                </h2>
                <p
                    v-if="stopped"
                    class="mt-2 text-[15px] leading-6 text-pretty text-ink-2"
                >
                    We will not email you about this parcel again. You can still
                    follow it on the tracking page.
                </p>
                <p
                    v-else
                    class="mt-2 text-[15px] leading-6 text-pretty text-ink-2"
                >
                    The sender gave your email address, so we email you when the
                    delivery day is set, when the parcel is out for delivery and
                    when it arrives. If the parcel is not for you, or you would
                    rather not hear about it, stop the emails here.
                </p>

                <!-- Stopping them vs following the parcel. The two do not
                     share a line in a phone's card, so there they stack at
                     full width, without the divider. -->
                <div
                    class="mt-6 flex flex-col gap-2.5 sm:flex-row sm:flex-wrap sm:items-center"
                >
                    <template v-if="!stopped">
                        <Button
                            variant="warning"
                            class="h-12 px-5 text-[15px] font-bold"
                            :disabled="form.processing"
                            @click="stop"
                        >
                            <MailX aria-hidden="true" />
                            Stop these emails
                        </Button>
                        <ActionDivider class="max-sm:hidden" />
                    </template>
                    <Button
                        as-child
                        variant="outline"
                        class="h-12 px-5 text-[15px] font-bold"
                    >
                        <Link
                            :href="track({ query: { number: trackingNumber } })"
                        >
                            <ScanLine aria-hidden="true" />
                            Track the parcel
                        </Link>
                    </Button>
                </div>
            </div>
        </section>
    </div>
</template>
