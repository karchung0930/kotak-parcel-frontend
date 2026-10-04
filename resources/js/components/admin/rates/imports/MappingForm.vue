<script setup lang="ts">
import { useForm } from '@inertiajs/vue3';
import { ListChecks } from '@lucide/vue';
import {
    computed,
    nextTick,
    reactive,
    ref,
    useId,
    useTemplateRef,
    watchEffect,
} from 'vue';
import ChoiceCard from '@/components/ChoiceCard.vue';
import FormField from '@/components/admin/FormField.vue';
import FormSection from '@/components/admin/FormSection.vue';
import SheetPreview from '@/components/admin/rates/imports/SheetPreview.vue';
import InputError from '@/components/InputError.vue';
import NativeSelect from '@/components/NativeSelect.vue';
import { Button } from '@/components/ui/button';
import { Spinner } from '@/components/ui/spinner';
import UnitInput from '@/components/UnitInput.vue';
import { routeName } from '@/lib/pricing';
import {
    columnLetter,
    routeKey,
    routeOf,
    routeOptions,
} from '@/lib/rateImport';
import { mapping as saveMapping } from '@/routes/admin/rates/imports';
import type {
    PriceZone,
    RateImport,
    RateImportLayoutValue,
    RateImportMapping,
} from '@/types';

/**
 * How to read an uploaded sheet, as suggested when it was read, for the
 * admin to check and confirm: the layout, the headings row and the units,
 * then the column of each value (a row per band) or the route of each
 * column and the row of prices per extra kg (weights by route). The
 * preview shows the sheet's first rows with their letters and numbers.
 * Confirming queues every row to be checked; a field the server refuses
 * is focused, as it may be far above the button. A refusal of the whole
 * step comes under "import", which the page shows.
 */
const props = withDefaults(
    defineProps<{
        rateImport: RateImport;
        /** The base card's zones: the routes a column can hold. */
        zones: PriceZone[];
        /** Mapping again after a check: offer Cancel. */
        cancellable?: boolean;
    }>(),
    { cancellable: false },
);

defineEmits<{
    cancel: [];
}>();

const id = `mapping-${useId()}`;

const preview = computed(
    () =>
        props.rateImport.preview ?? {
            sheets: [],
            rows: [],
            columns: 0,
            last_row: 0,
        },
);

const suggested: RateImportMapping = props.rateImport.mapping ?? {
    header_row: preview.value.rows[0]?.number ?? 1,
    weight_unit: 'kg',
    price_unit: 'rm',
};

const text = (value: number | null | undefined): string =>
    value === null || value === undefined ? '' : String(value);

/*
|--------------------------------------------------------------------------
| The mapping as the admin edits it (select values are strings)
|--------------------------------------------------------------------------
*/

const form = useForm({
    layout: (props.rateImport.layout?.value ?? 'long') as RateImportLayoutValue,
    header_row: String(suggested.header_row),
    weight_unit: suggested.weight_unit as string,
    price_unit: suggested.price_unit as string,
    origin: text(suggested.columns?.origin),
    destination: text(suggested.columns?.destination),
    weight: text(suggested.columns?.weight),
    price: text(suggested.columns?.price),
    weight_column: text(suggested.weight_column ?? 0),
    extra_row: text(suggested.extra_row),
});

/** The route chosen for each matrix column, by column index ("" = not a route). */
const routeByColumn = reactive<Record<number, string>>(
    Object.fromEntries(
        (suggested.routes ?? []).map((route) => [
            route.column,
            route.origin && route.destination
                ? routeKey(route.origin, route.destination)
                : '',
        ]),
    ),
);

const LAYOUTS = [
    {
        value: 'long' as const,
        title: 'A row per weight band',
        hint: 'Origin, destination, max weight and price columns.',
    },
    {
        value: 'matrix' as const,
        title: 'Weights by route',
        hint: 'Weights down one column, a column for each route.',
    },
];

const LONG_COLUMNS = [
    { key: 'origin', label: 'Origin zone' },
    { key: 'destination', label: 'Destination zone' },
    { key: 'weight', label: 'Max weight' },
    { key: 'price', label: 'Price' },
] as const;

/*
|--------------------------------------------------------------------------
| What the sheet offers
|--------------------------------------------------------------------------
*/

const headings = computed(
    () =>
        preview.value.rows.find((row) => row.number === Number(form.header_row))
            ?.cells ?? [],
);

/** Every column, named by its letter and heading: "B · Destination". */
const columnChoices = computed(() =>
    Array.from({ length: preview.value.columns }, (_, index) => ({
        value: String(index),
        label: headings.value[index]
            ? `${columnLetter(index)} · ${headings.value[index]}`
            : columnLetter(index),
    })),
);

/** The matrix columns that can hold a route: those with a heading, after the weights. */
const routeColumns = computed(() =>
    headings.value.flatMap((heading, index) =>
        heading !== '' && index !== Number(form.weight_column)
            ? [{ index, heading }]
            : [],
    ),
);

// Every column offered starts as "Not a route" unless the suggestion named one.
watchEffect(() => {
    for (const column of routeColumns.value) {
        routeByColumn[column.index] ??= '';
    }
});

