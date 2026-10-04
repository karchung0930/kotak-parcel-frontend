<script setup lang="ts">
import { computed } from 'vue';
import { columnLetter } from '@/lib/rateImport';

/**
 * Rows of a sheet as a small spreadsheet: column letters across the top,
 * row numbers down the side (kept in view while the columns scroll), the
 * headings row in the brand tint and, for a matrix, the row of prices per
 * extra kg in grey, each marked by name (on phones only by its tint, and
 * for screen readers, so the row numbers stay narrow). The card is as wide
 * as its columns, so they keep equal gaps, and scrolls sideways when they
 * do not fit. Long cells are cut short; the whole text is in their title.
 *
 * Without labels, the same small sheet shows example rows only: no
 * letters or row numbers, the headings row still tinted.
 */
const props = withDefaults(
    defineProps<{
        rows: { number: number; cells: string[] }[];
        /** The widest row of the sheet. */
        columns: number;
        headerRow: number;
        extraRow?: number | null;
        /** Show the column letters and row numbers. */
        labels?: boolean;
        caption?: string;
    }>(),
    {
        extraRow: null,
        labels: true,
        caption:
            'The first rows of the sheet, with the row numbers and column letters of the file',
    },
);

/** The most columns shown; a matrix of 16 zones has 257. */
const MAX_COLUMNS = 30;

const shown = computed(() => Math.min(props.columns, MAX_COLUMNS));

// Opaque tints, so the sticky row numbers hide what scrolls under them.
const headingTint = 'bg-[color-mix(in_srgb,var(--color-brand-tint)_70%,white)]';
const extraTint = 'bg-[color-mix(in_srgb,var(--color-surface)_80%,white)]';

function rowClass(number: number): string {
    if (number === props.headerRow) {
        return `${headingTint} font-bold text-ink`;
    }

    return number === props.extraRow
        ? `${extraTint} text-ink-2`
        : 'bg-white text-ink-2';
}

function rowTag(number: number): string | null {
    if (number === props.headerRow) {
        return 'Headings';
    }

    return number === props.extraRow ? 'Extra kg' : null;
}

// 20px at both ends, 24px between columns.
const cellClass = computed(
    () => `px-3 py-2 last:pr-5 ${props.labels ? '' : 'first:pl-5'}`,
);
const rowHeadClass =
    'sticky left-0 z-10 py-2 pr-3 pl-5 text-left whitespace-nowrap shadow-[inset_-1px_0_0_var(--color-line)]';
</script>

<template>
    <div class="grid gap-2">
        <div
            class="w-fit max-w-full overflow-x-auto rounded-xl border border-line"
        >
            <table class="w-max text-left text-[13px] leading-5">
                <caption class="sr-only">
                    {{
                        caption
                    }}
                </caption>
                <thead
                    v-if="labels"
                    class="border-b border-line bg-surface text-xs font-bold text-muted-foreground"
                >
                    <tr>
                        <th scope="col" :class="[rowHeadClass, 'bg-surface']">
                            Row
                        </th>
                        <th
                            v-for="column in shown"
                            :key="column"
                            scope="col"
                            :class="[cellClass, 'font-mono']"
                        >
                            {{ columnLetter(column - 1) }}
                        </th>
                    </tr>
                </thead>
                <tbody class="divide-y divide-line-soft">
                    <tr
                        v-for="row in rows"
                        :key="row.number"
                        :class="rowClass(row.number)"
                    >
                        <th
                            v-if="labels"
                            scope="row"
                            :class="[
                                rowHeadClass,
                                rowClass(row.number),
                                'font-mono font-semibold text-muted-foreground',
                            ]"
                        >
                            {{ row.number }}
                            <span
                                v-if="rowTag(row.number)"
                                :class="[
                                    'ml-1.5 font-sans text-[11px] font-bold tracking-wide uppercase max-sm:sr-only',
                                    row.number === headerRow
                                        ? 'text-brand-strong'
                                        : 'text-ink-2',
                                ]"
                            >
                                {{ rowTag(row.number) }}
                            </span>
                        </th>
                        <td
                            v-for="column in shown"
                            :key="column"
                            :class="[cellClass, 'max-w-56 truncate']"
                            :title="row.cells[column - 1] || undefined"
                        >
                            {{ row.cells[column - 1] ?? '' }}
                        </td>
                    </tr>
                </tbody>
            </table>
        </div>
        <p
            v-if="columns > shown"
            class="text-[13px] leading-5 text-muted-foreground"
        >
            Showing columns A to {{ columnLetter(shown - 1) }} of
            {{ columnLetter(columns - 1) }}.
        </p>
    </div>
</template>
