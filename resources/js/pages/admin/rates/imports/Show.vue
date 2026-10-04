<script setup lang="ts">
import { Head, Link, useForm, usePage, usePoll } from '@inertiajs/vue3';
import {
    CircleCheck,
    Columns3,
    FilePlus2,
    FileUp,
    Layers,
    ListChecks,
    Rows3,
    TriangleAlert,
} from '@lucide/vue';
import {
    computed,
    nextTick,
    onBeforeUnmount,
    ref,
    useTemplateRef,
    watch,
} from 'vue';
import FormField from '@/components/admin/FormField.vue';
import FormSection from '@/components/admin/FormSection.vue';
import ImportFileField from '@/components/admin/rates/imports/ImportFileField.vue';
import ImportProblems from '@/components/admin/rates/imports/ImportProblems.vue';
import ImportStatusChip from '@/components/admin/rates/imports/ImportStatusChip.vue';
import ImportSteps from '@/components/admin/rates/imports/ImportSteps.vue';
import MappingForm from '@/components/admin/rates/imports/MappingForm.vue';
import SheetChooser from '@/components/admin/rates/imports/SheetChooser.vue';
import FileName from '@/components/FileName.vue';
import Notice from '@/components/Notice.vue';
import PageHeader from '@/components/PageHeader.vue';
import RouteGroups from '@/components/RouteGroups.vue';
import StatCard from '@/components/StatCard.vue';
import TextLink from '@/components/TextLink.vue';
import { Button } from '@/components/ui/button';
import { Spinner } from '@/components/ui/spinner';
import { importStep } from '@/lib/rateImport';
import { index, show as showRateCard } from '@/routes/admin/rates';
import { create, draft, show, store } from '@/routes/admin/rates/imports';
import type { AdminRateImportsShowPageProps } from '@/types';

/**
 * One import, where it stands: being read or checked (the page asks again
 * every two seconds until the job is done), the columns to check, the
 * problems found with a way to upload a fixed file, or the prices ready to
 * become a draft. Once checked, the prices show as the route cards of a
 * rate card, so they can be compared before the draft is made.
 *
 * "Change columns" opens the columns right under the steps, in place of
 * the problems or the checked prices (and of Create draft, which would
 * use the last check). Where the import stands is announced as it
 * changes, and a step the server refuses is shown at the top, scrolled to.
 */
const props = defineProps<AdminRateImportsShowPageProps>();

const page = usePage();

const item = computed(() => props.rateImport);
const status = computed(() => item.value.status.value);
const hasLayout = computed(() => item.value.layout !== null);

/*
|--------------------------------------------------------------------------
| While a job works on the file
|--------------------------------------------------------------------------
*/

const { start, stop } = usePoll(
    2000,
    { only: ['rateImport', 'can'] },
    { autoStart: false },
);

/** Set when a job has been waited for half a minute: the worker may be stopped. */
const waitingLong = ref(false);
let waitTimer: ReturnType<typeof setTimeout> | undefined;

watch(
    () => item.value.is_running,
    (running) => {
        clearTimeout(waitTimer);
        waitingLong.value = false;

        if (running) {
            start();
            waitTimer = setTimeout(() => (waitingLong.value = true), 30_000);
        } else {
            stop();
        }
    },
    { immediate: true },
);

onBeforeUnmount(() => clearTimeout(waitTimer));

/*
|--------------------------------------------------------------------------
| Changing the columns
|--------------------------------------------------------------------------
*/

/** Mapping again after a check that found problems, or before the draft. */
const remapping = ref(false);

watch(status, () => (remapping.value = false));

const showMapping = computed(
    () =>
        props.can.map && (status.value === 'needs_mapping' || remapping.value),
);

const canChangeColumns = computed(
    () =>
        props.can.map &&
        (status.value === 'ready' || status.value === 'failed'),
);

/** Hidden while the columns change: the draft would use the last check. */
const showCreateDraft = computed(
    () => props.can.createDraft && !remapping.value,
);

/** Without a button, the header leaves no empty row for actions on phones. */
const hasActions = computed(
    () =>
        canChangeColumns.value ||
        showCreateDraft.value ||
        (!!item.value.rate_card && status.value === 'applied'),
);

