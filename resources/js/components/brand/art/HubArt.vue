<script setup lang="ts">
import { useId } from 'vue';
import {
    FACADE_X,
    boxFaces,
    HORIZON_Y,
    facadeMatrix,
    facadeQuad,
    groundQuad,
    range,
    screenX,
    screenY,
    worldPath,
} from '@/components/brand/art/hubPerspective';
import { DOCKS } from '@/components/brand/art/hubDocks';

/**
 * The Kotak Klang Valley hub and its yard as an SVG group, in
 * WarehouseScene's perspective (see hubPerspective): the long dock face
 * running away from the viewer with its red brand band, the ribbon
 * window, the numbered docks with their shelters and roller doors, the
 * roof vents and skylight ridges over the parapet, the apron with its bay
 * lines, the service road and the city on the horizon. Vans, people,
 * parcels, the sky and everything that moves belong to WarehouseScene.
 * The ground and the skyline run on well past the part WarehouseScene
 * always keeps in view, since it paints the picture out to whatever box
 * it covers.
 * Always decorative.
 */
withDefaults(
    defineProps<{
        /**
         * Drop the small lettering and fine texture for small sizes; only
         * the five nearest dock numbers stay, big enough to read.
         */
        compact?: boolean;
    }>(),
    { compact: false },
);

const font = 'Plus Jakarta Sans, sans-serif';
const mono = 'JetBrains Mono, monospace';

/**
 * The dock face runs from well off the left edge to its far end: far
 * enough that even a short, wide band (up to about 6:1, e.g. over the
 * form on a tablet) never shows where it starts.
 */
const NEAR = 2.5;
const FAR = 150;
const PARAPET = 13;

const wall = facadeQuad(0, PARAPET, NEAR, FAR);
const plinth = facadeQuad(0, 1, NEAR, FAR);
const plinthEdge = facadeQuad(0.94, 1.04, NEAR, FAR);

/**
 * Standing-seam cladding ribs, dense enough to read, sparse far off.
 * Like the mullions below, they keep to a grid through 5 m, starting a
 * step or two nearer, just past NEAR.
 */
const ribs = range(5 - 2 * 1.15, 70, 1.15)
    .map((z) => facadeQuad(1.04, 9.9, z, z + 0.14))
    .join('');

/** The ribbon window between the docks and the brand band. */
const ribbon = facadeQuad(6.9, 8.3, NEAR, FAR);
const ribbonSill = facadeQuad(6.8, 6.95, NEAR, FAR);
const ribbonMullions = range(5 - 1.53, 90, 1.53)
    .map((z) => facadeQuad(6.95, 8.3, z, z + 0.12))
    .join('');
/** Glare across the glass: a few slanted strokes near the viewer. */
const ribbonGlare = [9.2, 12.4, 17.6, 23.4]
    .map((z) =>
        worldPath([
            [FACADE_X, 6.95, z],
            [FACADE_X, 8.3, z + 0.9],
            [FACADE_X, 8.3, z + 1.5],
            [FACADE_X, 6.95, z + 0.6],
        ]),
    )
    .join('');

/** Brand band along the top of the face, with its parapet cap. */
const band = facadeQuad(9.9, PARAPET - 0.35, NEAR, FAR);
const bandLight = facadeQuad(PARAPET - 0.6, PARAPET - 0.35, NEAR, FAR);
const bandShade = facadeQuad(9.9, 10.12, NEAR, FAR);
const cap = facadeQuad(PARAPET - 0.35, PARAPET, NEAR, FAR);

/**
 * The wordmark along the band: each letter is laid onto the face at its
 * own depth so it shrinks with the building. Advances are Plus Jakarta
 * Sans ExtraBold's, in ems, near enough for a sign.
 */
const WORD_START = 23.2;
const WORD_EM = 2.3;
const letters = (() => {
    const advances: [string, number][] = [
        ['K', 0.66],
        ['o', 0.6],
        ['t', 0.4],
        ['a', 0.58],
        ['k', 0.58],
    ];
    let z = WORD_START;

    return advances.map(([glyph, advance]) => {
        const letter = {
            glyph,
            transform: facadeMatrix(10.55, z, WORD_EM / 20),
        };
        z += advance * WORD_EM - 0.05 * WORD_EM;

        return letter;
    });
})();
const markTransform = facadeMatrix(12.9, 19.6, 0.095);

