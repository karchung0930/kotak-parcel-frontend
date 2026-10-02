<script setup lang="ts">
import { computed, useId, useTemplateRef } from 'vue';
import BoxTruckArt from '@/components/brand/art/BoxTruckArt.vue';
import CourierArt from '@/components/brand/art/CourierArt.vue';
import DistantVanArt from '@/components/brand/art/DistantVanArt.vue';
import HubArt from '@/components/brand/art/HubArt.vue';
import HubParcelArt from '@/components/brand/art/HubParcelArt.vue';
import { DOCKS } from '@/components/brand/art/hubDocks';
import {
    FACADE_X,
    HORIZON_Y,
    boxFaces,
    groundQuad,
    scaleAt,
    screenX,
    screenY,
    worldPath,
} from '@/components/brand/art/hubPerspective';
import VanArt from '@/components/brand/art/VanArt.vue';
import { useInView } from '@/composables/useInView';

/**
 * The sign-in picture: the Kotak Klang Valley hub, a long white
 * distribution centre with its red brand band, sixteen numbered docks
 * running off towards the horizon and a row of red vans backed onto them.
 * In front, taped parcels ride a roller conveyor out of dock 01, under the
 * scanner (its beam flashes, the light turns green, the count goes up)
 * and into the waiting van; the door swings shut, the van settles and
 * blinks. Meanwhile a van further down reverses onto dock 05 and later
 * pulls out again, a colleague brings a pallet of parcels and a few pale
 * clouds hang over the roof, drifting too slowly to catch the eye. One
 * 12 s loop, pure CSS, paused while off screen. With reduced motion it
 * holds one loading moment: the door open and a parcel under the scanner.
 *
 * It covers any box: give it a size (flex-1 in a column, say) inside a
 * box that clips (overflow hidden). The hub (HUB below: the Kotak sign on
 * the band, dock 01, the conveyor, the van and the colleague) is always
 * wholly inside the component's own box, centred across. It stands on the
 * bottom edge and fills most of the height, under a modest band of sky
 * (FILL); in a box too narrow for that it fits the width instead, and the
 * height left over goes mostly to the sky, a little to the yard in front.
 * The rest of the hub, its yard and the sky paint on around it, past that
 * box, out to the clipping box's edges, so nothing important is ever
 * cropped and no part of the box is left blank. The scene carries no text
 * of its own and needs nothing kept clear over it.
 * Pass `title` when the picture carries meaning; without one it is
 * decorative (aria-hidden).
 */
const props = withDefaults(
    defineProps<{
        /**
         * For the small band above the form on phones and tablets: drop
         * the small lettering and fine texture, and give the hub nearly
         * the whole height, the sign and the van close under a thin strip
         * of sky.
         */
        compact?: boolean;
        title?: string | null;
    }>(),
    {
        compact: false,
        title: null,
    },
);

const root = useTemplateRef<HTMLDivElement>('root');
const inView = useInView(root);

/**
 * The hub in picture units, the part that is never cropped: from just
 * over the Kotak sign on the band (the parapet over its box mark is at
 * 100) down to the ground under the conveyor's feet (768), and from the
 * wall just before dock 01's shelter (197) to just past the colleague
 * (1060). It is also the SVG's viewBox.
 */
const HUB = { x: 186, y: 90, width: 884, height: 690 };

/**
 * The share of the box's height the hub fills when the box is wide
 * enough: the rest is sky over it. Beside the form that leaves a modest
 * band of sky for the clouds (exactly so in a panel at least 0.92 as wide
 * as it is high; a narrower one gets more sky, see .warehouse-scene__art);
 * in the small band on phones and tablets only a strip over the sign.
 */
const FILL = { panel: 0.72, compact: 0.92 };

const viewBox = `${HUB.x} ${HUB.y} ${HUB.width} ${HUB.height}`;
const artStyle = computed(() => ({
    '--warehouse-scene-width': String(HUB.width),
    '--warehouse-scene-height': String(HUB.height),
    '--warehouse-scene-fill': String(props.compact ? FILL.compact : FILL.panel),
}));

const mono = 'JetBrains Mono, monospace';
const id = useId();
const beltClipId = `${id}-belt`;
const skyId = `${id}-sky`;

/**
 * The sky behind everything, well past the hub on every side so a
 * box of any shape is covered: pale cool grey overhead, lighter towards
 * the horizon.
 */
