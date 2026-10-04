<script setup lang="ts">
import { MapPin, Ruler, Weight } from '@lucide/vue';
import { computed } from 'vue';
import { formatMoney, formatVolumeSum } from '@/lib/format';
import { lowestExtraKgSen, lowestPriceSen } from '@/lib/pricing';
import type { Pricing } from '@/types';

/**
 * The three pricing rules (where it goes, weight bands, size weight), with
 * the amounts from the current rate card. "Size weight" is the friendly
 * name for volumetric weight, the same words the price estimate uses.
 */
const props = defineProps<{
    pricing: Pricing;
}>();

// \u00a0 (a non-breaking space) keeps each number on the line of its unit.
const rules = computed(() => {
    const zones = props.pricing.zones.length;

    return [
        {
            icon: MapPin,
            title:
                zones > 1
                    ? `${zones} delivery zones`
                    : 'One price across Malaysia',
            text:
                zones > 1
                    ? 'The price depends on the zone of your drop-off branch and the zone of the delivery address.'
                    : 'The same rates from every branch to every state.',
        },
        {
            icon: Weight,
            title: `Weight bands from ${formatMoney(lowestPriceSen(props.pricing))}`,
            text: `Each route has its own bands. Above the top band, every started kg costs extra (from ${formatMoney(lowestExtraKgSen(props.pricing))}), so 5.1\u00a0kg counts as 6\u00a0kg.`,
        },
        {
            icon: Ruler,
            // The formula stays whole: on a phone it goes under "Size
            // weight =" rather than leaving the divisor alone on a line.
            title: `Size weight = ${formatVolumeSum(null, null, null, props.pricing.divisor, { whole: true })}`,
            text: 'Also called volumetric weight (box size in cm). When it is more than the actual weight, we charge by size.',
        },
    ];
});
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
