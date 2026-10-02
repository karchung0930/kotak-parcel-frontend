<script setup lang="ts">
import ParcelArt from '@/components/brand/art/ParcelArt.vue';
import ParcelGround from '@/components/brand/art/ParcelGround.vue';
import VanArt from '@/components/brand/art/VanArt.vue';

/**
 * The tracking card picture: the Kotak van on the road to the receiver's
 * house, with a red location pin. With `arrived` the parcel waits on the
 * doorstep and the pin shows a tick. Size it with width classes.
 */
withDefaults(
    defineProps<{
        arrived?: boolean;
        title?: string | null;
    }>(),
    {
        arrived: false,
        title: null,
    },
);

const laneMarks = [14, 58, 102, 146, 190, 234, 278, 322, 366];
</script>

<template>
    <svg
        viewBox="0 0 400 236"
        :role="title ? 'img' : undefined"
        :aria-hidden="title ? undefined : 'true'"
        focusable="false"
        class="block h-auto"
    >
        <title v-if="title">{{ title }}</title>
        <rect width="400" height="236" fill="#F4F5F7" />

        <!-- road -->
        <rect x="0" y="196" width="400" height="40" fill="#E6E8EC" />
        <rect
            v-for="x in laneMarks"
            :key="x"
            :x="x"
            y="214"
            width="22"
            height="4"
            rx="2"
            fill="#FFFFFF"
        />

        <!-- destination house -->
        <rect x="292" y="116" width="80" height="80" fill="#FFFFFF" />
        <path d="M282 120L332 80L382 120Z" fill="#2A2E36" />
        <rect x="299" y="130" width="15" height="15" rx="2" fill="#D5DCE5" />
        <rect x="351" y="130" width="15" height="15" rx="2" fill="#D5DCE5" />
        <rect x="320" y="150" width="24" height="46" rx="2" fill="#D0161E" />
        <circle cx="338" cy="174" r="2" fill="#FFC53D" />
        <rect x="312" y="194" width="40" height="4" rx="1" fill="#C9CED6" />

        <!-- location pin -->
        <path
            d="M332 18c-9.4 0-17 7.6-17 17 0 12.5 17 27 17 27s17-14.5 17-27c0-9.4-7.6-17-17-17Z"
            fill="#D0161E"
        />
        <path
            v-if="arrived"
            d="m325.5 35 4.5 4.5 8.5-9"
            fill="none"
            stroke="#FFFFFF"
            stroke-width="3.2"
            stroke-linecap="round"
            stroke-linejoin="round"
        />
        <circle v-else cx="332" cy="35" r="6" fill="#FFFFFF" />

        <!-- parcel on the doorstep, standing on its ground shadow -->
        <g v-if="arrived">
            <ParcelGround
                :x="346"
                :y="200"
                :width="20"
                :dx="6"
                :dy="3.5"
                :size="0.4"
            />
            <g transform="translate(346 185) scale(0.25)">
                <ParcelArt :label="false" />
            </g>
        </g>

        <!-- speed lines -->
        <template v-if="!arrived">
            <rect x="6" y="128" width="30" height="5" rx="2.5" fill="#D5D9DF" />
            <rect x="0" y="144" width="24" height="5" rx="2.5" fill="#D5D9DF" />
            <rect x="8" y="160" width="28" height="5" rx="2.5" fill="#D5D9DF" />
        </template>

        <!-- van -->
        <g :transform="arrived ? 'translate(40 0)' : 'translate(0 0)'">
            <ellipse
                cx="140"
                cy="197"
                rx="100"
                ry="4"
                fill="#16181D"
                opacity="0.1"
            />
            <g transform="translate(-14 2) scale(0.36)">
                <VanArt compact />
            </g>
        </g>
    </svg>
</template>
