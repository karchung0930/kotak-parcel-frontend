<script setup lang="ts">
import type { HTMLAttributes } from "vue"
import { useVModel } from "@vueuse/core"
import { cn } from "@/lib/utils"

/**
 * The site's multi-line text field, in the same style as its inputs: 16px
 * on phones (iOS zooms in on smaller fields), 15px from 640px, and the
 * brand red edge when invalid. Attributes (rows, maxlength, aria-*) go to
 * the textarea.
 */
const props = defineProps<{
  defaultValue?: string
  modelValue?: string
  class?: HTMLAttributes["class"]
}>()

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
      'w-full resize-y rounded-lg border border-field bg-white px-3 py-2.5 text-base leading-6 text-ink outline-none placeholder:text-subtle focus-visible:border-ring focus-visible:ring-[3px] focus-visible:ring-ring/50 aria-invalid:border-brand-strong sm:text-[15px]',
      props.class,
    )"
  />
</template>
