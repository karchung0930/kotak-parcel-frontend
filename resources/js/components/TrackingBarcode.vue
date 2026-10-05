<script setup lang="ts">
import { computed } from 'vue';
import { code39Bars } from '@/lib/code39';
import { formatTrackingNumber } from '@/lib/format';

/**
 * A tracking number as a Code 39 barcode (lib/code39.ts), so branch staff
 * can scan it straight into the counter search (a USB scanner "types"
 * KT-XXXXXXXX and presses Enter) or with a phone's camera
 * (TrackingScanner.vue). Size it with width and height classes (it
 * stretches to fill them; keep it at least ~300px wide).
 */
const props = defineProps<{
    /** Any accepted form: "KT-7Q4M92XD", "KT7Q4M92XD"... */
    value: string;
}>();

const HEIGHT = 60;

const text = computed(() => formatTrackingNumber(props.value));

const symbol = computed(() => code39Bars(text.value));
</script>

<template>
    <svg
        :viewBox="`0 0 ${symbol.width} ${HEIGHT}`"
        role="img"
        :aria-label="`Barcode for tracking number ${text}`"
        preserveAspectRatio="none"
        class="block"
    >
        <rect :width="symbol.width" :height="HEIGHT" fill="#FFFFFF" />
        <rect
            v-for="(bar, index) in symbol.bars"
            :key="index"
            :x="bar.x"
            y="0"
            :width="bar.width"
            :height="HEIGHT"
            fill="#16181D"
        />
    </svg>
</template>
