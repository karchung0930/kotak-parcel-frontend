<script setup lang="ts">
import { Head, Link, useForm } from '@inertiajs/vue3';
import { ChevronRight, Download, FileUp } from '@lucide/vue';
import { computed, watch } from 'vue';
import FormField from '@/components/admin/FormField.vue';
import FormSection from '@/components/admin/FormSection.vue';
import ImportFileField from '@/components/admin/rates/imports/ImportFileField.vue';
import ImportStatusChip from '@/components/admin/rates/imports/ImportStatusChip.vue';
import LayoutExamples from '@/components/admin/rates/imports/LayoutExamples.vue';
import DateTime from '@/components/DateTime.vue';
import FileName from '@/components/FileName.vue';
import NativeSelect from '@/components/NativeSelect.vue';
import PageHeader from '@/components/PageHeader.vue';
import TextLink from '@/components/TextLink.vue';
import { Button } from '@/components/ui/button';
import { Spinner } from '@/components/ui/spinner';
import { download, index, show as showRateCard } from '@/routes/admin/rates';
import { create, show, store } from '@/routes/admin/rates/imports';
import type { AdminRateImportsCreatePageProps } from '@/types';

/**
 * Import rates (admins only): upload an Excel or CSV file of prices and
 * choose the version whose zones they use (the current rates by default).
 * The file is read on the queue and opens on its own page, where the
 * columns are checked; nothing changes until a draft is made from it.
 * After the form, the two layouts it reads and the latest imports, with a
 * link to the draft made from each (or a note that it was deleted).
 */
const props = defineProps<AdminRateImportsCreatePageProps>();

const form = useForm({
    file: null as File | null,
    base_rate_card_id: props.currentRateCardId,
});

const breadcrumbs = [
    { title: 'Rates', href: index() },
    { title: 'Import rates', href: create() },
];

const errors = computed(
    () => form.errors as Partial<Record<'file' | 'base_rate_card_id', string>>,
);

// A new file clears what was said about the last one.
watch(
    () => form.file,
    () => form.clearErrors('file'),
);

function submit(): void {
    form.submit(store(), { forceFormData: true });
}

const headingClass =
    'text-lg leading-[26px] font-extrabold tracking-heading text-ink';
</script>

