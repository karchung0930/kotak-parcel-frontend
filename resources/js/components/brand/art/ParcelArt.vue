<script setup lang="ts">
/**
 * A taped cardboard parcel as an SVG group: an 80 × 60 front with its
 * top-left corner at the origin and a depth of 24 across for every 14 up
 * (so its back-bottom-right corner is at 104, 46). Place it with a
 * transform on a wrapping <g>. ParcelBox, EmptyParcel and the scenes all
 * draw their parcels with it, so every box on the site matches.
 *
 * Face shading only, no outlines: the three faces lie on one kraft
 * silhouette, so they meet without light or dark hairlines whatever is
 * behind the box, and the tape sits on a red one of its own where it folds
 * over an edge (lighter on the top face, darker on the side).
 *
 * It draws no ground: stand it on a surface whose top reaches past its
 * back-bottom-right corner (a belt, a platform) or put a ground shadow
 * under it, as ParcelBox does, so that corner rests on something.
 */
withDefaults(
    defineProps<{
        /** vertical: seam tape over the top and down the front; band: a band around it. */
        tape?: 'vertical' | 'band' | 'none';
        /** The label's printing; without it the label is blank (for small sizes). */
        label?: boolean;
        /** No label at all. */
        bare?: boolean;
    }>(),
    {
        tape: 'vertical',
        label: true,
        bare: false,
    },
);
</script>

<template>
    <g>
        <path d="M0 0 24-14H104V46L80 60H0Z" fill="#D4995A" />
        <path d="M0 0 24-14H104L80 0Z" fill="#E7B97F" />
        <path d="M80 0 104-14V46L80 60Z" fill="#B98046" />

        <template v-if="tape === 'vertical'">
            <path
                d="M33 0 57-14H71L47 0V22L44.7 24.5 42.3 22 40 24.5 37.7 22 35.3 24.5 33 22Z"
                fill="#D0161E"
            />
            <path d="M33 0 57-14H71L47 0Z" fill="#E4474D" />
        </template>
        <template v-else-if="tape === 'band'">
            <path d="M0 10H80L104-4V9L80 23H0Z" fill="#A8111A" />
            <rect y="10" width="80" height="13" fill="#D0161E" />
        </template>

        <g v-if="!bare">
            <rect x="50" y="30" width="24" height="24" rx="2" fill="#FFFFFF" />
            <template v-if="label">
                <path
                    d="M50 35V32A2 2 0 0 1 52 30H72A2 2 0 0 1 74 32V35Z"
                    fill="#D0161E"
                />
                <rect
                    x="53"
                    y="38"
                    width="12"
                    height="2"
                    rx="1"
                    fill="#8C93A0"
                />
                <path
                    d="M53 43v8M55.5 43v8M57.5 43v8M60 43v8M62.5 43v8M64.5 43v8M67 43v8M69 43v8M71 43v8"
                    stroke="#16181D"
                    stroke-width="1.1"
                />
            </template>
        </g>
    </g>
</template>