const sky = { x: -1600, y: -2400, width: 4400, height: HORIZON_Y + 2401 };

/**
 * Flat, pale clouds in the sky over the roof, drawn before the hub so it
 * stands in front of them. Each is 160 × 62 at scale 1, sitting on its
 * point. The sky is the wedge between the roofline, which falls from the
 * top left towards the far end of the hub, and the horizon on the right,
 * so they keep to the middle and the right, clear of the roof and the
 * skyline. Beside the form three show: the picture's top edge is at about
 * -190 in a panel 0.91 as wide as it is high (1920 × 1080) and -265 in
 * one 0.82 as wide (1440 × 900). The fourth only fills the extra sky of
 * a narrower panel (1024 × 768, top edge at about -415) and the fifth
 * that of a taller one still. The phones' band shows just the low one on
 * the right.
 */
const clouds = [
    { x: 480, y: -70, scale: 0.6 },
    { x: 770, y: -100, scale: 0.8 },
    { x: 995, y: 110, scale: 0.66 },
    { x: 620, y: -300, scale: 0.7 },
    { x: 400, y: -620, scale: 0.75 },
].map((cloud, index) => ({
    key: index,
    transform: `translate(${cloud.x} ${cloud.y}) scale(${cloud.scale})`,
}));

/** VanArt's body is 530 units for a 5.4 m van. */
const VAN_UNITS = 530 / 5.4;

/**
 * Place VanArt (or DistantVanArt) with its rear bumper at world x and its
 * near side at depth z, wheels on the ground.
 */
function vanTransform(rearX: number, z: number): string {
    const k = scaleAt(z) / VAN_UNITS;
    const tx = screenX(rearX, z) - 150 * k;
    const ty = screenY(0, z) - 540 * k;

    return `translate(${tx.toFixed(2)} ${ty.toFixed(2)}) scale(${k.toFixed(4)})`;
}

/**
 * Soft shadow on the ground along the foot of a van's near side: only a
 * strip, since the side view shows no front for the rest to fall from.
 */
function vanShadow(rearX: number, z: number): string {
    return groundQuad(rearX + 0.15, rearX + 5.45, z - 0.12, z + 0.5);
}

const DOCKED_REAR = FACADE_X + 0.35;

/**
 * The box truck on dock 09, drawn at 100 units a metre with its rear at
 * the origin (BoxTruckArt).
 */
const truck = (() => {
    const z = DOCKS[8].zc - 1.2;
    const k = scaleAt(z) / 100;

    return {
        transform: `translate(${screenX(DOCKED_REAR, z).toFixed(2)} ${screenY(0, z).toFixed(2)}) scale(${k.toFixed(4)})`,
        shadow: groundQuad(
            DOCKED_REAR + 0.1,
            DOCKED_REAR + 7.2,
            z - 0.12,
            z + 0.5,
        ),
    };
})();

/** Vans backed onto the docks, far to near; dock 05's comes and goes. */
const dockedVans = [6, 4, 2].map((index) => {
    const dock = DOCKS[index];
    const z = dock.zc - 1.1;

    return {
        key: dock.label,
        moving: index === 4,
        transform: vanTransform(DOCKED_REAR, z),
        shadow: vanShadow(DOCKED_REAR, z),
    };
});

/** The hero van, parked off dock 01 and loaded over the conveyor. */
const hero = { rear: -6.7, z: 10.5 };
const heroTransform = vanTransform(hero.rear, hero.z);
const heroShadow = vanShadow(hero.rear, hero.z);

/**
 * The roller conveyor out of dock 01: from inside the hall, through the
 * open door and on under the van's rear. Its top is at y 1.1.
 */
const belt = { x0: -11.8, x1: -6.0, y: 1.1, z0: 10.05, z1: 10.65 };
const beltFaces = boxFaces(
    belt.x0,
    belt.x1,
    belt.y - 0.16,
    belt.y,
    belt.z0,
    belt.z1,
);
const rollers = Array.from({ length: 29 }, (_, index) => {
    const x = belt.x0 + 0.1 + index * 0.2;

    return worldPath([
        [x, belt.y, belt.z0 + 0.03],
        [x, belt.y, belt.z1 - 0.03],
        [x + 0.07, belt.y, belt.z1 - 0.03],
        [x + 0.07, belt.y, belt.z0 + 0.03],
    ]);
}).join('');
const beltLegs = [-10.6, -8.9, -7.2]
    .map(
        (x) =>
            boxFaces(
                x,
                x + 0.08,
                0,
                belt.y - 0.16,
                belt.z0 + 0.05,
                belt.z0 + 0.13,
            ).front,
    )
    .join('');
