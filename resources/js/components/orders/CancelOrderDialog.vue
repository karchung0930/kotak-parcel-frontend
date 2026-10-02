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
import { formatTrackingNumber } from '@/lib/format';
import { cancel } from '@/routes/orders';

/**
 * "Cancel order" with a confirmation dialog and an optional reason. Only
 * shown while the customer may still cancel (before drop-off); the server
 * confirms with a toast and the page reloads with the new status.
 */
const props = defineProps<{
    orderId: number;
    trackingNumber: string;
}>();

const open = ref(false);
const trackingNumber = formatTrackingNumber(props.trackingNumber);
</script>

<template>
    <Dialog v-model:open="open">
        <!-- Only opens the dialog, so a plain outline button; the step
             that cannot be undone is the dialog's own button. -->
        <DialogTrigger as-child>
            <Button variant="outline" class="h-11 px-4 font-bold">
                <CircleX aria-hidden="true" />
                Cancel order
            </Button>
        </DialogTrigger>

        <DialogContent class="sm:max-w-md">
            <Form
                v-bind="cancel.form(orderId)"
                :options="{ preserveScroll: true }"
                class="space-y-5"
                v-slot="{ errors, processing }"
                @success="open = false"
            >
                <DialogHeader class="gap-2">
                    <!-- Room for the close button on the right, and as much
                         on the left on phones, where the title is centred. -->
                    <DialogTitle
                        class="px-12 text-xl leading-7 font-extrabold tracking-heading text-ink sm:pl-0"
                    >
                        Cancel this order?
                    </DialogTitle>
                    <DialogDescription class="text-[15px] leading-6">
                        <span class="font-mono font-bold text-ink">{{
                            trackingNumber
                        }}</span>
                        will be cancelled and can't be dropped off. This can't
                        be undone, but you can create a new order any time.
                    </DialogDescription>
                </DialogHeader>

                <div class="grid gap-1.5">
                    <Label
                        for="cancel-reason"
                        class="text-[13.5px] leading-[19px] font-semibold text-ink"
                    >
                        Reason
                        <span class="font-normal text-muted-foreground">
                            (optional)
                        </span>
                    </Label>
                    <textarea
                        id="cancel-reason"
                        name="reason"
                        rows="3"
                        maxlength="255"
                        placeholder="e.g. I sent it another way"
                        :aria-invalid="errors.reason ? true : undefined"
                        :aria-describedby="
                            errors.reason ? 'cancel-reason-error' : undefined
                        "
                        class="w-full resize-none rounded-lg border-[1.5px] border-input bg-white px-3.5 py-2.5 text-base leading-6 text-ink outline-none focus-visible:border-ring focus-visible:ring-[3px] focus-visible:ring-ring/50 aria-invalid:border-destructive"
                    />
                    <InputError
                        id="cancel-reason-error"
                        :message="errors.reason"
                    />
                </div>

                <!-- Keep order is a plain outline button; cancelling cannot
                     be undone, so it is caution yellow. -->
                <DialogFooter class="gap-2">
                    <DialogClose as-child>
                        <Button
                            type="button"
                            variant="outline"
                            class="h-11 px-5 font-bold"
                        >
                            Keep order
                        </Button>
                    </DialogClose>
                    <Button
                        type="submit"
                        variant="warning"
                        class="h-11 px-5 font-bold"
                        :disabled="processing"
                        data-test="confirm-cancel-order-button"
                    >
                        <Spinner v-if="processing" />
                        Cancel order
                    </Button>
                </DialogFooter>
            </Form>
        </DialogContent>
    </Dialog>
</template>