const routeChoices = computed(() =>
    routeOptions(props.zones, (from, to) =>
        routeName(from.name, to.name, from.code === to.code),
    ),
);

/*
|--------------------------------------------------------------------------
| Errors (keys as the server sends them)
|--------------------------------------------------------------------------
*/

/** The routes sent, so "routes.3.origin" can be put back on its column. */
const sentColumns = ref<number[]>([]);

const errors = computed(
    () => form.errors as Record<string, string | undefined>,
);

function routeError(column: number): string | undefined {
    const index = sentColumns.value.indexOf(column);

    return index === -1
        ? undefined
        : (errors.value[`routes.${index}.origin`] ??
              errors.value[`routes.${index}.destination`] ??
              errors.value[`routes.${index}.column`]);
}

const previewDescription = computed(() => {
    const where = props.rateImport.sheet
        ? `the sheet “${props.rateImport.sheet}”`
        : 'the file';

    return preview.value.cut_short
        ? `The first rows of ${where}, which goes on beyond row ${preview.value.last_row.toLocaleString('en-MY')}.`
        : `The first rows of ${where}, ${preview.value.last_row} rows in all.`;
});

/*
|--------------------------------------------------------------------------
| Confirming
|--------------------------------------------------------------------------
*/

const formElement = useTemplateRef<HTMLFormElement>('formElement');

/** Bring the first field the server refused into view. */
function focusFirstError(): void {
    void nextTick(() =>
        formElement.value
            ?.querySelector<HTMLElement>('[aria-invalid="true"]')
            ?.focus(),
    );
}

const number = (value: string): number | null =>
    value.trim() === '' ? null : Number(value);

function submit(): void {
    sentColumns.value = routeColumns.value.map((column) => column.index);

    form.transform((data) => {
        const common = {
            layout: data.layout,
            header_row: Number(data.header_row),
            weight_unit: data.weight_unit,
            price_unit: data.price_unit,
        };

        return data.layout === 'long'
            ? {
                  ...common,
                  columns: {
                      origin: number(data.origin),
                      destination: number(data.destination),
                      weight: number(data.weight),
                      price: number(data.price),
                  },
              }
            : {
                  ...common,
                  weight_column: Number(data.weight_column),
                  extra_row: number(data.extra_row),
                  routes: routeColumns.value.map((column) => ({
                      column: column.index,
                      ...routeOf(routeByColumn[column.index] ?? ''),
                  })),
              };
    }).submit(saveMapping(props.rateImport.id), {
        preserveScroll: true,
        onError: focusFirstError,
    });
}
</script>

