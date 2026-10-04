<script setup lang="ts">
import { Link, useForm } from '@inertiajs/vue3';
import { CalendarClock, Pencil, Send, TriangleAlert } from '@lucide/vue';
import { computed, ref, useId, watch } from 'vue';
import ChoiceCard from '@/components/ChoiceCard.vue';
import InputError from '@/components/InputError.vue';
import Notice from '@/components/Notice.vue';
import { Button } from '@/components/ui/button';
import {
    Dialog,
    DialogClose,
    DialogContent,
    DialogDescription,
    DialogFooter,
    DialogHeader,
    DialogTitle,
    DialogTrigger,
} from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Spinner } from '@/components/ui/spinner';
import { formatDateTime, toLocalDateTime } from '@/lib/format';
import { edit, publish } from '@/routes/admin/rates';
import type { RateCard } from '@/types';

/**
 * Publish a draft: in effect straight away, or from a date and time in
 * Malaysia, up to two years ahead. A draft with problems cannot be
 * published: the dialog lists them and leads to the editor instead (the
 * server checks again and lists anything else it finds). While problems
 * remain, the trigger is a white button, as the next step is to edit.
 */
const props = defineProps<{
    rateCard: RateCard;
    /** What stops the draft from being published, from the server. */
    problems: string[];
}>();

const open = ref(false);
const id = `publish-${useId()}`;

/** The datetime-local value for now plus the given years, in Malaysia. */
function localDateTime(yearsAhead = 0): string {
    const date = new Date();
    date.setFullYear(date.getFullYear() + yearsAhead);

    return toLocalDateTime(date) ?? '';
}

/** The earliest and latest moments allowed, refreshed each time the dialog opens. */
const earliest = ref(localDateTime());
const latest = ref(localDateTime(2));

const WHEN = [
    { value: 'now', title: 'Now' },
    { value: 'scheduled', title: 'At a date and time' },
] as const;

const form = useForm({
    when: 'now' as 'now' | 'scheduled',
    effective_at: '',
});

watch(open, (isOpen) => {
    if (isOpen) {
        earliest.value = localDateTime();
        latest.value = localDateTime(2);
        form.clearErrors();
    }
});

// A refused time is forgotten once another is chosen, so the summary
// under it describes the new choice rather than contradicting the error.
watch(
    () => [form.when, form.effective_at],
    () => form.clearErrors('effective_at', 'when'),
);

/** Every problem from the server: the draft's own and the time's. */
const errors = computed(() => form.errors as Partial<Record<string, string>>);

const serverProblems = computed(() =>
    Object.entries(errors.value)
        .filter(([key]) => key.startsWith('problems.') || key === 'card')
        .map(([, message]) => message as string),
);

const problemList = computed(() => [
    ...new Set([...props.problems, ...serverProblems.value]),
]);

const blocked = computed(() => problemList.value.length > 0);

/** Problems with the draft itself are fixed in the editor. */
const fixable = computed(() => blocked.value && !errors.value.card);

const summary = computed(() => {
    if (form.when === 'now') {
        return `New orders are priced with ${props.rateCard.name} from now on.`;
    }

    return form.effective_at
        ? `New orders are priced with ${props.rateCard.name} from ${formatDateTime(`${form.effective_at}:00+08:00`)}. Until then you can withdraw them.`
        : 'Choose when they take effect.';
});

function submit(): void {
    form.transform((data) =>
        data.when === 'now' ? { when: 'now' } : data,
    ).submit(publish(props.rateCard.id), {
        preserveScroll: true,
        onSuccess: () => {
            open.value = false;
        },
    });
}
</script>

