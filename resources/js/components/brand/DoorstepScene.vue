<script setup lang="ts">
import { computed, useId, useTemplateRef } from 'vue';
import CourierArt from '@/components/brand/art/CourierArt.vue';
import ParcelArt from '@/components/brand/art/ParcelArt.vue';
import ReceiverArt from '@/components/brand/art/ReceiverArt.vue';
import TerraceHouseArt from '@/components/brand/art/TerraceHouseArt.vue';
import VanArt from '@/components/brand/art/VanArt.vue';
import { useInView } from '@/composables/useInView';

/**
 * The home page hero picture, told as one calm 11-second loop: the red
 * Kotak van pulls up at the kerb outside No. 12, the courier steps out with
 * a taped parcel and walks to the open gate, the customer comes out of his
 * door and the parcel changes hands. Then the system confirms it: a green
 * tick seal pops up over the parcel with a ring spreading from it, and a
 * "Delivered · 11:42" status chip (styled like the site's own delivered
 * status) drops in over the roof, well away from anyone's head and with no
 * tail, so it cannot be read as something a person says. After a pause the
 * people fade, the van pulls away and it starts again.
 *
 * Every part rests on the last frame (parcel handed over, seal and status
 * showing), which is what visitors who prefer reduced motion see, without
 * movement. The loop pauses while the picture is scrolled off screen.
 *
 * Size it with width classes (it keeps its aspect ratio, 740 × 474). Pass
 * `title` when the picture carries meaning; without one it is decorative
 * (aria-hidden).
 */
const props = withDefaults(
    defineProps<{
        /**
         * For renders under ~640px wide (phones, and beside the text on
         * small laptops): less fine detail and a bigger Delivered seal and
         * status with larger lettering, so they stay legible.
         */
        compact?: boolean;
        title?: string | null;
    }>(),
    {
        compact: false,
        title: null,
    },
);

const root = useTemplateRef<SVGSVGElement>('root');
const inView = useInView(root);

// Unique per instance: the page renders a compact and a full copy.
const id = useId();
const fadeId = `${id}-fade`;
const maskId = `${id}-edges`;
const exitFadeId = `${id}-exit-fade`;
const exitMaskId = `${id}-exit`;

const font = 'Plus Jakarta Sans, sans-serif';
const mono = 'JetBrains Mono, monospace';

/** The house and people are drawn at these sizes (house art is 1:1). */
const houseScale = 1.1;
const houseTop = 440 - 428 * houseScale;
const houseTransform = (x: number) =>
    `translate(${x} ${houseTop}) scale(${houseScale})`;

const pavementJoints = Array.from({ length: 10 }, (_, index) => 40 + index * 72)
    .map((x) => `M${x} 441V461`)
    .join('');

const laneMarks = Array.from({ length: 9 }, (_, index) => 24 + index * 80)
    .map((x) => `M${x} 503H${x + 36}`)
    .join('');

/** VanArt wheel centres (its own coordinates, y 496). */
const wheelCentres = [270, 585];
const spokeAngles = [0, 72, 144, 216, 288];

/**
 * The street tree on the verge in front of the right-hand neighbour, well
 * clear of the van: overlapping canopy lobes, the big ones lit up-left.
 * The whole canopy stays inside the picture (x 652-738), so it is never
 * cut off at the right edge, and clear of No. 12's pillar lamp and AC unit.
 */
const treeLobes = [
    { cx: 692, cy: 298, r: 16, lit: false },
    { cx: 722, cy: 298, r: 16, lit: false },
    { cx: 676, cy: 266, r: 24, lit: true },
    { cx: 716, cy: 262, r: 22, lit: true },
    { cx: 698, cy: 226, r: 34, lit: true },
];

/**
 * The Delivered seal's edge: a circle with shallow scallops, the way an
 * "approved" stamp or a verified badge is drawn, so it reads as the system
 * confirming the delivery. Drawn round the origin, peaks at about `radius`.
 */
