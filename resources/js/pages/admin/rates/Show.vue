<script setup lang="ts">
import { Head, Link, router, useForm, usePage } from '@inertiajs/vue3';
import {
    CircleCheck,
    Copy,
    Pencil,
    Trash2,
    TriangleAlert,
    Undo2,
} from '@lucide/vue';
import { computed, ref } from 'vue';
import ActionDivider from '@/components/ActionDivider.vue';
import DownloadMenu from '@/components/admin/rates/DownloadMenu.vue';
import PublishDialog from '@/components/admin/rates/PublishDialog.vue';
import RateCardPhaseChip from '@/components/admin/RateCardPhaseChip.vue';
import ConfirmActionDialog from '@/components/ConfirmActionDialog.vue';
import DateTime from '@/components/DateTime.vue';
import DescriptionItem from '@/components/DescriptionItem.vue';
import DescriptionList from '@/components/DescriptionList.vue';
import Notice from '@/components/Notice.vue';
import PageHeader from '@/components/PageHeader.vue';
import RouteGroups from '@/components/RouteGroups.vue';
import { Button } from '@/components/ui/button';
import { Spinner } from '@/components/ui/spinner';
import ZoneList from '@/components/ZoneList.vue';
import { formatDateTime } from '@/lib/format';
import {
    destroy,
    edit,
    index,
    show,
    store,
    withdraw,
} from '@/routes/admin/rates';
import type { AdminRatesShowPageProps } from '@/types';

/**
 * One version of the rates: its zones and every route's weight bands.
 * What can be done depends on where it stands: a draft is edited,
 * published or deleted; scheduled rates can be withdrawn before they take
 * effect; any version can be copied into a new draft.
 */
const props = defineProps<AdminRatesShowPageProps>();

const page = usePage();

const card = computed(() => props.rateCard);
const zones = computed(() => card.value.zones ?? []);

/** "Copy to a new draft" (its errors show in the refused notice below). */
const copyForm = useForm({ source_id: props.rateCard.id });

const breadcrumbs = computed(() => [
    { title: 'Rates', href: index() },
    { title: card.value.name, href: show(card.value.id) },
]);

/** One line about when the rates apply. */
const description = computed(() => {
    const from = formatDateTime(card.value.effective_from);

    switch (card.value.phase.value) {
        case 'draft':
            return 'A draft: it prices nothing until it is published.';
        case 'scheduled':
            return `Takes effect on ${from}, Malaysia time.`;
        case 'current':
            return `Pricing new orders since ${from}.`;
        default:
            return `In effect from ${from}, until newer rates took over.`;
    }
});

/*
 * An action the server refused (key "card"), e.g. a withdraw that came too
 * late or a copy of a version deleted meanwhile.
 */
const refused = computed(
    () =>
        (page.props.errors as Record<string, string>).card ??
        copyForm.errors.source_id ??
        null,
);

/** The zones and routes as RouteGroups lays them out, by zone id. */
const routeZones = computed(() =>
    zones.value.map((zone) => ({ key: zone.id, name: zone.name })),
);

const routes = computed(() =>
    (card.value.routes ?? []).map((route) => ({
        from: route.origin_zone_id,
        to: route.destination_zone_id,
        bands: route.bands.map((band) => ({
            maxWeightG: band.max_weight_g,
            priceSen: band.price_sen,
        })),
        extraKgSen: route.extra_kg_sen,
    })),
);

/*
|--------------------------------------------------------------------------
| Actions
|--------------------------------------------------------------------------
*/

function copy(): void {
    copyForm.submit(store());
}

const confirming = ref<'withdraw' | 'delete' | null>(null);
const processing = ref(false);

const confirmOpen = computed({
    get: () => confirming.value !== null,
    set: (open: boolean) => {
        if (!open) {
            confirming.value = null;
        }
    },
});

function confirm(): void {
    const action =
        confirming.value === 'delete'
            ? destroy(card.value.id)
            : withdraw(card.value.id);

    router.visit(action, {
        preserveScroll: true,
        onStart: () => (processing.value = true),
        onFinish: () => {
            processing.value = false;
            confirming.value = null;
        },
    });
}

const headingClass =
    'text-lg leading-[26px] font-extrabold tracking-heading text-ink';
</script>

