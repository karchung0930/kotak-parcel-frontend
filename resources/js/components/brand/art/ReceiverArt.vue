<script setup lang="ts">
/**
 * The receiver as an SVG group, in home clothes: T-shirt, joggers and
 * slippers. Drawn facing right with both hands out at waist height (in
 * DoorstepScene he is mirrored to face the courier and take the parcel).
 * Feet at the origin, about 108 tall: place it with a transform on a
 * wrapping <g>. Always decorative.
 *
 * The limbs are separate groups so a scene can move them with CSS:
 * receiver-art__leg--far / --near swing from the hip (the top of each
 * group) and each receiver-art__arm turns at its top left corner (the
 * shoulder for the near arm, the elbow for the far one).
 *
 * Both arms share one skin tone. The hands hold the parcel by its darker
 * side face (x 12-24 here, in DoorstepScene), and each forearm casts a soft
 * shadow just below it, so light hands stay clear against the kraft box.
 */
const skin = '#E8B98F';
const skinShade = '#D29E74';
const hair = '#2A211C';
const tee = '#5B84B1';
const teeShade = '#4A6F99';

/** The soft shadow each forearm casts on whatever is under it. */
const shadow = '#16181D';
const shadowOpacity = 0.24;
</script>

<template>
    <g class="receiver-art">
        <!-- far arm: only the forearm shows past the body, clear of the
             near elbow, with its shadow on the parcel -->
        <g class="receiver-art__arm receiver-art__arm--far">
            <g transform="translate(0 1.3)" :opacity="shadowOpacity">
                <path
                    d="M6 -73L18.8 -66.2"
                    :stroke="shadow"
                    stroke-width="7.2"
                    stroke-linecap="round"
                />
                <circle cx="19.3" cy="-66" r="4.5" :fill="shadow" />
            </g>
            <path
                d="M6 -73L18.8 -66.2"
                :stroke="skin"
                stroke-width="6"
                stroke-linecap="round"
            />
            <circle cx="19.3" cy="-66" r="3.6" :fill="skin" />
        </g>

        <!-- legs: joggers, cuffs, feet in slippers; the hips over the tops -->
        <g class="receiver-art__leg receiver-art__leg--far">
            <path d="M-10.5 -47H-1L-2.5 -9H-10Z" fill="#8C93A0" />
            <rect
                x="-10.2"
                y="-10"
                width="7.9"
                height="3.2"
                rx="1"
                fill="#6B7280"
            />
            <path
                d="M-9.5 -7H-3.5V-4.4Q1.5 -4.6 2.5 -2.4H-9.5Z"
                :fill="skinShade"
            />
            <rect
                x="-10.5"
                y="-2.4"
                width="13.5"
                height="2.4"
                rx="1.2"
                fill="#2A2E36"
            />
            <path
                d="M-6 -2.6L-1.5 -5.4L1.5 -2.6"
                fill="none"
                stroke="#3D6FB0"
                stroke-width="1.5"
                stroke-linecap="round"
                stroke-linejoin="round"
            />
        </g>
        <g class="receiver-art__leg receiver-art__leg--near">
            <path d="M-2 -47H10.5L9.5 -9H1Z" fill="#A3AAB5" />
            <rect
                x="0.8"
                y="-10"
                width="8.9"
                height="3.2"
                rx="1"
                fill="#7A818E"
            />
            <path d="M1.5 -7H8V-4.4Q13.5 -4.6 14.5 -2.4H1.5Z" :fill="skin" />
            <rect
                x="0.5"
                y="-2.4"
                width="15"
                height="2.4"
                rx="1.2"
                fill="#2A2E36"
            />
            <path
                d="M5 -2.6L9.5 -5.4L12.5 -2.6"
                fill="none"
                stroke="#3D6FB0"
                stroke-width="1.5"
                stroke-linecap="round"
                stroke-linejoin="round"
            />
        </g>
        <rect x="-10.5" y="-55" width="21" height="10" fill="#A3AAB5" />

        <!-- T-shirt with a shaded back and a crew neck -->
        <rect x="-2.2" y="-92" width="6.4" height="6" :fill="skinShade" />
        <path
            d="M-11 -83Q-11 -87.5 -6.5 -87.5H6.5Q11 -87.5 11 -83V-51H-11Z"
            :fill="tee"
        />
        <path d="M-11 -83Q-11 -87.5 -6.5 -87.5H-5V-51H-11Z" :fill="teeShade" />
        <path d="M-2.8 -87.5Q1 -83.8 4.8 -87.5Z" :fill="skinShade" />
        <path
            d="M-3.4 -87.5Q1 -83.2 5.4 -87.5"
            fill="none"
            :stroke="teeShade"
            stroke-width="1.4"
        />

        <!-- near arm: lit sleeve, then the forearm out to the parcel -->
        <g class="receiver-art__arm receiver-art__arm--near">
            <path
                d="M1.5 -83L5.5 -74.5"
                stroke="#6A91BC"
                stroke-width="10"
                stroke-linecap="round"
            />
            <g transform="translate(0 1.3)" :opacity="shadowOpacity">
                <path
                    d="M6.5 -65L18.4 -51.6"
                    :stroke="shadow"
                    stroke-width="7.6"
                    stroke-linecap="round"
                />
                <circle cx="19" cy="-51" r="4.7" :fill="shadow" />
            </g>
            <path
                d="M5.5 -73.5L6.5 -65L18.4 -51.6"
                fill="none"
                :stroke="skin"
                stroke-width="6.4"
                stroke-linecap="round"
                stroke-linejoin="round"
            />
            <circle cx="19" cy="-51" r="3.8" :fill="skin" />
        </g>

        <!-- head: short hair, ear, eye, smile -->
        <circle cx="1" cy="-97.5" r="9.3" :fill="skin" />
        <path
            d="M-8.9 -94Q-11 -105 -1 -108.4Q8.5 -110 10.9 -101.8L9.6 -101.2Q6 -102.6 3 -100.4Q1.2 -99 0.8 -95.2L-1.4 -94.4Q-2.8 -90.6 -6.6 -89.6Q-8.4 -91 -8.9 -94Z"
            :fill="hair"
        />
        <ellipse cx="-1.8" cy="-96.5" rx="1.9" ry="2.5" :fill="skinShade" />
        <ellipse cx="6.2" cy="-97.3" rx="1.15" ry="1.4" fill="#16181D" />
        <path
            d="M4.6 -92.8Q6.8 -91 9 -93"
            fill="none"
            stroke="#7A4630"
            stroke-width="1.1"
            stroke-linecap="round"
        />
    </g>
</template>
