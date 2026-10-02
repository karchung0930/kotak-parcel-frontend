<script setup lang="ts">
import type { HTMLAttributes } from "vue"
import { DialogClose } from "reka-ui"
import { cn } from "@/lib/utils"
import { Button } from '@/components/ui/button'

const props = withDefaults(defineProps<{
  class?: HTMLAttributes["class"]
  showCloseButton?: boolean
  /** A grey band along the dialog's bottom edge for the buttons. */
  band?: boolean
}>(), {
  showCloseButton: false,
  band: false,
})
</script>

<template>
  <!-- As a band it runs edge to edge: it reaches out through the dialog's
       padding (negative margins of --dialog-padding) and is padded with it
       again, so its buttons still line up with the content above. The
       dialog's rows are 1rem apart (DialogContent's gap-4), so it tops that
       up to a full padding above its line, as below it. -->
  <div
    data-slot="dialog-footer"
    :class="cn(
      'flex flex-col-reverse gap-2 sm:flex-row sm:justify-end',
      band && '-mx-(--dialog-padding) mt-[calc(var(--dialog-padding)-1rem)] -mb-(--dialog-padding) rounded-b-lg border-t border-line bg-surface/60 p-(--dialog-padding)',
      props.class,
    )"
  >
    <slot />
    <DialogClose v-if="showCloseButton" as-child>
      <Button variant="outline">
        Close
      </Button>
    </DialogClose>
  </div>
</template>
