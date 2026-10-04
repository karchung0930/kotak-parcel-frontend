<script setup lang="ts">
import { useForm } from '@inertiajs/vue3';
import { Undo2 } from '@lucide/vue';
import { computed, useId } from 'vue';
import FormField from '@/components/admin/FormField.vue';
import InputError from '@/components/InputError.vue';
import Notice from '@/components/Notice.vue';
import { Button } from '@/components/ui/button';
import { Spinner } from '@/components/ui/spinner';
import { Textarea } from '@/components/ui/textarea';
import { returnMethod } from '@/routes/admin/orders';
import type { OrderSummary } from '@/types';

/**
 * Close a failed delivery by returning the parcel to its sender, with an
 * optional note for the customer. This ends the order, so the panel says
 * so plainly before the admin confirms.
 */
const props = defineProps<{
    order: OrderSummary;
    /** Every delivery attempt has failed: returning is the only way forward. */
    atLimit: boolean;
    maxFailedAttempts: number;
    /** The action bar is stuck over the fields (docked panel): lift it. */
    barStuck?: boolean;
}>();

const emit = defineEmits<{
    /** Go back to rescheduling (only while attempts remain). */
    back: [];
    cancel: [];
    done: [];
}>();

const NOTE_MAX = 500;

const noteId = `${useId()}-note`;

const form = useForm({ note: '' });

const errors = computed(() => form.errors as Partial<Record<string, string>>);

function submit(): void {
    form.submit(returnMethod(props.order.id), {
        preserveScroll: true,
        preserveState: true,
        onSuccess: () => emit('done'),
    });
}
</script>

<template>
    <form novalidate @submit.prevent="submit">
        <!-- Padded with the panel's padding (see DispatchPanel). Focus
             scrolls a field at least 208px above the bottom edge, clear of
             the action bar stuck there (160px at most). -->
        <div class="space-y-5 px-(--panel-padding) pt-5 pb-6 **:scroll-mb-52">
            <Notice
                tone="warning"
                :icon="Undo2"
                :title="
                    atLimit
                        ? `All ${maxFailedAttempts} delivery attempts have failed`
                        : 'Return instead of trying again?'
                "
            >
                The order closes as Returned to Sender and the customer is
                emailed. This cannot be undone.
            </Notice>

            <FormField
                :id="noteId"
                label="Note for the customer"
                optional
                hint="Shown in the customer's order history, e.g. “The recipient has moved away.”"
                :error="errors.note"
            >
                <template #default="{ describedby, invalid }">
                    <Textarea
                        :id="noteId"
                        v-model="form.note"
                        rows="4"
                        :maxlength="NOTE_MAX"
                        :aria-describedby="
                            `${describedby ?? ''} ${noteId}-count`.trim()
                        "
                        :aria-invalid="invalid"
                        placeholder="Why the parcel is going back"
                    />
                    <p
                        :id="`${noteId}-count`"
                        class="text-right font-mono text-xs text-muted-foreground"
                    >
                        {{ form.note.length }}/{{ NOTE_MAX }}
                    </p>
                </template>
            </FormField>

            <p
                v-if="!atLimit"
                class="text-[13px] leading-5 text-muted-foreground"
            >
                Worth another try?
                <button
                    type="button"
                    class="tap-target relative font-semibold text-brand-strong underline decoration-brand-edge underline-offset-4 hover:text-brand-deep hover:decoration-current"
                    @click="emit('back')"
                >
                    Reschedule the delivery
                </button>
            </p>
        </div>

        <!-- Sticks to the bottom of the sheet or, docked, of the screen, and
             stops at the form's end. Stuck in the docked panel, it has the
             phone bars' shadow. -->
        <div
            :class="[
                'sticky bottom-0 border-t border-line bg-white px-(--panel-padding) pt-4 pb-5',
                barStuck && 'shadow-bar',
            ]"
        >
            <p class="text-[13px] leading-5 text-ink-2">
                <span class="font-mono font-bold text-ink">{{
                    order.tracking_number
                }}</span>
                goes back to the sender instead of
                {{ order.receiver_name }}.
            </p>
            <InputError :message="errors.status" class="mt-2" />
            <div class="mt-3 flex gap-2.5">
                <Button
                    type="button"
                    variant="outline"
                    class="h-12 rounded-lg px-5 text-[15px] font-bold"
                    @click="emit('cancel')"
                >
                    Cancel
                </Button>
                <Button
                    type="submit"
                    variant="warning"
                    :disabled="form.processing"
                    class="h-12 flex-1 rounded-lg text-[15px] font-bold"
                >
                    <Spinner v-if="form.processing" />
                    <Undo2 v-else aria-hidden="true" class="size-[18px]" />
                    Return to sender
                </Button>
            </div>
        </div>
    </form>
</template>
