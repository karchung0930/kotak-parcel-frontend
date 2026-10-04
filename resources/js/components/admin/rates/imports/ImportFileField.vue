<script setup lang="ts">
import { FileSpreadsheet, RefreshCw, Trash2 } from '@lucide/vue';
import { computed, ref, useTemplateRef } from 'vue';
import { Button } from '@/components/ui/button';
import { fileProblem, formatFileSize } from '@/lib/rateImport';

/**
 * The spreadsheet to import: a drop area that opens the file picker (or
 * takes a file dropped on it), then the chosen file's name and size with
 * Change and Remove. Only .xlsx and .csv files up to the limit are taken,
 * chosen or dropped: anything else is refused here with the server's
 * message (`reject`), before it is sent. The server checks again. v-model
 * holds the File to send.
 */
const file = defineModel<File | null>({ required: true });

const props = defineProps<{
    id: string;
    /** The largest file accepted, in KB. */
    maxKb: number;
    /** Validation message, from the server or a refused file. */
    error?: string;
    /** Ids of hint or error text that describe the field. */
    describedBy?: string;
}>();

const emit = defineEmits<{
    /** A file was refused, with why. */
    reject: [message: string];
}>();

const input = useTemplateRef<HTMLInputElement>('input');
const dragging = ref(false);

const limit = computed(() => formatFileSize(props.maxKb * 1024));

function take(chosen: File): void {
    const problem = fileProblem(chosen, props.maxKb);

    if (problem) {
        emit('reject', problem);

        return;
    }

    file.value = chosen;
}

function choose(event: Event): void {
    const chosen = (event.target as HTMLInputElement).files?.[0];

    if (chosen) {
        take(chosen);
    }

    // Lets the same file be chosen again after removing it.
    (event.target as HTMLInputElement).value = '';
}

function drop(event: DragEvent): void {
    dragging.value = false;
    const dropped = event.dataTransfer?.files?.[0];

    if (dropped) {
        take(dropped);
    }
}

function change(): void {
    input.value?.click();
}

function remove(): void {
    file.value = null;
    input.value?.focus();
}
</script>

<template>
    <!-- min-w-0: a long file name wraps, never widening the field. -->
    <div class="min-w-0">
        <!-- The real control: visually hidden but focusable, opened by its label. -->
        <input
            :id="id"
            ref="input"
            type="file"
            accept=".xlsx,.csv,application/vnd.openxmlformats-officedocument.spreadsheetml.sheet,text/csv"
            class="peer sr-only"
            :tabindex="file ? -1 : undefined"
            :aria-invalid="error ? 'true' : undefined"
            :aria-describedby="describedBy"
            @change="choose"
        />

        <!-- The name takes the row; on a phone the buttons wrap under it.
             The whole name shows, as two files often differ only at the end. -->
        <div
            v-if="file"
            class="flex flex-wrap items-center gap-x-3 gap-y-2.5 rounded-xl border border-line bg-surface/60 px-4 py-3"
        >
            <span
                class="flex size-10 flex-none items-center justify-center rounded-lg bg-white text-status-delivered ring-1 ring-line"
            >
                <FileSpreadsheet aria-hidden="true" class="size-5" />
            </span>
            <p class="min-w-0 flex-[1_1_10rem] text-sm leading-5">
                <span class="block font-bold wrap-anywhere text-ink">
                    {{ file.name }}
                </span>
                <span class="text-[13px] text-muted-foreground">
                    {{ formatFileSize(file.size) }}
                </span>
            </p>
            <!-- Removing only empties the field, so it is a white button. -->
            <div class="flex flex-none gap-2.5 max-sm:ml-auto">
                <Button
                    type="button"
                    variant="outline"
                    class="h-11 rounded-lg px-3 font-bold"
                    @click="change"
                >
                    <RefreshCw aria-hidden="true" />
                    Change
                    <span class="sr-only">{{ file.name }}</span>
                </Button>
                <Button
                    type="button"
                    variant="outline"
                    size="icon"
                    class="size-11 rounded-lg text-ink-2"
                    @click="remove"
                >
                    <Trash2 aria-hidden="true" class="size-[18px]" />
                    <span class="sr-only">Remove {{ file.name }}</span>
                </Button>
            </div>
        </div>

        <!-- Pointed at, it lifts like a white button; the pale red tint only
             shows while a file is dragged over it (where it will go). -->
        <label
            v-else
            :for="id"
            :class="[
                'flex min-h-32 cursor-pointer flex-col items-center justify-center gap-2 rounded-xl border-2 border-dashed px-4 py-6 text-center transition-[background-color,border-color,box-shadow] peer-focus-visible:outline-3 peer-focus-visible:outline-offset-2 peer-focus-visible:outline-brand',
                dragging
                    ? 'border-brand bg-brand-tint/40'
                    : error
                      ? 'border-brand-strong bg-white hover:shadow-[0_1px_2px_rgb(22_24_29_/_0.10),0_3px_8px_rgb(22_24_29_/_0.12)]'
                      : 'border-line-strong bg-surface hover:border-ink-2 hover:bg-white hover:shadow-[0_1px_2px_rgb(22_24_29_/_0.10),0_3px_8px_rgb(22_24_29_/_0.12)]',
            ]"
            @dragover.prevent="dragging = true"
            @dragleave="dragging = false"
            @drop.prevent="drop"
        >
            <span
                class="flex size-11 items-center justify-center rounded-full bg-white text-brand ring-1 ring-line"
            >
                <FileSpreadsheet aria-hidden="true" class="size-5" />
            </span>
            <span class="text-[15px] leading-6 font-bold text-ink">
                Choose a spreadsheet
                <span class="font-semibold text-muted-foreground max-sm:hidden">
                    or drop it here
                </span>
            </span>
            <span class="text-[13px] leading-5 text-muted-foreground">
                Excel (.xlsx) or CSV, up to {{ limit }}
            </span>
        </label>
    </div>
</template>
