<script setup lang="ts">
import { X } from '@lucide/vue';
import { Button } from '@/components/ui/button';

/**
 * The × that closes a panel, sheet or dialog. It is one component used
 * everywhere, so every close button looks and behaves the same: a 36px
 * square outline Button with an 18px × and a name for screen readers.
 * It is an outline Button like the ones beside it (the panel's Cancel):
 * white with a strong grey border, and on hover a dark border and a soft
 * shadow. Its ::after reaches 4px past each edge, so the target is 44px
 * while it still looks 36px.
 *
 * On its own it is a plain button: listen for its click, which falls
 * through to the <button>. Inside a DialogClose or SheetClose with
 * `as-child` it closes that dialog or sheet itself. The container it
 * closes places it (a class for its position falls through): fixed in
 * its top right corner, as far in as the container's padding, so it
 * lines up with the content whatever the content is (DialogContent,
 * SheetContent, DispatchPanel).
 */
withDefaults(
    defineProps<{
        /** What it closes, for screen readers, e.g. "Close panel". */
        label?: string;
    }>(),
    {
        label: 'Close',
    },
);
</script>

<template>
    <Button
        type="button"
        variant="outline"
        size="icon"
        class="relative text-ink-2 after:absolute after:-inset-1"
    >
        <X aria-hidden="true" class="size-[18px]" />
        <span class="sr-only">{{ label }}</span>
    </Button>
</template>
