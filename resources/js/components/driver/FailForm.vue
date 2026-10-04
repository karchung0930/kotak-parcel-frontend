<script setup lang="ts">
import { useForm } from '@inertiajs/vue3';
import { TriangleAlert } from '@lucide/vue';
import { computed, nextTick, ref } from 'vue';
import ChoiceCard from '@/components/ChoiceCard.vue';
import ConfirmActionDialog from '@/components/ConfirmActionDialog.vue';
import InputError from '@/components/InputError.vue';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { formatTrackingNumber } from '@/lib/format';
import { fail } from '@/routes/driver/jobs';
import type { DeliveryFailureReasonValue, DriverJob, Option } from '@/types';

/**
 * Record a failed delivery attempt: why it failed and an optional note
 * (required for "Other"), confirmed in a dialog because it cannot be
 * undone. The office then reschedules the parcel or returns it.
 */
const props = defineProps<{
    order: DriverJob;
    failureReasons: Option<DeliveryFailureReasonValue>[];
}>();

const form = useForm({
    reason: '' as DeliveryFailureReasonValue | '',
    note: '',
});

const confirming = ref(false);
const trackingNumber = formatTrackingNumber(props.order.tracking_number);
const NOTE_LIMIT = 500;

const noteRequired = computed(() => form.reason === 'other');

const reasonLabel = computed(
    () =>
        props.failureReasons.find((reason) => reason.value === form.reason)
            ?.label ?? '',
);

function focusFirstError(): void {
    void nextTick(() => {
        if (form.errors.reason) {
            document
                .querySelector<HTMLInputElement>('input[name="fail-reason"]')
                ?.focus();
        } else if (form.errors.note) {
            document.getElementById('fail-note')?.focus();
        }
    });
}

/** Check the form, then ask for confirmation. */
function review(): void {
    const errors: Partial<Record<'reason' | 'note', string>> = {};

    form.clearErrors();

    if (form.reason === '') {
        errors.reason = 'Choose why the parcel could not be delivered.';
    } else if (noteRequired.value && form.note.trim() === '') {
        errors.note = 'Describe what happened when the reason is "Other".';
    }

    if (Object.keys(errors).length > 0) {
        form.setError(errors);
        focusFirstError();

        return;
    }

    confirming.value = true;
}

function submit(): void {
    form.transform((data) => ({
        reason: data.reason,
        note: data.note.trim() === '' ? null : data.note.trim(),
    })).submit(fail(props.order.id), {
        onError: () => {
            confirming.value = false;
            focusFirstError();
        },
    });
}
</script>

<template>
    <form novalidate class="grid gap-6" @submit.prevent="review">
        <fieldset
            class="min-w-0"
            :aria-describedby="
                form.errors.reason ? 'fail-reason-error' : undefined
            "
        >
            <legend class="text-sm leading-5 font-bold text-ink">
                What happened?
            </legend>
            <div class="mt-2 grid gap-2">
                <ChoiceCard
                    v-for="reason in failureReasons"
                    :key="reason.value"
                    v-model="form.reason"
                    name="fail-reason"
                    :value="reason.value"
                    :title="reason.label"
                    tone="failed"
                />
            </div>
            <InputError
                id="fail-reason-error"
                :message="form.errors.reason"
                class="mt-2"
            />
        </fieldset>

        <div class="grid gap-1.5">
            <!-- block: a plain space before (optional), not the flex gap -->
            <Label
                for="fail-note"
                class="block text-sm leading-5 font-bold text-ink"
            >
                Note for the office
                <span
                    v-if="!noteRequired"
                    class="font-medium text-muted-foreground"
                >
                    (optional)
                </span>
            </Label>
            <Textarea
                id="fail-note"
                v-model="form.note"
                size="lg"
                rows="3"
                :maxlength="NOTE_LIMIT"
                :placeholder="
                    noteRequired
                        ? 'What happened?'
                        : 'e.g. Gate locked, left a card in the letterbox'
                "
                :aria-required="noteRequired ? 'true' : undefined"
                :aria-invalid="form.errors.note ? 'true' : undefined"
                :aria-describedby="
                    form.errors.note
                        ? 'fail-note-hint fail-note-error'
                        : 'fail-note-hint'
                "
            />
            <p
                id="fail-note-hint"
                class="flex justify-between gap-3 text-[13px] leading-5 text-muted-foreground"
            >
                <span>Only Kotak staff see this note.</span>
                <span class="tabular-nums">
                    {{ form.note.length }}/{{ NOTE_LIMIT }}
                </span>
            </p>
            <InputError id="fail-note-error" :message="form.errors.note" />
        </div>

        <!-- Only checks the form and opens the confirm dialog, so a plain
             outline button; the dialog's "Yes, record it" is the yellow,
             final step. -->
        <Button
            type="submit"
            variant="outline"
            :disabled="form.processing"
            class="h-14 w-full rounded-xl text-base font-bold"
        >
            <TriangleAlert aria-hidden="true" class="size-5" />
            Record failed delivery
        </Button>
    </form>

    <ConfirmActionDialog
        v-model:open="confirming"
        :icon="TriangleAlert"
        tone="warning"
        title="Record a failed delivery?"
        :description="`${trackingNumber}: ${reasonLabel}. Our team will arrange another delivery or return it to the sender. This cannot be undone.`"
        confirm-label="Yes, record it"
        :processing="form.processing"
        @confirm="submit"
    />
</template>
