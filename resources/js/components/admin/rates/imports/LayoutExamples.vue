<script setup lang="ts">
import SheetPreview from '@/components/admin/rates/imports/SheetPreview.vue';

/**
 * The two layouts an import reads, each as a small example sheet (the
 * same SheetPreview as the columns step, without letters and row
 * numbers): a row per weight band, and weights by route. Headings may be
 * worded and placed freely (any case, title rows above them, other
 * columns beside them); these are only the usual shapes.
 */
const EXAMPLES = [
    {
        title: 'A row per weight band',
        text: 'Origin, destination, max weight and price columns. A row whose weight says “Each additional kg” gives the route’s price per extra kg.',
        rows: [
            ['Origin', 'Destination', 'Max weight (kg)', 'Price (RM)'],
            ['Peninsular Malaysia', 'Sarawak', '0.5', '9.00'],
            ['Peninsular Malaysia', 'Sarawak', '1', '11.50'],
            ['Peninsular Malaysia', 'Sarawak', 'Each additional kg', '4.50'],
        ],
    },
    {
        title: 'Weights by route',
        text: 'Weights down the first column and a column for each route, named “From → To”. Write “n/a” where a route has no band at that weight; an empty box is a missing price.',
        rows: [
            [
                'Weight (kg)',
                'Peninsular Malaysia → Sarawak',
                'Sarawak → Sarawak',
            ],
            ['0.5', '9.00', 'n/a'],
            ['1', '11.50', '9.00'],
            ['Each additional kg', '4.50', '2.50'],
        ],
    },
].map((example) => ({
    ...example,
    rows: example.rows.map((cells, index) => ({ number: index + 1, cells })),
}));
</script>

<template>
    <div class="grid gap-6 xl:grid-cols-2 xl:gap-8">
        <div
            v-for="example in EXAMPLES"
            :key="example.title"
            class="grid gap-2"
        >
            <h3 class="text-[15px] leading-5 font-bold text-ink">
                {{ example.title }}
            </h3>
            <p
                class="text-[13.5px] leading-5 text-pretty text-muted-foreground"
            >
                {{ example.text }}
            </p>
            <SheetPreview
                :rows="example.rows"
                :columns="example.rows[0]?.cells.length ?? 0"
                :header-row="1"
                :labels="false"
                :caption="`Example: ${example.title}`"
            />
        </div>
    </div>
</template>
