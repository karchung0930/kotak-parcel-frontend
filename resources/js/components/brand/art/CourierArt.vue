<script setup lang="ts">
/**
 * The Kotak courier as an SVG group: red polo with the white tape stripe,
 * cap, dark work trousers, light grey work gloves and a handheld scanner
 * clipped to the belt. She faces right with both hands out at waist height
 * (carrying the parcel in DoorstepScene). Both arms share one skin tone and
 * both gloves match; the pale gloves stand out from the kraft parcel she
 * carries and from her charcoal trousers when her arms hang down. Drawn
 * with the feet at the origin, about 105 tall: place it with a transform
 * on a wrapping <g>. Always decorative.
 *
 * The limbs are separate groups so a scene can move them with CSS:
 * courier-art__leg--far / --near swing from the hip (the top of each
 * group), courier-art__arm--near turns at the shoulder (the top left of its
 * group) and courier-art__arm--far at the elbow (its left end).
 */
withDefaults(
    defineProps<{
        /** Drop the tiny print on the stripe and cap for small sizes. */
        compact?: boolean;
    }>(),
    { compact: false },
);

const skin = '#9A6444';
const skinShade = '#84533A';
const hair = '#1F1A17';

/**
 * Light grey work gloves, the same on both hands: a slightly darker knit
 * cuff, then the hand, a pale fist on a grey disc that shows as a hairline
 * rim up-left and a shaded underside down-right (the scenes are lit from
 * the up-left). The rim keeps the pale hand clear against light walls.
 */
const glove = '#F4F5F7';
const gloveShade = '#A3AAB5';
const gloveCuff = '#CDD2D9';
</script>

