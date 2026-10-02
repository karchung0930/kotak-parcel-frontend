<script setup lang="ts">
import ParcelGround from '@/components/brand/art/ParcelGround.vue';

/**
 * Three taped parcels, stacked, as an SVG group in the hero's coordinates
 * (x 44-247 with the ground, y 261-547). Use ParcelStack or KotakVan with
 * `parcels` rather than this piece directly.
 *
 * Drawn like ParcelArt (face shading on one kraft silhouette per box, no
 * outlines; tape lighter on top faces, darker on sides), with depth about
 * 13 across for every 9 up. Each upper box stands wholly on the top face of
 * the box below, with a contact shadow there, and the bottom box stands
 * on its ground, so no corner hangs in the air.
 */
withDefaults(
    defineProps<{
        /** The background under the stack, for its ground shadow. */
        surface?: 'light' | 'dark';
    }>(),
    { surface: 'light' },
);

const font = 'Plus Jakarta Sans, sans-serif';
const thinBars =
    'M70 507v16M73 507v16M78 507v16M80.5 507v16M85 507v16M89 507v16M92 507v16M97 507v16M101 507v16M103.5 507v16M108 507v16M113 507v16M116 507v16M120 507v16M126 507v16M129 507v16';
const thickBars = 'M75.5 507v16M94.5 507v16M110.5 507v16M123 507v16M133 507v16';
</script>

<template>
    <g>
        <ParcelGround
            :x="52"
            :y="540"
            :width="150"
            :dx="26"
            :dy="18"
            :size="1.4"
            :surface="surface"
        />

        <!-- parcel A (large): tape over the top and down the side, and a band -->
        <path d="M52 420 78 402H228V522L202 540H52Z" fill="#D4995A" />
        <path d="M52 420 78 402H228L202 420Z" fill="#E7B97F" />
        <path d="M202 420 228 402V522L202 540Z" fill="#B98046" />
        <path d="M58 415.85H208V535.85L220 527.54V407.54H70Z" fill="#D0161E" />
        <path d="M58 415.85H208L220 407.54H70Z" fill="#E4474D" />
        <path d="M208 415.85 220 407.54V527.54L208 535.85Z" fill="#A8111A" />
        <path d="M52 434H202L228 416V440L202 458H52Z" fill="#A8111A" />
        <rect x="52" y="434" width="150" height="24" fill="#D0161E" />
        <!--
            "KOTAK", the mark, "KOTAK" as one group centred on the band's
            front (52-202): the mark on 127, 10 from each word's ink, and
            13.2 from each word's outer letter to the band's end. The words
            are anchored at their middle; the ink sits 0.7 left of it (the
            trailing letter-spacing), hence the +0.7.
        -->
        <text
            x="89.17"
            y="450.5"
            text-anchor="middle"
            :font-family="font"
            font-size="11.5"
            font-weight="800"
            letter-spacing="2"
            fill="#FFFFFF"
            v-text="'KOTAK'"
        />
        <g transform="translate(119 438.5) scale(0.5)">
            <path
                d="M16 5.5 26.5 10.75v10.5L16 26.5 5.5 21.25v-10.5Z"
                fill="#FFFFFF"
            />
        </g>
        <text
            x="166.24"
            y="450.5"
            text-anchor="middle"
            :font-family="font"
            font-size="11.5"
            font-weight="800"
            letter-spacing="2"
            fill="#FFFFFF"
            v-text="'KOTAK'"
        />
        <!-- shipping label -->
        <rect x="64" y="470" width="92" height="58" rx="3" fill="#FFFFFF" />
        <path
            d="M64 480V473A3 3 0 0 1 67 470H153A3 3 0 0 1 156 473V480Z"
            fill="#D0161E"
        />
        <rect x="70" y="486" width="44" height="4" rx="2" fill="#8C93A0" />
        <rect x="70" y="494" width="30" height="4" rx="2" fill="#C9CED6" />
        <rect x="132" y="485" width="18" height="18" rx="2" fill="#16181D" />
        <rect x="135" y="488" width="5" height="5" fill="#FFFFFF" />
        <rect x="142" y="495" width="5" height="5" fill="#FFFFFF" />
        <rect x="135" y="496" width="3" height="3" fill="#FFFFFF" />
        <path :d="thinBars" stroke="#16181D" stroke-width="1.6" />
        <path :d="thickBars" stroke="#16181D" stroke-width="2.6" />

        <!-- parcel B (medium) on A's top face: seam tape and "this way up" -->
        <ParcelGround
            :x="74"
            :y="417"
            :width="110"
            :dx="20"
            :dy="14"
            contact-only
        />
        <path d="M74 329 94 315H204V403L184 417H74Z" fill="#D4995A" />
        <path d="M74 329 94 315H204L184 329Z" fill="#E7B97F" />
        <path d="M184 329 204 315V403L184 417Z" fill="#B98046" />
        <path
            d="M118 329 138 315H160L140 329V367L136.3 371 132.7 367 129 371 125.3 367 121.7 371 118 367Z"
            fill="#D0161E"
        />
        <path d="M118 329 138 315H160L140 329Z" fill="#E4474D" />
        <!-- read upwards, centred on the tape's straight front (118-140
             across, 329-367 down) with room at both ends -->
        <text
            transform="translate(131.98 347.58) rotate(-90)"
            text-anchor="middle"
            :font-family="font"
            font-size="8"
            font-weight="800"
            letter-spacing="1.2"
            fill="#FFFFFF"
            v-text="'KOTAK'"
        />
        <path
            d="M88 405V385M82 391L88 384L94 391M100 405V385M94 391L100 384L106 391M82 410H106"
            fill="none"
            stroke="#16181D"
            stroke-width="2.4"
            stroke-linecap="round"
            stroke-linejoin="round"
        />
        <rect x="148" y="379" width="28" height="30" rx="2" fill="#FFFFFF" />
        <path
            d="M148 385V381A2 2 0 0 1 150 379H174A2 2 0 0 1 176 381V385Z"
            fill="#D0161E"
        />
        <path
            d="M152 391v13M154.5 391v13M158 391v13M160 391v13M163.5 391v13M167 391v13M169 391v13M172 391v13"
            stroke="#16181D"
            stroke-width="1.2"
        />

        <!-- parcel C (small) on B's top face: a tape band -->
        <ParcelGround
            :x="96"
            :y="327"
            :width="76"
            :dx="14"
            :dy="10"
            contact-only
        />
        <path d="M96 271 110 261H186V317L172 327H96Z" fill="#D4995A" />
        <path d="M96 271 110 261H186L172 271Z" fill="#E7B97F" />
        <path d="M172 271 186 261V317L172 327Z" fill="#B98046" />
        <path d="M96 289H172L186 279V295L172 305H96Z" fill="#A8111A" />
        <rect x="96" y="289" width="76" height="16" fill="#D0161E" />
        <!-- centred on the band's front (96-172): ink middle on 134 -->
        <text
            x="134.67"
            y="300.5"
            text-anchor="middle"
            :font-family="font"
            font-size="9"
            font-weight="800"
            letter-spacing="1.8"
            fill="#FFFFFF"
            v-text="'KOTAK'"
        />
    </g>
</template>
