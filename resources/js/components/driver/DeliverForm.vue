<script setup lang="ts">
import { useForm } from '@inertiajs/vue3';
import { PackageCheck, UserRound } from '@lucide/vue';
import { nextTick, ref } from 'vue';
import ConfirmActionDialog from '@/components/ConfirmActionDialog.vue';
import PhotoCapture from '@/components/driver/PhotoCapture.vue';
import InputError from '@/components/InputError.vue';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { formatTrackingNumber } from '@/lib/format';
import { deliver } from '@/routes/driver/jobs';
import type { DriverJob } from '@/types';

/**
 * Record a successful delivery: who received the parcel and a photo of
 * it at the door, confirmed in a dialog because it cannot be undone.
 */
const props = defineProps<{
    order: DriverJob;
}>();

const form = useForm({
    recipient_name: '',
    photo: null as File | null,
});

const confirming = ref(false);
const trackingNumber = formatTrackingNumber(props.order.tracking_number);

const FIELD_IDS = {
    recipient_name: 'recipient-name',
    photo: 'delivery-photo',
} as const;

function focusFirstError(): void {
    void nextTick(() => {
        const first = (
            Object.keys(FIELD_IDS) as (keyof typeof FIELD_IDS)[]
        ).find((field) => form.errors[field]);

        if (first) {
            document.getElementById(FIELD_IDS[first])?.focus();
        }
    });
}

/** Check the form, then ask for confirmation. */
function review(): void {
    const errors: Partial<Record<keyof typeof FIELD_IDS, string>> = {};

    form.clearErrors();

    if (form.recipient_name.trim() === '') {
        errors.recipient_name =
            'Enter the name of the person who received the parcel.';
    }

    if (!form.photo) {
        errors.photo = 'Take a photo of the delivered parcel.';
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
        ...data,
        recipient_name: data.recipient_name.trim(),
    })).submit(deliver(props.order.id), {
        forceFormData: true,
        onError: () => {
            confirming.value = false;
            focusFirstError();
        },
    });
}
</script>

<template>
    <form novalidate class="grid gap-6" @submit.prevent="review">
        <div class="grid gap-1.5">
            <Label
                for="recipient-name"
                class="text-sm leading-5 font-bold text-ink"
            >
                Who received it?
            </Label>
            <input
                id="recipient-name"
                v-model="form.recipient_name"
                type="text"
                maxlength="100"
                autocomplete="off"
                autocapitalize="words"
                enterkeyhint="next"
                placeholder="Their name"
                :aria-invalid="form.errors.recipient_name ? 'true' : undefined"
                :aria-describedby="
                    form.errors.recipient_name
                        ? 'recipient-name-hint recipient-name-error'
                        : 'recipient-name-hint'
                "
                class="h-12 w-full rounded-lg border-[1.5px] border-field bg-white px-3.5 text-base font-semibold text-ink outline-none placeholder:font-medium placeholder:text-subtle focus-visible:border-brand focus-visible:ring-[3px] focus-visible:ring-brand/25 aria-invalid:border-brand-strong"
            />
            <div class="flex flex-wrap items-center gap-x-3 gap-y-2">
                <!-- A long name wraps inside the pill rather than running
                     off the side of the phone. -->
                <Button
                    v-if="form.recipient_name.trim() !== order.receiver_name"
                    type="button"
                    variant="outline"
                    class="h-auto min-h-11 max-w-full rounded-full font-bold whitespace-normal"
                    @click="form.recipient_name = order.receiver_name"
                >
                    <UserRound aria-hidden="true" class="text-brand" />
                    It was {{ order.receiver_name }}
                </Button>
                <p
                    id="recipient-name-hint"
                    class="text-[13px] leading-5 text-muted-foreground"
                >
                    Or whoever took it, such as a family member or the guard.
                </p>
            </div>
            <InputError
                id="recipient-name-error"
                :message="form.errors.recipient_name"
            />
        </div>

        <div class="grid gap-1.5">
            <p class="text-sm leading-5 font-bold text-ink" aria-hidden="true">
                Photo of the delivered parcel
            </p>
            <PhotoCapture
                id="delivery-photo"
                v-model="form.photo"
                label="Photo of the delivered parcel"
                :error="form.errors.photo"
                :described-by="
                    form.errors.photo ? 'delivery-photo-error' : undefined
                "
            />
            <InputError
                id="delivery-photo-error"
                :message="form.errors.photo"
            />
        </div>

        <div
            v-if="form.progress && form.processing"
            class="grid gap-1.5"
            aria-live="polite"
        >
            <p class="text-[13px] leading-5 font-semibold text-ink-2">
                Uploading photo… {{ form.progress.percentage ?? 0 }}%
            </p>
            <div
                class="h-2 overflow-hidden rounded-full bg-line"
                aria-hidden="true"
            >
                <div
                    class="h-full rounded-full bg-brand transition-[width]"
                    :style="{ width: `${form.progress.percentage ?? 0}%` }"
                />
            </div>
        </div>

        <Button
            type="submit"
            :disabled="form.processing"
            class="h-14 w-full rounded-xl text-base font-bold hover:bg-brand-strong"
        >
            <PackageCheck aria-hidden="true" class="size-5" />
            Mark as delivered
        </Button>
    </form>

    <ConfirmActionDialog
        v-model:open="confirming"
        :icon="PackageCheck"
        tone="success"
        title="Mark as delivered?"
        :description="`${trackingNumber} was handed to ${form.recipient_name.trim()}. Tracking shows it as delivered straight away, and this cannot be undone.`"
        confirm-label="Yes, it's delivered"
        :processing="form.processing"
        @confirm="submit"
    />
</template>