function sealOutline(radius: number, bumps = 12): string {
    const base = radius * 0.92;
    const step = (2 * Math.PI) / bumps;
    const arc = (2 * base * Math.sin(step / 2) * 0.62).toFixed(2);
    const point = (index: number) => {
        const angle = (index % bumps) * step - Math.PI / 2;

        return `${(base * Math.cos(angle)).toFixed(2)} ${(base * Math.sin(angle)).toFixed(2)}`;
    };

    let d = `M${point(0)}`;

    for (let index = 1; index <= bumps; index++) {
        d += `A${arc} ${arc} 0 0 1 ${point(index)}`;
    }

    return `${d}Z`;
}

/**
 * The seal sits just above the parcel in his hands (the parcel's top edge
 * is at y 355, centred on x 487), between the two heads rather than by
 * either.
 * The compact drawing gets a bigger one, so it still reads on a phone.
 */
const seals = {
    compact: {
        y: 334,
        radius: 17,
        outline: sealOutline(17),
        tick: 'M-5.8 0.3L-1.7 4.4L6 -3.9',
        tickWidth: 3.4,
        ringWidth: 3,
    },
    full: {
        y: 338,
        radius: 14,
        outline: sealOutline(14),
        tick: 'M-4.8 0.3L-1.4 3.6L4.9 -3.1',
        tickWidth: 2.8,
        ringWidth: 2.5,
    },
};

const seal = computed(() => (props.compact ? seals.compact : seals.full));

/**
 * The status chip's two words as the site's own font files draw them, in
 * em: how wide the letters' ink is, how far the middle of that ink sits
 * right of the middle of the advance box (which text-anchor="middle"
 * centres), and how far below the ink's middle the baseline falls.
 * "Delivered" is Plus Jakarta Sans ExtraBold (kerned), "11:42" JetBrains
 * Mono SemiBold. Each word is set by the middle of its ink, so a fallback
 * font still sits centred in its slot.
 */
const chipWords = {
    label: { ink: 4.602, shift: 0.0055, baseline: 0.3725 },
    time: { ink: 2.848, shift: 0.009, baseline: 0.365 },
};

type StatusChipSize = {
    height: number;
    corner: number;
    border: number;
    /** From the tick disc's left edge and the time's last ink to the edges. */
    padding: number;
    iconRadius: number;
    /** The tick, drawn round the disc's centre. */
    tick: string;
    tickWidth: number;
    /** Between the disc and "Delivered". */
    iconGap: number;
    labelSize: number;
    /** Either side of the dot between "Delivered" and the time. */
    dotGap: number;
    dotRadius: number;
    dotY: number;
    timeSize: number;
};

const round = (value: number) => Math.round(value * 100) / 100;

/**
 * Lays the chip out left to right (tick disc, "Delivered", dot, time) from
 * the measured ink, with the same padding at both ends, and centres it on
 * the origin.
 */
function statusChip(size: StatusChipSize) {
    const labelInk = chipWords.label.ink * size.labelSize;
    const timeInk = chipWords.time.ink * size.timeSize;
    const width =
        2 * size.padding +
        2 * size.iconRadius +
        size.iconGap +
        labelInk +
        2 * size.dotGap +
        2 * size.dotRadius +
        timeInk;

    let edge = -width / 2 + size.padding;
    const iconX = edge + size.iconRadius;
    edge += 2 * size.iconRadius + size.iconGap;
    const labelX = edge + labelInk / 2 - chipWords.label.shift * size.labelSize;
    edge += labelInk + size.dotGap;
    const dotX = edge + size.dotRadius;
    edge += 2 * size.dotRadius + size.dotGap;
    const timeX = edge + timeInk / 2 - chipWords.time.shift * size.timeSize;

    return {
        ...size,
        x: round(-width / 2),
        y: -size.height / 2,
        width: round(width),
        iconX: round(iconX),
        labelX: round(labelX),
        labelY: round(chipWords.label.baseline * size.labelSize),
        dotX: round(dotX),
        timeX: round(timeX),
        timeY: round(chipWords.time.baseline * size.timeSize),
    };
}

