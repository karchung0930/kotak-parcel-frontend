<script setup lang="ts">
import type { HTMLAttributes } from "vue"
import { cn } from "@/lib/utils"

const props = defineProps<{ class?: HTMLAttributes["class"] }>()
</script>

<template>
  <!-- Padded like the rest of the sheet, so a header's first row starts
       level with SheetContent's close button. -->
  <div
    data-slot="sheet-header"
    :class="cn('flex flex-col gap-1.5 p-(--sheet-padding)', props.class)"
  >
    <slot />
  </div>
</template>
