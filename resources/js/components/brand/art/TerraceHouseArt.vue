<script setup lang="ts">
import { computed } from 'vue';

/**
 * One unit of a double-storey taman terrace house as an SVG group, front
 * view: tiled roof between the party walls, upper-floor windows, the car
 * porch and the front boundary with its pillars and sliding grille gate.
 * Drawn 378 wide from x 0 (party wall to party wall), standing on y 428:
 * place it with a transform. Used by DoorstepScene; always decorative.
 *
 * The home variant is the customer's house: gate slid fully open to the
 * left, front door open at the right, the house number on the right gate
 * pillar, pillar lamps and a potted plant. The porch wall between the gate
 * and the door (x 122-268) stays plain, so people standing in the gateway
 * read clearly against it. `muted` draws a pale, plain neighbour with the
 * gate shut.
 */
const props = withDefaults(
    defineProps<{
        muted?: boolean;
        /** Drop the fine texture (tile edges, grille detail) for small sizes. */
        compact?: boolean;
        /** House number on the plaque by the door (home variant only). */
        number?: string | null;
    }>(),
    {
        muted: false,
        compact: false,
        number: null,
    },
);

const font = 'Plus Jakarta Sans, sans-serif';

const palette = computed(() =>
    props.muted
        ? {
              wall: '#EAECEF',
              wallShade: '#E3E6EA',
              wallDeep: '#D9DDE3',
              trim: '#F5F6F8',
              trimShade: '#E3E6EA',
              roof: '#DCCFC9',
              roofLight: '#E4D9D4',
              roofShade: '#D0C1BA',
              ridge: '#CBBAB2',
              glass: '#D6DCE3',
              fanlight: '#D0D6DE',
              metal: '#CDD2D9',
          }
        : {
              wall: '#F6EBDC',
              wallShade: '#ECDDC8',
              wallDeep: '#DECBB0',
              trim: '#FFFFFF',
              trimShade: '#E6E8EC',
              roof: '#B7684C',
              roofLight: '#C98062',
              roofShade: '#9A523B',
              ridge: '#8A4935',
              glass: '#9DB1C6',
              fanlight: '#8AA0B8',
              metal: '#3D4350',
          },
);

/** Party walls at both ends; they rise above the roof as firewalls. */
const partyWalls = [0, 364];
const pillars = [0, 356];

/** Four courses of tiles between the ridge (y 92) and the fascia (y 147). */
const courseTops = [92, 105.75, 119.5, 133.25];
const courseHeight = 13.75;

const tileEdges = computed(() =>
    courseTops
        .map((top) => {
            const y = top + courseHeight;

            // Straight rows on the small home roof; the neighbours stay
            // scalloped, since plain lines there read as speed streaks.
            return props.compact && !props.muted
                ? `M14 ${y}H364`
                : `M14 ${y}${' q7 4.5 14 0'.repeat(25)}`;
        })
        .join(''),
);

const tileJoints = computed(() => {
    let d = '';

    for (const top of courseTops) {
        for (let x = 28; x < 364; x += 14) {
            d += `M${x} ${top + 3}V${top + courseHeight}`;
        }
    }

    return d;
});

interface HouseWindow {
    x: number;
    y: number;
    w: number;
    h: number;
    panes: number;
    hood: boolean;
    grille: boolean;
}

const windows: HouseWindow[] = [
    { x: 42, y: 184, w: 160, h: 62, panes: 4, hood: true, grille: false },
    { x: 254, y: 184, w: 76, h: 62, panes: 2, hood: true, grille: false },
    { x: 30, y: 326, w: 62, h: 60, panes: 2, hood: false, grille: true },
];

function glass(win: HouseWindow) {
    const x = win.x + 4;
    const y = win.y + 4;
    const w = win.w - 8;
    const h = win.h - 8;

    return { x, y, w, h, transom: y + Math.round(h * 0.3) };
}

/** Curtain panels drawn to both sides, with a fold down each. */
function curtains(win: HouseWindow): string {
    const g = glass(win);
    const cw = Math.round(Math.min(g.w * 0.16, 14));
    const right = g.x + g.w;

    return (
        `M${g.x} ${g.y}H${g.x + cw}V${g.y + g.h}H${g.x}Z` +
        `M${right - cw} ${g.y}H${right}V${g.y + g.h}H${right - cw}Z`
    );
}

