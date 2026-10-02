<script setup lang="ts">
import ParcelArt from '@/components/brand/art/ParcelArt.vue';
import ParcelGround from '@/components/brand/art/ParcelGround.vue';

/**
 * Spot illustration for empty and not-found states (used by EmptyState).
 *
 * - empty: an open, empty cardboard box ("no parcels yet").
 * - search: a sealed parcel under a magnifying glass ("nothing matched").
 * - done: a sealed parcel with a green tick ("all caught up").
 *
 * Every box stands on its ground shadow (bottom edge at y 106), and the
 * sealed ones are the site's ParcelArt, so they match every other parcel.
 * Always decorative: the heading next to it says what it means.
 */
withDefaults(
    defineProps<{
        variant?: 'empty' | 'search' | 'done';
    }>(),
    { variant: 'empty' },
);
</script>

<template>
    <svg
        viewBox="0 0 160 120"
        aria-hidden="true"
        focusable="false"
        class="block h-auto"
    >
        <!--
            An open, empty box, flaps up. Like ParcelArt, the body is one
            kraft silhouette under its faces, and each flap reaches a unit
            under the part drawn after it, so nothing shows through where
            they meet.
        -->
        <g v-if="variant === 'empty'">
            <ParcelGround :x="36" :y="106" :width="76" :dx="22" :dy="13" />
            <path d="M57.7 48H133.7L142 22H66Z" fill="#DDAB6D" />
            <path d="M89.7 48H101.7L110 22H98Z" fill="#D0161E" />
            <path d="M37.1 61 59.1 48 40 31 18 44Z" fill="#E7B97F" />
            <path d="M110.9 60.5 132.9 47.5 152 39 130 52Z" fill="#DDAB6D" />
            <path d="M36 60 58 47H134V93L112 106H36Z" fill="#D4995A" />
            <path d="M36 60H112L134 47H58Z" fill="#8F5E2C" />
            <path d="M58 47H134L128 51H64Z" fill="#744B22" />
            <path d="M112 60 134 47V93L112 106Z" fill="#B98046" />
            <path d="M36 60H112L106 72H30Z" fill="#E7B97F" />
            <path d="M68 60H80L74 72H62Z" fill="#D0161E" />
            <rect x="46" y="84" width="26" height="14" rx="2" fill="#FFFFFF" />
            <path
                d="M46 88V86A2 2 0 0 1 48 84H70A2 2 0 0 1 72 86V88Z"
                fill="#D0161E"
            />
            <rect x="49" y="91" width="14" height="2" rx="1" fill="#C9CED6" />
        </g>

        <!-- A sealed parcel under a magnifying glass -->
        <g v-else-if="variant === 'search'">
            <ParcelGround :x="24" :y="106" :width="70" :dx="21" :dy="12.25" />
            <g transform="translate(24 53.5) scale(0.875)">
                <ParcelArt />
            </g>
            <circle cx="116" cy="64" r="21" fill="#FFFFFF" opacity="0.72" />
            <circle
                cx="116"
                cy="64"
                r="21"
                fill="none"
                stroke="#3D4350"
                stroke-width="6"
            />
            <path
                d="M131 79 146 94"
                stroke="#3D4350"
                stroke-width="9"
                stroke-linecap="round"
            />
            <path
                d="M109.5 58a6.5 6.5 0 1 1 9 6c-1.7.8-2.5 2-2.5 3.6V70"
                fill="none"
                stroke="#A8111A"
                stroke-width="3.4"
                stroke-linecap="round"
            />
            <circle cx="116" cy="76" r="2.1" fill="#A8111A" />
        </g>

        <!-- A sealed, taped parcel with a green tick -->
        <g v-else>
            <ParcelGround :x="34" :y="106" :width="70" :dx="21" :dy="12.25" />
            <g transform="translate(34 53.5) scale(0.875)">
                <ParcelArt tape="band" />
            </g>
            <circle cx="122" cy="36" r="17" fill="#146C34" />
            <path
                d="m114.5 36.5 5 5 10-10.5"
                fill="none"
                stroke="#FFFFFF"
                stroke-width="4"
                stroke-linecap="round"
                stroke-linejoin="round"
            />
        </g>
    </svg>
</template>