const beltFeet = [-10.6, -8.9, -7.2]
    .map((x) => boxFaces(x - 0.1, x + 0.18, 0, 0.04, belt.z0, belt.z0 + 0.2))
    .map((foot) => foot.front)
    .join('');

/** Where the hall's wall hides the belt: left of dock 01's near jamb. */
const doorEdge = screenX(FACADE_X, DOCKS[0].z0);
const doorInside = screenX(FACADE_X, belt.z0);
const hallShade = {
    top: screenY(1.52, belt.z0).toFixed(1),
    height: (screenY(0.9, belt.z0) - screenY(1.52, belt.z0)).toFixed(1),
};

/** Each round's three parcels, drawn mid-ride and slid along the belt. */
const parcels = ['a', 'b', 'c'] as const;
const parcelStart = -9.2;

/** The scanner on its post in front of the belt. */
const scanner = (() => {
    const x = -8.25;
    const z = 9.9;
    const s = scaleAt(z);

    return {
        post: boxFaces(x - 0.05, x + 0.05, 0, 2.18, z, z + 0.1).front,
        foot: boxFaces(x - 0.18, x + 0.18, 0, 0.05, z, z + 0.3).front,
        arm: worldPath([
            [x - 0.04, 2.3, z],
            [x - 0.04, 2.3, 10.3],
            [x + 0.04, 2.3, 10.3],
            [x + 0.04, 2.3, z],
        ]),
        head: {
            transform: `translate(${screenX(x - 0.34, z).toFixed(2)} ${screenY(2.44, z).toFixed(2)}) scale(${(s / 100).toFixed(4)})`,
        },
        beam: worldPath([
            [x - 0.14, 2.06, 10.3],
            [x - 0.3, belt.y + 0.02, 10.3],
            [x + 0.3, belt.y + 0.02, 10.3],
            [x + 0.14, 2.06, 10.3],
        ]),
    };
})();
const counts = [0, 1, 2, 3];

/** The colleague with a pallet jack of parcels, walking to the van. */
const staff = (() => {
    const z = 11.8;
    const x = 1.45;
    const k = scaleAt(z) / 64;

    return {
        transform: `translate(${screenX(x, z).toFixed(2)} ${screenY(0, z).toFixed(2)}) scale(${(-k).toFixed(4)} ${k.toFixed(4)})`,
        shadow: groundQuad(x - 0.24, x + 0.2, z - 0.08, z + 0.22),
    };
})();
const pallet = { x0: -0.45, x1: 0.75, z0: 11.55, z1: 12.55, top: 0.16 };
const palletFaces = boxFaces(
    pallet.x0,
    pallet.x1,
    0.02,
    pallet.top,
    pallet.z0,
    pallet.z1,
);
const palletSlats = [0.06, 0.1]
    .map((y) =>
        worldPath([
            [pallet.x0, y, pallet.z0],
            [pallet.x0, y + 0.025, pallet.z0],
            [pallet.x1, y + 0.025, pallet.z0],
            [pallet.x1, y, pallet.z0],
        ]),
    )
    .join('');
const palletShadow = groundQuad(
    pallet.x0 - 0.03,
    pallet.x1 + 0.05,
    pallet.z0 - 0.04,
    pallet.z0 + 0.3,
);
/** The jack's handle rises from under the pallet to her near hand. */
const jackHandle = worldPath([
    [0.78, 0.12, 11.95],
    [1.03, 0.86, 11.95],
    [1.08, 0.86, 11.95],
    [0.85, 0.12, 11.95],
]);
const jackGrip = worldPath([
    [0.98, 0.83, 11.95],
    [0.98, 0.93, 11.95],
    [1.16, 0.93, 11.95],
    [1.16, 0.83, 11.95],
]);
const jackWheel = {
    cx: screenX(0.84, 11.9),
    cy: screenY(0.07, 11.9),
    r: 0.08 * scaleAt(11.9),
};

