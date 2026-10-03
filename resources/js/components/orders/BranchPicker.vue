<script setup lang="ts">
import {
    ChevronDown,
    LocateFixed,
    Navigation,
    TriangleAlert,
} from '@lucide/vue';
import { computed, ref, watch } from 'vue';
import ChoiceCard from '@/components/ChoiceCard.vue';
import InputError from '@/components/InputError.vue';
import Notice from '@/components/Notice.vue';
import { Button } from '@/components/ui/button';
import { Spinner } from '@/components/ui/spinner';
import { useNearestBranches } from '@/composables/useNearestBranches';
import { formatDistance } from '@/lib/branches';
import type { Branch } from '@/types';

/**
 * The drop-off branch choice: radio cards, three at a time with "Show all",
 * and "Use my location" to sort them by distance (useNearestBranches: worked
 * out in the browser; the position never leaves the device). Finding the
 * location picks the nearest branch when none is chosen yet.
 *
 * v-model: the chosen branch id. The radios are named "branch_id", so the
 * page can move focus to the first one when the server rejects the choice.
 */
const props = defineProps<{
    branches: Branch[];
    error?: string;
}>();

const model = defineModel<number | null>({ required: true });

const COLLAPSED_COUNT = 3;

const {
    status: locateStatus,
    locate,
    branches: options,
    nearest,
    message,
} = useNearestBranches(() => props.branches);

const expanded = ref(false);

const locateFailed = computed(() =>
    ['denied', 'failed', 'unsupported'].includes(locateStatus.value),
);

watch(nearest, (branch) => {
    if (branch && model.value === null) {
        model.value = branch.branch.id;
    }
});

const collapsible = computed(() => props.branches.length > COLLAPSED_COUNT + 1);

const visible = computed(() => {
    if (!collapsible.value || expanded.value) {
        return options.value;
    }

    const first = options.value.slice(0, COLLAPSED_COUNT);
    const chosen = options.value.find(
        (option) => option.branch.id === model.value,
    );

    return chosen && !first.includes(chosen) ? [...first, chosen] : first;
});
</script>

<template>
    <div>
        <Notice
            v-if="branches.length === 0"
            tone="warning"
            :icon="TriangleAlert"
            title="No branches are taking drop-offs right now"
        >
            Please try again later, or call us if you need to send a parcel
            today.
        </Notice>

        <template v-else>
            <!-- An outline Button, so it looks and hovers like "Use my
                 location" on the branches page; the thicker edge matches
                 this form's fields. -->
            <Button
                type="button"
                variant="outline"
                class="h-12 w-full rounded-lg border-[1.5px] border-field text-[15px] font-bold"
                :disabled="locateStatus === 'locating'"
                @click="locate"
            >
                <Spinner
                    v-if="locateStatus === 'locating'"
                    class="text-brand"
                />
                <LocateFixed
                    v-else
                    aria-hidden="true"
                    class="size-[18px] text-brand"
                />
                Use my location
            </Button>

            <p
                aria-live="polite"
                :class="[
                    'text-[13px] leading-5',
                    message ? 'mt-2' : '',
                    locateFailed
                        ? 'font-semibold text-status-failed'
                        : 'text-muted-foreground',
                ]"
            >
                {{ message }}
            </p>

            <fieldset
                class="mt-3 min-w-0"
                :aria-describedby="error ? 'branch_id-error' : undefined"
            >
                <legend class="sr-only">Choose a drop-off branch</legend>

                <ul id="branch-options" class="flex flex-col gap-2">
                    <li v-for="option in visible" :key="option.branch.id">
                        <!-- A red edge on every card while none is chosen
                             and the form says to choose one. -->
                        <ChoiceCard
                            :id="`branch-${option.branch.id}`"
                            v-model="model"
                            name="branch_id"
                            :value="option.branch.id"
                            :class="error ? 'border-brand-edge' : ''"
                        >
                            <span class="min-w-0 flex-1">
                                <span
                                    v-if="
                                        nearest?.branch.id === option.branch.id
                                    "
                                    class="mb-1.5 inline-flex h-[22px] items-center gap-1.5 rounded-[5px] bg-highlight px-[7px] text-[11.5px] font-bold text-ink"
                                >
                                    <Navigation
                                        aria-hidden="true"
                                        class="size-3"
                                        :stroke-width="2.6"
                                    />
                                    Nearest to you
                                </span>
                                <span
                                    :class="[
                                        'block text-base leading-[22px] text-ink',
                                        model === option.branch.id
                                            ? 'font-extrabold'
                                            : 'font-bold',
                                    ]"
                                >
                                    {{ option.branch.name }}
                                </span>
                                <span
                                    class="mt-0.5 block text-[13px] leading-[18px] text-muted-foreground"
                                >
                                    <template v-if="option.distanceKm !== null">
                                        {{ formatDistance(option.distanceKm) }}
                                        away ·
                                    </template>
                                    {{ option.branch.city }} ·
                                    {{ option.branch.opening_hours }}
                                </span>
                            </span>
                        </ChoiceCard>
                    </li>
                </ul>
            </fieldset>

            <InputError id="branch_id-error" :message="error" class="mt-2" />

            <button
                v-if="collapsible"
                type="button"
                aria-controls="branch-options"
                :aria-expanded="expanded"
                class="mt-2 flex h-11 w-full items-center justify-center gap-1.5 rounded-lg text-[14.5px] font-bold text-brand-strong hover:bg-brand-tint hover:text-brand-deep"
                @click="expanded = !expanded"
            >
                {{
                    expanded
                        ? 'Show fewer branches'
                        : `Show all ${branches.length} branches`
                }}
                <ChevronDown
                    aria-hidden="true"
                    :class="[
                        'size-4 transition-transform',
                        expanded ? 'rotate-180' : '',
                    ]"
                    :stroke-width="2.2"
                />
            </button>
        </template>
    </div>
</template>
