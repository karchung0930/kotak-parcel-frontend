<script setup lang="ts">
import { Form } from '@inertiajs/vue3';
import { CircleX } from '@lucide/vue';
import { ref } from 'vue';
import InputError from '@/components/InputError.vue';
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
import { Label } from '@/components/ui/label';
import { Spinner } from '@/components/ui/spinner';
import { Textarea } from '@/components/ui/textarea';
import { formatMoney, formatTrackingNumber } from '@/lib/format';
import { cancel } from '@/routes/staff/orders';
import type { Order } from '@/types';

/**
 * "Customer refused the price": cancels a weighed parcel after a
 * confirmation dialog with an optional reason. Cannot be undone.
 */
const props = defineProps<{
    order: Order;
}>();

const open = ref(false);
const trackingNumber = formatTrackingNumber(props.order.tracking_number);
</script>

<template>
    <section
        aria-labelledby="refuse-title"
        class="flex flex-col gap-4 rounded-xl border border-line bg-white p-4 sm:flex-row sm:items-center sm:justify-between sm:p-5"
    >
        <div class="min-w-0">
            <h3
                id="refuse-title"
                class="text-[15px] leading-6 font-bold text-ink"
            >
                Customer refused the price?
            </h3>
            <p class="mt-0.5 text-sm leading-5 text-muted-foreground">
                Cancel the order and hand the parcel back. Nothing is charged.
            </p>
        </div>

        <Dialog v-model:open="open">
            <!-- Only opens the dialog, so a plain outline button; the
                 step that cannot be undone is the dialog's own button. -->
            <DialogTrigger as-child>
                <Button
                    variant="outline"
                    class="h-11 flex-none rounded-lg px-4 text-sm font-bold"
                >
                    <CircleX aria-hidden="true" />
                    Cancel order
                </Button>
            </DialogTrigger>
            <!-- DialogContent's padding and close button, as in every
                 dialog. The form's rows are as far apart as the dialog's
                 (gap-4), which the footer band counts on. -->
            <DialogContent class="sm:max-w-md">
                <Form
                    v-bind="cancel.form(order.id)"
                    :options="{ preserveScroll: true }"
                    class="grid gap-4"
                    v-slot="{ errors, processing }"
                    @success="open = false"
                >
                    <DialogHeader class="gap-2 text-left">
                        <!-- pr-12 leaves room for the close button. -->
                        <DialogTitle
                            class="pr-12 text-xl leading-7 font-extrabold tracking-heading text-ink"
                        >
                            Cancel {{ trackingNumber }}?
                        </DialogTitle>
                        <DialogDescription
                            class="text-[15px] leading-6 text-ink-2"
                        >
                            Only do this if the customer does not accept the
                            final price of
                            <strong class="font-bold text-ink">{{
                                formatMoney(order.final_price_sen)
                            }}</strong
                            >. The order is closed for good and the parcel goes
                            back to the customer.
                        </DialogDescription>
                    </DialogHeader>

                    <div class="grid gap-1.5">
                        <!-- block: a plain space before (optional), as in
                             every form label, not the flex gap -->
                        <Label
                            for="cancel-reason"
                            class="block text-sm leading-5 font-bold text-ink"
                        >
                            Reason
                            <span class="font-medium text-muted-foreground">
                                (optional)
                            </span>
                        </Label>
                        <Textarea
                            id="cancel-reason"
                            name="reason"
                            size="lg"
                            rows="3"
                            maxlength="255"
                            placeholder="Customer declined the final price."
                            :aria-invalid="errors.reason ? 'true' : undefined"
                            :aria-describedby="
                                errors.reason
                                    ? 'cancel-reason-error'
                                    : undefined
                            "
                        />
                        <InputError
                            id="cancel-reason-error"
                            :message="errors.reason"
                        />
                    </div>

                    <!-- Keep the order is a plain outline button; cancelling
                         cannot be undone, so it is caution yellow. -->
                    <DialogFooter band>
                        <DialogClose as-child>
                            <Button
                                type="button"
                                variant="outline"
                                :disabled="processing"
                                class="h-12 rounded-lg px-5 text-[15px] font-bold"
                            >
                                Keep the order
                            </Button>
                        </DialogClose>
                        <Button
                            type="submit"
                            variant="warning"
                            :disabled="processing"
                            class="h-12 rounded-lg px-5 text-[15px] font-bold"
                        >
                            <Spinner v-if="processing" />
                            Cancel the order
                        </Button>
                    </DialogFooter>
                </Form>
            </DialogContent>
        </Dialog>
    </section>
</template>