/** The compact chip is bigger, with larger lettering, for phones. */
const statusChips = {
    compact: statusChip({
        height: 46,
        corner: 9,
        border: 2.5,
        padding: 13.5,
        iconRadius: 13,
        tick: 'M-5.8 0.3L-1.7 4.4L6 -3.9',
        tickWidth: 3.2,
        iconGap: 10.5,
        labelSize: 23,
        dotGap: 11.5,
        dotRadius: 2.4,
        dotY: 0.6,
        timeSize: 19,
    }),
    full: statusChip({
        height: 34,
        corner: 7,
        border: 2,
        padding: 10,
        iconRadius: 9,
        tick: 'M-3.8 0.2L-1 3L4.2 -2.6',
        tickWidth: 2.3,
        iconGap: 8,
        labelSize: 17,
        dotGap: 9,
        dotRadius: 1.8,
        dotY: 0.5,
        timeSize: 14,
    }),
};

const chip = computed(() =>
    props.compact ? statusChips.compact : statusChips.full,
);
</script>

<template>
    <svg
        ref="root"
        viewBox="0 40 740 474"
        :role="title ? 'img' : undefined"
        :aria-hidden="title ? undefined : 'true'"
        focusable="false"
        :class="[
            'doorstep-scene block h-auto',
            { 'doorstep-scene--paused': !inView },
        ]"
    >
        <title v-if="title">{{ title }}</title>
        <defs>
            <linearGradient
                :id="fadeId"
                gradientUnits="userSpaceOnUse"
                x1="0"
                y1="0"
                x2="740"
                y2="0"
            >
                <stop offset="0" stop-color="#000000" />
                <stop offset="0.12" stop-color="#FFFFFF" />
                <stop offset="0.97" stop-color="#FFFFFF" />
                <stop offset="1" stop-color="#000000" />
            </linearGradient>
            <mask
                :id="maskId"
                maskUnits="userSpaceOnUse"
                x="0"
                y="0"
                width="740"
                height="520"
            >
                <rect width="740" height="520" :fill="`url(#${fadeId})`" />
            </mask>
            <!-- the van drives off into the right edge rather than
                 turning see-through over the house -->
            <linearGradient
                :id="exitFadeId"
                gradientUnits="userSpaceOnUse"
                x1="0"
                y1="0"
                x2="740"
                y2="0"
            >
                <stop offset="0" stop-color="#FFFFFF" />
                <stop offset="0.8" stop-color="#FFFFFF" />
                <stop offset="1" stop-color="#000000" />
            </linearGradient>
            <mask
                :id="exitMaskId"
                maskUnits="userSpaceOnUse"
                x="-460"
                y="0"
                width="1200"
                height="520"
            >
                <rect
                    x="-460"
                    width="1200"
                    height="520"
                    :fill="`url(#${exitFadeId})`"
                />
            </mask>
        </defs>

        <!-- the terrace row carries on either side, fading out -->
        <g :mask="`url(#${maskId})`">
            <g :transform="houseTransform(-138.4)">
                <TerraceHouseArt muted :compact="compact" />
            </g>
            <g :transform="houseTransform(662.4)">
                <TerraceHouseArt muted :compact="compact" />
            </g>
        </g>

        <!-- No. 12: gate slid fully open, a plain porch wall behind the
             gateway, the open door at the right -->
        <g :transform="houseTransform(262)">
            <TerraceHouseArt number="12" :compact="compact" />
        </g>

        <!-- pavement, kerb and road -->
        <g :mask="`url(#${maskId})`">
            <rect x="0" y="440" width="740" height="22" fill="#E6E8EC" />
            <path
                v-if="!compact"
                :d="pavementJoints"
                stroke="#D9DCE1"
                stroke-width="1.5"
            />
            <rect x="0" y="462" width="740" height="7" fill="#CDD2D9" />
            <rect x="0" y="469" width="740" height="45" fill="#DDE1E6" />
            <path
                :d="laneMarks"
                stroke="#F4F5F7"
                stroke-width="3"
                stroke-linecap="round"
            />
        </g>

        <!-- street tree on the verge in front of the neighbour: grass,
             forked trunk, then the canopy in three tones -->
        <rect x="686" y="444.5" width="36" height="8" rx="3" fill="#A4CBAE" />
        <rect
            x="686"
            y="449"
            width="36"
            height="3.5"
            rx="1.75"
            fill="#8DBD9A"
        />
        <path d="M699 450L701.5 312H706.5L709 450Z" fill="#7A5A45" />
        <path d="M704.5 450L704.5 312H706.5L709 450Z" fill="#634836" />
        <path
            d="M703 350L691 310M705 342L718 306"
            stroke="#7A5A45"
            stroke-width="4"
            stroke-linecap="round"
        />
        <circle
            v-for="lobe in treeLobes"
            :key="`shade-${lobe.cx}`"
            :cx="lobe.cx"
            :cy="lobe.cy"
            :r="lobe.r"
            fill="#2F7447"
        />
        <circle
            v-for="lobe in treeLobes"
            :key="`leaf-${lobe.cx}`"
            :cx="lobe.cx - 3"
            :cy="lobe.cy - 4"
            :r="lobe.r - 3"
            fill="#3F8C58"
        />
        <template v-for="lobe in treeLobes" :key="`light-${lobe.cx}`">
            <template v-if="lobe.lit">
                <circle
                    :cx="lobe.cx - lobe.r * 0.28"
                    :cy="lobe.cy - lobe.r * 0.32"
                    :r="lobe.r * 0.52"
                    fill="#55A26D"
                />
                <circle
                    :cx="lobe.cx - lobe.r * 0.19"
                    :cy="lobe.cy - lobe.r * 0.22"
                    :r="lobe.r * 0.52"
                    fill="#3F8C58"
                />
            </template>
        </template>

        <!-- the van, parked at the kerb; hub caps turn with the wheels -->
        <g :mask="`url(#${exitMaskId})`">
            <g class="doorstep-scene__van">
                <ellipse
                    cx="160"
                    cy="497"
                    rx="152"
                    ry="4.5"
                    fill="#16181D"
                    opacity="0.14"
                />
                <g class="doorstep-scene__van-body">
                    <g transform="translate(-78 193.6) scale(0.56)">
                        <VanArt :compact="compact" />
                        <g
                            v-for="cx in wheelCentres"
                            :key="`hub-${cx}`"
                            :transform="`translate(${cx} 496)`"
                        >
                            <g class="doorstep-scene__wheel">
                                <!-- keeps the turn centred on the axle -->
                                <circle r="24" fill="none" />
                                <rect
                                    v-for="angle in spokeAngles"
                                    :key="`slot-${angle}`"
                                    x="-3"
                                    y="-23"
                                    width="6"
                                    height="8"
                                    rx="3"
                                    fill="#A3AAB5"
                                    :transform="`rotate(${angle})`"
                                />
                                <circle
                                    v-for="angle in spokeAngles"
                                    :key="`nut-${angle}`"
                                    cx="0"
                                    cy="-10.5"
                                    r="2.2"
                                    fill="#B9C0CA"
                                    :transform="`rotate(${angle + 36})`"
                                />
                            </g>
                        </g>
                    </g>
                </g>
            </g>
        </g>

        <!-- the courier, carrying the parcel to the gate -->
        <g transform="translate(422 460)">
            <g class="doorstep-scene__courier">
                <ellipse
                    cx="3"
                    cy="0"
                    rx="22"
                    ry="3"
                    fill="#16181D"
                    opacity="0.14"
                />
                <g class="doorstep-scene__courier-step">
                    <g transform="scale(1.22)">
                        <g class="doorstep-scene__parcel">
                            <g transform="translate(20 -76) scale(0.48)">
                                <ParcelArt :label="!compact" />
                            </g>
                        </g>
                        <CourierArt :compact="compact" />
                    </g>
                </g>
            </g>
        </g>

        <!-- the customer, out of his door to take it -->
        <g transform="translate(532 448)">
            <g class="doorstep-scene__receiver">
                <ellipse
                    cx="-4"
                    cy="0"
                    rx="21"
                    ry="3"
                    fill="#16181D"
                    opacity="0.14"
                />
                <g class="doorstep-scene__receiver-step">
                    <g transform="scale(-1.22 1.22)">
                        <ReceiverArt />
                    </g>
                </g>
            </g>
        </g>

        <!-- Delivered, confirmed by the system: a green tick seal pops up
             over the parcel, now in his hands, and a soft ring spreads out
             from it. Not tied to either person. -->
        <g :transform="`translate(487 ${seal.y})`">
            <circle
                class="doorstep-scene__seal-ring"
                :r="seal.radius"
                fill="#146C34"
                fill-opacity="0.08"
                stroke="#1F8A45"
                :stroke-width="seal.ringWidth"
            />
            <g class="doorstep-scene__seal">
                <path
                    :d="seal.outline"
                    transform="translate(0 2.2)"
                    fill="#16181D"
                    opacity="0.14"
                />
                <path :d="seal.outline" fill="#146C34" />
                <circle
                    :r="seal.radius * 0.68"
                    fill="none"
                    stroke="#FFFFFF"
                    stroke-opacity="0.35"
                    stroke-width="1.2"
                />
                <path
                    :d="seal.tick"
                    fill="none"
                    stroke="#FFFFFF"
                    :stroke-width="seal.tickWidth"
                    stroke-linecap="round"
                    stroke-linejoin="round"
                />
            </g>
        </g>

        <!-- ...and the order's status turns to Delivered: the site's green
             status chip with the time, floating over the roof like an app
             notice. No tail, nowhere near a head: nobody is saying it.
             Laid out from the measured lettering (statusChip), with equal
             padding at both ends. -->
        <g transform="translate(487 100)">
            <g class="doorstep-scene__status">
                <rect
                    :x="chip.x"
                    :y="chip.y + 3"
                    :width="chip.width"
                    :height="chip.height"
                    :rx="chip.corner"
                    fill="#16181D"
                    opacity="0.12"
                />
                <rect
                    :x="chip.x"
                    :y="chip.y"
                    :width="chip.width"
                    :height="chip.height"
                    :rx="chip.corner"
                    fill="#E6F4EB"
                    stroke="#FFFFFF"
                    :stroke-width="chip.border"
                />
                <g :transform="`translate(${chip.iconX} 0)`">
                    <circle :r="chip.iconRadius" fill="#146C34" />
                    <path
                        :d="chip.tick"
                        fill="none"
                        stroke="#FFFFFF"
                        :stroke-width="chip.tickWidth"
                        stroke-linecap="round"
                        stroke-linejoin="round"
                    />
                </g>
                <text
                    :x="chip.labelX"
                    :y="chip.labelY"
                    text-anchor="middle"
                    :font-family="font"
                    :font-size="chip.labelSize"
                    font-weight="800"
                    fill="#146C34"
                >
                    Delivered
                </text>
                <circle
                    :cx="chip.dotX"
                    :cy="chip.dotY"
                    :r="chip.dotRadius"
                    fill="#146C34"
                    opacity="0.55"
                />
                <text
                    :x="chip.timeX"
                    :y="chip.timeY"
                    text-anchor="middle"
                    :font-family="mono"
                    :font-size="chip.timeSize"
                    font-weight="600"
                    fill="#146C34"
                >
                    11:42
                </text>
            </g>
        </g>
    </svg>