<template>
    <Head :title="card.name" />

    <!-- The layout follows the width of the page's own area (a @container),
         so an open sidebar counts: zones and details sit side by side only
         when the zones still get room for two cards across. -->
    <div class="@container max-w-6xl space-y-6">
        <PageHeader
            :title="card.name"
            :description="description"
            :breadcrumbs="breadcrumbs"
        >
            <template #meta>
                <RateCardPhaseChip :phase="card.phase" size="md" />
            </template>
            <template #actions>
                <!-- White buttons open or switch; withdrawing and deleting
                     ask first, with a yellow confirm, and a divider sets
                     them apart. Publishing is the next step for a draft,
                     so it is red; while the draft has problems, editing is. -->
                <Button
                    v-if="can.delete"
                    variant="outline"
                    class="h-11 rounded-lg px-4 font-bold"
                    @click="confirming = 'delete'"
                >
                    <Trash2 aria-hidden="true" />
                    Delete
                </Button>
                <Button
                    v-if="can.withdraw"
                    variant="outline"
                    class="h-11 rounded-lg px-4 font-bold"
                    @click="confirming = 'withdraw'"
                >
                    <Undo2 aria-hidden="true" />
                    Withdraw
                </Button>
                <ActionDivider v-if="can.delete || can.withdraw" />
                <DownloadMenu :rate-card-id="card.id" />
                <Button
                    v-if="can.update"
                    :variant="problems.length > 0 ? 'default' : 'outline'"
                    as-child
                    :class="[
                        'h-11 rounded-lg px-4 font-bold',
                        problems.length > 0 ? 'hover:bg-brand-strong' : '',
                    ]"
                >
                    <Link :href="edit(card.id)">
                        <Pencil aria-hidden="true" />
                        Edit
                    </Link>
                </Button>
                <Button
                    v-if="!can.update"
                    variant="outline"
                    class="h-11 rounded-lg px-4 font-bold"
                    :disabled="copyForm.processing"
                    @click="copy"
                >
                    <Spinner v-if="copyForm.processing" />
                    <Copy v-else aria-hidden="true" />
                    Copy to a new draft
                </Button>
                <PublishDialog
                    v-if="can.publish"
                    :rate-card="card"
                    :problems="problems"
                />
            </template>
        </PageHeader>

        <Notice
            v-if="refused"
            tone="warning"
            :icon="TriangleAlert"
            title="That did not go through"
        >
            {{ refused }}
        </Notice>

        <template v-if="card.phase.value === 'draft'">
            <Notice
                v-if="problems.length > 0"
                tone="warning"
                :icon="TriangleAlert"
                title="To fix before publishing"
            >
                <ul class="list-disc space-y-0.5 pl-4">
                    <li v-for="problem in problems" :key="problem">
                        {{ problem }}
                    </li>
                </ul>
            </Notice>
            <Notice
                v-else
                tone="success"
                :icon="CircleCheck"
                title="Ready to publish"
            >
                Every state is in a zone and every route has its prices.
            </Notice>
        </template>

        <div
            class="grid gap-6 @4xl:grid-cols-[minmax(0,1fr)_minmax(0,22rem)] @4xl:items-start"
        >
            <section aria-labelledby="zones-title" class="min-w-0 space-y-3">
                <h2 id="zones-title" :class="headingClass">Zones</h2>
                <ZoneList
                    v-if="zones.length > 0"
                    :zones="zones"
                    :states="states"
                    :columns="2"
                />
                <p
                    v-else
                    class="rounded-xl border border-dashed border-line-strong bg-white px-5 py-6 text-sm text-muted-foreground"
                >
                    No zones yet.
                </p>
            </section>

            <!-- The heading sits above the card, as Zones does, so the cards
                 start level. The rows' own 12px padding completes the
                 card's 20px (24px from 640px). -->
            <section aria-labelledby="details-title" class="space-y-3">
                <h2 id="details-title" :class="headingClass">Details</h2>
                <DescriptionList
                    class="rounded-xl border border-line bg-white px-5 py-2 sm:px-6 sm:py-3"
                >
                    <DescriptionItem label="Effective from">
                        <DateTime
                            v-if="card.effective_from"
                            :value="card.effective_from"
                        />
                        <span v-else class="font-medium text-muted-foreground">
                            Not published
                        </span>
                    </DescriptionItem>
                    <DescriptionItem label="Size weight">
                        L × W × H ÷ {{ card.volumetric_divisor }}
                    </DescriptionItem>
                    <DescriptionItem v-if="card.published_at" label="Published">
                        <DateTime :value="card.published_at" />
                        <span
                            v-if="card.published_by"
                            class="block font-medium text-ink-2"
                        >
                            by {{ card.published_by.name }}
                        </span>
                    </DescriptionItem>
                    <DescriptionItem label="Created">
                        <DateTime :value="card.created_at" />
                        <span
                            v-if="card.created_by"
                            class="block font-medium text-ink-2"
                        >
                            by {{ card.created_by.name }}
                        </span>
                    </DescriptionItem>
                    <DescriptionItem label="Last saved">
                        <DateTime :value="card.updated_at" />
                    </DescriptionItem>
                    <DescriptionItem v-if="card.notes" label="Notes" stacked>
                        <span class="font-medium whitespace-pre-line">{{
                            card.notes
                        }}</span>
                    </DescriptionItem>
                </DescriptionList>
            </section>
        </div>

        <section aria-labelledby="routes-title" class="space-y-3">
            <h2 id="routes-title" :class="headingClass">Prices by route</h2>
            <RouteGroups
                v-if="routeZones.length > 0"
                :zones="routeZones"
                :routes="routes"
            />
            <p
                v-else
                class="rounded-xl border border-dashed border-line-strong bg-white px-5 py-6 text-sm text-muted-foreground"
            >
                Add zones to set prices between them.
            </p>
        </section>

        <ConfirmActionDialog
            v-model:open="confirmOpen"
            :title="
                confirming === 'delete'
                    ? `Delete ${card.name}?`
                    : `Withdraw ${card.name}?`
            "
            :description="
                confirming === 'delete'
                    ? 'The draft and its prices are deleted for good.'
                    : 'It goes back to being a draft. You can edit it and publish it again.'
            "
            :confirm-label="
                confirming === 'delete' ? 'Delete draft' : 'Withdraw rates'
            "
            cancel-label="Keep it"
            :icon="confirming === 'delete' ? Trash2 : Undo2"
            tone="warning"
            :processing="processing"
            @confirm="confirm"
        />
    </div>
</template>