/**
 * Parcels on the pallet: four on the deck and one on top of the front
 * left one, each wholly on what it stands on.
 */
const stack = [
    { x: -0.38, y: pallet.top, z: 11.95, width: 0.5, height: 0.36, depth: 0.5 },
    { x: 0.18, y: pallet.top, z: 11.95, width: 0.5, height: 0.3, depth: 0.5 },
    { x: -0.4, y: pallet.top, z: 11.6, width: 0.52, height: 0.34, depth: 0.34 },
    { x: 0.16, y: pallet.top, z: 11.6, width: 0.52, height: 0.4, depth: 0.34 },
    {
        x: -0.3,
        y: pallet.top + 0.34,
        z: 11.64,
        width: 0.42,
        height: 0.3,
        depth: 0.3,
    },
];

/**
 * Yard lamps along the apron's edge, far to near, their arms out over the
 * road. The pole is each lamp's left end, so where the picture's edge
 * cuts the nearest one, it cuts it at the pole and never leaves a lamp
 * head hanging in the air.
 */
const lamps = [74, 54, 34, 14].map((z) => {
    const x = 4.5;

    return {
        z,
        pole: boxFaces(x - 0.09, x + 0.09, 0, 10, z, z + 0.18).front,
        arm: boxFaces(x - 0.05, x + 1.3, 9.85, 10, z, z + 0.1).front,
        head: boxFaces(x + 0.75, x + 1.55, 9.7, 9.95, z, z + 0.3).front,
        light: boxFaces(x + 0.8, x + 1.5, 9.66, 9.72, z, z + 0.3).front,
        base: boxFaces(x - 0.2, x + 0.2, 0, 0.5, z, z + 0.3).front,
    };
});
const farLamps = lamps.filter((lamp) => lamp.z > 20);
const nearLamps = lamps.filter((lamp) => lamp.z <= 20);
</script>