</template>

<style scoped>
/*
 * The delivery story. Every moving part shares one 11 s loop; the keyframe
 * percentages are the script:
 *
 *    0-16   the van drives in from the left, wheels turning, and stops
 *   16-21   it settles on its springs
 *   19-37   the courier steps out by the bonnet and walks to the gate
 *   29-43   the customer comes out of his door and walks to meet her
 *   42-52   he reaches out and the parcel passes into his hands
 *   51-55   she lowers her arms
 *   53-58   the Delivered seal pops up over the parcel
 *   54-63   a soft ring spreads out from it and fades
 *   56-60   the Delivered status chip drops in over the roof
 *   60-82   hold
 *   82-87   the people, the seal and the status fade
 *   86-97   the van pulls away out of the picture; the street is empty
 *
 * Resting styles (outside the motion query) are the final frame, so reduced
 * motion shows the handover done with the seal and the status showing (the
 * ring stays hidden), without movement. Transforms and opacity only.
 */
.doorstep-scene {
    --doorstep-scene-play: running;
}

.doorstep-scene--paused {
    --doorstep-scene-play: paused;
}

.doorstep-scene__van,
.doorstep-scene__van-body,
.doorstep-scene__courier,
.doorstep-scene__courier-step,
.doorstep-scene__receiver,
.doorstep-scene__receiver-step {
    transform-box: fill-box;
    transform-origin: 50% 100%;
}

