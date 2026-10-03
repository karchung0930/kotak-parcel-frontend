<script setup lang="ts">
import { Head, Link, useForm } from '@inertiajs/vue3';
import { Plus, Trash2, TriangleAlert } from '@lucide/vue';
import { computed, nextTick, reactive, ref } from 'vue';
import { toast } from 'vue-sonner';
import FormField from '@/components/admin/FormField.vue';
import FormSection from '@/components/admin/FormSection.vue';
import InputError from '@/components/InputError.vue';
import Notice from '@/components/Notice.vue';
import PageHeader from '@/components/PageHeader.vue';
import RouteTitle from '@/components/RouteTitle.vue';
import { Button } from '@/components/ui/button';
import { Checkbox } from '@/components/ui/checkbox';
import { Input } from '@/components/ui/input';
import { Spinner } from '@/components/ui/spinner';
import { Textarea } from '@/components/ui/textarea';
import UnitInput from '@/components/UnitInput.vue';
import { formatKg } from '@/lib/format';
import {
    kgToGrams,
    ringgitToSen,
    routeName,
    senToRinggit,
} from '@/lib/pricing';
import { index, show, update } from '@/routes/admin/rates';
import type {
    AdminRatesEditPageProps,
    MalaysianStateValue,
    Option,
} from '@/types';

/**
 * The draft editor: the version's details, its zones (a name and the
 * states in it; a state can only be in one zone) and its prices as a grid:
 * a row per weight band, a column per route between zones, prices typed in
 * ringgit, and a last row for the price per extra kg above the highest band.
 *
 * A route's empty box means it has no band at that weight. A draft may be
 * saved unfinished; its page lists what is missing before it can be
 * published. Values are checked here first, so a typo is pointed at in
 * the grid; the server checks them again.
 */
const props = defineProps<AdminRatesEditPageProps>();

type ZoneDraft = { key: string; name: string; states: MalaysianStateValue[] };
type BandRow = { key: string; kg: string; prices: Record<string, string> };

let lastKey = 0;
const newKey = (prefix: string): string => `${prefix}${++lastKey}`;

const routeKey = (from: string, to: string): string => `${from}>${to}`;

/*
|--------------------------------------------------------------------------
| The draft as the admin edits it
|--------------------------------------------------------------------------
*/

const zoneKeys = new Map<number, string>();

const zones = ref<ZoneDraft[]>(
    (props.rateCard.zones ?? []).map((zone) => {
        const key = newKey('zone');
        zoneKeys.set(zone.id, key);

        return { key, name: zone.name, states: [...zone.states] };
    }),
);

const routes = props.rateCard.routes ?? [];

// One row per weight that any route has a band for, lightest first.
const weights = [
    ...new Set(
        routes.flatMap((route) => route.bands.map((b) => b.max_weight_g)),
    ),
].sort((a, b) => a - b);

const rows = ref<BandRow[]>(
    weights.map((grams) => ({
        key: newKey('band'),
        kg: String(grams / 1000),
        prices: {},
    })),
);

const extras = ref<Record<string, string>>({});

for (const route of routes) {
    const key = routeKey(
        zoneKeys.get(route.origin_zone_id) ?? '',
        zoneKeys.get(route.destination_zone_id) ?? '',
    );

    for (const band of route.bands) {
        const row = rows.value[weights.indexOf(band.max_weight_g)];

        if (row) {
            row.prices[key] = senToRinggit(band.price_sen);
        }
    }

    extras.value[key] = senToRinggit(route.extra_kg_sen);
}

if (rows.value.length === 0) {
    rows.value.push({ key: newKey('band'), kg: '1', prices: {} });
}

const details = reactive({
    name: props.rateCard.name,
    divisor: String(props.rateCard.volumetric_divisor),
    notes: props.rateCard.notes ?? '',
});

/*
|--------------------------------------------------------------------------
| Zones
|--------------------------------------------------------------------------
*/

/** The zone each state is in (the first, if a draft has it twice). */
const zoneOf = computed(() => {
    const owners = new Map<string, ZoneDraft>();

    for (const zone of zones.value) {
        for (const state of zone.states) {
            if (!owners.has(state)) {
                owners.set(state, zone);
            }
        }
    }

    return owners;
});