function curtainFolds(win: HouseWindow): string {
    const g = glass(win);
    const cw = Math.round(Math.min(g.w * 0.16, 14));
    const bottom = g.y + g.h;

    return (
        `M${g.x + cw * 0.5} ${g.y}V${bottom}` +
        `M${g.x + g.w - cw * 0.5} ${g.y}V${bottom}`
    );
}

function glint(win: HouseWindow): string {
    const g = glass(win);
    const lean = g.h * 0.6;
    const x = g.x + Math.min(g.w * 0.4, g.w - lean - 14);

    return `M${x} ${g.y + g.h}H${x + 10}L${x + 10 + lean} ${g.y}H${x + lean}Z`;
}

function mullions(win: HouseWindow): number[] {
    const g = glass(win);

    return Array.from(
        { length: win.panes - 1 },
        (_, index) => g.x + ((index + 1) * g.w) / win.panes - 1.5,
    );
}

function grille(win: HouseWindow): string {
    const g = glass(win);
    const step = props.compact ? 9 : 6;
    let d = '';

    for (let x = g.x + step; x < g.x + g.w - 1; x += step) {
        d += `M${x} ${g.y}V${g.y + g.h}`;
    }

    const rails = [0.36, 0.68].map((t) => g.y + Math.round(g.h * t));

    return d + rails.map((y) => `M${g.x} ${y}H${g.x + g.w}`).join('');
}

interface GatePanel {
    x: number;
    w: number;
    colour: string;
}

/** Open: two panels stacked at the left. Shut: one panel across. */
const gatePanels = computed<GatePanel[]>(() =>
    props.muted
        ? [{ x: 22, w: 334, colour: palette.value.metal }]
        : [
              { x: 30, w: 92, colour: '#A3AAB5' },
              { x: 22, w: 92, colour: '#737A87' },
          ],
);

function gateBars(panel: GatePanel): string {
    let d = '';

    for (let x = panel.x + 8; x < panel.x + panel.w - 4; x += 8) {
        d += `M${x} 357.5V419`;
    }

    return d;
}

function gateStuds(panel: GatePanel): number[] {
    const studs: number[] = [];

    for (let x = panel.x + 8; x < panel.x + panel.w - 4; x += 8) {
        studs.push(x);
    }

    return studs;
}

const lamps = [11, 367];
</script>