.doorstep-scene__wheel,
.doorstep-scene__seal,
.doorstep-scene__seal-ring,
.doorstep-scene__status {
    transform-box: fill-box;
    transform-origin: 50% 50%;
}

/* The ring only shows while it spreads out, so it rests hidden. */
.doorstep-scene__seal-ring {
    opacity: 0;
}

/* Handed over: resting in the customer's hands (10, -4 in the scene). */
.doorstep-scene__parcel {
    transform-box: fill-box;
    transform-origin: 50% 50%;
    transform: translate(8.2px, -3.28px);
}

/* Limbs turn at the hip, shoulder or elbow (see the art components). */
.doorstep-scene :deep(.courier-art__arm),
.doorstep-scene :deep(.courier-art__leg),
.doorstep-scene :deep(.receiver-art__arm),
.doorstep-scene :deep(.receiver-art__leg) {
    transform-box: fill-box;
}

/* Her hands are empty now: the near arm hangs, the far one is hidden. */
.doorstep-scene :deep(.courier-art__arm--near) {
    transform-origin: 0 0;
    transform: rotate(32deg);
}

.doorstep-scene :deep(.courier-art__arm--far) {
    transform-origin: 0 65%;
    transform: rotate(80deg);
    opacity: 0;
}

.doorstep-scene :deep(.courier-art__leg--far) {
    transform-origin: 37% 0;
}