<template>
    <div
        ref="root"
        :class="['warehouse-scene', { 'warehouse-scene--paused': !inView }]"
    >
        <svg
            :viewBox="viewBox"
            preserveAspectRatio="xMidYMax meet"
            :role="title ? 'img' : undefined"
            :aria-hidden="title ? undefined : 'true'"
            focusable="false"
            class="warehouse-scene__art"
            :style="artStyle"
        >
            <title v-if="title">{{ title }}</title>
            <defs>
                <clipPath :id="beltClipId">
                    <rect
                        :x="doorEdge"
                        y="0"
                        :width="1200 - doorEdge"
                        height="800"
                    />
                </clipPath>
                <linearGradient
                    :id="skyId"
                    x1="0"
                    y1="-600"
                    x2="0"
                    :y2="HORIZON_Y"
                    gradientUnits="userSpaceOnUse"
                >
                    <stop offset="0" stop-color="#E6EAF0" />
                    <stop offset="1" stop-color="#F6F7F9" />
                </linearGradient>
            </defs>

            <!-- the sky, and clouds drifting behind the hub -->
            <rect
                :x="sky.x"
                :y="sky.y"
                :width="sky.width"
                :height="sky.height"
                :fill="`url(#${skyId})`"
            />
            <g
                v-for="cloud in clouds"
                :key="`cloud-${cloud.key}`"
                :transform="cloud.transform"
            >
                <g
                    :class="[
                        'warehouse-scene__cloud',
                        `warehouse-scene__cloud--${cloud.key}`,
                    ]"
                >
                    <rect
                        x="-80"
                        y="-24"
                        width="160"
                        height="24"
                        rx="12"
                        fill="#FFFFFF"
                    />
                    <circle cx="-38" cy="-24" r="22" fill="#FFFFFF" />
                    <circle cx="6" cy="-32" r="30" fill="#FFFFFF" />
                    <circle cx="46" cy="-20" r="20" fill="#FFFFFF" />
                </g>
            </g>

            <HubArt :compact="compact" />

            <!-- yard lamps down the apron's edge -->
            <g v-for="lamp in farLamps" :key="`lamp-${lamp.z}`">
                <path :d="lamp.pole" fill="#A9B0BC" />
                <path :d="lamp.base" fill="#8C93A0" />
                <path :d="lamp.arm" fill="#A9B0BC" />
                <path :d="lamp.head" fill="#555C69" />
                <path :d="lamp.light" fill="#FFE3A0" />
            </g>

            <!-- the box truck on dock 09, then vans backed on, far to near -->
            <path :d="truck.shadow" fill="#16181D" opacity="0.1" />
            <g :transform="truck.transform">
                <BoxTruckArt />
            </g>
            <g
                v-for="van in dockedVans"
                :key="`docked-${van.key}`"
                :class="{ 'warehouse-scene__yard-van': van.moving }"
            >
                <path :d="van.shadow" fill="#16181D" opacity="0.1" />
                <g :transform="van.transform">
                    <DistantVanArt />
                </g>
            </g>

            <!-- the van's rear door, swung open behind the conveyor; the hinge
             is its right edge, on the van's rear corner -->
            <g :transform="heroTransform">
                <g class="warehouse-scene__door">
                    <rect
                        x="80"
                        y="244"
                        width="80"
                        height="188"
                        fill="#D0161E"
                    />
                    <rect
                        x="80"
                        y="432"
                        width="80"
                        height="16"
                        fill="#B5121A"
                    />
                    <rect x="80" y="248" width="80" height="4" fill="#E4474D" />
                    <rect
                        x="92"
                        y="262"
                        width="56"
                        height="60"
                        rx="6"
                        fill="#26303F"
                    />
                    <path
                        d="M100 322H112L132 262H120Z"
                        fill="#FFFFFF"
                        opacity="0.16"
                    />
                    <rect
                        x="80"
                        y="398"
                        width="80"
                        height="24"
                        fill="#FFFFFF"
                    />
                    <rect x="90" y="406" width="60" height="8" fill="#F4B7BA" />
                    <rect
                        x="86"
                        y="348"
                        width="7"
                        height="26"
                        rx="3.5"
                        fill="#8F0F16"
                    />
                    <rect
                        x="152"
                        y="244"
                        width="8"
                        height="204"
                        fill="#A8111A"
                    />
                    <rect
                        class="warehouse-scene__door-shade"
                        x="80"
                        y="244"
                        width="80"
                        height="204"
                        fill="#16181D"
                    />
                </g>
            </g>

            <!-- the conveyor out of dock 01 and this round's parcels -->
            <g :clip-path="`url(#${beltClipId})`">
                <path :d="beltLegs" fill="#3D4350" />
                <path :d="beltFeet" fill="#2A2E36" />
                <path v-if="beltFaces.top" :d="beltFaces.top" fill="#6B7280" />
                <path :d="rollers" fill="#C3C9D1" />
                <path :d="beltFaces.front" fill="#3D4350" />
                <g
                    v-for="parcel in parcels"
                    :key="`parcel-${parcel}`"
                    :class="[
                        'warehouse-scene__parcel',
                        `warehouse-scene__parcel--${parcel}`,
                    ]"
                >
                    <HubParcelArt
                        :x="parcelStart"
                        :y="belt.y"
                        :z="belt.z0 + 0.08"
                        :label="!compact"
                    />
                </g>
                <!-- inside the hall it is darker -->
                <rect
                    :x="doorEdge"
                    :y="hallShade.top"
                    :width="doorInside - doorEdge"
                    :height="hallShade.height"
                    fill="#16181D"
                    opacity="0.4"
                />
            </g>

            <!-- scanner on its post: status light, count, beam -->
            <path :d="scanner.foot" fill="#2A2E36" />
            <path :d="scanner.post" fill="#555C69" />
            <path :d="scanner.arm" fill="#3D4350" />
            <path
                class="warehouse-scene__beam"
                :d="scanner.beam"
                fill="#FF3B45"
                fill-opacity="0.32"
            />
            <g :transform="scanner.head.transform">
                <rect width="68" height="36" rx="6" fill="#2A2E36" />
                <rect width="68" height="6" rx="3" fill="#3D4350" />
                <circle cx="13" cy="19" r="5" fill="#4A505C" />
                <circle
                    class="warehouse-scene__led"
                    cx="13"
                    cy="19"
                    r="5"
                    fill="#3DDC84"
                />
                <rect
                    x="24"
                    y="9"
                    width="38"
                    height="20"
                    rx="3"
                    fill="#0F1115"
                />
                <text
                    v-for="count in counts"
                    :key="`count-${count}`"
                    :class="[
                        'warehouse-scene__count',
                        `warehouse-scene__count--${count}`,
                    ]"
                    x="43"
                    y="24.5"
                    text-anchor="middle"
                    :font-family="mono"
                    font-size="15"
                    font-weight="700"
                    fill="#FFC53D"
                >
                    0{{ count }}
                </text>
                <rect
                    x="20"
                    y="36"
                    width="28"
                    height="4"
                    rx="2"
                    fill="#FF6B70"
                />
            </g>

            <!-- the Kotak van off dock 01 -->
            <path :d="heroShadow" fill="#16181D" opacity="0.14" />
            <g class="warehouse-scene__van">
                <g :transform="heroTransform">
                    <VanArt compact />
                    <!-- rear lamp cluster; both indicators blink once loaded -->
                    <rect
                        x="160"
                        y="360"
                        width="7"
                        height="30"
                        rx="2"
                        fill="#7C0D13"
                    />
                    <rect
                        x="160"
                        y="378"
                        width="7"
                        height="10"
                        rx="1.5"
                        fill="#E8892F"
                    />
                    <g class="warehouse-scene__blink">
                        <circle
                            cx="163"
                            cy="383"
                            r="16"
                            fill="#FF8A3D"
                            opacity="0.35"
                        />
                        <rect
                            x="160"
                            y="378"
                            width="7"
                            height="10"
                            rx="1.5"
                            fill="#FFE1B3"
                        />
                        <circle
                            cx="684"
                            cy="389.5"
                            r="16"
                            fill="#FF8A3D"
                            opacity="0.35"
                        />
                        <rect
                            x="678"
                            y="386"
                            width="12"
                            height="7"
                            rx="2"
                            fill="#FFE1B3"
                        />
                    </g>
                </g>
            </g>

            <!-- a colleague bringing a pallet of parcels -->
            <path :d="palletShadow" fill="#16181D" opacity="0.12" />
            <path :d="staff.shadow" fill="#16181D" opacity="0.12" />
            <path v-if="palletFaces.top" :d="palletFaces.top" fill="#C9A06A" />
            <path :d="palletFaces.front" fill="#A67C48" />
            <path :d="palletSlats" fill="#8A6538" />
            <HubParcelArt
                v-for="(box, index) in stack"
                :key="`stack-${index}`"
                v-bind="box"
                :label="!compact"
            />
            <path :d="jackHandle" fill="#3D4350" />
            <path :d="jackGrip" fill="#16181D" />
            <circle
                :cx="jackWheel.cx"
                :cy="jackWheel.cy"
                :r="jackWheel.r"
                fill="#16181D"
            />
            <g :transform="staff.transform">
                <CourierArt compact />
            </g>

            <!-- the nearest yard lamp -->
            <g v-for="lamp in nearLamps" :key="`lamp-${lamp.z}`">
                <path :d="lamp.pole" fill="#8C93A0" />
                <path :d="lamp.base" fill="#6B7280" />
                <path :d="lamp.arm" fill="#8C93A0" />
                <path :d="lamp.head" fill="#3D4350" />
                <path :d="lamp.light" fill="#FFE3A0" />
            </g>
        </svg>
    </div>