<template>
    <form
        ref="formElement"
        class="space-y-6"
        novalidate
        @submit.prevent="submit"
    >
        <FormSection
            title="Layout"
            description="Suggested from the headings. Change anything that is not right."
        >
            <fieldset class="grid gap-2 sm:grid-cols-2">
                <legend class="sr-only">How the sheet is laid out</legend>
                <ChoiceCard
                    v-for="option in LAYOUTS"
                    :key="option.value"
                    v-model="form.layout"
                    :name="`${id}-layout`"
                    :value="option.value"
                    :title="option.title"
                    :hint="option.hint"
                />
            </fieldset>
            <InputError :message="errors.layout" />

            <!-- Three short selects, each column sized to its field, with
                 a note 8px under them. -->
            <div class="grid gap-2">
                <div
                    class="grid gap-5 sm:grid-cols-[repeat(3,minmax(0,13rem))]"
                >
                    <FormField
                        :id="`${id}-header`"
                        label="Headings in row"
                        :error="errors.header_row"
                    >
                        <template #default="{ describedby, invalid }">
                            <NativeSelect
                                :id="`${id}-header`"
                                v-model="form.header_row"
                                :aria-describedby="describedby"
                                :aria-invalid="invalid"
                            >
                                <option
                                    v-for="row in preview.rows"
                                    :key="row.number"
                                    :value="String(row.number)"
                                >
                                    Row {{ row.number }}
                                </option>
                            </NativeSelect>
                        </template>
                    </FormField>
                    <FormField
                        :id="`${id}-weight-unit`"
                        label="Weights in"
                        :error="errors.weight_unit"
                    >
                        <template #default="{ describedby, invalid }">
                            <NativeSelect
                                :id="`${id}-weight-unit`"
                                v-model="form.weight_unit"
                                :aria-describedby="describedby"
                                :aria-invalid="invalid"
                            >
                                <option value="kg">kg</option>
                                <option value="g">grams</option>
                            </NativeSelect>
                        </template>
                    </FormField>
                    <FormField
                        :id="`${id}-price-unit`"
                        label="Prices in"
                        :error="errors.price_unit"
                    >
                        <template #default="{ describedby, invalid }">
                            <NativeSelect
                                :id="`${id}-price-unit`"
                                v-model="form.price_unit"
                                :aria-describedby="describedby"
                                :aria-invalid="invalid"
                            >
                                <option value="rm">ringgit (RM)</option>
                                <option value="sen">sen</option>
                            </NativeSelect>
                        </template>
                    </FormField>
                </div>
                <p class="text-[13px] leading-5 text-muted-foreground">
                    A unit typed in a cell, such as “500&nbsp;g” or
                    “RM&nbsp;9.50”, is used for that cell.
                </p>
            </div>
        </FormSection>

        <FormSection title="Preview" :description="previewDescription">
            <SheetPreview
                :rows="preview.rows"
                :columns="preview.columns"
                :header-row="Number(form.header_row)"
                :extra-row="
                    form.layout === 'matrix' ? number(form.extra_row) : null
                "
            />
        </FormSection>

        <FormSection
            v-if="form.layout === 'long'"
            title="Columns"
            description="Which column holds each value. Rows whose weight says “additional kg” or “per kg” give the price per extra kg."
        >
            <div class="grid gap-5 sm:grid-cols-2">
                <FormField
                    v-for="column in LONG_COLUMNS"
                    :id="`${id}-${column.key}`"
                    :key="column.key"
                    :label="column.label"
                    :error="errors[`columns.${column.key}`]"
                >
                    <template #default="{ describedby, invalid }">
                        <NativeSelect
                            :id="`${id}-${column.key}`"
                            v-model="form[column.key]"
                            :aria-describedby="describedby"
                            :aria-invalid="invalid"
                        >
                            <option value="" disabled>Choose a column</option>
                            <option
                                v-for="choice in columnChoices"
                                :key="choice.value"
                                :value="choice.value"
                            >
                                {{ choice.label }}
                            </option>
                        </NativeSelect>
                    </template>
                </FormField>
            </div>
        </FormSection>

        <FormSection
            v-else
            title="Routes"
            description="The column with the weights, the route each other column holds, and the row of prices per extra kg."
        >
            <div class="grid gap-5 sm:grid-cols-2">
                <FormField
                    :id="`${id}-weight-column`"
                    label="Weights in column"
                    :error="errors.weight_column"
                >
                    <template #default="{ describedby, invalid }">
                        <NativeSelect
                            :id="`${id}-weight-column`"
                            v-model="form.weight_column"
                            :aria-describedby="describedby"
                            :aria-invalid="invalid"
                        >
                            <option
                                v-for="choice in columnChoices"
                                :key="choice.value"
                                :value="choice.value"
                            >
                                {{ choice.label }}
                            </option>
                        </NativeSelect>
                    </template>
                </FormField>
                <FormField
                    :id="`${id}-extra-row`"
                    label="Price per extra kg in row"
                    optional
                    hint="Empty: the row whose weight says “additional kg”."
                    :error="errors.extra_row"
                >
                    <template #default="{ describedby, invalid }">
                        <UnitInput
                            :id="`${id}-extra-row`"
                            v-model="form.extra_row"
                            inputmode="numeric"
                            maxlength="6"
                            autocomplete="off"
                            :aria-describedby="describedby"
                            :aria-invalid="invalid"
                            class="sm:max-w-40"
                        />
                    </template>
                </FormField>
            </div>

            <fieldset class="grid gap-3">
                <legend class="mb-1 text-[15px] leading-5 font-bold text-ink">
                    Route of each column
                </legend>
                <p class="text-[13px] leading-5 text-muted-foreground">
                    Each column with a heading, after the weights.
                </p>
                <p
                    v-if="routeColumns.length === 0"
                    class="rounded-xl border border-dashed border-line-strong px-5 py-6 text-sm text-muted-foreground"
                >
                    The headings row has no other columns. Choose the row with
                    the route names.
                </p>
                <div v-else class="grid gap-5 sm:grid-cols-2">
                    <FormField
                        v-for="column in routeColumns"
                        :id="`${id}-route-${column.index}`"
                        :key="column.index"
                        :label="`${columnLetter(column.index)} · ${column.heading}`"
                        :error="routeError(column.index)"
                    >
                        <template #default="{ describedby, invalid }">
                            <NativeSelect
                                :id="`${id}-route-${column.index}`"
                                v-model="routeByColumn[column.index]"
                                :aria-describedby="describedby"
                                :aria-invalid="invalid"
                            >
                                <option value="">Not a route</option>
                                <option
                                    v-for="choice in routeChoices"
                                    :key="choice.value"
                                    :value="choice.value"
                                >
                                    {{ choice.label }}
                                </option>
                            </NativeSelect>
                        </template>
                    </FormField>
                </div>
                <InputError :message="errors.routes" />
            </fieldset>
        </FormSection>

        <div
            class="flex flex-col gap-2.5 sm:flex-row sm:items-center sm:justify-end"
        >
            <Button
                v-if="cancellable"
                type="button"
                variant="outline"
                class="h-12 rounded-lg px-5 text-[15px] font-bold"
                @click="$emit('cancel')"
            >
                Cancel
            </Button>
            <Button
                type="submit"
                :disabled="form.processing"
                class="h-12 rounded-lg px-6 text-[15px] font-bold hover:bg-brand-strong"
            >
                <Spinner v-if="form.processing" />
                <ListChecks v-else aria-hidden="true" />
                Check every row
            </Button>
        </div>
    </form>
</template>