.doorstep-scene :deep(.courier-art__leg--near) {
    transform-origin: 38% 0;
}

.doorstep-scene :deep(.receiver-art__arm) {
    transform-origin: 0 0;
}

.doorstep-scene :deep(.receiver-art__leg--far) {
    transform-origin: 35% 0;
}

.doorstep-scene :deep(.receiver-art__leg--near) {
    transform-origin: 36% 0;
}

@media (prefers-reduced-motion: no-preference) {
    .doorstep-scene__van,
    .doorstep-scene__van-body,
    .doorstep-scene__wheel,
    .doorstep-scene__courier,
    .doorstep-scene__courier-step,
    .doorstep-scene__parcel,
    .doorstep-scene__receiver,
    .doorstep-scene__receiver-step,
    .doorstep-scene__seal,
    .doorstep-scene__seal-ring,
    .doorstep-scene__status,
    .doorstep-scene :deep(.courier-art__arm),
    .doorstep-scene :deep(.courier-art__leg),
    .doorstep-scene :deep(.receiver-art__arm),
    .doorstep-scene :deep(.receiver-art__leg) {
        animation-duration: 11s;
        animation-iteration-count: infinite;
        animation-play-state: var(--doorstep-scene-play);
    }

    .doorstep-scene__van {
        animation-name: doorstep-scene-van;
    }

    .doorstep-scene__wheel {
        animation-name: doorstep-scene-wheel;
    }

    .doorstep-scene__van-body {
        animation-name: doorstep-scene-van-settle;
    }

    .doorstep-scene__courier {
        animation-name: doorstep-scene-courier;
    }

    .doorstep-scene__courier-step {
        animation-name: doorstep-scene-courier-step;
    }

    .doorstep-scene :deep(.courier-art__leg--near) {
        animation-name: doorstep-scene-courier-leg-near;
    }

    .doorstep-scene :deep(.courier-art__leg--far) {
        animation-name: doorstep-scene-courier-leg-far;
    }

    .doorstep-scene :deep(.courier-art__arm--near) {
        animation-name: doorstep-scene-courier-arm-near;
    }

    .doorstep-scene :deep(.courier-art__arm--far) {
        animation-name: doorstep-scene-courier-arm-far;
    }

    .doorstep-scene__parcel {
        animation-name: doorstep-scene-parcel;
    }

    .doorstep-scene__receiver {
        animation-name: doorstep-scene-receiver;
    }

    .doorstep-scene__receiver-step {
        animation-name: doorstep-scene-receiver-step;
    }

    .doorstep-scene :deep(.receiver-art__leg--near) {
        animation-name: doorstep-scene-receiver-leg-near;
    }

    .doorstep-scene :deep(.receiver-art__leg--far) {
        animation-name: doorstep-scene-receiver-leg-far;
    }

    .doorstep-scene :deep(.receiver-art__arm--near) {
        animation-name: doorstep-scene-receiver-arm-near;
    }

    .doorstep-scene :deep(.receiver-art__arm--far) {
        animation-name: doorstep-scene-receiver-arm-far;
    }

    .doorstep-scene__seal {
        animation-name: doorstep-scene-seal;
    }

    .doorstep-scene__seal-ring {
        animation-name: doorstep-scene-seal-ring;
    }

    .doorstep-scene__status {
        animation-name: doorstep-scene-status;
    }
}

