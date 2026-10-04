<script setup lang="ts">
import { useForm } from '@inertiajs/vue3';
import { Plus } from '@lucide/vue';
import { computed, ref, useId, watch } from 'vue';
import ChoiceCard from '@/components/ChoiceCard.vue';
import InputError from '@/components/InputError.vue';
import NativeSelect from '@/components/NativeSelect.vue';
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
import { Spinner } from '@/components/ui/spinner';
import { store } from '@/routes/admin/rates';
import type { RateCard } from '@/types';

/**
 * "New draft": a copy of the current rates (the usual start), a copy of
 * any other version, or a blank draft. Creating it opens the editor.
 */
const props = defineProps<{
    /** Every version, for "copy another version". */
    versions: RateCard[];
}>();

const open = ref(false);
const id = `new-draft-${useId()}`;

const current = computed(
    () => props.versions.find((card) => card.phase.value === 'current') ?? null,
);

type Start = 'current' | 'other' | 'blank';

const start = ref<Start>(current.value ? 'current' : 'blank');
const otherId = ref<number | null>(
    props.versions.find((card) => card.id !== current.value?.id)?.id ??
        current.value?.id ??
        null,
);

const form = useForm({ source_id: null as number | null });

const options = computed(() => [
    ...(current.value
        ? [
              {
                  value: 'current' as const,
                  title: 'Copy the current rates',
                  text: current.value.name,
              },
          ]
        : []),
    {
        value: 'other' as const,
        title: 'Copy another version',
        text: 'Scheduled, past or a draft, to bring older prices back.',
    },
    {
        value: 'blank' as const,
        title: 'Start blank',
        text: 'No zones or prices yet.',
    },
]);

watch(open, (isOpen) => {
    if (isOpen) {
        form.clearErrors();
    }
});

function submit(): void {
    form.source_id =
        start.value === 'current'
            ? (current.value?.id ?? null)
            : start.value === 'other'
              ? otherId.value
              : null;

    form.submit(store(), {
        onSuccess: () => {
            open.value = false;
        },
    });
}
</script>

<template>
    <Dialog v-model:open="open">
        <DialogTrigger as-child>
            <Button class="h-11 rounded-lg px-4 font-bold">
                <Plus aria-hidden="true" />
                New draft
            </Button>
        </DialogTrigger>
        <DialogContent class="sm:max-w-lg">
            <form class="grid gap-4" novalidate @submit.prevent="submit">
                <DialogHeader class="gap-2 text-left">
                    <DialogTitle
                        class="pr-12 text-xl leading-7 font-extrabold tracking-heading text-ink"
                    >
                        New draft
                    </DialogTitle>
                    <DialogDescription class="text-[15px] leading-6 text-ink-2">
                        Drafts change nothing until you publish them.
                    </DialogDescription>
                </DialogHeader>

                <fieldset class="grid gap-2">
                    <legend class="sr-only">Start from</legend>
                    <ChoiceCard
                        v-for="option in options"
                        :key="option.value"
                        v-model="start"
                        :name="`${id}-start`"
                        :value="option.value"
                        :title="option.title"
                        :hint="option.text"
                    />
                </fieldset>

                <!-- 20px below the cards, as the date under the publish choice -->
                <div v-if="start === 'other'" class="mt-1 grid gap-1.5">
                    <label
                        :for="`${id}-version`"
                        class="text-sm leading-5 font-bold text-ink"
                    >
                        Version to copy
                    </label>
                    <NativeSelect :id="`${id}-version`" v-model="otherId">
                        <option
                            v-for="card in versions"
                            :key="card.id"
                            :value="card.id"
                        >
                            {{ card.name }} ({{ card.phase.label }})
                        </option>
                    </NativeSelect>
                </div>

                <InputError :message="form.errors.source_id" />

                <DialogFooter band>
                    <DialogClose as-child>
                        <Button
                            type="button"
                            variant="outline"
                            :disabled="form.processing"
                            class="h-12 rounded-lg px-5 text-[15px] font-bold"
                        >
                            Cancel
                        </Button>
                    </DialogClose>
                    <Button
                        type="submit"
                        :disabled="form.processing"
                        class="h-12 rounded-lg px-5 text-[15px] font-bold hover:bg-brand-strong"
                    >
                        <Spinner v-if="form.processing" />
                        Create draft
                    </Button>
                </DialogFooter>
            </form>
        </DialogContent>
    </Dialog>
</template>