<template>
    <g class="courier-art">
        <!-- far arm: only the forearm shows past the body, then the glove -->
        <g class="courier-art__arm courier-art__arm--far">
            <path
                d="M6 -69L17 -69.7"
                :stroke="skin"
                stroke-width="6"
                stroke-linecap="round"
            />
            <path
                d="M16.4 -69.7L19.2 -69.8"
                :stroke="gloveCuff"
                stroke-width="6.8"
            />
            <circle cx="21.5" cy="-70" r="3.6" :fill="gloveShade" />
            <circle cx="21.3" cy="-70.2" r="3" :fill="glove" />
        </g>

        <!-- legs: trousers and shoes, then the hips over their tops -->
        <g class="courier-art__leg courier-art__leg--far">
            <path d="M-10.5 -46H-1L-2.5 -5H-10Z" fill="#23262D" />
            <path
                d="M-10.5 -5.5H-2.5Q1.5 -5.5 2.5 -2V0H-10.5Z"
                fill="#16181D"
            />
            <rect x="-10.5" y="-1.4" width="13" height="1.4" fill="#3D4350" />
        </g>
        <g class="courier-art__leg courier-art__leg--near">
            <path d="M-2 -46H10.5L9.5 -5H1Z" fill="#343944" />
            <path d="M1 -5.5H9.5Q13.5 -5.5 14.5 -2V0H1Z" fill="#16181D" />
            <rect x="1" y="-1.4" width="13.5" height="1.4" fill="#3D4350" />
        </g>
        <rect x="-10.5" y="-53" width="21" height="9" fill="#343944" />

        <!-- polo: body, shaded back, white tape stripe, collar -->
        <rect x="-2.5" y="-88" width="6" height="6" :fill="skinShade" />
        <path
            d="M-10.5 -79Q-10.5 -83 -6.5 -83H6.5Q10.5 -83 10.5 -79V-53H-10.5Z"
            fill="#D0161E"
        />
        <path
            d="M-10.5 -79Q-10.5 -83 -6.5 -83H-4.5V-53H-10.5Z"
            fill="#B5121A"
        />
        <rect x="-10.5" y="-72" width="21" height="5" fill="#FFFFFF" />
        <rect x="-10.5" y="-72" width="6" height="5" fill="#E3E6EB" />
        <template v-if="!compact">
            <rect x="-3" y="-70.3" width="4.5" height="1.6" fill="#D0161E" />
            <rect x="3.5" y="-70.3" width="4.5" height="1.6" fill="#D0161E" />
        </template>
        <path d="M-2 -83L2 -78.8L6 -83Z" :fill="skinShade" />
        <path
            d="M-4.8 -83.4H-1.6L2 -78.8L0.4 -77.6ZM8.8 -83.4H5.6L2 -78.8L3.6 -77.6Z"
            fill="#A8111A"
        />

        <!-- belt and the scanner in its holster -->
        <rect x="-10.5" y="-54.5" width="21" height="3" fill="#16181D" />
        <rect x="6" y="-54.5" width="3.5" height="3" fill="#8C93A0" />
        <rect x="-1" y="-52" width="6.5" height="10" rx="1.6" fill="#16181D" />
        <rect
            x="-0.5"
            y="-58.5"
            width="5.5"
            height="8"
            rx="1.2"
            fill="#555C69"
        />
        <rect
            x="0.5"
            y="-57.2"
            width="3.5"
            height="3"
            rx="0.4"
            fill="#FFC53D"
        />

        <!-- near arm: lit sleeve, the forearm out to the parcel, the glove -->
        <g class="courier-art__arm courier-art__arm--near">
            <path
                d="M1.5 -78.5L5.5 -70.5"
                stroke="#E4474D"
                stroke-width="9"
                stroke-linecap="round"
            />
            <path
                d="M5.5 -69.5L7.5 -62L18.5 -57.8"
                fill="none"
                :stroke="skin"
                stroke-width="6.2"
                stroke-linecap="round"
                stroke-linejoin="round"
            />
            <path
                d="M17.56 -58.13L20.36 -57.06"
                :stroke="gloveCuff"
                stroke-width="7"
            />
            <circle cx="22.6" cy="-56.2" r="3.9" :fill="gloveShade" />
            <circle cx="22.4" cy="-56.4" r="3.3" :fill="glove" />
        </g>

        <!-- ponytail out of the back of the cap -->
        <path
            d="M-7.5 -98.5Q-14.5 -98 -15.5 -90Q-16 -83 -12.5 -78.5Q-13 -85 -10.5 -89.5Q-9 -92 -7 -93Z"
            :fill="hair"
        />

        <!-- head: hair at the nape, ear, eye, smile, cap -->
        <circle cx="1" cy="-94" r="9" :fill="skin" />
        <path
            d="M-8.2 -96Q-9.8 -90 -7 -86.8Q-4.8 -85.3 -2.6 -86.2V-96Z"
            :fill="hair"
        />
        <ellipse cx="-1.2" cy="-92.5" rx="1.8" ry="2.4" :fill="skinShade" />
        <ellipse cx="5.5" cy="-94" rx="1.1" ry="1.35" fill="#16181D" />
        <path
            d="M4 -89.8Q6 -88.2 8 -90"
            fill="none"
            stroke="#4A2A1C"
            stroke-width="1.1"
            stroke-linecap="round"
        />
        <path
            d="M-9.2 -95Q-9.8 -104.5 0.5 -104.8Q10.2 -105 10.4 -96Z"
            fill="#D0161E"
        />
        <path d="M-9.2 -95.2L10.4 -96.2" stroke="#A8111A" stroke-width="1.4" />
        <path
            d="M8 -96.8H17.5Q19.5 -96.8 18.8 -95.2Q18.4 -94.4 17 -94.4H8Z"
            fill="#A8111A"
        />
        <g v-if="!compact" transform="translate(-1.2 -104) scale(0.22)">
            <path
                d="M16 5.5 26.5 10.75v10.5L16 26.5 5.5 21.25v-10.5Z"
                fill="#FFFFFF"
            />
        </g>
    </g>
</template>
