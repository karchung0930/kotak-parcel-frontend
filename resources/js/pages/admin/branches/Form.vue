<script setup lang="ts">
import { Head, Link, useForm } from '@inertiajs/vue3';
import { ExternalLink, TriangleAlert } from '@lucide/vue';
import { computed, nextTick } from 'vue';
import FormField from '@/components/admin/FormField.vue';
import FormSection from '@/components/admin/FormSection.vue';
import NativeSelect from '@/components/admin/NativeSelect.vue';
import SwitchField from '@/components/admin/SwitchField.vue';
import InputError from '@/components/InputError.vue';
import PageHeader from '@/components/PageHeader.vue';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Spinner } from '@/components/ui/spinner';
import { mapSearchUrl } from '@/lib/branches';
import { create, edit, index, store, update } from '@/routes/admin/branches';
import type { AdminBranchesFormPageProps, MalaysianStateValue } from '@/types';

const props = defineProps<AdminBranchesFormPageProps>();

const title = computed(() =>
    props.branch ? `Edit ${props.branch.name}` : 'Add a branch',
);

const description = computed(() => {
    const branch = props.branch;

    if (!branch) {
        return 'A new drop-off point. Customers see it on the branches page and when they send a parcel.';
    }

    const place =
        branch.city === branch.state
            ? branch.city
            : `${branch.city}, ${branch.state}`;

    return `${branch.code} · ${place}`;
});

const breadcrumbs = computed(() => [
    { title: 'Branches', href: index() },
    {
        title: props.branch ? props.branch.name : 'Add a branch',
        href: props.branch ? edit(props.branch.id) : create(),
    },
]);

const form = useForm({
    code: props.branch?.code ?? '',
    name: props.branch?.name ?? '',
    address: props.branch?.address ?? '',
    city: props.branch?.city ?? '',
    postcode: props.branch?.postcode ?? '',
    state: props.branch?.state ?? ('' as MalaysianStateValue | ''),
    phone: props.branch?.phone ?? '',
    latitude: props.branch ? String(props.branch.latitude) : '',
    longitude: props.branch ? String(props.branch.longitude) : '',
    opening_hours: props.branch?.opening_hours ?? '',
    is_active: props.branch?.is_active ?? true,
});

const errors = computed(() => form.errors as Partial<Record<string, string>>);

/*
|--------------------------------------------------------------------------
| Map location
|--------------------------------------------------------------------------
|
| Google Maps copies a point as "3.1177, 101.6168": pasting that into
| either field fills both. The same bounds as the server keep the point
| in Malaysia, so the nearest-branch finder stays meaningful.
|
*/

const COORDINATES = /^\s*(-?\d{1,3}(?:\.\d+)?)\s*,\s*(-?\d{1,3}(?:\.\d+)?)\s*$/;

function pasteCoordinates(event: ClipboardEvent): void {
    const match = COORDINATES.exec(event.clipboardData?.getData('text') ?? '');

    if (!match) {
        return;
    }

    event.preventDefault();
    form.latitude = match[1];
    form.longitude = match[2];
    form.clearErrors('latitude', 'longitude');
}

const point = computed(() => {
    const latitude = Number.parseFloat(form.latitude);
    const longitude = Number.parseFloat(form.longitude);

    return Number.isFinite(latitude) && Number.isFinite(longitude)
        ? { latitude, longitude }
        : null;
});

const outsideMalaysia = computed(
    () =>
        point.value !== null &&
        (point.value.latitude < 0.8 ||
            point.value.latitude > 7.5 ||
            point.value.longitude < 99.5 ||
            point.value.longitude > 119.5),
);

const mapUrl = computed(() => (point.value ? mapSearchUrl(point.value) : null));

function submit(): void {
    form.submit(props.branch ? update(props.branch.id) : store(), {
        preserveScroll: true,
        onError: () =>
            void nextTick(() =>
                document
                    .querySelector<HTMLElement>('main [aria-invalid="true"]')
                    ?.focus(),
            ),
    });
}
</script>