/* The van: in from the left (easing out), then away to the right (easing
   in), solid all the way: it leaves through the soft right edge of the
   picture (the exit mask) instead of fading over the house. The wheels
   turn the distance over the tyre radius, same easing. */
@keyframes doorstep-scene-van {
    0% {
        transform: translateX(-440px);
        opacity: 0;
        animation-timing-function: cubic-bezier(0.22, 0.61, 0.36, 1);
    }

    3% {
        opacity: 1;
    }

    16% {
        transform: translateX(0);
    }

    86% {
        transform: translateX(0);
        opacity: 1;
        animation-timing-function: cubic-bezier(0.55, 0, 0.9, 0.5);
    }

    97%,
    100% {
        transform: translateX(760px);
        opacity: 1;
    }
}

@keyframes doorstep-scene-wheel {
    0% {
        transform: rotate(-1023deg);
        animation-timing-function: cubic-bezier(0.22, 0.61, 0.36, 1);
    }

    16%,
    86% {
        transform: rotate(0deg);
        animation-timing-function: cubic-bezier(0.55, 0, 0.9, 0.5);
    }

    97%,
    100% {
        transform: rotate(1767deg);
    }
}

@keyframes doorstep-scene-van-settle {
    0%,
    15.5% {
        transform: scaleY(1);
    }

    17.5% {
        transform: scaleY(0.988);
    }

    19.5% {
        transform: scaleY(1.004);
    }

    21.5%,
    100% {
        transform: scaleY(1);
    }
}

/* The courier: out from beside the bonnet, then an even walk to the gate. */
@keyframes doorstep-scene-courier {
    0%,
    19% {
        transform: translate(-98px, 34px);
        opacity: 0;
    }

    22.5% {
        transform: translate(-86px, 34px);
        opacity: 1;
        animation-timing-function: linear;
    }

    37% {
        transform: translate(0, 0);
    }

    82% {
        opacity: 1;
    }

    87%,
    100% {
        transform: translate(0, 0);
        opacity: 0;
    }
}

/* Three strides: the body dips a little as the legs part. */
@keyframes doorstep-scene-courier-step {
    0%,
    22.5%,
    27.3%,
    32.2%,
    37%,
    100% {
        transform: translateY(0);
    }

    24.9%,
    29.8%,
    34.6% {
        transform: translateY(1.3px);
    }
}

@keyframes doorstep-scene-courier-leg-near {
    0%,
    22.5%,
    27.3%,
    32.2%,
    37%,
    100% {
        transform: rotate(0deg);
    }

    24.9%,
    34.6% {
        transform: rotate(-12deg);
    }

    29.8% {
        transform: rotate(12deg);
    }
}