const unzoned = computed(() =>
    props.states.filter((state) => !zoneOf.value.has(state.value)),
);

/** The states this zone can take: its own and those in no zone. */
function choosable(zone: ZoneDraft): Option<MalaysianStateValue>[] {
    return props.states.filter((state) => {
        const owner = zoneOf.value.get(state.value);

        // A state a draft has in two zones stays listed in both, to untick.
        return (
            !owner ||
            owner.key === zone.key ||
            zone.states.includes(state.value)
        );
    });
}

/** The other zones' states, by zone: "Sarawak: Sarawak". */
function elsewhere(zone: ZoneDraft): string[] {
    const label = (value: MalaysianStateValue): string =>
        props.states.find((state) => state.value === value)?.label ?? value;

    return zones.value
        .filter((other) => other.key !== zone.key && other.states.length > 0)
        .map(
            (other) =>
                `${other.name || 'Unnamed zone'}: ${other.states.map(label).join(', ')}`,
        );
}

function toggleState(
    zone: ZoneDraft,
    state: MalaysianStateValue,
    checked: boolean | 'indeterminate',
): void {
    zone.states =
        checked === true
            ? [...new Set([...zone.states, state])]
            : zone.states.filter((item) => item !== state);
}

function addZone(): void {
    const zone = { key: newKey('zone'), name: '', states: [] };
    zones.value.push(zone);

    void nextTick(() => document.getElementById(`${zone.key}-name`)?.focus());
}

/**
 * Remove a zone, with every price to and from it, and keep the keyboard in
 * the same place: on the next zone's name, or "Add zone" after the last.
 */
function removeZone(zone: ZoneDraft): void {
    const index = zones.value.findIndex((item) => item.key === zone.key);

    zones.value = zones.value.filter((item) => item.key !== zone.key);

    // Say what went, unless it was a zone just added and left empty.
    if (zone.name.trim() !== '' || zone.states.length > 0) {
        toast(`Removed ${zone.name.trim() || 'the zone'} and its prices.`);
    }

    const next = zones.value[index];

    void nextTick(() =>
        document
            .getElementById(next ? `${next.key}-name` : 'add-zone')
            ?.focus(),
    );
}

/*
|--------------------------------------------------------------------------
| Prices: a column per route, a row per weight band
|--------------------------------------------------------------------------
*/

const columns = computed(() =>
    zones.value.flatMap((from) =>
        zones.value.map((to) => ({
            key: routeKey(from.key, to.key),
            from,
            to,
            label: routeName(
                from.name || 'Unnamed zone',
                to.name || 'Unnamed zone',
                from.key === to.key,
            ),
        })),
    ),
);

function addRow(): void {
    const row = { key: newKey('band'), kg: '', prices: {} };
    rows.value.push(row);

    void nextTick(() => document.getElementById(`${row.key}-kg`)?.focus());
}

/**
 * Remove a band row with its prices, and keep the keyboard in the same
 * place: on the next row's weight, or "Add weight band" after the last.
 */
function removeRow(row: BandRow): void {
    const index = rows.value.findIndex((item) => item.key === row.key);

    if (hasPrice(row)) {
        toast(`Removed the band up to ${rowLabel(row)} and its prices.`);
    }

    rows.value = rows.value.filter((item) => item.key !== row.key);

    const next = rows.value[index];

    void nextTick(() =>
        document.getElementById(next ? `${next.key}-kg` : 'add-band')?.focus(),
    );
}

/** "2 kg", or the weight as typed while it is not a number yet. */
function rowLabel(row: BandRow): string {
    const grams = kgToGrams(row.kg);

    return Number.isFinite(grams) && grams > 0
        ? formatKg(grams)
        : row.kg || 'a new band';
}

const hasPrice = (row: BandRow): boolean =>
    columns.value.some(
        (column) => (row.prices[column.key] ?? '').trim() !== '',
    );

/*
|--------------------------------------------------------------------------
| Checking and saving
|--------------------------------------------------------------------------
|
| Errors are keyed by what they belong to: "name", "divisor",
| "zone:<key>:name", "row:<key>", "cell:<route>:<row>" and
| "extra:<route>". The server's keys (zones.0.name,
| routes.2.bands.1.price_sen …) are translated back through what was sent.
|
*/