<template>
    <Dialog v-model:open="open">
        <DialogTrigger as-child>
            <Button
                :variant="problems.length > 0 ? 'outline' : 'default'"
                :class="[
                    'h-11 rounded-lg px-4 font-bold',
                    problems.length > 0 ? '' : 'hover:bg-brand-strong',
                ]"
            >
                <Send aria-hidden="true" />
                Publish
            </Button>
        </DialogTrigger>
        <DialogContent class="sm:max-w-lg">
            <form class="grid gap-4" novalidate @submit.prevent="submit">
                <DialogHeader class="gap-2 text-left">
                    <DialogTitle
                        class="pr-12 text-xl leading-7 font-extrabold tracking-heading text-ink"
                    >
                        Publish {{ rateCard.name }}?
                    </DialogTitle>
                    <DialogDescription class="text-[15px] leading-6 text-ink-2">
                        Published rates are final. Later changes go in a new
                        draft.
                    </DialogDescription>
                </DialogHeader>

                <Notice
                    v-if="blocked"
                    tone="warning"
                    :icon="TriangleAlert"
                    :title="
                        fixable
                            ? 'Fix these in the draft first'
                            : 'These rates cannot be published'
                    "
                >
                    <ul class="list-disc space-y-0.5 pl-4">
                        <li v-for="problem in problemList" :key="problem">
                            {{ problem }}
                        </li>
                    </ul>
                </Notice>

                <fieldset v-else class="grid gap-2">
                    <legend class="mb-1.5 text-sm leading-5 font-bold text-ink">
                        When do they take effect?
                    </legend>
                    <ChoiceCard
                        v-for="option in WHEN"
                        :key="option.value"
                        v-model="form.when"
                        :name="`${id}-when`"
                        :value="option.value"
                        :title="option.title"
                    />

                    <div
                        v-if="form.when === 'scheduled'"
                        class="mt-3 grid gap-1.5"
                    >
                        <label
                            :for="`${id}-at`"
                            class="text-sm leading-5 font-bold text-ink"
                        >
                            Date and time
                            <span class="font-medium text-muted-foreground">
                                (Malaysia time)
                            </span>
                        </label>
                        <div class="relative">
                            <CalendarClock
                                aria-hidden="true"
                                class="pointer-events-none absolute top-1/2 left-3 size-[18px] -translate-y-1/2 text-brand"
                            />
                            <!-- 16px on phones: iOS zooms in on smaller fields. -->
                            <Input
                                :id="`${id}-at`"
                                v-model="form.effective_at"
                                type="datetime-local"
                                :min="earliest"
                                :max="latest"
                                required
                                :aria-invalid="
                                    errors.effective_at ? true : undefined
                                "
                                :aria-describedby="
                                    errors.effective_at
                                        ? `${id}-at-error`
                                        : undefined
                                "
                                class="h-11 rounded-lg bg-white pl-10 text-base font-bold text-ink md:text-[15px]"
                            />
                        </div>
                        <InputError
                            :id="`${id}-at-error`"
                            :message="errors.effective_at"
                        />
                    </div>
                    <InputError :message="errors.when" />

                    <p
                        v-if="!errors.effective_at"
                        class="text-[13px] leading-5 text-muted-foreground"
                    >
                        {{ summary }}
                    </p>
                </fieldset>

                <DialogFooter band>
                    <DialogClose as-child>
                        <Button
                            type="button"
                            variant="outline"
                            :disabled="form.processing"
                            class="h-12 rounded-lg px-5 text-[15px] font-bold"
                        >
                            {{ blocked ? 'Close' : 'Cancel' }}
                        </Button>
                    </DialogClose>
                    <!-- With problems, the next step is the editor. -->
                    <Button
                        v-if="fixable"
                        as-child
                        class="h-12 rounded-lg px-5 text-[15px] font-bold hover:bg-brand-strong"
                    >
                        <Link :href="edit(rateCard.id)">
                            <Pencil aria-hidden="true" />
                            Edit draft
                        </Link>
                    </Button>
                    <Button
                        v-else-if="!blocked"
                        type="submit"
                        :disabled="form.processing"
                        class="h-12 rounded-lg px-5 text-[15px] font-bold hover:bg-brand-strong"
                    >
                        <Spinner v-if="form.processing" />
                        Publish rates
                    </Button>
                </DialogFooter>
            </form>
        </DialogContent>
    </Dialog>
</template>