</template>

<style scoped>
/*
 * One 12 s loop; every keyframe below is a share of it.
 *   0-5%    the van's rear door swings open
 *   6-56%   parcels a, b and c ride the belt 13% apart (24% each,
 *           linear), each scanned about 13.5% into its ride
 *   60-66%  the door swings shut
 *   66-72%  the van settles on its springs
 *   74-84%  both indicators blink twice
 *   4-26%   meanwhile dock 05's van reverses on from the yard, and
 *   84-100% pulls out again to where it started
 * The clouds drift on far slower cycles of their own.
 * The rules outside the keyframes are the still picture (reduced motion).
 */
.warehouse-scene {
    --warehouse-scene-loop: 12s;
    --warehouse-scene-play: running;
    position: relative;
    container-type: size;
}

.warehouse-scene--paused {
    --warehouse-scene-play: paused;
}

/*
 * The framing. The hub (the viewBox) is scaled to fill the fill share of
 * the box's height, standing on its bottom edge with the sky over it, as
 * long as it fits across; in a narrower box it fits the width instead.
 * The slack, the height left over the ideal (the hub and its band of
 * sky), then goes 70:30 to more sky above and to a strip of the yard in
 * front (the lift), so in a tall box the vans do not stand right on the
 * edge and the sky does not tower over them either. Centred across.
 * Everything outside the viewBox still paints (overflow visible): the
 * parent's clipping box decides where the picture ends.
 */