const clientErrors = ref<Record<string, string>>({});

type Sent = {
    zoneKeys: string[];
    routes: { key: string; rowKeys: string[] }[];
};

const sent = ref<Sent | null>(null);

const form = useForm({
    name: '',
    volumetric_divisor: 0,
    notes: null as string | null,
    zones: [] as { name: string; states: MalaysianStateValue[] }[],
    routes: [] as {
        origin: number;
        destination: number;
        extra_kg_sen: number | null;
        bands: { max_weight_g: number; price_sen: number }[];
    }[],
});

const serverErrors = computed(() => {
    const mapped: Record<string, string> = {};
    const routesSent = sent.value?.routes ?? [];
    const zonesSent = sent.value?.zoneKeys ?? [];

    for (const [key, message] of Object.entries(
        form.errors as Record<string, string>,
    )) {
        const zone = /^zones\.(\d+)\.(name|states)/.exec(key);
        const band =
            /^routes\.(\d+)\.bands\.(\d+)\.(max_weight_g|price_sen)$/.exec(key);
        const extra = /^routes\.(\d+)\.extra_kg_sen$/.exec(key);

        if (key === 'volumetric_divisor') {
            mapped.divisor = message;
        } else if (key === 'name' || key === 'notes') {
            mapped[key] = message;
        } else if (zone) {
            mapped[`zone:${zonesSent[Number(zone[1])]}:${zone[2]}`] = message;
        } else if (band) {
            const route = routesSent[Number(band[1])];
            const row = route?.rowKeys[Number(band[2])];

            mapped[
                band[3] === 'price_sen'
                    ? `cell:${route?.key}:${row}`
                    : `row:${row}`
            ] = message;
        } else if (extra) {
            mapped[`extra:${routesSent[Number(extra[1])]?.key}`] = message;
        } else {
            mapped.other = message;
        }
    }

    return mapped;
});

function error(key: string): string | undefined {
    return clientErrors.value[key] ?? serverErrors.value[key];
}

/** The id of a grid problem's line under the grid ("cell:a>b:c" → "grid-error-cell-a-b-c"). */
const gridErrorId = (key: string): string =>
    `grid-error-${key.replace(/[^a-z0-9]+/gi, '-')}`;

/** A grid box's invalid state and the line that says why, for screen readers. */
function gridField(key: string): {
    'aria-invalid': true | undefined;
    'aria-describedby': string | undefined;
} {
    const invalid = error(key) !== undefined;

    return {
        'aria-invalid': invalid ? true : undefined,
        'aria-describedby': invalid ? gridErrorId(key) : undefined,
    };
}

/** Grid problems, listed under the grid with where they are. */
const gridErrors = computed(() => {
    const list: { key: string; message: string }[] = [];

    for (const row of rows.value) {
        const rowError = error(`row:${row.key}`);

        if (rowError) {
            list.push({
                key: `row:${row.key}`,
                message: `Band ${rowLabel(row)}: ${rowError}`,
            });
        }

        for (const column of columns.value) {
            const cellError = error(`cell:${column.key}:${row.key}`);

            if (cellError) {
                list.push({
                    key: `cell:${column.key}:${row.key}`,
                    message: `${column.label}, up to ${rowLabel(row)}: ${cellError}`,
                });
            }
        }
    }

    for (const column of columns.value) {
        const extraError = error(`extra:${column.key}`);

        if (extraError) {
            list.push({
                key: `extra:${column.key}`,
                message: `${column.label}, each extra kg: ${extraError}`,
            });
        }
    }

    return list;
});

const PRICE_ERROR = 'Enter a price like 8.50.';

