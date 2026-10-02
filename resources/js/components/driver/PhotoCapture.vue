<script setup lang="ts">
import { Camera, RefreshCw, Trash2 } from '@lucide/vue';
import { onBeforeUnmount, ref, useTemplateRef } from 'vue';
import { Button } from '@/components/ui/button';
import { Spinner } from '@/components/ui/spinner';
import { downscaleImage } from '@/lib/image';

/**
 * Proof of delivery photo: opens the phone's back camera (or the photo
 * picker on a computer), shows a preview and shrinks the photo to 1600 px
 * JPEG before it is uploaded. v-model holds the File to send.
 */
const photo = defineModel<File | null>({ required: true });

const props = defineProps<{
    id: string;
    /** The field's name for screen readers, e.g. "Photo of the delivered parcel". */
    label: string;
    /** Validation message from the server. */
    error?: string;
    /** Ids of hint or error text that describe the field. */
    describedBy?: string;
}>();

const input = useTemplateRef<HTMLInputElement>('input');
const preview = ref<string | null>(null);
const preparing = ref(false);

function setPreview(file: File | null): void {
    if (preview.value) {
        URL.revokeObjectURL(preview.value);
    }

    preview.value = file ? URL.createObjectURL(file) : null;
}

async function choose(event: Event): Promise<void> {
    const file = (event.target as HTMLInputElement).files?.[0];

    if (!file) {
        return;
    }

    preparing.value = true;

    try {
        const resized = await downscaleImage(file);
        photo.value = resized;
        setPreview(resized);
    } finally {
        preparing.value = false;
        // Lets the driver pick the same photo again after removing it.
        (event.target as HTMLInputElement).value = '';
    }
}

function retake(): void {
    input.value?.click();
}

function remove(): void {
    photo.value = null;
    setPreview(null);
    input.value?.focus();
}

onBeforeUnmount(() => setPreview(null));
</script>

<template>
    <div>
        <!-- The real control: visually hidden but focusable, opened by its label. -->
        <input
            :id="props.id"
            ref="input"
            type="file"
            accept="image/*"
            capture="environment"
            class="peer sr-only"
            :tabindex="preview ? -1 : undefined"
            :aria-label="label"
            :aria-invalid="error ? 'true' : undefined"
            :aria-describedby="describedBy"
            @change="choose"
        />

        <div
            v-if="preview && photo"
            class="overflow-hidden rounded-xl border border-line bg-surface sm:max-w-sm"
        >
            <img
                :src="preview"
                alt="Preview of the delivery photo"
                class="aspect-[4/3] w-full object-cover"
            />
            <div
                class="flex items-center justify-between gap-2 border-t border-line bg-white px-3 py-2"
            >
                <p class="min-w-0 truncate text-[13px] leading-5 text-ink-2">
                    Photo ready ·
                    {{ Math.max(1, Math.round(photo.size / 1024)) }} KB
                </p>
                <!-- Plain outline buttons, 44px for a thumb. Removing the
                     photo only empties the field (the driver can take
                     another), so it is not red, which is for the next
                     step, nor yellow, which is for a step that cannot be
                     undone: an outline trash button like a passkey's. -->
                <div class="flex flex-none gap-2">
                    <Button
                        type="button"
                        variant="outline"
                        class="h-11 rounded-lg px-3 font-bold"
                        @click="retake"
                    >
                        <RefreshCw aria-hidden="true" />
                        Retake
                    </Button>
                    <Button
                        type="button"
                        variant="outline"
                        size="icon"
                        class="size-11 rounded-lg text-ink-2"
                        @click="remove"
                    >
                        <Trash2 aria-hidden="true" class="size-[18px]" />
                        <span class="sr-only">Remove photo</span>
                    </Button>
                </div>
            </div>
        </div>

        <label
            v-else
            :for="props.id"
            :class="[
                'flex min-h-36 cursor-pointer flex-col items-center justify-center gap-2 rounded-xl border-2 border-dashed px-4 py-6 text-center transition-colors peer-focus-visible:outline-3 peer-focus-visible:outline-offset-2 peer-focus-visible:outline-brand hover:border-brand hover:bg-brand-tint/40',
                error
                    ? 'border-brand-strong bg-brand-tint/40'
                    : 'border-line-strong bg-surface',
            ]"
        >
            <span
                class="flex size-12 items-center justify-center rounded-full bg-brand text-white"
            >
                <Spinner v-if="preparing" class="size-5" />
                <Camera v-else aria-hidden="true" class="size-6" />
            </span>
            <span class="text-base leading-6 font-bold text-ink">
                {{ preparing ? 'Preparing photo…' : 'Take a photo' }}
            </span>
            <span class="text-[13px] leading-5 text-muted-foreground">
                The parcel at the door, with the house number if you can.
            </span>
        </label>
    </div>
</template>