<template>
    <g>
        <!-- party walls, rising above the roof as firewalls -->
        <g v-for="x in partyWalls" :key="`party-${x}`">
            <rect :x="x" y="76" width="14" height="352" :fill="palette.trim" />
            <rect
                :x="x + 11"
                y="76"
                width="3"
                height="352"
                :fill="palette.trimShade"
            />
            <rect
                :x="x - 2"
                y="71"
                width="18"
                height="5"
                rx="1"
                :fill="palette.trim"
            />
            <rect
                :x="x"
                y="76"
                width="14"
                height="2"
                :fill="palette.trimShade"
            />
        </g>

        <!-- tiled roof: ridge, four courses, fascia -->
        <rect x="14" y="84" width="350" height="8" :fill="palette.ridge" />
        <rect x="14" y="92" width="350" height="55" :fill="palette.roof" />
        <rect
            v-for="top in muted ? [] : courseTops"
            :key="`course-${top}`"
            x="14"
            :y="top"
            width="350"
            height="3"
            :fill="palette.roofLight"
        />
        <path
            v-if="!compact && !muted"
            :d="tileJoints"
            stroke="#9A523B"
            stroke-width="1"
            opacity="0.5"
        />
        <path
            :d="tileEdges"
            fill="none"
            :stroke="palette.roofShade"
            :stroke-width="muted ? 1.5 : 2"
        />

        <!-- upper floor -->
        <rect x="14" y="153" width="350" height="129" :fill="palette.wall" />
        <rect x="14" y="146" width="350" height="7" :fill="palette.trim" />
        <rect x="14" y="153" width="350" height="6" :fill="palette.wallShade" />

        <!-- ground floor, set back in the shade of the car porch -->
        <rect
            x="14"
            y="298"
            width="350"
            height="130"
            :fill="palette.wallShade"
        />
        <rect x="14" y="282" width="350" height="16" :fill="palette.trim" />
        <rect x="14" y="298" width="350" height="6" :fill="palette.wallDeep" />
        <rect x="14" y="418" width="350" height="10" :fill="palette.wallDeep" />

        <!-- windows: hood, frame, glass, curtains, bars, sill -->
        <g v-for="win in windows" :key="`window-${win.x}-${win.y}`">
            <template v-if="win.hood">
                <rect
                    :x="win.x - 6"
                    :y="win.y - 12"
                    :width="win.w + 12"
                    height="6"
                    :fill="palette.trim"
                />
                <rect
                    :x="win.x - 4"
                    :y="win.y - 6"
                    :width="win.w + 8"
                    height="3"
                    :fill="palette.wallShade"
                />
            </template>
            <rect
                :x="win.x"
                :y="win.y"
                :width="win.w"
                :height="win.h"
                :fill="palette.trim"
            />
            <rect
                :x="glass(win).x"
                :y="glass(win).y"
                :width="glass(win).w"
                :height="glass(win).h"
                :fill="palette.glass"
            />
            <rect
                :x="glass(win).x"
                :y="glass(win).y"
                :width="glass(win).w"
                :height="glass(win).transom - glass(win).y"
                :fill="palette.fanlight"
            />
            <template v-if="!muted">
                <path :d="curtains(win)" fill="#E9C28A" />
                <path
                    :d="curtainFolds(win)"
                    stroke="#D9AC6E"
                    stroke-width="1.5"
                />
                <path :d="glint(win)" fill="#FFFFFF" opacity="0.22" />
            </template>
            <rect
                :x="glass(win).x"
                :y="glass(win).transom - 1.25"
                :width="glass(win).w"
                height="2.5"
                :fill="palette.trim"
            />
            <rect
                v-for="x in mullions(win)"
                :key="`mullion-${x}`"
                :x="x"
                :y="glass(win).y"
                width="3"
                :height="glass(win).h"
                :fill="palette.trim"
            />
            <path
                v-if="win.grille && !muted"
                :d="grille(win)"
                fill="none"
                :stroke="palette.metal"
                :stroke-width="compact ? 1.6 : 1.2"
            />
            <rect
                :x="win.x - 4"
                :y="win.y + win.h"
                :width="win.w + 8"
                height="5"
                :fill="palette.trim"
            />
            <rect
                :x="win.x - 2"
                :y="win.y + win.h + 5"
                :width="win.w + 4"
                height="3"
                :fill="palette.wallDeep"
            />
        </g>

        <!-- air-conditioner unit on its bracket -->
        <g v-if="!muted">
            <path
                d="M300 279V284M338 279V284"
                stroke="#8C93A0"
                stroke-width="2"
            />
            <rect
                x="294"
                y="257"
                width="50"
                height="22"
                rx="2"
                fill="#F1F2F4"
            />
            <rect x="294" y="276" width="50" height="3" fill="#D5D9DF" />
            <circle cx="329" cy="267" r="8" fill="#DDE1E6" />
            <template v-if="!compact">
                <circle
                    cx="329"
                    cy="267"
                    r="5.5"
                    fill="none"
                    stroke="#C3C9D1"
                    stroke-width="1.2"
                />
                <path
                    d="M299 262H316M299 266H316M299 270H316"
                    stroke="#D5D9DF"
                    stroke-width="1.4"
                />
            </template>
            <circle cx="329" cy="267" r="2" fill="#AEB5BF" />
        </g>

        <!-- front door, at the right of the porch -->
        <rect x="264" y="424" width="76" height="4" :fill="palette.trim" />
        <rect x="268" y="310" width="68" height="118" :fill="palette.trim" />
        <template v-if="muted">
            <rect
                x="272"
                y="314"
                width="60"
                height="114"
                :fill="palette.wallDeep"
            />
        </template>
        <template v-else>
            <!-- open: the leaf swung in, the grille door folded aside -->
            <rect x="272" y="314" width="60" height="114" fill="#4B3B31" />
            <rect x="272" y="416" width="60" height="12" fill="#6A5445" />
            <path d="M272 314L287 319V423L272 428Z" fill="#A06B45" />
            <path
                d="M275.5 327L283.5 329.6V362L275.5 360.3ZM275.5 373L283.5 374.4V410L275.5 413Z"
                fill="#8A5A38"
            />
            <path
                d="M321 314V428M324.5 314V428M328 314V428M331 314V428M319 334H332M319 374H332M319 412H332"
                stroke="#3D4350"
                :stroke-width="compact ? 1.8 : 1.3"
            />
            <rect x="280" y="424" width="44" height="4" rx="1" fill="#B98046" />
        </template>

        <!-- potted snake plant beside the door -->
        <g v-if="!muted">
            <path
                d="M345 409Q344 392 347 378Q350 392 349 409Z"
                fill="#3E8A56"
            />
            <path
                d="M342.5 409Q340 399 341 390Q344.5 399 345.5 409Z"
                fill="#2E6E42"
            />
            <path
                d="M348.5 409Q350 397 353.5 387Q354 399 351.5 409Z"
                fill="#2E6E42"
            />
            <path d="M340 411H353.5L352 428H341.5Z" fill="#B7684C" />
            <path d="M347 411H353.5L352 428H347Z" fill="#9A523B" />
            <rect
                x="339"
                y="408"
                width="15.5"
                height="3.5"
                rx="1"
                fill="#C98062"
            />
        </g>

        <!-- front boundary: pillars, lamps, house number, sliding gate -->
        <g v-for="x in pillars" :key="`pillar-${x}`">
            <rect :x="x" y="338" width="22" height="90" :fill="palette.wall" />
            <rect
                :x="x + 18"
                y="338"
                width="4"
                height="90"
                :fill="palette.wallDeep"
            />
            <rect
                :x="x"
                y="338"
                width="22"
                height="2.5"
                :fill="palette.wallDeep"
            />
            <rect
                :x="x - 3"
                y="332"
                width="28"
                height="6"
                rx="1"
                :fill="palette.trim"
            />
        </g>
        <template v-if="!muted">
            <g v-for="cx in lamps" :key="`lamp-${cx}`">
                <rect
                    :x="cx - 3.5"
                    y="326"
                    width="7"
                    height="6"
                    fill="#2A2E36"
                />
                <rect
                    :x="cx - 6"
                    y="313"
                    width="12"
                    height="14"
                    rx="1.5"
                    fill="#2A2E36"
                />
                <rect
                    :x="cx - 4.2"
                    y="315"
                    width="8.4"
                    height="10"
                    rx="0.6"
                    fill="#FFE3A0"
                />
                <path
                    :d="`M${cx - 7.5} 313.5L${cx} 307.5L${cx + 7.5} 313.5Z`"
                    fill="#2A2E36"
                />
                <circle :cx="cx" cy="306.5" r="1.4" fill="#2A2E36" />
            </g>
            <!-- house number on the right gate pillar -->
            <g v-if="number">
                <rect
                    x="357"
                    y="346"
                    width="16"
                    height="13"
                    rx="1.5"
                    fill="#2A2E36"
                />
                <text
                    x="365"
                    y="355.8"
                    text-anchor="middle"
                    :font-family="font"
                    font-size="9.5"
                    font-weight="800"
                    fill="#FFFFFF"
                >
                    {{ number }}
                </text>
            </g>
        </template>

        <rect x="22" y="424" width="334" height="4" :fill="palette.metal" />
        <g v-for="panel in gatePanels" :key="`gate-${panel.x}`">
            <path
                :d="gateBars(panel)"
                :stroke="panel.colour"
                :stroke-width="compact ? 2 : 1.6"
            />
            <rect
                :x="panel.x"
                y="346"
                :width="panel.w"
                height="4"
                :fill="panel.colour"
            />
            <rect
                :x="panel.x"
                y="355"
                :width="panel.w"
                height="2.5"
                :fill="panel.colour"
            />
            <rect
                :x="panel.x"
                y="386"
                :width="panel.w"
                height="2.5"
                :fill="panel.colour"
            />
            <rect
                :x="panel.x"
                y="419"
                :width="panel.w"
                height="5"
                :fill="panel.colour"
            />
            <rect
                :x="panel.x"
                y="346"
                width="4"
                height="78"
                :fill="panel.colour"
            />
            <rect
                :x="panel.x + panel.w - 4"
                y="346"
                width="4"
                height="78"
                :fill="panel.colour"
            />
            <template v-if="!compact && !muted">
                <circle
                    v-for="x in gateStuds(panel)"
                    :key="`stud-${x}`"
                    :cx="x"
                    cy="352.5"
                    r="1.3"
                    :fill="panel.colour"
                />
            </template>
        </g>
    </g>
</template>