/** "KLANG VALLEY HUB" in smaller caps after the wordmark. */
const tagline = (() => {
    const text = 'KLANG VALLEY HUB';
    const em = 1.25;
    let z = 35.2;

    return [...text].map((glyph) => {
        const item = { glyph, transform: facadeMatrix(10.7, z, em / 20) };
        z += (glyph === ' ' ? 0.34 : glyph === 'I' ? 0.36 : 0.78) * em;

        return item;
    });
})();

/** The box mark repeated down the band past the lettering. */
const farMarks = [56, 72, 92].map((z) => facadeMatrix(12.1, z, 0.075));

/**
 * Over the parapet: skylight ridges running back over the roof and a
 * row of turbine vents, all set back from the edge, so only their tops
 * show above it.
 */
const ridges = range(24, 112, 11).map((z) => {
    const back = FACADE_X - 3;

    return {
        glass: worldPath([
            [back, PARAPET, z],
            [back, PARAPET + 1.3, z + 1.4],
            [back, PARAPET, z + 2.8],
        ]),
        frame: worldPath([
            [back, PARAPET, z + 1.1],
            [back, PARAPET + 1.3, z + 1.4],
            [back, PARAPET, z + 2.8],
        ]),
    };
});

const vents = [30, 41, 52, 63, 74, 85].map((z) => {
    const x = FACADE_X - 1.6;
    const s = 700 / z;

    return {
        cx: screenX(x, z),
        top: screenY(PARAPET + 1.5, z),
        base: screenY(PARAPET, z),
        r: 0.55 * s,
    };
});

/** Docks: shelters, roller doors (closed ones), lamps and plates. */
const doorSlats = (z0: number, z1: number) =>
    range(1.5, 4.8, 0.3)
        .map((y) => facadeQuad(y, y + 0.06, z0, z1))
        .join('');

/**
 * The number plate over each door, 1.04 m across and 0.7 m high, and its
 * two-digit number in JetBrains Mono Bold at a 0.56 m em (two figures are
 * 0.67 m wide, 0.41 m tall: the font's cap height is 0.73 em). The number
 * is centred both ways, so the plate shows the same margin left and right
 * and above and below: across, text-anchor middle at the depth that lands
 * halfway between the plate's near and far edges on screen (the harmonic
 * mean of the two depths, since screen x goes with 1 / z); up and down,
 * the baseline sits half the figures' height under the plate's middle.
 */
const PLATE = { bottom: 5.6, top: 6.3, half: 0.52, em: 0.56 };
const plateBaseline = (PLATE.bottom + PLATE.top) / 2 - (0.73 * PLATE.em) / 2;

function plateText(zc: number): string {
    const near = zc - PLATE.half;
    const far = zc + PLATE.half;
    const middle = (2 * near * far) / (near + far);

    return facadeMatrix(plateBaseline, middle, PLATE.em / 20);
}

const docks = DOCKS.map((dock) => ({
    ...dock,
    shelter: facadeQuad(0.9, 5.35, dock.z0 - 0.32, dock.z1 + 0.32),
    header: facadeQuad(4.95, 5.35, dock.z0 - 0.32, dock.z1 + 0.32),
    opening: facadeQuad(1.05, 4.95, dock.z0, dock.z1),
    slats: doorSlats(dock.z0, dock.z1),
    rail: facadeQuad(1.05, 1.32, dock.z0, dock.z1),
    /** The far jamb, seen at a slant: the thickness of the wall. */
    jamb: worldPath([
        [FACADE_X, 1.05, dock.z1],
        [FACADE_X - 0.5, 1.05, dock.z1],
        [FACADE_X - 0.5, 4.95, dock.z1],
        [FACADE_X, 4.95, dock.z1],
    ]),
    /** The door rolled up into the head of an open dock. */
    rolled: facadeQuad(4.45, 4.95, dock.z0, dock.z1),
    floor: facadeQuad(1.05, 1.6, dock.z0, dock.z1),
    glow: facadeQuad(1.6, 3.8, dock.z0 + 0.4, dock.z1 - 0.4),
    lip: facadeQuad(0.96, 1.08, dock.z0, dock.z1),
    bumpers:
        facadeQuad(0.42, 0.92, dock.z0 + 0.08, dock.z0 + 0.4) +
        facadeQuad(0.42, 0.92, dock.z1 - 0.4, dock.z1 - 0.08),
    plate: facadeQuad(
        PLATE.bottom,
        PLATE.top,
        dock.zc - PLATE.half,
        dock.zc + PLATE.half,
    ),
    plateText: plateText(dock.zc),
    lamp: facadeQuad(5.45, 5.75, dock.z1 + 0.45, dock.z1 + 0.95),
    lampGlow: facadeQuad(5.37, 5.47, dock.z1 + 0.5, dock.z1 + 0.9),
}));