/** Check what can be checked here, so a typo is pointed at before saving. */
function check(): Record<string, string> {
    const errors: Record<string, string> = {};
    const maxKg = props.maxWeightG / 1000;

    if (details.name.trim() === '') {
        errors.name = 'Name this version, e.g. "Rates from 1 January".';
    }

    const divisor = Number(details.divisor.trim());

    if (
        !/^\d+$/.test(details.divisor.trim()) ||
        divisor < 1000 ||
        divisor > 10000
    ) {
        errors.divisor = 'Enter a whole number from 1000 to 10000.';
    }

    const names = new Set<string>();

    for (const zone of zones.value) {
        const name = zone.name.trim().toLowerCase().replace(/\s+/g, ' ');

        if (name === '') {
            errors[`zone:${zone.key}:name`] = 'Name the zone.';
        } else if (names.has(name)) {
            errors[`zone:${zone.key}:name`] =
                'Another zone already has this name.';
        }

        names.add(name);
    }

    const seen = new Set<number>();

    for (const row of rows.value) {
        if (!hasPrice(row)) {
            continue;
        }

        const grams = kgToGrams(row.kg);

        if (!Number.isFinite(grams) || grams <= 0 || grams > props.maxWeightG) {
            errors[`row:${row.key}`] =
                `Enter a weight above 0 and up to ${maxKg} kg.`;
        } else if (seen.has(grams)) {
            errors[`row:${row.key}`] = 'This weight is already a band.';
        }

        seen.add(grams);

        for (const column of columns.value) {
            const price = (row.prices[column.key] ?? '').trim();

            if (price !== '' && Number.isNaN(ringgitToSen(price))) {
                errors[`cell:${column.key}:${row.key}`] = PRICE_ERROR;
            }
        }
    }

    for (const column of columns.value) {
        const price = (extras.value[column.key] ?? '').trim();

        if (price !== '' && Number.isNaN(ringgitToSen(price))) {
            errors[`extra:${column.key}`] = PRICE_ERROR;
        }
    }

    return errors;
}

function focusFirstError(): void {
    void nextTick(() =>
        document
            .querySelector<HTMLElement>('main [aria-invalid="true"]')
            ?.focus(),
    );
}

function submit(): void {
    clientErrors.value = check();
    form.clearErrors();

    if (Object.keys(clientErrors.value).length > 0) {
        focusFirstError();

        return;
    }

    const zoneIndex = new Map(zones.value.map((zone, i) => [zone.key, i]));
    const routesSent: Sent['routes'] = [];

    form.name = details.name.trim();
    form.volumetric_divisor = Number(details.divisor.trim());
    form.notes = details.notes.trim() === '' ? null : details.notes.trim();
    form.zones = zones.value.map((zone) => ({
        name: zone.name.trim(),
        states: zone.states,
    }));
    form.routes = columns.value.flatMap((column) => {
        const priced = rows.value.filter(
            (row) => (row.prices[column.key] ?? '').trim() !== '',
        );
        const extra = (extras.value[column.key] ?? '').trim();

        if (priced.length === 0 && extra === '') {
            return [];
        }

        routesSent.push({
            key: column.key,
            rowKeys: priced.map((row) => row.key),
        });

        return [
            {
                origin: zoneIndex.get(column.from.key) ?? 0,
                destination: zoneIndex.get(column.to.key) ?? 0,
                extra_kg_sen: extra === '' ? null : ringgitToSen(extra),
                bands: priced.map((row) => ({
                    max_weight_g: kgToGrams(row.kg),
                    price_sen: ringgitToSen(row.prices[column.key] ?? ''),
                })),
            },
        ];
    });

    sent.value = {
        zoneKeys: zones.value.map((zone) => zone.key),
        routes: routesSent,
    };

    form.submit(update(props.rateCard.id), {
        // Stay put to fix errors; the draft's page opens at the top.
        preserveScroll: 'errors',
        onError: focusFirstError,
    });
}

const breadcrumbs = computed(() => [
    { title: 'Rates', href: index() },
    { title: props.rateCard.name, href: show(props.rateCard.id) },
]);

/*
 * The grid's weight column stays put from 640px while the prices scroll
 * under it; its cells share the row's opaque colour and a 1px edge marks
 * where the prices slide under.
 */
const stickyClass =
    'w-px whitespace-nowrap sm:sticky sm:left-0 sm:z-10 sm:shadow-[inset_-1px_0_0_var(--color-line)]';
// Every route column is as wide; headers wrap inside it. The gap between
// two boxes is the cells' padding, 16px, as after the weight column.
const routeCellClass = 'w-32 px-2';
// The extra-kg row's tint as one opaque colour, so the sticky cell matches.
const extraRowClass = 'bg-[color-mix(in_srgb,var(--color-surface)_60%,white)]';
</script>