<template>
    <Head :title="title" />

    <div class="max-w-5xl space-y-6">
        <PageHeader
            :title="title"
            :breadcrumbs="breadcrumbs"
            :description="description"
        />

        <form class="space-y-5" novalidate @submit.prevent="submit">
            <FormSection
                title="Branch"
                description="The short code appears on receipts and in staff screens."
            >
                <div class="grid gap-5 sm:grid-cols-[14rem_minmax(0,1fr)]">
                    <FormField
                        id="branch-code"
                        label="Code"
                        hint="Capitals and numbers, e.g. PJ-SS2."
                        :error="errors.code"
                    >
                        <template #default="{ describedby, invalid }">
                            <Input
                                id="branch-code"
                                v-model="form.code"
                                required
                                maxlength="16"
                                autocomplete="off"
                                autocapitalize="characters"
                                spellcheck="false"
                                :aria-describedby="describedby"
                                :aria-invalid="invalid"
                                class="h-11 rounded-lg bg-white font-mono text-base font-bold tracking-[0.04em] uppercase md:text-[15px]"
                            />
                        </template>
                    </FormField>
                    <FormField
                        id="branch-name"
                        label="Name"
                        hint="As customers know it, e.g. Petaling Jaya - SS2."
                        :error="errors.name"
                    >
                        <template #default="{ describedby, invalid }">
                            <Input
                                id="branch-name"
                                v-model="form.name"
                                required
                                maxlength="255"
                                autocomplete="off"
                                :aria-describedby="describedby"
                                :aria-invalid="invalid"
                                class="h-11 rounded-lg bg-white text-base md:text-[15px]"
                            />
                        </template>
                    </FormField>
                </div>
            </FormSection>

            <FormSection
                title="Address"
                description="Where customers bring their parcels."
            >
                <FormField
                    id="branch-address"
                    label="Street address"
                    :error="errors.address"
                >
                    <template #default="{ describedby, invalid }">
                        <Input
                            id="branch-address"
                            v-model="form.address"
                            required
                            maxlength="255"
                            autocomplete="off"
                            :aria-describedby="describedby"
                            :aria-invalid="invalid"
                            class="h-11 rounded-lg bg-white text-base md:text-[15px]"
                        />
                    </template>
                </FormField>
                <!-- A 5-digit postcode needs little room, so it shares a
                     row with the city even on phones -->
                <div
                    class="grid grid-cols-[7rem_minmax(0,1fr)] gap-5 sm:grid-cols-[8rem_minmax(0,1fr)] xl:grid-cols-[8rem_minmax(0,1fr)_minmax(0,1fr)]"
                >
                    <FormField
                        id="branch-postcode"
                        label="Postcode"
                        :error="errors.postcode"
                    >
                        <template #default="{ describedby, invalid }">
                            <Input
                                id="branch-postcode"
                                v-model="form.postcode"
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
                    <FormField
                        id="branch-city"
                        label="City"
                        :error="errors.city"
                    >
                        <template #default="{ describedby, invalid }">
                            <Input
                                id="branch-city"
                                v-model="form.city"
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
                        id="branch-state"
                        label="State"
                        :error="errors.state"
                        class="col-span-2 xl:col-span-1"
                    >
                        <template #default="{ describedby, invalid }">
                            <NativeSelect
                                id="branch-state"
                                v-model="form.state"
                                required
                                :aria-describedby="describedby"
                                :aria-invalid="invalid"
                            >
                                <option value="" disabled>
                                    Choose a state
                                </option>
                                <option
                                    v-for="state in states"
                                    :key="state.value"
                                    :value="state.value"
                                >
                                    {{ state.label }}
                                </option>
                            </NativeSelect>
                        </template>
                    </FormField>
                </div>
            </FormSection>

            <FormSection
                title="Contact and hours"
                description="Shown to customers on the branches page and on receipts."
            >
                <div class="grid gap-5 sm:grid-cols-[14rem_minmax(0,1fr)]">
                    <FormField
                        id="branch-phone"
                        label="Phone"
                        :error="errors.phone"
                    >
                        <template #default="{ describedby, invalid }">
                            <Input
                                id="branch-phone"
                                v-model="form.phone"
                                type="tel"
                                required
                                maxlength="20"
                                inputmode="tel"
                                autocomplete="off"
                                placeholder="03-7877 1234"
                                :aria-describedby="describedby"
                                :aria-invalid="invalid"
                                class="h-11 rounded-lg bg-white font-mono text-base md:text-[15px]"
                            />
                        </template>
                    </FormField>
                    <FormField
                        id="branch-hours"
                        label="Opening hours"
                        hint="e.g. Mon–Fri 9:00–18:00, Sat 9:00–13:00"
                        :error="errors.opening_hours"
                    >
                        <template #default="{ describedby, invalid }">
                            <Input
                                id="branch-hours"
                                v-model="form.opening_hours"
                                required
                                maxlength="255"
                                autocomplete="off"
                                :aria-describedby="describedby"
                                :aria-invalid="invalid"
                                class="h-11 rounded-lg bg-white text-base md:text-[15px]"
                            />
                        </template>
                    </FormField>
                </div>
            </FormSection>

            <FormSection
                title="Map location"
                description="For finding the nearest branch."
            >
                <p class="text-[13px] leading-5 text-ink-2">
                    In Google Maps, right-click the branch and click the numbers
                    at the top to copy them. Paste them into either field below
                    and both are filled in.
                </p>
                <!-- The warning's live region shares a wrapper with the
                     fields, so while empty it adds no gap of its own -->
                <div>
                    <div class="grid gap-5 sm:grid-cols-2">
                        <FormField
                            id="branch-latitude"
                            label="Latitude"
                            hint="Between 0.8 and 7.5, e.g. 3.1177"
                            :error="errors.latitude"
                        >
                            <template #default="{ describedby, invalid }">
                                <Input
                                    id="branch-latitude"
                                    v-model="form.latitude"
                                    required
                                    inputmode="decimal"
                                    autocomplete="off"
                                    :aria-describedby="describedby"
                                    :aria-invalid="invalid"
                                    class="h-11 rounded-lg bg-white font-mono text-base md:text-[15px]"
                                    @paste="pasteCoordinates"
                                />
                            </template>
                        </FormField>
                        <FormField
                            id="branch-longitude"
                            label="Longitude"
                            hint="Between 99.5 and 119.5, e.g. 101.6168"
                            :error="errors.longitude"
                        >
                            <template #default="{ describedby, invalid }">
                                <Input
                                    id="branch-longitude"
                                    v-model="form.longitude"
                                    required
                                    inputmode="decimal"
                                    autocomplete="off"
                                    :aria-describedby="describedby"
                                    :aria-invalid="invalid"
                                    class="h-11 rounded-lg bg-white font-mono text-base md:text-[15px]"
                                    @paste="pasteCoordinates"
                                />
                            </template>
                        </FormField>
                    </div>
                    <div aria-live="polite">
                        <p
                            v-if="outsideMalaysia"
                            class="mt-5 flex items-start gap-1.5 text-[13px] leading-5 font-semibold text-status-failed"
                        >
                            <TriangleAlert
                                aria-hidden="true"
                                class="mt-0.5 size-4 flex-none"
                            />
                            This point is outside Malaysia. Check that latitude
                            and longitude are not swapped.
                        </p>
                    </div>
                </div>
                <a
                    v-if="mapUrl"
                    :href="mapUrl"
                    target="_blank"
                    rel="noopener noreferrer"
                    class="-my-3 inline-flex min-h-11 w-fit items-center gap-1.5 text-sm font-semibold text-brand-strong underline decoration-brand-edge underline-offset-4 hover:text-brand-deep hover:decoration-current"
                >
                    Check the pin on Google Maps
                    <ExternalLink aria-hidden="true" class="size-3.5" />
                    <span class="sr-only">(opens in a new tab)</span>
                </a>
            </FormSection>

            <FormSection
                title="Status"
                description="Branches are never deleted, so past orders keep their branch."
            >
                <SwitchField
                    id="branch-active"
                    v-model="form.is_active"
                    label="Open for new orders"
                    description="Customers can choose this branch when they send a parcel, and staff can be assigned to it. Parcels already here are not affected."
                    on-label="Open"
                    off-label="Closed"
                    :describedby="
                        errors.is_active ? 'branch-active-error' : undefined
                    "
                />
                <InputError
                    id="branch-active-error"
                    :message="errors.is_active"
                />
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
                    class="h-12 rounded-lg px-6 text-[15px] font-bold"
                >
                    <Spinner v-if="form.processing" />
                    {{ branch ? 'Save changes' : 'Create branch' }}
                </Button>
            </div>
        </form>
    </div>
</template>
