<script setup lang="ts">
import { Head, Link } from '@inertiajs/vue3';
import { ChevronRight, Download, FileUp } from '@lucide/vue';
import { computed } from 'vue';
import NewDraftDialog from '@/components/admin/rates/NewDraftDialog.vue';
import RateCardPhaseChip from '@/components/admin/RateCardPhaseChip.vue';
import DateTime from '@/components/DateTime.vue';
import EmptyState from '@/components/EmptyState.vue';
import KeepTogether from '@/components/KeepTogether.vue';
import PageHeader from '@/components/PageHeader.vue';
import { Button } from '@/components/ui/button';
import { pluralize } from '@/lib/format';
import { download, show } from '@/routes/admin/rates';
import { create as importRates } from '@/routes/admin/rates/imports';
import type { AdminRatesIndexPageProps } from '@/types';

/**
 * Rates (admins only): every version of the price list. Drafts first, then
 * the published ones from the last to take effect, so a scheduled change
 * sits above the rates in effect. Prices can also come from a spreadsheet:
 * the template is the current rates as a workbook, and an import becomes
 * a draft.
 */
const props = defineProps<AdminRatesIndexPageProps>();

const current = computed(
    () =>
        props.rateCards.find((card) => card.phase.value === 'current') ?? null,
);
</script>

<template>
    <Head title="Rates" />

    <div class="space-y-6">
        <PageHeader
            title="Rates"
            description="Prices by zone and weight band. Published rates never change."
        >
            <template v-if="rateCards.length > 0" #meta>
                <p
                    class="min-w-0 text-[13px] font-semibold wrap-anywhere text-ink-2"
                >
                    {{ pluralize(rateCards.length, 'version') }}
                    <template v-if="current">
                        · in effect: <KeepTogether :text="current.name" />
                    </template>
                </p>
            </template>
            <!-- White buttons open or download; starting a draft is the next step. -->
            <template #actions>
                <Button
                    v-if="current"
                    variant="outline"
                    as-child
                    class="h-11 rounded-lg px-4 font-bold"
                >
                    <a :href="download([current.id, 'xlsx']).url" download>
                        <Download aria-hidden="true" />
                        Download template
                    </a>
                </Button>
                <Button
                    variant="outline"
                    as-child
                    class="h-11 rounded-lg px-4 font-bold"
                >
                    <Link :href="importRates()">
                        <FileUp aria-hidden="true" />
                        Import
                    </Link>
                </Button>
                <NewDraftDialog :versions="rateCards" />
            </template>
        </PageHeader>

        <section
            v-if="rateCards.length > 0"
            aria-labelledby="versions-title"
            class="@container overflow-hidden rounded-xl border border-line bg-white"
        >
            <h2 id="versions-title" class="sr-only">Every version</h2>

            <!-- A table (.data-table in app.css) once the card is 40rem
                 wide; who published it and when it was saved join at 52rem,
                 so a long name keeps its line. Cards below 40rem. Container
                 queries, so an open sidebar counts too. -->
            <div class="hidden overflow-x-auto @[40rem]:block">
                <table
                    role="table"
                    class="data-table text-[13.5px] [--columns:4] @[52rem]:[--columns:6]"
                >
                    <caption class="sr-only">
                        Rate card versions, drafts first
                    </caption>
                    <thead
                        role="rowgroup"
                        class="data-table__head border-b border-line bg-surface/70 text-[12.5px] leading-5 font-bold whitespace-nowrap text-muted-foreground"
                    >
                        <tr role="row" class="data-table__row">
                            <th scope="col" role="columnheader" class="py-2.5">
                                Name
                            </th>
                            <th scope="col" role="columnheader" class="py-2.5">
                                Status
                            </th>
                            <th scope="col" role="columnheader" class="py-2.5">
                                Effective from
                            </th>
                            <th
                                scope="col"
                                role="columnheader"
                                class="hidden py-2.5 @[52rem]:block"
                            >
                                Published by
                            </th>
                            <th
                                scope="col"
                                role="columnheader"
                                class="hidden py-2.5 @[52rem]:block"
                            >
                                Updated
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
                            v-for="card in rateCards"
                            :key="card.id"
                            role="row"
                            class="data-table__row transition-colors hover:bg-surface/70"
                        >
                            <!-- The name is plain text: Open is the row's one link.
                                 A name without spaces (an imported file's)
                                 breaks anywhere, never over the next column. -->
                            <th
                                scope="row"
                                role="rowheader"
                                class="max-w-72 py-3 text-left font-bold wrap-anywhere text-ink @[52rem]:max-w-96"
                            >
                                <KeepTogether :text="card.name" />
                            </th>
                            <td role="cell" class="py-3">
                                <RateCardPhaseChip :phase="card.phase" />
                            </td>
                            <td
                                role="cell"
                                class="py-3 whitespace-nowrap text-ink-2 tabular-nums"
                            >
                                <DateTime
                                    v-if="card.effective_from"
                                    :value="card.effective_from"
                                />
                                <span v-else class="text-muted-foreground">
                                    Not published
                                </span>
                            </td>
                            <td
                                role="cell"
                                class="hidden max-w-48 py-3 text-ink-2 @[52rem]:block"
                            >
                                {{ card.published_by?.name ?? '—' }}
                            </td>
                            <td
                                role="cell"
                                class="hidden py-3 whitespace-nowrap text-ink-2 tabular-nums @[52rem]:block"
                            >
                                <DateTime :value="card.updated_at" />
                            </td>
                            <td role="cell" class="py-3">
                                <Button variant="outline" size="row" as-child>
                                    <Link :href="show(card.id)">
                                        Open
                                        <span class="sr-only">{{
                                            card.name
                                        }}</span>
                                    </Link>
                                </Button>
                            </td>
                        </tr>
                    </tbody>
                </table>
            </div>

            <ul class="divide-y divide-line-soft @[40rem]:hidden">
                <li v-for="card in rateCards" :key="card.id">
                    <Link
                        :href="show(card.id)"
                        class="flex items-center gap-3 px-4 py-4 transition-colors hover:bg-surface/70"
                    >
                        <div class="min-w-0 flex-1">
                            <p class="font-bold wrap-anywhere text-ink">
                                <KeepTogether :text="card.name" />
                            </p>
                            <div
                                class="mt-1.5 flex flex-wrap items-center gap-x-2 gap-y-1.5 text-[13px] text-ink-2"
                            >
                                <RateCardPhaseChip :phase="card.phase" />
                                <span v-if="card.effective_from">
                                    from
                                    <DateTime :value="card.effective_from" />
                                </span>
                            </div>
                        </div>
                        <ChevronRight
                            aria-hidden="true"
                            class="size-5 flex-none text-muted-foreground"
                        />
                    </Link>
                </li>
            </ul>
        </section>

        <EmptyState
            v-else
            title="No rates yet"
            description="Start a draft with zones and weight bands, then publish it."
        />
    </div>
</template>
