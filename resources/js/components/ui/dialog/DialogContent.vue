<script setup lang="ts">
import type { DialogContentEmits, DialogContentProps } from "reka-ui"
import type { HTMLAttributes } from "vue"
import { reactiveOmit } from "@vueuse/core"
import {
  DialogClose,
  DialogContent,
  DialogPortal,
  useForwardPropsEmits,
} from "reka-ui"
import CloseButton from "@/components/CloseButton.vue"
import { cn } from "@/lib/utils"
import DialogOverlay from "./DialogOverlay.vue"

defineOptions({
  inheritAttrs: false,
})

interface Props extends DialogContentProps {
  class?: HTMLAttributes["class"]
  showCloseButton?: boolean
}

const props = withDefaults(defineProps<Props>(), {
  showCloseButton: true,
})
const emits = defineEmits<DialogContentEmits>()

const delegatedProps = reactiveOmit(props, "class", "showCloseButton")

const forwarded = useForwardPropsEmits(delegatedProps, emits)
</script>

<template>
  <DialogPortal>
    <DialogOverlay />
    <!-- Every dialog has this one padding, --dialog-padding: 20px on
         phones, 24px from sm. A dialog does not set its own padding or
         move the close button; a footer band that runs edge to edge is
         DialogFooter's `band`, which works from the same padding.
         A dialog taller than the screen (a phone on its side) scrolls
         inside itself, 1rem clear of the top and bottom edges; the close
         button scrolls with the title. -->
    <DialogContent
      data-slot="dialog-content"
      v-bind="{ ...$attrs, ...forwarded }"
      :class="
        cn(
          'bg-background data-[state=open]:animate-in data-[state=closed]:animate-out data-[state=closed]:fade-out-0 data-[state=open]:fade-in-0 data-[state=closed]:zoom-out-95 data-[state=open]:zoom-in-95 fixed top-[50%] left-[50%] z-50 grid max-h-[calc(100dvh-2rem)] w-full max-w-[calc(100%-2rem)] translate-x-[-50%] translate-y-[-50%] gap-4 overflow-y-auto rounded-lg border [--dialog-padding:1.25rem] p-(--dialog-padding) shadow-lg duration-200 sm:max-w-lg sm:[--dialog-padding:1.5rem]',
          props.class,
        )"
    >
      <slot />

      <!-- The site's one close button (CloseButton), fixed in the top
           right corner: the dialog's padding from the top and from the
           right, so it lines up with the content's top and right edges
           whatever the content is. A first row that could run under it
           leaves room on its right (pr-12: the 36px button and a gap). -->
      <DialogClose v-if="showCloseButton" data-slot="dialog-close" as-child>
        <CloseButton class="absolute top-(--dialog-padding) right-(--dialog-padding)" />
      </DialogClose>
    </DialogContent>
  </DialogPortal>
</template>