<template>
    <Head title="Import rates" />

    <div class="max-w-6xl space-y-6">
        <PageHeader
            title="Import rates"
            description="Upload prices from Excel or CSV. Nothing changes until you create a draft."
            :breadcrumbs="breadcrumbs"
        />

        <form class="space-y-6" novalidate @submit.prevent="submit">
            <FormSection
                title="File"
                description="Zone names in the file are matched to the zones of the rates you choose."
            >
                <FormField
                    id="import-file"
                    label="Spreadsheet"
                    :error="errors.file"
                >
                    <template #default="{ describedby }">
                        <ImportFileField
                            id="import-file"
                            v-model="form.file"
                            :max-kb="maxKb"
                            :error="errors.file"
                            :described-by="describedby"
                            @reject="
                                (message) => form.setError('file', message)
                            "
                        />
                    </template>
                </FormField>
                <FormField
                    id="import-base"
                    label="Zones from"
                    hint="The draft gets these zones and their size weight divisor."
                    :error="errors.base_rate_card_id"
                >
                    <template #default="{ describedby, invalid }">
                        <NativeSelect
                            id="import-base"
                            v-model="form.base_rate_card_id"
                            :aria-describedby="describedby"
                            :aria-invalid="invalid"
                            class="sm:max-w-md"
                        >
                            <option
                                v-for="card in rateCards"
                                :key="card.id"
                                :value="card.id"
                            >
                                {{ card.name }} ({{ card.phase.label }})
                            </option>
                        </NativeSelect>
                    </template>
                </FormField>
            </FormSection>

            <div
                class="flex flex-col gap-2.5 sm:flex-row sm:items-center sm:justify-end"
            >
                <Button
                    variant="outline"
                    as-child
                    class="h-12 rounded-lg px-5 text-[15px] font-bold"
                >
                    <Link :href="index()">Cancel</Link>
                </Button>
                <Button
                    type="submit"
                    :disabled="form.processing"
                    class="h-12 rounded-lg px-6 text-[15px] font-bold hover:bg-brand-strong"
                >
                    <Spinner v-if="form.processing" />
                    <FileUp v-else aria-hidden="true" />
                    Upload and read
                </Button>
            </div>
        </form>

        <!-- Reference, not part of the form: the shapes a file may take. -->
        <section aria-labelledby="layouts-title" class="space-y-3">
            <div
                class="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between"
            >
                <div class="min-w-0">
                    <h2 id="layouts-title" :class="headingClass">
                        Layouts it reads
                    </h2>
                    <p
                        class="mt-0.5 text-[13.5px] leading-5 text-muted-foreground"
                    >
                        Headings can be worded your way. The template has both
                        layouts.
                    </p>
                </div>
                <Button
                    variant="outline"
                    as-child
                    class="h-11 w-fit flex-none rounded-lg px-4 font-bold"
                >
                    <a
                        :href="download([currentRateCardId, 'xlsx']).url"
                        download
                    >
                        <Download aria-hidden="true" />
                        Download template
                    </a>
                </Button>
            </div>
            <div class="rounded-xl border border-line bg-white p-5 sm:p-6">
                <LayoutExamples />
            </div>
        </section>

        <section
            v-if="recent.length > 0"
            aria-labelledby="recent-title"
            class="@container space-y-3"
        >
            <h2 id="recent-title" :class="headingClass">Recent imports</h2>
            <div class="overflow-hidden rounded-xl border border-line bg-white">
                <!-- A table (.data-table in app.css) once the card is 40rem
                     wide, with who uploaded it from 52rem; cards below. -->
                <div class="hidden overflow-x-auto @[40rem]:block">
                    <table
                        role="table"
                        class="data-table text-[13.5px] [--columns:5] @[52rem]:[--columns:6]"
                    >
                        <caption class="sr-only">
                            The latest imports, newest first
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
                                    File
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
                                    Zones from
                                </th>
                                <th
                                    scope="col"
                                    role="columnheader"
                                    class="hidden py-2.5 @[52rem]:block"
                                >
                                    Uploaded by
                                </th>
                                <th
                                    scope="col"
                                    role="columnheader"
                                    class="py-2.5"
                                >
                                    Uploaded
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
                                v-for="item in recent"
                                :key="item.id"
                                role="row"
                                class="data-table__row transition-colors hover:bg-surface/70"
                            >
                                <!-- Whole names, as two files often differ
                                     only at the end ("…v2.xlsx", "…v3.xlsx"). -->
                                <th
                                    scope="row"
                                    role="rowheader"
                                    class="max-w-64 py-3 text-left font-bold wrap-anywhere text-ink @[52rem]:max-w-96"
                                >
                                    <FileName :name="item.original_name" />
                                </th>
                                <td role="cell" class="max-w-56 py-3">
                                    <ImportStatusChip :status="item.status" />
                                    <!-- The draft made from it, one click away. -->
                                    <p
                                        v-if="item.rate_card"
                                        class="mt-1.5 text-[13px] leading-5"
                                    >
                                        <TextLink
                                            :href="
                                                showRateCard(item.rate_card.id)
                                            "
                                        >
                                            Open the draft
                                            <span class="sr-only">
                                                {{ item.rate_card.name }}</span
                                            >
                                        </TextLink>
                                    </p>
                                    <p
                                        v-else-if="
                                            item.status.value === 'applied'
                                        "
                                        class="mt-1.5 text-[13px] leading-5 text-muted-foreground"
                                    >
                                        Draft deleted
                                    </p>
                                </td>
                                <td
                                    role="cell"
                                    class="max-w-48 py-3 wrap-anywhere text-ink-2"
                                >
                                    {{ item.base_rate_card?.name ?? '—' }}
                                </td>
                                <td
                                    role="cell"
                                    class="hidden max-w-40 py-3 text-ink-2 @[52rem]:block"
                                >
                                    {{ item.user?.name ?? '—' }}
                                </td>
                                <td
                                    role="cell"
                                    class="py-3 whitespace-nowrap text-ink-2 tabular-nums"
                                >
                                    <DateTime
                                        v-if="item.created_at"
                                        :value="item.created_at"
                                    />
                                </td>
                                <td role="cell" class="py-3">
                                    <Button
                                        variant="outline"
                                        size="row"
                                        as-child
                                    >
                                        <Link :href="show(item.id)">
                                            Open
                                            <span class="sr-only">{{
                                                item.original_name
                                            }}</span>
                                        </Link>
                                    </Button>
                                </td>
                            </tr>
                        </tbody>
                    </table>
                </div>

                <!-- Each card opens its import (the name's link covers the
                     card); the draft's link sits above it. -->
                <ul class="divide-y divide-line-soft @[40rem]:hidden">
                    <li
                        v-for="item in recent"
                        :key="item.id"
                        class="relative flex items-center gap-3 px-4 py-4 transition-colors hover:bg-surface/70"
                    >
                        <div class="min-w-0 flex-1">
                            <Link
                                :href="show(item.id)"
                                class="block font-bold wrap-anywhere text-ink after:absolute after:inset-0"
                            >
                                <FileName :name="item.original_name" />
                            </Link>
                            <div
                                class="mt-1.5 flex flex-wrap items-center gap-x-2 gap-y-1.5 text-[13px] text-ink-2"
                            >
                                <ImportStatusChip :status="item.status" />
                                <DateTime
                                    v-if="item.created_at"
                                    :value="item.created_at"
                                />
                            </div>
                            <p
                                v-if="item.rate_card"
                                class="relative z-10 mt-2.5 w-fit text-[13px] leading-5"
                            >
                                <TextLink
                                    :href="showRateCard(item.rate_card.id)"
                                >
                                    Open the draft
                                    <span class="sr-only">
                                        {{ item.rate_card.name }}</span
                                    >
                                </TextLink>
                            </p>
                            <p
                                v-else-if="item.status.value === 'applied'"
                                class="mt-2.5 text-[13px] leading-5 text-muted-foreground"
                            >
                                Draft deleted
                            </p>
                        </div>
                        <ChevronRight
                            aria-hidden="true"
                            class="size-5 flex-none text-muted-foreground"
                        />
                    </li>
                </ul>
            </div>
        </section>
    </div>
</template>
