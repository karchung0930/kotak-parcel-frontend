<script setup lang="ts">
import type { LucideIcon } from '@lucide/vue';
import { Button } from '@/components/ui/button';
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogFooter,
    DialogHeader,
    DialogTitle,
} from '@/components/ui/dialog';
import { Spinner } from '@/components/ui/spinner';

/**
 * "Are you sure?" before a driver records something that cannot be undone
 * (picked up, delivered, failed). Stays open while the request runs; the
 * default slot can summarise what is about to be saved.
 */
const open = defineModel<boolean>('open', { required: true });

withDefaults(
    defineProps<{
        title: string;
        description: string;
        confirmLabel: string;
        cancelLabel?: string;
        processing?: boolean;
        icon?: LucideIcon | null;
        tone?: 'brand' | 'success' | 'warning';
    }>(),
    {
        cancelLabel: 'Go back',
        processing: false,
        icon: null,
        tone: 'brand',
    },
);

const emit = defineEmits<{
    confirm: [];
}>();

const iconTone = {
    brand: 'bg-brand-tint text-brand',
    success: 'bg-status-delivered-tint text-status-delivered',
    warning: 'bg-status-failed-tint text-status-failed',
};
</script>

<template>
    <Dialog
        :open="open"
        @update:open="(value: boolean) => !processing && (open = value)"
    >
        <!-- DialogContent's padding and close button, as in every
             dialog: the close button sits level with the icon's top. -->
        <DialogContent class="sm:max-w-md" :show-close-button="!processing">
            <DialogHeader class="gap-3 text-left">
                <span
                    v-if="icon"
                    :class="[
                        'flex size-12 items-center justify-center rounded-full',
                        iconTone[tone],
                    ]"
                >
                    <component :is="icon" aria-hidden="true" class="size-6" />
                </span>
                <!-- Under the icon the title is clear of the close button;
                     without one it leaves room for it. -->
                <DialogTitle
                    :class="[
                        'text-xl leading-7 font-extrabold tracking-heading text-ink',
                        !icon && 'pr-12',
                    ]"
                >
                    {{ title }}
                </DialogTitle>
                <DialogDescription class="text-[15px] leading-6 text-ink-2">
                    {{ description }}
                </DialogDescription>
            </DialogHeader>
            <div v-if="$slots.default">
                <slot />
            </div>
            <!-- Go back is a plain outline button. The confirm is red for
                 a step forward, or caution yellow (warning) for a negative
                 step that cannot be undone, such as a failed delivery. -->
            <DialogFooter band class="gap-2.5">
                <Button
                    type="button"
                    variant="outline"
                    :disabled="processing"
                    class="h-12 rounded-lg px-5 text-[15px] font-bold"
                    @click="open = false"
                >
                    {{ cancelLabel }}
                </Button>
                <Button
                    type="button"
                    :variant="tone === 'warning' ? 'warning' : 'default'"
                    :disabled="processing"
                    class="h-12 rounded-lg px-5 text-[15px] font-bold"
                    :class="tone !== 'warning' && 'hover:bg-brand-strong'"
                    @click="emit('confirm')"
                >
                    <Spinner v-if="processing" />
                    {{ confirmLabel }}
                </Button>
            </DialogFooter>
        </DialogContent>
    </Dialog>
</template>
