<script setup lang="ts">
import { computed } from 'vue';
import { pluralize } from '@/lib/format';
import type { RateImportProblem } from '@/types';

/**
 * The problems found in an imported file, where the file has them: row,
 * column (A, B…) and what is wrong. Problems of a route or of the file as
 * a whole have no row; both views say "Across the file" for them. The
 * heading sits above the card, as on the page's other sections. A table
 * (.data-table in app.css) from 40rem of its own width, a list on phones.
 * Only the first 200 come from the server, with the total, which the line
 * under the heading gives.
 */
const props = defineProps<{
    problems: { total: number; items: RateImportProblem[] };
}>();

const ACROSS = 'Across the file';

const shownNote = computed(() =>
    props.problems.total > props.problems.items.length
        ? `The first ${props.problems.items.length} of ${props.problems.total}.`
        : null,
);

const where = (problem: RateImportProblem): string =>
    [
        problem.row === null ? null : `Row ${problem.row}`,
        problem.column === null ? null : `column ${problem.column}`,
    ]
        .filter(Boolean)
        .join(', ') || ACROSS;
</script>

<template>
    <section aria-labelledby="problems-title" class="@container space-y-3">
        <div>
            <h2
                id="problems-title"
                class="text-lg leading-[26px] font-extrabold tracking-heading text-ink"
            >
                {{ pluralize(problems.total, 'problem') }}
            </h2>
            <p
                v-if="shownNote"
                class="mt-0.5 text-[13.5px] leading-5 text-muted-foreground"
            >
                {{ shownNote }}
            </p>
        </div>

        <div class="overflow-hidden rounded-xl border border-line bg-white">
            <div class="hidden overflow-x-auto @[40rem]:block">
                <table
                    role="table"
                    class="data-table text-[13.5px] [--columns:3]"
                >
                    <caption class="sr-only">
                        Problems in the file, by row and column
                    </caption>
                    <thead
                        role="rowgroup"
                        class="data-table__head border-b border-line bg-surface/70 text-[12.5px] leading-5 font-bold whitespace-nowrap text-muted-foreground"
                    >
                        <tr role="row" class="data-table__row">
                            <th scope="col" role="columnheader" class="py-2.5">
                                Row
                            </th>
                            <th scope="col" role="columnheader" class="py-2.5">
                                Column
                            </th>
                            <th scope="col" role="columnheader" class="py-2.5">
                                Problem
                            </th>
                        </tr>
                    </thead>
                    <tbody
                        role="rowgroup"
                        class="data-table__body divide-y divide-line-soft"
                    >
                        <tr
                            v-for="(problem, index) in problems.items"
                            :key="index"
                            role="row"
                            class="data-table__row"
                        >
                            <!-- Without a row, one cell across Row and Column. -->
                            <td
                                v-if="problem.row === null"
                                role="cell"
                                colspan="2"
                                class="col-span-2 py-2.5 font-semibold whitespace-nowrap text-ink"
                            >
                                {{ ACROSS }}
                            </td>
                            <template v-else>
                                <td
                                    role="cell"
                                    class="py-2.5 font-mono font-semibold whitespace-nowrap text-ink"
                                >
                                    {{ problem.row }}
                                </td>
                                <td
                                    role="cell"
                                    class="py-2.5 font-mono font-semibold text-ink"
                                >
                                    {{ problem.column ?? '—' }}
                                </td>
                            </template>
                            <td role="cell" class="max-w-2xl py-2.5 text-ink-2">
                                {{ problem.message }}
                            </td>
                        </tr>
                    </tbody>
                </table>
            </div>

            <ul class="divide-y divide-line-soft @[40rem]:hidden">
                <li
                    v-for="(problem, index) in problems.items"
                    :key="index"
                    class="px-4 py-3 text-sm leading-5"
                >
                    <p class="text-[12.5px] font-bold text-muted-foreground">
                        {{ where(problem) }}
                    </p>
                    <p class="mt-0.5 text-ink-2">{{ problem.message }}</p>
                </li>
            </ul>
        </div>
    </section>
</template>