<template>
    <Head :title="`Edit ${rateCard.name}`" />

    <div class="max-w-6xl space-y-6">
        <PageHeader
            :title="`Edit ${rateCard.name}`"
            :breadcrumbs="breadcrumbs"
            description="Drafts can be saved unfinished. Publish from the draft's page."
        />

        <Notice
            v-if="serverErrors.other"
            tone="warning"
            :icon="TriangleAlert"
            title="The draft was not saved"
        >
            {{ serverErrors.other }}
        </Notice>

        <form class="space-y-5" novalidate @submit.prevent="submit">
            <FormSection
                title="Version"
                description="Staff see the name at the counter and on order details."
            >
                <div class="grid gap-5 sm:grid-cols-[minmax(0,1fr)_14rem]">
                    <FormField
                        id="rate-card-name"
                        label="Name"
                        hint="e.g. Rates from 1 January 2027"
                        :error="error('name')"
                    >
                        <template #default="{ describedby, invalid }">
                            <Input
                                id="rate-card-name"
                                v-model="details.name"
                                required
                                maxlength="100"
                                autocomplete="off"
                                :aria-describedby="describedby"
                                :aria-invalid="invalid"
                                class="h-11 rounded-lg bg-white text-base md:text-[15px]"
                            />
                        </template>
                    </FormField>
                    <FormField
                        id="rate-card-divisor"
                        label="Size weight divisor"
                        hint="L × W × H (cm) ÷ this. 5000 is usual."
                        :error="error('divisor')"
                    >
                        <template #default="{ describedby, invalid }">
                            <Input
                                id="rate-card-divisor"
                                v-model="details.divisor"
                                required
                                inputmode="numeric"
                                maxlength="5"
                                autocomplete="off"
                                :aria-describedby="describedby"
                                :aria-invalid="invalid"
                                class="h-11 rounded-lg bg-white font-mono text-base md:text-[15px]"
                            />
                        </template>
                    </FormField>
                </div>
                <FormField
                    id="rate-card-notes"
                    label="Notes"
                    optional
                    hint="For admins only, e.g. why the prices changed."
                    :error="error('notes')"
                >
                    <template #default="{ describedby, invalid }">
                        <!-- Grows with the note (two lines at least), so no
                             line is cut off at the bottom edge. -->
                        <Textarea
                            id="rate-card-notes"
                            v-model="details.notes"
                            rows="2"
                            maxlength="2000"
                            :aria-describedby="describedby"
                            :aria-invalid="invalid"
                            class="field-sizing-content max-h-60 min-h-[70px]"
                        />
                    </template>
                </FormField>
            </FormSection>

            <FormSection
                title="Zones"
                description="Group the states that cost the same. A state can only be in one zone."
            >
                <div
                    v-for="(zone, zoneIndex) in zones"
                    :key="zone.key"
                    class="rounded-xl border border-line p-4"
                >
                    <!-- The button lines up with the field, under its label. -->
                    <div class="flex items-start gap-3">
                        <FormField
                            :id="`${zone.key}-name`"
                            :label="`Zone ${zoneIndex + 1}`"
                            :error="error(`zone:${zone.key}:name`)"
                            class="flex-1"
                        >
                            <template #default="{ describedby, invalid }">
                                <Input
                                    :id="`${zone.key}-name`"
                                    v-model="zone.name"
                                    required
                                    maxlength="60"
                                    autocomplete="off"
                                    placeholder="e.g. Peninsular Malaysia"
                                    :aria-describedby="describedby"
                                    :aria-invalid="invalid"
                                    class="h-11 rounded-lg bg-white text-base font-bold md:text-[15px]"
                                />
                            </template>
                        </FormField>
                        <Button
                            type="button"
                            variant="outline"
                            class="mt-[26px] h-11 min-w-11 flex-none rounded-lg px-3.5 font-bold"
                            @click="removeZone(zone)"
                        >
                            <Trash2 aria-hidden="true" />
                            <span class="max-sm:sr-only">Remove</span>
                            <span class="sr-only">
                                {{ zone.name || `zone ${zoneIndex + 1}` }}
                            </span>
                        </Button>
                    </div>

                    <!-- Only the states free to choose are listed: those in
                         this zone and those in none. States in other zones
                         are named under them, to be moved from there. -->
                    <fieldset class="mt-4">
                        <legend class="text-sm leading-5 font-bold text-ink">
                            States in this zone
                        </legend>
                        <!-- Each row is a 44px target on touch screens, with
                             the same 44px rhythm as with a mouse. -->
                        <div
                            v-if="choosable(zone).length > 0"
                            class="mt-2 grid grid-cols-1 gap-x-4 gap-y-1 min-[400px]:grid-cols-2 md:grid-cols-3 2xl:grid-cols-4 pointer-coarse:gap-y-0"
                        >
                            <label
                                v-for="state in choosable(zone)"
                                :key="state.value"
                                class="flex min-h-10 cursor-pointer items-center gap-2.5 text-sm leading-5 text-ink pointer-coarse:min-h-11"
                            >
                                <Checkbox
                                    :model-value="
                                        zone.states.includes(state.value)
                                    "
                                    class="size-[18px]"
                                    @update:model-value="
                                        toggleState(zone, state.value, $event)
                                    "
                                />
                                {{ state.label }}
                            </label>
                        </div>
                        <p
                            v-if="elsewhere(zone).length > 0"
                            class="mt-2 text-[13px] leading-5 text-pretty text-muted-foreground"
                        >
                            In other zones:
                            {{ elsewhere(zone).join('; ') }}.
                        </p>
                        <InputError
                            :message="error(`zone:${zone.key}:states`)"
                            class="mt-2"
                        />
                    </fieldset>
                </div>

                <!-- Out of the flow while empty, so it adds no second gap. -->
                <div aria-live="polite" class="empty:absolute">
                    <Notice
                        v-if="unzoned.length > 0 && zones.length > 0"
                        tone="warning"
                        :icon="TriangleAlert"
                    >
                        Not in any zone yet:
                        {{ unzoned.map((state) => state.label).join(', ') }}.
                        Every state needs a zone before publishing.
                    </Notice>
                </div>

                <Button
                    id="add-zone"
                    type="button"
                    variant="outline"
                    class="h-11 w-fit rounded-lg px-4 font-bold"
                    @click="addZone"
                >
                    <Plus aria-hidden="true" />
                    Add zone
                </Button>
            </FormSection>

            <FormSection
                title="Prices"
                description="In ringgit. A row per weight band, a column per route. Leave a box empty where a route has no band at that weight."
            >
                <p
                    v-if="columns.length === 0"
                    class="rounded-xl border border-dashed border-line-strong px-5 py-6 text-sm text-muted-foreground"
                >
                    Add a zone to set prices.
                </p>

                <template v-else>
                    <!-- Scrolls sideways inside the card when the routes do
                         not fit. From 640px the weight column stays put while
                         it scrolls, and scroll-padding keeps a focused box
                         clear of it; on phones it scrolls with the prices.
                         The last, empty column takes any spare width, so the
                         route columns keep one width and one gap. -->
                    <div
                        class="overflow-x-auto rounded-xl border border-line sm:scroll-pl-56"
                    >
                        <table class="w-max min-w-full text-left text-sm">
                            <caption class="sr-only">
                                Prices in ringgit by weight band and route
                            </caption>
                            <thead
                                class="border-b border-line bg-surface text-[12.5px] leading-4 font-bold text-ink-2"
                            >
                                <tr>
                                    <th
                                        scope="col"
                                        :class="[
                                            'bg-surface py-2.5 pr-2 pl-5 align-bottom',
                                            stickyClass,
                                        ]"
                                    >
                                        Weight band
                                    </th>
                                    <th
                                        v-for="column in columns"
                                        :key="column.key"
                                        scope="col"
                                        :class="[
                                            'py-2.5 align-bottom',
                                            routeCellClass,
                                        ]"
                                    >
                                        <RouteTitle :title="column.label" />
                                    </th>
                                    <td aria-hidden="true" class="pl-3" />
                                </tr>
                            </thead>
                            <tbody class="divide-y divide-line-soft">
                                <tr v-for="row in rows" :key="row.key">
                                    <th
                                        scope="row"
                                        :class="[
                                            'bg-white py-2 pr-2 pl-5 font-normal',
                                            stickyClass,
                                        ]"
                                    >
                                        <div class="flex items-center gap-1.5">
                                            <span
                                                class="text-[13px] font-semibold whitespace-nowrap text-muted-foreground"
                                            >
                                                Up to
                                            </span>
                                            <UnitInput
                                                :id="`${row.key}-kg`"
                                                v-model="row.kg"
                                                unit="kg"
                                                inputmode="decimal"
                                                autocomplete="off"
                                                placeholder="1"
                                                :aria-label="`Band ${rowLabel(row)}: weight in kg`"
                                                v-bind="
                                                    gridField(`row:${row.key}`)
                                                "
                                                class="w-24"
                                            />
                                            <Button
                                                type="button"
                                                variant="outline"
                                                size="icon"
                                                class="size-11 flex-none rounded-lg text-ink-2"
                                                @click="removeRow(row)"
                                            >
                                                <Trash2
                                                    aria-hidden="true"
                                                    class="size-[18px]"
                                                />
                                                <span class="sr-only">
                                                    Remove the band up to
                                                    {{ rowLabel(row) }}
                                                </span>
                                            </Button>
                                        </div>
                                    </th>
                                    <td
                                        v-for="column in columns"
                                        :key="column.key"
                                        :class="['py-2', routeCellClass]"
                                    >
                                        <Input
                                            v-model="row.prices[column.key]"
                                            inputmode="decimal"
                                            autocomplete="off"
                                            :aria-label="`${column.label}, up to ${rowLabel(row)}: price in ringgit`"
                                            v-bind="
                                                gridField(
                                                    `cell:${column.key}:${row.key}`,
                                                )
                                            "
                                            class="h-11 w-full rounded-lg bg-white font-mono text-base tabular-nums md:text-[15px]"
                                        />
                                    </td>
                                    <td aria-hidden="true" class="pl-3" />
                                </tr>
                                <tr :class="extraRowClass">
                                    <th
                                        scope="row"
                                        :class="[
                                            'py-2 pr-2 pl-5 text-[13px] font-semibold whitespace-nowrap text-ink-2',
                                            extraRowClass,
                                            stickyClass,
                                        ]"
                                    >
                                        Each kg over the top band
                                    </th>
                                    <td
                                        v-for="column in columns"
                                        :key="column.key"
                                        :class="['py-2', routeCellClass]"
                                    >
                                        <Input
                                            v-model="extras[column.key]"
                                            inputmode="decimal"
                                            autocomplete="off"
                                            :aria-label="`${column.label}: price for each extra kg, in ringgit`"
                                            v-bind="
                                                gridField(`extra:${column.key}`)
                                            "
                                            class="h-11 w-full rounded-lg bg-white font-mono text-base tabular-nums md:text-[15px]"
                                        />
                                    </td>
                                    <td aria-hidden="true" class="pl-3" />
                                </tr>
                            </tbody>
                        </table>
                    </div>

                    <!-- Always there, so screen readers hear problems as they
                         appear; each box points at its line. Out of the
                         flow while empty, so it adds no second gap. -->
                    <div aria-live="polite" class="empty:absolute">
                        <ul v-if="gridErrors.length > 0" class="grid gap-1">
                            <li
                                v-for="item in gridErrors"
                                :id="gridErrorId(item.key)"
                                :key="item.key"
                            >
                                <InputError :message="item.message" />
                            </li>
                        </ul>
                    </div>

                    <Button
                        id="add-band"
                        type="button"
                        variant="outline"
                        class="h-11 w-fit rounded-lg px-4 font-bold"
                        @click="addRow"
                    >
                        <Plus aria-hidden="true" />
                        Add weight band
                    </Button>
                </template>
            </FormSection>

            <div
                class="flex flex-col gap-2.5 sm:flex-row sm:items-center sm:justify-end"
            >
                <Button
                    variant="outline"
                    as-child
                    class="h-12 rounded-lg px-5 text-[15px] font-bold"
                >
                    <Link :href="show(rateCard.id)">Cancel</Link>
                </Button>
                <Button
                    type="submit"
                    :disabled="form.processing"
                    class="h-12 rounded-lg px-6 text-[15px] font-bold"
                >
                    <Spinner v-if="form.processing" />
                    Save draft
                </Button>
            </div>
        </form>
    </div>
</template>
