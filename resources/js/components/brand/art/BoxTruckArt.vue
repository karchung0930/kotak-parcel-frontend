<script setup lang="ts">
/**
 * A Kotak box truck from the side, facing right, as an SVG group: 7.3 m
 * long and 3.8 m tall at 100 units a metre, drawn with its rear at x 0
 * and its wheels on y 0 (it stands up into negative y). The red cargo
 * box carries the white tape band and the wordmark; the cab is lower in
 * front. For the hub's docks, next to the vans. Always decorative.
 */
const font = 'Plus Jakarta Sans, sans-serif';
const wheels = [118, 208, 612];
</script>

<template>
    <g>
        <!-- chassis under the box and the cab -->
        <rect x="16" y="-102" width="700" height="30" fill="#2A2E36" />

        <!-- cargo box: lit top edge, tape band, box mark and wordmark -->
        <rect x="0" y="-380" width="528" height="282" rx="6" fill="#D0161E" />
        <rect x="0" y="-380" width="528" height="10" rx="4" fill="#E4474D" />
        <rect x="0" y="-112" width="528" height="14" fill="#A8111A" />
        <rect x="0" y="-162" width="528" height="30" fill="#FFFFFF" />
        <rect x="24" y="-151" width="480" height="8" fill="#F4B7BA" />
        <rect x="0" y="-380" width="12" height="282" fill="#B5121A" />
        <g transform="translate(40 -330) scale(3)">
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
        </g>
        <text
            x="150"
            y="-214"
            :font-family="font"
            font-size="104"
            font-weight="800"
            letter-spacing="-3"
            fill="#FFFFFF"
        >
            Kotak
        </text>

        <!-- cab: sloped windscreen, window, door seam, mirror, lamps -->
        <path
            d="M540 -300H652Q672 -300 682 -282L716 -196Q722 -184 722 -170V-86Q722 -72 708 -72H540Z"
            fill="#D0161E"
        />
        <path
            d="M540 -300H652Q672 -300 682 -282L688 -268H540Z"
            fill="#E4474D"
        />
        <path
            d="M568 -282H650Q660 -282 665 -272L694 -202H568Z"
            fill="#26303F"
        />
        <path d="M596 -202H614L646 -282H628Z" fill="#FFFFFF" opacity="0.16" />
        <path d="M558 -290V-86" stroke="#A8111A" stroke-width="4" />
        <rect x="690" y="-250" width="12" height="40" rx="4" fill="#2A2E36" />
        <rect x="576" y="-176" width="30" height="8" rx="4" fill="#A8111A" />
        <rect x="704" y="-158" width="18" height="22" rx="4" fill="#FFC53D" />
        <rect x="696" y="-104" width="34" height="34" rx="8" fill="#2A2E36" />

        <!-- wheels: tandem at the back, one in front -->
        <template v-for="cx in wheels" :key="`wheel-${cx}`">
            <circle :cx="cx" cy="-44" r="44" fill="#1F2228" />
            <circle
                :cx="cx"
                cy="-44"
                r="34"
                fill="none"
                stroke="#343842"
                stroke-width="3"
            />
            <circle :cx="cx" cy="-44" r="20" fill="#D5D9DF" />
            <circle :cx="cx" cy="-44" r="7" fill="#8C93A0" />
        </template>
    </g>
</template>