/**
 * Through dock 01: the hall floor at dock height and a wall of racks
 * 4.6 m in, stacked with parcels, lit from above. Clipped to the door.
 */
const clipId = `${useId()}-dock`;
const first = DOCKS[0];
const RACK_X = FACADE_X - 4.6;
const hall = {
    back: facadeQuad(1.05, 6, first.z0 - 2, first.z1 + 8, RACK_X),
    floor: groundQuad(RACK_X, FACADE_X, first.z0 - 2, first.z1 + 8, 1.05),
    shelves: [1.9, 2.85, 3.8]
        .map((y) =>
            facadeQuad(y, y + 0.09, first.z0 - 2, first.z1 + 8, RACK_X + 0.05),
        )
        .join(''),
    uprights: range(first.z0 - 1.2, first.z1 + 8, 2.4)
        .map((z) => facadeQuad(1.05, 4.4, z, z + 0.12, RACK_X + 0.08))
        .join(''),
    boxes: [
        { y: 1.14, h: 0.6, z: 13.6, w: 0.8 },
        { y: 1.14, h: 0.45, z: 14.7, w: 0.7 },
        { y: 1.14, h: 0.62, z: 16.2, w: 0.9 },
        { y: 1.99, h: 0.5, z: 13.9, w: 0.7 },
        { y: 1.99, h: 0.66, z: 15.1, w: 0.9 },
        { y: 1.99, h: 0.4, z: 16.9, w: 0.6 },
        { y: 2.94, h: 0.55, z: 14.2, w: 0.8 },
        { y: 2.94, h: 0.42, z: 15.4, w: 0.7 },
        { y: 2.94, h: 0.6, z: 16.6, w: 0.8 },
    ]
        .map((box) =>
            facadeQuad(
                box.y,
                box.y + box.h,
                box.z,
                box.z + box.w,
                RACK_X + 0.1,
            ),
        )
        .join(''),
    tape: [
        { y: 1.14, h: 0.6, z: 13.6, w: 0.8 },
        { y: 1.99, h: 0.66, z: 15.1, w: 0.9 },
        { y: 2.94, h: 0.6, z: 16.6, w: 0.8 },
    ]
        .map((box) =>
            facadeQuad(
                box.y + box.h * 0.55,
                box.y + box.h * 0.7,
                box.z,
                box.z + box.w,
                RACK_X + 0.11,
            ),
        )
        .join(''),
    light: facadeQuad(
        1.05,
        4.6,
        first.z0 + 0.2,
        first.z1 - 0.2,
        FACADE_X - 0.6,
    ),
};

/** Yellow bollards on the apron between the docks, with dark bands. */
const bollards = DOCKS.slice(0, 10).map((dock) => {
    const z = dock.z1 + 0.62;
    const x = FACADE_X + 0.3;

    return {
        body: boxFaces(x, x + 0.22, 0, 1.1, z, z + 0.22),
        bands: [0.55, 0.85]
            .map((y) => boxFaces(x, x + 0.22, y, y + 0.12, z, z + 0.22).front)
            .join(''),
    };
});

/** Red/green traffic lights beside the near docks; dock 01 is loading. */
const signals = DOCKS.slice(0, 6).map((dock) => ({
    box: facadeQuad(2.55, 3.35, dock.z1 + 0.42, dock.z1 + 0.76),
    red: facadeQuad(3.0, 3.24, dock.z1 + 0.48, dock.z1 + 0.7),
    green: facadeQuad(2.66, 2.9, dock.z1 + 0.48, dock.z1 + 0.7),
    loading: dock.index === 0,
}));

/**
 * The yard: apron in front of the docks with its bay lines and the yellow
 * walkway line, the service road with its centre dashes, the verge and
 * the fence.
 */
const apron = groundQuad(FACADE_X, 4.2, NEAR, FAR);
const walkLine = groundQuad(FACADE_X + 1.35, FACADE_X + 1.5, NEAR, FAR);
const bayLines = DOCKS.slice(0, 11)
    .map((dock) =>
        groundQuad(FACADE_X + 1.5, 3.6, dock.z1 + 0.62, dock.z1 + 0.8),
    )
    .join('');