@keyframes doorstep-scene-courier-leg-far {
    0%,
    22.5%,
    27.3%,
    32.2%,
    37%,
    100% {
        transform: rotate(0deg);
    }

    24.9%,
    34.6% {
        transform: rotate(12deg);
    }

    29.8% {
        transform: rotate(-12deg);
    }
}

/* She holds the parcel out until he has it, then lets her arms down. */
@keyframes doorstep-scene-courier-arm-near {
    0%,
    51% {
        transform: rotate(0deg);
    }

    55%,
    100% {
        transform: rotate(32deg);
    }
}

@keyframes doorstep-scene-courier-arm-far {
    0%,
    51% {
        transform: rotate(0deg);
        opacity: 1;
    }

    54%,
    100% {
        transform: rotate(80deg);
        opacity: 0;
    }
}

@keyframes doorstep-scene-parcel {
    0%,
    47% {
        transform: translate(0, 0);
    }

    52%,
    100% {
        transform: translate(8.2px, -3.28px);
    }
}

/* The customer: appears in his doorway, a little further back, and walks
   out to the gate, arms down until he reaches for the parcel. */
@keyframes doorstep-scene-receiver {
    0%,
    29% {
        transform: translate(62px, -10px) scale(0.86);
        opacity: 0;
    }

    32% {
        transform: translate(62px, -8px) scale(0.9);
        opacity: 1;
        animation-timing-function: linear;
    }

    43% {
        transform: translate(0, 0) scale(1);
    }

    82% {
        opacity: 1;
    }

    87%,
    100% {
        transform: translate(0, 0) scale(1);
        opacity: 0;
    }
}

@keyframes doorstep-scene-receiver-step {
    0%,
    32%,
    37.5%,
    43%,
    100% {
        transform: translateY(0);
    }

    34.75%,
    40.25% {
        transform: translateY(1.3px);
    }
}

@keyframes doorstep-scene-receiver-leg-near {
    0%,
    32%,
    37.5%,
    43%,
    100% {
        transform: rotate(0deg);
    }

    34.75% {
        transform: rotate(-11deg);
    }

    40.25% {
        transform: rotate(11deg);
    }
}

@keyframes doorstep-scene-receiver-leg-far {
    0%,
    32%,
    37.5%,
    43%,
    100% {
        transform: rotate(0deg);
    }

    34.75% {
        transform: rotate(11deg);
    }

    40.25% {
        transform: rotate(-11deg);
    }
}

@keyframes doorstep-scene-receiver-arm-near {
    0%,
    42% {
        transform: rotate(32deg);
    }

    46%,
    100% {
        transform: rotate(0deg);
    }
}

@keyframes doorstep-scene-receiver-arm-far {
    0%,
    42% {
        transform: rotate(64deg);
        opacity: 0;
    }

    46%,
    100% {
        transform: rotate(0deg);
        opacity: 1;
    }
}

/* The seal pops up over the parcel as it settles in his hands. */
@keyframes doorstep-scene-seal {
    0%,
    53% {
        transform: scale(0.2);
        opacity: 0;
    }

    55.5% {
        transform: scale(1.14);
        opacity: 1;
    }

    57.5%,
    82% {
        transform: scale(1);
        opacity: 1;
    }

    86%,
    100% {
        transform: scale(0.9);
        opacity: 0;
    }
}

/* One soft ring spreads out from behind it and fades away. */
@keyframes doorstep-scene-seal-ring {
    0%,
    54.5% {
        transform: scale(1);
        opacity: 0;
    }

    55% {
        transform: scale(1);
        opacity: 0.6;
        animation-timing-function: cubic-bezier(0.2, 0.6, 0.35, 1);
    }

    63%,
    100% {
        transform: scale(1.9);
        opacity: 0;
    }
}

/* The status chip drops in over the roof, like a notice arriving. */
@keyframes doorstep-scene-status {
    0%,
    56% {
        transform: translateY(-10px);
        opacity: 0;
        animation-timing-function: cubic-bezier(0.22, 0.61, 0.36, 1);
    }

    59.5%,
    82% {
        transform: translateY(0);
        opacity: 1;
    }

    86%,
    100% {
        transform: translateY(-4px);
        opacity: 0;
    }
}
</style>
