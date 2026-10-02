<script setup lang="ts">
/**
 * The Kotak van as an SVG group, drawn in the hero's coordinates
 * (x 150-698, y 236-540). Render it inside an <svg>; use KotakVan or
 * DeliveryScene rather than this piece directly.
 */
withDefaults(
    defineProps<{
        /** Drop the small lettering that is unreadable at small sizes. */
        compact?: boolean;
    }>(),
    { compact: false },
);

const tapeWords = [236, 324, 412];
const tapeSquares = [303, 391, 479];
const wheels = [270, 585];
const font = 'Plus Jakarta Sans, sans-serif';
</script>

<template>
    <g>
        <!-- body -->
        <path
            d="M160 256Q160 236 180 236H540Q556 236 566 249L624 330Q630 338 642 340L676 346Q690 349 690 366V474Q690 492 672 492H178Q160 492 160 474Z"
            fill="#D0161E"
        />
        <path
            d="M184 245H532"
            stroke="#E4474D"
            stroke-width="3"
            stroke-linecap="round"
        />
        <path d="M160 432H690V466H160Z" fill="#B5121A" />
        <path
            d="M160 466H690V474Q690 492 672 492H178Q160 492 160 474Z"
            fill="#2A2E36"
        />

        <!-- inverse tape band on the cargo side -->
        <rect x="160" y="398" width="366" height="24" fill="#FFFFFF" />
        <template v-if="compact">
            <rect x="190" y="407" width="300" height="6" fill="#F4B7BA" />
        </template>
        <template v-else>
            <text
                v-for="x in tapeWords"
                :key="`word-${x}`"
                :x="x"
                y="414.5"
                :font-family="font"
                font-size="12"
                font-weight="800"
                letter-spacing="2.4"
                fill="#D0161E"
            >
                KOTAK
            </text>
            <rect
                v-for="x in tapeSquares"
                :key="`square-${x}`"
                :x="x"
                y="407.5"
                width="6"
                height="6"
                fill="#D0161E"
            />
        </template>

        <!-- cab: B-pillar, front door seam, window, mirror, handle, lights -->
        <path d="M526 244V466" stroke="#A8111A" stroke-width="3" />
        <path
            d="M628 338V430"
            stroke="#A8111A"
            stroke-width="3"
            stroke-linecap="round"
        />
        <path
            d="M542 268Q542 262 548 262H561L607 326H548Q542 326 542 320Z"
            fill="#26303F"
        />
        <path d="M550 326H561L583 296H572Z" fill="#FFFFFF" opacity="0.16" />
        <path
            d="M604 322H612"
            stroke="#2A2E36"
            stroke-width="4"
            stroke-linecap="round"
        />
        <rect x="610" y="304" width="12" height="32" rx="4" fill="#2A2E36" />
        <rect x="540" y="352" width="26" height="7" rx="3.5" fill="#A8111A" />
        <rect x="674" y="356" width="16" height="20" rx="4" fill="#FFC53D" />
        <rect x="678" y="386" width="12" height="7" rx="2" fill="#FF8A3D" />
        <rect x="664" y="446" width="34" height="46" rx="8" fill="#2A2E36" />
        <rect x="150" y="448" width="26" height="44" rx="6" fill="#2A2E36" />

        <!-- livery -->
        <g transform="translate(214 276) scale(2.1)">
            <path
                d="M16 5.5 26.5 10.75v10.5L16 26.5 5.5 21.25v-10.5Z"
                fill="#FFFFFF"
            />
            <path
                d="M5.5 10.75 16 16l10.5-5.25M16 16v10.5"
                fill="none"
                stroke="#D0161E"
                stroke-width="1.5"
                stroke-linejoin="round"
            />
            <path
                d="M10.75 8.13 21.25 13.38V18.6"
                fill="none"
                stroke="#D0161E"
                stroke-width="2.4"
                stroke-linejoin="round"
            />
        </g>
        <text
            x="286"
            y="330"
            :font-family="font"
            font-size="62"
            font-weight="800"
            letter-spacing="-1.8"
            fill="#FFFFFF"
        >
            Kotak
        </text>
        <text
            v-if="!compact"
            x="226"
            y="374"
            :font-family="font"
            font-size="17"
            font-weight="700"
            fill="#FFFFFF"
        >
            Parcel delivery · Klang Valley
        </text>

        <!-- wheels -->
        <template v-for="cx in wheels" :key="`wheel-${cx}`">
            <path
                :d="`M${cx - 54} 492A54 54 0 0 1 ${cx + 54} 492Z`"
                fill="#7C0D13"
            />
            <circle :cx="cx" cy="496" r="44" fill="#1F2228" />
            <circle
                :cx="cx"
                cy="496"
                r="35"
                fill="none"
                stroke="#343842"
                stroke-width="3"
            />
            <circle :cx="cx" cy="496" r="24" fill="#D5D9DF" />
            <circle :cx="cx" cy="496" r="15" fill="#EEF0F3" />
            <circle :cx="cx" cy="496" r="6" fill="#8C93A0" />
        </template>
    </g>
</template>
