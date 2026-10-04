<script setup lang="ts">
import { Form } from '@inertiajs/vue3';
import { CircleX } from '@lucide/vue';
import { ref } from 'vue';
import InputError from '@/components/InputError.vue';
import TrackingNumber from '@/components/TrackingNumber.vue';
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
import { cancel } from '@/routes/orders';

/**
 * "Cancel order" with a confirmation dialog and an optional reason. Only
 * shown while the customer may still cancel (before drop-off); the server
 * confirms with a toast and the page reloads with the new status.
 */
defineProps<{
    orderId: number;
    trackingNumber: string;
}>();

const open = ref(false);
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
                        <TrackingNumber
                            :value="trackingNumber"
                            size="inline"
                            class="text-ink"
                        />
                        will be cancelled and can't be dropped off. This can't
                        be undone, but you can create a new order any time.
                    </DialogDescription>
                </DialogHeader>

                <div class="grid gap-1.5">
                    <!-- block: a plain space before (optional), as in every
                         form label, not the flex gap -->
                    <Label
                        for="cancel-reason"
                        class="block text-[13.5px] leading-[19px] font-semibold text-ink"
                    >
                        Reason
                        <span class="font-normal text-muted-foreground">
                            (optional)
                        </span>
                    </Label>
                    <Textarea
                        id="cancel-reason"
                        name="reason"
                        size="lg"
                        rows="3"
                        maxlength="255"
                        placeholder="e.g. I sent it another way"
                        :aria-invalid="errors.reason ? true : undefined"
                        :aria-describedby="
                            errors.reason ? 'cancel-reason-error' : undefined
                        "
                    />
                    <InputError
                        id="cancel-reason-error"
                        :message="errors.reason"
                    />
                </div>

                <!-- Keep order is a plain outline button; cancelling cannot
                     be undone, so it is caution yellow. -->
                <DialogFooter>
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