.warehouse-scene__art {
    --warehouse-scene-lift: 0.3;
    --warehouse-scene-unit: min(
        100cqw / var(--warehouse-scene-width),
        100cqh * var(--warehouse-scene-fill) / var(--warehouse-scene-height)
    );
    --warehouse-scene-slack: max(
        0px,
        100cqh - var(--warehouse-scene-unit) * var(--warehouse-scene-height) /
            var(--warehouse-scene-fill)
    );
    position: absolute;
    inset-inline: 0;
    bottom: calc(var(--warehouse-scene-slack) * var(--warehouse-scene-lift));
    width: calc(var(--warehouse-scene-unit) * var(--warehouse-scene-width));
    height: calc(var(--warehouse-scene-unit) * var(--warehouse-scene-height));
    margin-inline: auto;
    overflow: visible;
}

/*
 * The clouds all but hold still: a few units either way over minutes,
 * enough to keep the sky from looking frozen, too slow to draw the eye.
 */
.warehouse-scene__cloud {
    animation: warehouse-scene-cloud 160s ease-in-out infinite alternate;
    animation-play-state: var(--warehouse-scene-play);
}

.warehouse-scene__cloud--1,
.warehouse-scene__cloud--3 {
    animation-duration: 210s;
    animation-direction: alternate-reverse;
}

.warehouse-scene__cloud--2 {
    animation-delay: -70s;
}

.warehouse-scene__door,
.warehouse-scene__door-shade,
.warehouse-scene__parcel,
.warehouse-scene__beam,
.warehouse-scene__led,
.warehouse-scene__count,
.warehouse-scene__van,
.warehouse-scene__blink,
.warehouse-scene__yard-van {
    transform-box: fill-box;
    animation-duration: var(--warehouse-scene-loop);
    animation-iteration-count: infinite;
    animation-play-state: var(--warehouse-scene-play);
}

/* The door turns on its hinge at the van's rear corner. */
.warehouse-scene__door {
    transform-origin: 100% 50%;
    animation-name: warehouse-scene-door;
    animation-timing-function: ease-in-out;
}

.warehouse-scene__door-shade {
    opacity: 0;
    animation-name: warehouse-scene-door-shade;
    animation-timing-function: ease-in-out;
}

/*
 * Parcels are drawn mid-belt; a ride runs from inside the hall (-152px)
 * to under the van (+207px). The still picture holds parcel a under the
 * scanner and parcel c just out of the door.
 */
.warehouse-scene__parcel {
    transform-origin: 0 0;
    animation-timing-function: linear;
}

.warehouse-scene__parcel--a {
    transform: translateX(50px);
    animation-name: warehouse-scene-parcel-a;
}

.warehouse-scene__parcel--b {
    opacity: 0;
    animation-name: warehouse-scene-parcel-b;
}

.warehouse-scene__parcel--c {
    transform: translateX(-60px);
    animation-name: warehouse-scene-parcel-c;
}

.warehouse-scene__beam {
    animation-name: warehouse-scene-beam;
}

.warehouse-scene__led {
    animation-name: warehouse-scene-led;
}

.warehouse-scene__count {
    opacity: 0;
}

.warehouse-scene__count--0 {
    animation-name: warehouse-scene-count-0;
}

.warehouse-scene__count--1 {
    opacity: 1;
    animation-name: warehouse-scene-count-1;
}

.warehouse-scene__count--2 {
    animation-name: warehouse-scene-count-2;
}

.warehouse-scene__count--3 {
    animation-name: warehouse-scene-count-3;
}

/* The van squats from the ground up: its wheels stay on the road. */
.warehouse-scene__van {
    transform-origin: 50% 100%;
    animation-name: warehouse-scene-settle;
    animation-timing-function: ease-in-out;
}

.warehouse-scene__blink {
    opacity: 0;
    animation-name: warehouse-scene-blink;
}

/*
 * Dock 05's van: 7 m out in the yard (173 units at its depth), reverses
 * onto the dock, and later pulls out again.
 */
.warehouse-scene__yard-van {
    animation-name: warehouse-scene-yard-van;
    animation-timing-function: ease-in-out;
}