const apronEdge = groundQuad(3.6, 3.78, NEAR, FAR);
const road = groundQuad(4.2, 11.2, NEAR, 400);
const roadDashes = range(8, 190, 7)
    .map((z) => groundQuad(7.6, 7.8, z, z + 3.2))
    .join('');
const kerb = groundQuad(11.2, 11.6, NEAR, 400, 0);
const verge = groundQuad(11.6, 40, NEAR, 400);

/** Fence posts and the top rail beyond the verge. */
const fenceX = 13.5;
const fencePosts = range(20, 120, 5)
    .map((z) =>
        worldPath([
            [fenceX, 0, z],
            [fenceX, 2.2, z],
            [fenceX, 2.2, z + 0.12],
            [fenceX, 0, z + 0.12],
        ]),
    )
    .join('');
const fenceRail = worldPath([
    [fenceX, 2.05, 20],
    [fenceX, 2.2, 20],
    [fenceX, 2.2, 400],
    [fenceX, 2.05, 400],
]);
const fenceMesh = worldPath([
    [fenceX, 0.1, 20],
    [fenceX, 2.05, 20],
    [fenceX, 2.05, 400],
    [fenceX, 0.1, 400],
]);

/** The far end of the dock face, where it stops against the sky. */
const farEnd = {
    x: screenX(FACADE_X, FAR),
    top: screenY(PARAPET, FAR),
    base: screenY(0, FAR),
};

/**
 * Klang Valley skyline on the horizon, pale with distance. It runs on well
 * past the usual frame on the right, for wide boxes (WarehouseScene paints
 * past its focal area).
 */
const horizon = HORIZON_Y + 0.5;
const towers: { x: number; w: number; h: number; tone: string }[] = [
    { x: 918, w: 16, h: 40, tone: '#DCE1E7' },
    { x: 936, w: 11, h: 58, tone: '#D3D9E0' },
    { x: 952, w: 18, h: 30, tone: '#DCE1E7' },
    { x: 1004, w: 14, h: 66, tone: '#D3D9E0' },
    { x: 1022, w: 20, h: 44, tone: '#DCE1E7' },
    { x: 1046, w: 12, h: 82, tone: '#D3D9E0' },
    { x: 1064, w: 22, h: 36, tone: '#DCE1E7' },
    { x: 1112, w: 16, h: 54, tone: '#D3D9E0' },
    { x: 1134, w: 24, h: 30, tone: '#DCE1E7' },
    { x: 1166, w: 14, h: 62, tone: '#D3D9E0' },
    { x: 1192, w: 18, h: 38, tone: '#DCE1E7' },
    { x: 1214, w: 12, h: 70, tone: '#D3D9E0' },
    { x: 1232, w: 22, h: 34, tone: '#DCE1E7' },
    { x: 1270, w: 14, h: 56, tone: '#D3D9E0' },
    { x: 1290, w: 20, h: 42, tone: '#DCE1E7' },
    { x: 1324, w: 12, h: 76, tone: '#D3D9E0' },
    { x: 1342, w: 24, h: 30, tone: '#DCE1E7' },
    { x: 1382, w: 16, h: 50, tone: '#D3D9E0' },
    { x: 1402, w: 20, h: 64, tone: '#DCE1E7' },
    { x: 1440, w: 14, h: 36, tone: '#D3D9E0' },
    { x: 1462, w: 22, h: 54, tone: '#DCE1E7' },
    { x: 1500, w: 16, h: 42, tone: '#D3D9E0' },
    { x: 1520, w: 12, h: 68, tone: '#DCE1E7' },
    { x: 1550, w: 24, h: 30, tone: '#D3D9E0' },
    { x: 1590, w: 16, h: 52, tone: '#DCE1E7' },
    { x: 1612, w: 20, h: 38, tone: '#D3D9E0' },
];
/** A telecom tower among them. */
const needle = { x: 985, base: horizon, top: horizon - 104 };

/** Low rounded trees along the fence, darker nearer the viewer. */
const trees = [26, 36, 48, 62, 80, 104].map((z, index) => {
    const s = 700 / z;
    const x = screenX(16 + (index % 2) * 3, z);
    const base = screenY(0, z);

    return {
        x,
        base,
        r: 2.6 * s,
        trunk: 0.35 * s,
        height: 3.2 * s,
        tone: index < 2 ? '#B9CBB8' : index < 4 ? '#C7D5C5' : '#D2DDD0',
    };
});