const mappingRegion = useTemplateRef<HTMLElement>('mappingRegion');

function toggleRemapping(): void {
    remapping.value = !remapping.value;

    if (remapping.value) {
        // The form opens under the steps: take focus there, which scrolls to it.
        void nextTick(() => mappingRegion.value?.focus());
    }
}

function cancelRemapping(): void {
    remapping.value = false;
    void nextTick(() => document.getElementById('change-columns')?.focus());
}

/*
|--------------------------------------------------------------------------
| What the page says
|--------------------------------------------------------------------------
*/

const breadcrumbs = computed(() => [
    { title: 'Rates', href: index() },
    { title: 'Import rates', href: create() },
    { title: item.value.original_name, href: show(item.value.id) },
]);

/** One line about where the import stands. */
const description = computed(() => {
    switch (status.value) {
        case 'uploaded':
            return 'Waiting in the queue to be read.';
        case 'parsing':
            return 'Reading the file.';
        case 'needs_mapping':
            return item.value.file_kept
                ? 'Check how the columns are read, then check every row.'
                : 'Upload the file again to check its columns.';
        case 'validating':
            return 'Checking every row.';
        case 'ready':
            return props.can.createDraft
                ? 'Every row checks out. Create the draft next.'
                : 'Every row checks out.';
        case 'failed':
            return hasLayout.value
                ? 'Some rows have problems. Fix the file and upload it again.'
                : 'Nothing could be imported from this file.';
        default:
            return item.value.draft_deleted
                ? 'The draft made from this file was deleted.'
                : 'A draft was made from this file.';
    }
});

/** Something the server refused, e.g. a second "Create draft". */
const refused = computed(() => {
    const errors = page.props.errors as Record<string, string | undefined>;

    return errors.import ?? null;
});

const refusedNotice = useTemplateRef<HTMLElement>('refusedNotice');

// The step was asked for further down the page: bring the reason into view.
watch(refused, (message) => {
    if (message) {
        void nextTick(() =>
            refusedNotice.value?.scrollIntoView({ block: 'center' }),
        );
    }
});

/** A fixed file, or the same one again once it was deleted. */
const showUpload = computed(
    () =>
        status.value === 'failed' ||
        (!item.value.file_kept && status.value === 'needs_mapping'),
);

/*
|--------------------------------------------------------------------------
| The checked prices
|--------------------------------------------------------------------------
*/

const routeZones = computed(() =>
    props.zones.map((zone) => ({ key: zone.code, name: zone.name })),
);

const routes = computed(() => item.value.summary?.routes ?? []);

const baseDeleted = computed(() => !item.value.base_rate_card);

/*
|--------------------------------------------------------------------------
| Actions
|--------------------------------------------------------------------------
*/

const draftForm = useForm({});

function createDraft(): void {
    draftForm.submit(draft(item.value.id), { preserveScroll: true });
}

const uploadForm = useForm({
    file: null as File | null,
    base_rate_card_id:
        props.rateImport.base_rate_card?.id ?? props.currentRateCardId,
});

const uploadErrors = computed(
    () =>
        uploadForm.errors as Partial<
            Record<'file' | 'base_rate_card_id', string>
        >,
);

// A new file clears what was said about the last one.
watch(
    () => uploadForm.file,
    () => uploadForm.clearErrors('file'),
);

function uploadAgain(): void {
    uploadForm.submit(store(), { forceFormData: true });
}
</script>