@keyframes warehouse-scene-door {
    0%,
    1% {
        transform: scaleX(0);
    }

    5%,
    60% {
        transform: scaleX(1);
    }

    66%,
    100% {
        transform: scaleX(0);
    }
}

@keyframes warehouse-scene-door-shade {
    0%,
    1% {
        opacity: 0.45;
    }

    5%,
    60% {
        opacity: 0;
    }

    66%,
    100% {
        opacity: 0.45;
    }
}

@keyframes warehouse-scene-parcel-a {
    0%,
    6% {
        transform: translateX(-152px);
    }

    30%,
    100% {
        transform: translateX(207px);
    }
}

@keyframes warehouse-scene-parcel-b {
    0%,
    19% {
        transform: translateX(-152px);
        opacity: 1;
    }

    43%,
    100% {
        transform: translateX(207px);
        opacity: 1;
    }
}

@keyframes warehouse-scene-parcel-c {
    0%,
    32% {
        transform: translateX(-152px);
    }

    56%,
    100% {
        transform: translateX(207px);
    }
}

@keyframes warehouse-scene-beam {
    0%,
    18.5% {
        opacity: 0;
    }

    19%,
    21.5% {
        opacity: 1;
    }

    22%,
    31.5% {
        opacity: 0;
    }

    32%,
    34.5% {
        opacity: 1;
    }

    35%,
    44.5% {
        opacity: 0;
    }

    45%,
    47.5% {
        opacity: 1;
    }

    48%,
    100% {
        opacity: 0;
    }
}

@keyframes warehouse-scene-led {
    0%,
    19.9% {
        opacity: 0;
    }

    20%,
    23% {
        opacity: 1;
    }

    23.5%,
    32.9% {
        opacity: 0;
    }

    33%,
    36% {
        opacity: 1;
    }

    36.5%,
    45.9% {
        opacity: 0;
    }

    46%,
    49% {
        opacity: 1;
    }

    49.5%,
    100% {
        opacity: 0;
    }
}

@keyframes warehouse-scene-count-0 {
    0%,
    19.9% {
        opacity: 1;
    }

    20%,
    100% {
        opacity: 0;
    }
}

@keyframes warehouse-scene-count-1 {
    0%,
    19.9% {
        opacity: 0;
    }

    20%,
    32.9% {
        opacity: 1;
    }

    33%,
    100% {
        opacity: 0;
    }
}

@keyframes warehouse-scene-count-2 {
    0%,
    32.9% {
        opacity: 0;
    }

    33%,
    45.9% {
        opacity: 1;
    }

    46%,
    100% {
        opacity: 0;
    }
}

@keyframes warehouse-scene-count-3 {
    0%,
    45.9% {
        opacity: 0;
    }

    46%,
    100% {
        opacity: 1;
    }
}

@keyframes warehouse-scene-settle {
    0%,
    66.5% {
        transform: scaleY(1);
    }

    68.5% {
        transform: scaleY(0.986);
    }

    70.5% {
        transform: scaleY(1.003);
    }

    72.5%,
    100% {
        transform: scaleY(1);
    }
}

@keyframes warehouse-scene-blink {
    0%,
    74% {
        opacity: 0;
    }

    74.5%,
    77% {
        opacity: 1;
    }

    77.5%,
    79.5% {
        opacity: 0;
    }

    80%,
    82.5% {
        opacity: 1;
    }

    83%,
    100% {
        opacity: 0;
    }
}

@keyframes warehouse-scene-yard-van {
    0%,
    4% {
        transform: translateX(173px);
    }

    26%,
    84% {
        transform: translateX(0);
    }

    100% {
        transform: translateX(173px);
    }
}

@keyframes warehouse-scene-cloud {
    from {
        transform: translateX(-10px);
    }

    to {
        transform: translateX(10px);
    }
}

/* Reduced motion: the still picture above, no loop. */
@media (prefers-reduced-motion: reduce) {
    .warehouse-scene__cloud,
    .warehouse-scene__door,
    .warehouse-scene__door-shade,
    .warehouse-scene__parcel,
    .warehouse-scene__beam,
    .warehouse-scene__led,
    .warehouse-scene__count,
    .warehouse-scene__van,
    .warehouse-scene__blink,
    .warehouse-scene__yard-van {
        animation: none;
    }
}
</style>
