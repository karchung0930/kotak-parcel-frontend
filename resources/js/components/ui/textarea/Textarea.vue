<script setup lang="ts">
import type { HTMLAttributes } from "vue"
import { useVModel } from "@vueuse/core"
import { cn } from "@/lib/utils"

/**
 * The site's multi-line text field, in the same style as its inputs, with
 * the brand red edge when invalid. Attributes (rows, maxlength, aria-*) go
 * to the textarea.
 *
 * size: md for admin forms: a 1px edge, as their inputs, 16px text on
 * phones (iOS zooms in on smaller fields) and 15px from 640px, and it can
 * be made taller. lg for the customer, counter and driver forms: a 1.5px
 * edge and 16px text at every width, as NativeSelect's and UnitInput's lg,
 * and a fixed height, so a dialog or the driver's form keeps its layout.
 */
const props = withDefaults(defineProps<{
  defaultValue?: string
  modelValue?: string
  size?: "md" | "lg"
  class?: HTMLAttributes["class"]
}>(), {
  defaultValue: undefined,
  modelValue: undefined,
  size: "md",
  class: undefined,
})

const emits = defineEmits<{
  (e: "update:modelValue", payload: string): void
}>()

const modelValue = useVModel(props, "modelValue", emits, {
  passive: true,
  defaultValue: props.defaultValue,
})
</script>

<template>
  <textarea
    v-model="modelValue"
    data-slot="textarea"
    :class="cn(
      'w-full rounded-lg border-field bg-white py-2.5 text-base leading-6 text-ink outline-none placeholder:text-subtle focus-visible:border-ring focus-visible:ring-[3px] focus-visible:ring-ring/50 aria-invalid:border-brand-strong',
      size === 'lg'
        ? 'resize-none border-[1.5px] px-3.5'
        : 'resize-y border px-3 sm:text-[15px]',
      props.class,
    )"
  />
</template>