<template>
    <Head :title="item.original_name" />

    <div class="max-w-6xl space-y-6">
        <PageHeader
            :title="item.original_name"
            :description="description"
            :breadcrumbs="breadcrumbs"
        >
            <template #title>
                <FileName :name="item.original_name" />
            </template>
            <template #meta>
                <ImportStatusChip :status="item.status" size="md" />
                <span
                    class="min-w-0 text-[13px] font-semibold wrap-anywhere text-ink-2"
                >
                    Zones from
                    {{ item.base_rate_card?.name ?? 'rates that were deleted' }}
                    <template v-if="item.sheet">
                        · sheet {{ item.sheet }}
                    </template>
                </span>
            </template>
            <template v-if="hasActions" #actions>
                <!-- Changing the columns opens the form (white, and says
                     whether it is open); the draft is the next step (red),
                     hidden while the columns change. -->
                <Button
                    v-if="canChangeColumns"
                    id="change-columns"
                    variant="outline"
                    class="h-11 rounded-lg px-4 font-bold"
                    :aria-expanded="remapping"
                    aria-controls="mapping-region"
                    @click="toggleRemapping"
                >
                    <Columns3 aria-hidden="true" />
                    Change columns
                </Button>
                <Button
                    v-if="showCreateDraft"
                    :disabled="draftForm.processing"
                    class="h-11 rounded-lg px-4 font-bold hover:bg-brand-strong"
                    @click="createDraft"
                >
                    <Spinner v-if="draftForm.processing" />
                    <FilePlus2 v-else aria-hidden="true" />
                    Create draft
                </Button>
                <Button
                    v-if="item.rate_card && status === 'applied'"
                    as-child
                    class="h-11 rounded-lg px-4 font-bold hover:bg-brand-strong"
                >
                    <Link :href="showRateCard(item.rate_card.id)">
                        Open the draft
                    </Link>
                </Button>
            </template>
        </PageHeader>

        <ImportSteps
            :current="importStep(status, hasLayout)"
            :done="status === 'applied' && !item.draft_deleted"
        />

        <!-- Read out whenever the import moves on, e.g. when a job finishes. -->
        <p class="sr-only" aria-live="polite">
            {{ item.status.label }}. {{ description }}
        </p>

        <div v-if="refused" ref="refusedNotice" role="alert">
            <Notice
                tone="warning"
                :icon="TriangleAlert"
                title="That did not go through"
            >
                {{ refused }}
            </Notice>
        </div>

        <Notice
            v-if="item.is_running"
            tone="brand"
            :icon="Spinner"
            title="This page updates by itself"
        >
            Large files take a little longer. You can leave this page and come
            back from Import rates.
            <template v-if="waitingLong">
                Still waiting? The queue worker may be stopped.
            </template>
        </Notice>

        <Notice
            v-if="
                !item.file_kept &&
                (status === 'needs_mapping' || status === 'failed')
            "
            tone="warning"
            :icon="TriangleAlert"
            title="The file is no longer kept"
        >
            Uploaded files are deleted after 7 days. Upload it again below to
            change how it is read.
        </Notice>

        <Notice
            v-if="item.draft_deleted"
            tone="warning"
            :icon="TriangleAlert"
            title="The draft was deleted"
        >
            <template v-if="can.createDraft">
                Create it again from the checked prices below.
            </template>
            <template v-else>
                It cannot be made again here.
                <TextLink :href="create()">Upload the file again</TextLink>
                to make a new one.
            </template>
        </Notice>

        <Notice
            v-else-if="baseDeleted && status === 'ready'"
            tone="warning"
            :icon="TriangleAlert"
            title="The rates for the zones were deleted"
        >
            The file was checked against their zones, so no draft can be made
            from it.
            <TextLink :href="create()">Upload it again</TextLink>
            and choose other rates.
        </Notice>

        <!-- The columns: the import's next step, or opened by "Change
             columns" in place of what is below. -->
        <section
            v-if="showMapping"
            id="mapping-region"
            ref="mappingRegion"
            tabindex="-1"
            aria-label="How the sheet is read"
            class="space-y-6 outline-none"
        >
            <!-- Another sheet, while the columns are checked. -->
            <SheetChooser
                v-if="can.chooseSheet"
                :key="`sheet-${item.updated_at ?? item.id}`"
                :rate-import="item"
            />

            <MappingForm
                :key="item.updated_at ?? item.id"
                :rate-import="item"
                :zones="zones"
                :cancellable="remapping"
                @cancel="cancelRemapping"
            />
        </section>

        <template v-if="status === 'failed' && item.errors && !remapping">
            <!-- Rows with problems as a table; a file that could not be
                 read at all says why in one notice. -->
            <ImportProblems v-if="hasLayout" :problems="item.errors" />
            <Notice v-else tone="warning" :icon="TriangleAlert">
                <p v-for="(problem, index) in item.errors.items" :key="index">
                    {{ problem.message }}
                </p>
            </Notice>

            <!-- The sheet read may be the wrong one, or empty. -->
            <SheetChooser
                v-if="can.chooseSheet"
                :key="`sheet-${item.updated_at ?? item.id}`"
                :rate-import="item"
            />
        </template>

        <form
            v-if="showUpload && !remapping"
            novalidate
            @submit.prevent="uploadAgain"
        >
            <FormSection
                :title="
                    status === 'failed' && hasLayout
                        ? 'Upload a fixed file'
                        : 'Upload it again'
                "
                :description="
                    status === 'failed' && hasLayout
                        ? 'Fix the rows in your spreadsheet and upload it again. It uses the same zones.'
                        : 'Upload the file again, or another one. It uses the same zones.'
                "
            >
                <FormField
                    id="fixed-file"
                    label="Spreadsheet"
                    :error="uploadErrors.file ?? uploadErrors.base_rate_card_id"
                >
                    <template #default="{ describedby }">
                        <ImportFileField
                            id="fixed-file"
                            v-model="uploadForm.file"
                            :max-kb="maxKb"
                            :error="uploadErrors.file"
                            :described-by="describedby"
                            @reject="
                                (message) =>
                                    uploadForm.setError('file', message)
                            "
                        />
                    </template>
                </FormField>
                <Button
                    type="submit"
                    :disabled="uploadForm.processing"
                    class="h-11 w-fit rounded-lg px-4 font-bold hover:bg-brand-strong"
                >
                    <Spinner v-if="uploadForm.processing" />
                    <FileUp v-else aria-hidden="true" />
                    Upload and read
                </Button>
            </FormSection>
        </form>

        <template
            v-if="
                (status === 'ready' || status === 'applied') &&
                item.summary &&
                !remapping
            "
        >
            <!-- The draft is named after the file, which may have no spaces. -->
            <Notice
                v-if="status === 'applied' && item.rate_card"
                tone="success"
                :icon="CircleCheck"
                title="Draft created"
                class="wrap-anywhere"
            >
                The prices below are now the draft
                <TextLink :href="showRateCard(item.rate_card.id)">{{
                    item.rate_card.name
                }}</TextLink
                >. Publish it from its page.
            </Notice>

            <!-- Three across from a 36rem page; on phones the first goes
                 across, so no slot is empty. -->
            <div class="@container">
                <ul
                    aria-label="What the file holds"
                    class="grid grid-cols-2 gap-3 @xl:grid-cols-3"
                >
                    <li class="@max-xl:col-span-2">
                        <StatCard
                            class="h-full"
                            label="Rows read"
                            :value="item.summary.rows"
                            :icon="Rows3"
                        />
                    </li>
                    <li>
                        <StatCard
                            class="h-full"
                            label="Routes"
                            :value="routes.length"
                            :icon="Layers"
                            tone="brand"
                        />
                    </li>
                    <li>
                        <StatCard
                            class="h-full"
                            label="Weight bands"
                            :value="item.summary.bands"
                            :icon="ListChecks"
                            tone="delivered"
                        />
                    </li>
                </ul>
            </div>

            <!-- The routes need the base card's zone names; without them
                 the notice above says why nothing is shown. -->
            <section
                v-if="routeZones.length > 0"
                aria-labelledby="routes-title"
                class="space-y-3"
            >
                <h2
                    id="routes-title"
                    class="text-lg leading-[26px] font-extrabold tracking-heading text-ink"
                >
                    Prices by route
                </h2>
                <RouteGroups :zones="routeZones" :routes="routes" />
            </section>
            <p
                v-else
                class="rounded-xl border border-dashed border-line-strong bg-white px-5 py-6 text-sm text-muted-foreground"
            >
                The prices cannot be shown by route: the rates whose zones they
                use were deleted.
            </p>
        </template>
    </div>
</template>
