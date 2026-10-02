<script setup lang="ts">
/**
 * A Kotak van seen from further off, as an SVG group in VanArt's
 * coordinates (x 150-698, y 236-540, facing right) so the two place the
 * same way: the same body, cab and wheels with the lettering, seams and
 * small lamps left out. For the vans at the hub's far docks, where
 * VanArt's detail would only add noise. Always decorative.
 */
const wheels = [270, 585];
</script>

<template>
    <g>
        <path
            d="M160 256Q160 236 180 236H540Q556 236 566 249L624 330Q630 338 642 340L676 346Q690 349 690 366V474Q690 492 672 492H178Q160 492 160 474Z"
            fill="#D0161E"
        />
        <path d="M160 432H690V466H160Z" fill="#B5121A" />
        <path
            d="M160 466H690V474Q690 492 672 492H178Q160 492 160 474Z"
            fill="#2A2E36"
        />
        <rect x="160" y="398" width="366" height="24" fill="#FFFFFF" />
        <path
            d="M542 268Q542 262 548 262H561L607 326H548Q542 326 542 320Z"
            fill="#26303F"
        />
        <rect x="674" y="356" width="16" height="20" rx="4" fill="#FFC53D" />
        <g transform="translate(214 276) scale(2.1)">
            <path
                d="M16 5.5 26.5 10.75v10.5L16 26.5 5.5 21.25v-10.5Z"
                fill="#FFFFFF"
            />
        </g>
        <text
            x="286"
            y="330"
            font-family="Plus Jakarta Sans, sans-serif"
            font-size="62"
            font-weight="800"
            letter-spacing="-1.8"
            fill="#FFFFFF"
        >
            Kotak
        </text>
        <template v-for="cx in wheels" :key="`wheel-${cx}`">
            <path
                :d="`M${cx - 54} 492A54 54 0 0 1 ${cx + 54} 492Z`"
                fill="#7C0D13"
            />
            <circle :cx="cx" cy="496" r="44" fill="#1F2228" />
            <circle :cx="cx" cy="496" r="20" fill="#D5D9DF" />
        </template>
    </g>
</template>