/** The ground line of the dock face, for the soft shadow at its foot. */
const footShadow = groundQuad(FACADE_X, FACADE_X + 0.9, NEAR, FAR);
</script>

<template>
    <g>
        <!-- the horizon: city skyline and a telecom tower, pale with distance -->
        <g>
            <rect
                v-for="tower in towers"
                :key="`tower-${tower.x}`"
                :x="tower.x"
                :y="horizon - tower.h"
                :width="tower.w"
                :height="tower.h"
                :fill="tower.tone"
            />
            <path
                :d="`M${needle.x - 1.6} ${needle.base}L${needle.x - 0.8} ${needle.top + 20}H${needle.x + 0.8}L${needle.x + 1.6} ${needle.base}Z`"
                fill="#D3D9E0"
            />
            <ellipse
                :cx="needle.x"
                :cy="needle.top + 22"
                rx="5"
                ry="4"
                fill="#D3D9E0"
            />
            <rect
                :x="needle.x - 0.5"
                :y="needle.top"
                width="1"
                height="20"
                fill="#D3D9E0"
            />
        </g>

        <!-- the ground: the yard up to the horizon -->
        <rect
            x="-1600"
            :y="horizon"
            width="4400"
            height="2000"
            fill="#E3E6EA"
        />
        <path :d="verge" fill="#D5DED3" />
        <path :d="road" fill="#CDD2D9" />
        <path :d="roadDashes" fill="#FFFFFF" />
        <path :d="kerb" fill="#B3BAC4" />
        <path :d="apron" fill="#E6E9ED" />
        <path :d="apronEdge" fill="#FFFFFF" />
        <path :d="bayLines" fill="#FFFFFF" />
        <path :d="walkLine" fill="#FFC53D" />

        <!-- fence and trees beyond the verge -->
        <path :d="fenceMesh" fill="#C3C9D1" opacity="0.35" />
        <path :d="fencePosts" fill="#A9B0BC" />
        <path :d="fenceRail" fill="#A9B0BC" />
        <g v-for="tree in trees" :key="`tree-${tree.x}`">
            <rect
                :x="tree.x - tree.trunk / 2"
                :y="tree.base - tree.height * 0.45"
                :width="tree.trunk"
                :height="tree.height * 0.45"
                fill="#A39A8C"
            />
            <circle
                :cx="tree.x"
                :cy="tree.base - tree.height * 0.62"
                :r="tree.r"
                :fill="tree.tone"
            />
        </g>

        <!-- over the parapet: skylight ridges and turbine vents -->
        <g v-for="ridge in ridges" :key="ridge.glass">
            <path :d="ridge.glass" fill="#BFD0E0" />
            <path :d="ridge.frame" fill="#A9BBCC" />
        </g>
        <g v-for="vent in vents" :key="`vent-${vent.cx}`">
            <rect
                :x="vent.cx - vent.r * 0.35"
                :y="vent.top + vent.r"
                :width="vent.r * 0.7"
                :height="vent.base - vent.top - vent.r"
                fill="#B3BAC4"
            />
            <path
                :d="`M${vent.cx - vent.r} ${vent.top + vent.r}A${vent.r} ${vent.r} 0 0 1 ${vent.cx + vent.r} ${vent.top + vent.r}Z`"
                fill="#C9CED6"
            />
        </g>

        <!-- the dock face: white standing-seam cladding on a concrete plinth -->
        <path :d="footShadow" fill="#16181D" opacity="0.06" />
        <path :d="wall" fill="#FFFFFF" />
        <path v-if="!compact" :d="ribs" fill="#EEF0F3" />
        <path :d="plinth" fill="#D9DDE3" />
        <path :d="plinthEdge" fill="#C3C9D1" />

        <!-- ribbon window: the sorting hall's lights behind the glass -->
        <path :d="ribbonSill" fill="#C3C9D1" />
        <path :d="ribbon" fill="#B4C3D3" />
        <path :d="ribbonGlare" fill="#FFFFFF" opacity="0.35" />
        <path :d="ribbonMullions" fill="#E6E9ED" />

        <!-- brand band: the box mark, "Kotak" and the hub's name -->
        <path :d="cap" fill="#A8111A" />
        <path :d="band" fill="#D0161E" />
        <path :d="bandLight" fill="#E4474D" />
        <path :d="bandShade" fill="#A8111A" />
        <g :transform="markTransform">
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
            v-for="(letter, index) in letters"
            :key="`letter-${index}`"
            :transform="letter.transform"
            :font-family="font"
            font-size="20"
            font-weight="800"
            fill="#FFFFFF"
        >
            {{ letter.glyph }}
        </text>
        <template v-if="!compact">
            <text
                v-for="(letter, index) in tagline"
                :key="`tag-${index}`"
                :transform="letter.transform"
                :font-family="font"
                font-size="20"
                font-weight="800"
                fill="#FFFFFF"
                opacity="0.9"
            >
                {{ letter.glyph }}
            </text>
        </template>
        <g
            v-for="(mark, index) in farMarks"
            :key="`far-mark-${index}`"
            :transform="mark"
        >
            <path
                d="M16 5.5 26.5 10.75v10.5L16 26.5 5.5 21.25v-10.5Z"
                fill="#FFFFFF"
                opacity="0.85"
            />
        </g>

        <!-- inside dock 01: racks of parcels in the lit hall -->
        <defs>
            <clipPath :id="clipId">
                <path :d="docks[0].opening" />
            </clipPath>
        </defs>

        <!-- the docks, near to far -->
        <g v-for="dock in docks" :key="`dock-${dock.label}`">
            <path :d="dock.shelter" fill="#2A2E36" />
            <path :d="dock.header" fill="#3D4350" />
            <template v-if="dock.open">
                <path :d="dock.opening" fill="#262B33" />
                <g v-if="dock.index === 0" :clip-path="`url(#${clipId})`">
                    <path :d="hall.back" fill="#3A404B" />
                    <path :d="hall.floor" fill="#4A505C" />
                    <path :d="hall.boxes" fill="#A87840" />
                    <path :d="hall.tape" fill="#9E1B20" />
                    <path :d="hall.shelves" fill="#B5121A" />
                    <path :d="hall.uprights" fill="#6B7280" />
                    <path :d="hall.light" fill="#FFE9B8" opacity="0.07" />
                </g>
                <path v-else :d="dock.glow" fill="#FFE9B8" opacity="0.08" />
                <path :d="dock.floor" fill="#3D4350" />
                <path :d="dock.jamb" fill="#B3BAC4" />
                <path :d="dock.rolled" fill="#E3E6EA" />
            </template>
            <template v-else>
                <path :d="dock.opening" fill="#E3E6EA" />
                <path v-if="!compact" :d="dock.slats" fill="#CDD2D9" />
                <path :d="dock.rail" fill="#B3BAC4" />
            </template>
            <path :d="dock.lip" fill="#FFC53D" />
            <path :d="dock.bumpers" fill="#16181D" />
            <path :d="dock.lamp" fill="#2A2E36" />
            <path :d="dock.lampGlow" fill="#FFE3A0" />
            <path :d="dock.plate" fill="#16181D" />
            <text
                v-if="dock.index < (compact ? 5 : 8)"
                :transform="dock.plateText"
                x="0"
                y="0"
                text-anchor="middle"
                :font-family="mono"
                font-size="20"
                font-weight="700"
                fill="#FFFFFF"
            >
                {{ dock.label }}
            </text>
        </g>

        <!-- traffic lights beside the near docks, bollards between them -->
        <g v-for="(signal, index) in signals" :key="`signal-${index}`">
            <path :d="signal.box" fill="#2A2E36" />
            <path
                :d="signal.red"
                :fill="signal.loading ? '#5A2328' : '#FF4D55'"
            />
            <path
                :d="signal.green"
                :fill="signal.loading ? '#3DDC84' : '#1F3A2B'"
            />
        </g>
        <g v-for="(bollard, index) in bollards" :key="`bollard-${index}`">
            <path
                v-if="bollard.body.side"
                :d="bollard.body.side"
                fill="#E5A92A"
            />
            <path
                v-if="bollard.body.top"
                :d="bollard.body.top"
                fill="#FFD66B"
            />
            <path :d="bollard.body.front" fill="#FFC53D" />
            <path :d="bollard.bands" fill="#2A2E36" />
        </g>

        <!-- where the face ends, far off -->
        <rect
            :x="farEnd.x - 0.5"
            :y="farEnd.top"
            width="1.5"
            :height="farEnd.base - farEnd.top"
            fill="#D5D9DF"
        />
    </g>
</template>
