<script setup lang="ts">
import { Plus, Ruler, Weight } from '@lucide/vue';
import { computed } from 'vue';
import { formatMoney } from '@/lib/format';
import type { Pricing } from '@/types';

/**
 * The three pricing rules (first kg, each additional kg, size weight),
 * with the amounts from config/kotak.php. "Size weight" is the friendly
 * name for volumetric weight, the same words the price estimate uses.
 */
const props = defineProps<{
    pricing: Pricing;
}>();

// \u00a0 (a non-breaking space) keeps each number on the line of its unit.
const rules = computed(() => [
    {
        icon: Weight,
        title: `${formatMoney(props.pricing.base)} for the first kg`,
        text: 'Covers any parcel charged as 1\u00a0kg or less.',
    },
    {
        icon: Plus,
        title: `${formatMoney(props.pricing.perKg)} for each additional kg`,
        text: 'Every started kg counts, so 5.1\u00a0kg is charged as 6\u00a0kg.',
    },
    {
        icon: Ruler,
        title: `Size weight = L × W × H ÷ ${props.pricing.divisor}`,
        text: 'Also called volumetric weight (box size in cm). When it is more than the actual weight, we charge by size.',
    },
]);
</script>

<template>
    <ul class="flex flex-col gap-[18px]">
        <li
            v-for="rule in rules"
            :key="rule.title"
            class="flex items-start gap-3.5"
        >
            <span
                class="flex size-11 flex-none items-center justify-center rounded-lg bg-brand-tint text-brand"
            >
                <component
                    :is="rule.icon"
                    aria-hidden="true"
                    class="size-[22px]"
                />
            </span>
            <div class="min-w-0 pt-px">
                <p
                    class="text-base leading-[22px] font-bold text-pretty text-ink"
                >
                    {{ rule.title }}
                </p>
                <p
                    class="mt-0.5 text-sm leading-[22px] text-pretty text-muted-foreground"
                >
                    {{ rule.text }}
                </p>
            </div>
        </li>
    </ul>
</template>
