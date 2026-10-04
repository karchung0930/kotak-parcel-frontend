<script setup lang="ts">
import { computed } from 'vue';
import {
    EMPTY,
    formatDate,
    formatDateTime,
    formatShortDate,
    formatShortDateTime,
    formatTime,
    formatWeekdayDate,
} from '@/lib/format';

/**
 * A timestamp (ISO UTC) or a "YYYY-MM-DD" date in Kuala Lumpur time,
 * inside a <time datetime> element.
 *
 * Formats: datetime "29 Sep 2026, 14:05" · date "29 Sep 2026" ·
 * weekday "Tue, 29 Sep 2026" · short "29 Sep" · shortDateTime
 * "29 Sep, 14:05" · time "14:05".
 *
 * The date itself never breaks (the formatters join its parts with
 * no-break spaces), but the time may go to the next line after the comma,
 * so a narrow box never has to grow to fit both. A table cell that wants
 * one line sets whitespace-nowrap itself.
 */
const props = withDefaults(
    defineProps<{
        value: string | null | undefined;
        format?:
            | 'datetime'
            | 'date'
            | 'weekday'
            | 'short'
            | 'shortDateTime'
            | 'time';
        /** JetBrains Mono, for times in tables and timelines. */
        mono?: boolean;
    }>(),
    {
        format: 'datetime',
        mono: false,
    },
);

const formatters = {
    datetime: formatDateTime,
    date: formatDate,
    weekday: formatWeekdayDate,
    short: formatShortDate,
    shortDateTime: formatShortDateTime,
    time: formatTime,
};

const text = computed(() => formatters[props.format](props.value));
</script>

<template>
    <time
        v-if="value && text !== EMPTY"
        :datetime="value"
        :class="{ 'font-mono': mono }"
        >{{ text }}</time
    >
    <span v-else>{{ EMPTY }}</span>
</template>
