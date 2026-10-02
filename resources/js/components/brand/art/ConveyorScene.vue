<script setup lang="ts">
import { computed, useId } from 'vue';
import ParcelArt from '@/components/brand/art/ParcelArt.vue';
import VanArt from '@/components/brand/art/VanArt.vue';
import { JOURNEY_STAGES } from '@/lib/journey';
import type {
    JourneyStage,
    JourneyStageState,
    JourneyTone,
} from '@/lib/journey';

/**
 * The whole parcel journey on one continuous conveyor (1280 × 238, from
 * y -28 so the tinted station panels have room above their contents): the
 * customer's phone, the branch counter and scale, the Kotak van and the
 * receiver's door, all on a single belt. The stations sit over four
 * equal columns (centres 160, 480, 800, 1120), so text in a four-column
 * grid of the same width lines up under them.
 *
 * Depth follows ParcelArt's oblique projection (24 across for every 14
 * up): the belt has a 16-deep top surface, the counter is a box across
 * the belt and the scale has a platform with depth, so every parcel
 * stands on a surface with its back edge on it. The house stands behind
 * the belt; its parcel waits on a doormat in front of the door.
 *
 * Without states (the "How it works" picture) and with motion allowed,
 * one parcel tours the stations in a 12 s loop and the belt moves with
 * it (see the styles below); with prefers-reduced-motion the static
 * picture shows a parcel between every pair of stations instead. As a
 * progress indicator it stays still apart from a slow chevron chase
 * after the current station. JourneyConveyor pauses all of it while
 * off-screen through the --journey-play custom property.
 *
 * Used by JourneyConveyor; always decorative.
 */
const props = withDefaults(
    defineProps<{
        /** Each station's state; all idle for the plain illustration. */
        states?: Record<JourneyStage, JourneyStageState>;
        tone?: JourneyTone;
    }>(),
    {
        states: () => ({
            order: 'idle',
            counter: 'idle',
            van: 'idle',
            door: 'idle',
        }),
        tone: 'active',
    },
);

const font = 'Plus Jakarta Sans, sans-serif';
const mono = 'JetBrains Mono, monospace';

// Unique per instance: a page can show more than one conveyor.
const id = useId();
const beltClipId = `${id}-belt`;
const tourClipId = `${id}-tour`;

/** The middle of each station's column. */
const centre: Record<JourneyStage, number> = {
    order: 160,
    counter: 480,
    van: 800,
    door: 1120,
};

const legs = [28, 336, 644, 952, 1236];
const legPath = legs.map((x) => `M${x} 188v16`).join('');
const feetPath = legs.map((x) => `M${x - 10} 205h20`).join('');

/** Rollers under the belt, seen end on, every 32 units. */
const rollers = Array.from({ length: 39 }, (_, index) => 16 + index * 32);

/**
 * Ridges across the belt's top surface, every 16 units along the depth
 * direction. They start far enough left to cover the belt however far
 * the tour moves them (592 units, a whole number of ridges).
 */
const slatPath = Array.from(
    { length: 119 },
    (_, index) => `M${-624 + index * 16} 150l27.4-16`,
).join('');

/** Three chevrons on the belt's front after each of the first three stations. */
const chevrons = [309, 629, 949].map((x) =>
    [0, 9, 18].map((step) => `M${x + step} 153.5l3.5 3.5-3.5 3.5`),
);

/** Parcels between the stations in the still "How it works" picture. */
const stillRiders = [289, 642, 951];

/** Where the touring parcel starts: at the phone, just after its parcel. */
const tourStart = 250;

const halo: Record<JourneyTone, string> = {
    active: '#FDECEC',
    issue: '#FFF1DB',
    ended: '#EEF0F3',
    complete: '#E6F4EB',
};

const idle = computed(() =>
    JOURNEY_STAGES.every((stage) => props.states[stage] === 'idle'),
);

const current = computed(
    () =>
        JOURNEY_STAGES.find((stage) => props.states[stage] === 'current') ??
        null,
);

const passed = computed(() =>
    JOURNEY_STAGES.filter((stage) => props.states[stage] === 'done'),
);

/** Half the width of the tinted panel behind the current station. */
const panelHalf = 144;

/**
 * The panel's top and height. The tallest things at the stations (the KT-
 * tag, the parcel on the scale, the "Delivered" pill) all start at about
 * y 10-12, so the panel starts 32 units above them; it ends behind the belt.
 */
const panelTop = -22;
const panelHeight = 168;

/**
 * In the progress view, while the journey runs normally, one parcel rides
 * on from the current station, just clear of the panel's edge.
 */
const movingOn = computed<number | null>(() => {
    const stage = current.value;

    if (idle.value || props.tone !== 'active' || !stage || stage === 'door') {
        return null;
    }

    return centre[stage] + panelHalf + 8;
});

/** The chevrons after that station flow gently (index into `chevrons`). */
const chasing = computed(() => {
    const stage = current.value;

    return movingOn.value !== null && stage
        ? JOURNEY_STAGES.indexOf(stage)
        : -1;
});

type Lettering = {
    text: string;
    /** The advance width: what text-anchor="middle" centres. */
    advance: number;
    /** The width of the letters' ink. */
    ink: number;
    /** How far the middle of the ink sits right of the advance's middle. */
    shift: number;
};

/**
 * The scene's lettering as the site's own font files draw it (Bold, with
 * kerning), in scene units at the size each label is set. Every label is
 * anchored at its middle so that the middle of its ink lands where it
 * should, with the same padding at both ends of its pill or panel, and
 * gets its advance as textLength: the browser then sets it exactly this
 * wide, whatever its hinting does to letter widths at small sizes (which
 * otherwise widens a word and eats the padding at one end of a pill).
 * The words go in with v-text, so no template whitespace around them
 * counts towards that length.
 */
const lettering = {
    /** JetBrains Mono 11.5. */
    tag: { text: 'KT-7Q4M92XD', advance: 75.9, ink: 74.28, shift: 0.06 },
    /** Plus Jakarta Sans 12. */
    counter: {
        text: 'Drop-off counter',
        advance: 101.98,
        ink: 100.98,
        shift: 0.37,
    },
    /** JetBrains Mono 7. */
    readout: { text: '6.0 kg', advance: 25.2, ink: 24.28, shift: -0.08 },
    /** Plus Jakarta Sans 9. */
    houseNumber: { text: '12', advance: 9, ink: 8.28, shift: -0.1 },
    /** Plus Jakarta Sans 11.5. */
    delivered: { text: 'Delivered', advance: 53.84, ink: 52.31, shift: 0.06 },
} satisfies Record<string, Lettering>;

const round = (value: number) => Math.round(value * 100) / 100;

/** The x to anchor a label at so the middle of its ink is at `middle`. */
function anchorFor(label: Lettering, middle: number): number {
    return round(middle - label.shift);
}

/**
 * The counter's front (396-564): the mark (21 across at 0.64, so 13.44), a
 * gap of 7 and "Drop-off counter", centred as one group, 23.29 in from
 * either end.
 */
const counterMark = 21 * 0.64;
const counterGap = 7;
const counterStart =
    480 - (counterMark + counterGap + lettering.counter.ink) / 2;
const counterMarkX = round(counterStart - 5.5 * 0.64);
const counterWordX = anchorFor(
    lettering.counter,
    counterStart + counterMark + counterGap + lettering.counter.ink / 2,
);

/**
 * The "Delivered" pill over the door: the tick and the word as one group,
 * centred on the door's column, with the same 12 from the pill's left end
 * to the tick as from the word's last letter to its right end.
 */
const deliveredPadding = 12;
const deliveredTick = 7;
const deliveredGap = 6;
const deliveredWidth =
    deliveredPadding * 2 +
    deliveredTick * 2 +
    deliveredGap +
    lettering.delivered.ink;
const deliveredX = round(centre.door - deliveredWidth / 2);
const deliveredTickX = round(
    centre.door - deliveredWidth / 2 + deliveredPadding + deliveredTick,
);
const deliveredWordX = anchorFor(
    lettering.delivered,
    centre.door +
        deliveredWidth / 2 -
        deliveredPadding -
        lettering.delivered.ink / 2,
);

/** The "Delivered" pill: on the plain picture, and once it is true. */
const showDelivered = computed(
    () => idle.value || (current.value === 'door' && props.tone === 'complete'),
);

const tickColour = computed(() =>
    props.tone === 'complete' ? '#146C34' : '#D0161E',
);

/** Stations the parcel has not reached yet are faded. */
function opacity(stage: JourneyStage): number | undefined {
    return props.states[stage] === 'upcoming' ? 0.4 : undefined;
}
</script>

<template>
    <svg
        viewBox="0 -28 1280 238"
        aria-hidden="true"
        focusable="false"
        class="conveyor-scene block h-auto w-full"
    >
        <defs>
            <clipPath :id="beltClipId">
                <path d="M0 150H1252L1279.4 134H27.4Z" />
            </clipPath>
            <!-- the touring parcel is out of sight inside the counter and the van -->
            <clipPath :id="tourClipId" clipPathUnits="userSpaceOnUse">
                <rect x="-20" y="-40" width="416" height="260" />
                <rect x="565.7" y="-40" width="161.3" height="260" />
                <rect x="913.3" y="-40" width="400" height="260" />
            </clipPath>
        </defs>

        <!-- the current station sits on a tinted panel -->
        <rect
            v-if="current"
            :x="centre[current] - panelHalf"
            :y="panelTop"
            :width="panelHalf * 2"
            :height="panelHeight"
            rx="22"
            :fill="halo[tone]"
        />

        <!-- the tour lights each station while the parcel is there -->
        <g v-if="idle" class="hidden motion-safe:inline">
            <rect
                v-for="(stage, index) in JOURNEY_STAGES"
                :key="`halo-${stage}`"
                :class="[
                    'conveyor-scene__halo',
                    `conveyor-scene__halo--${index + 1}`,
                ]"
                :x="centre[stage] - panelHalf"
                :y="panelTop"
                :width="panelHalf * 2"
                :height="panelHeight"
                rx="22"
                :fill="halo.active"
            />
        </g>

        <!-- conveyor frame: legs and feet, base rail, rollers -->
        <path :d="legPath" stroke="#3D4350" stroke-width="8" />
        <path
            :d="feetPath"
            stroke="#3D4350"
            stroke-width="4"
            stroke-linecap="round"
        />
        <rect y="182" width="1252" height="6" rx="3" fill="#3D4350" />
        <g
            v-for="x in rollers"
            :key="`roller-${x}`"
            :class="{ 'conveyor-scene__roller--tour': idle }"
        >
            <circle :cx="x" cy="173" r="7" fill="#C9CED6" />
            <path :d="`M${x - 6} 173h12`" stroke="#A9B0BC" stroke-width="1.6" />
            <circle :cx="x" cy="173" r="2.5" fill="#555C69" />
        </g>

        <!-- one belt end to end: front, ridged top surface, right end -->
        <rect y="149" width="1252" height="15" fill="#2A2E36" />
        <rect y="150" width="1252" height="1.5" fill="#4A505C" />
        <path d="M0 150H1252L1279.4 134H27.4Z" fill="#3D4350" />
        <g :clip-path="`url(#${beltClipId})`">
            <path
                :d="slatPath"
                :class="{ 'conveyor-scene__slats--tour': idle }"
                stroke="#4A505C"
                stroke-width="1.5"
            />
        </g>
        <path d="M1252 150 1279.4 134V148L1252 164Z" fill="#1F2228" />
        <template v-for="(group, g) in chevrons" :key="`chevrons-${g}`">
            <path
                v-for="(d, index) in group"
                :key="d"
                :d="d"
                :class="
                    g === chasing
                        ? [
                              'conveyor-scene__chevron',
                              `conveyor-scene__chevron--${index + 1}`,
                          ]
                        : undefined
                "
                fill="none"
                stroke="#8C93A0"
                stroke-width="2"
                stroke-linecap="round"
                stroke-linejoin="round"
            />
        </template>

        <!-- 1. Order created online: the phone, its KT- number, the taped parcel -->
        <g :opacity="opacity('order')">
            <!-- the number's ink (74.28 across) sits 18.86 in from either end of the tag (44-156) -->
            <g v-if="idle" class="conveyor-scene__tag">
                <path
                    d="M58 12H142A14 14 0 0 1 142 40H104L96 48 94 40H58A14 14 0 0 1 58 12Z"
                    fill="#FFFFFF"
                    stroke="#C9CED6"
                    stroke-width="1.5"
                    stroke-linejoin="round"
                />
                <text
                    :x="anchorFor(lettering.tag, 100)"
                    y="30.2"
                    text-anchor="middle"
                    :textLength="lettering.tag.advance"
                    :font-family="mono"
                    font-size="11.5"
                    font-weight="700"
                    fill="#D0161E"
                    v-text="lettering.tag.text"
                />
            </g>
            <rect x="76" y="54" width="48" height="88" rx="9" fill="#16181D" />
            <rect x="80" y="60" width="40" height="76" rx="5" fill="#FFFFFF" />
            <rect x="80" y="60" width="40" height="14" rx="5" fill="#D0161E" />
            <rect x="80" y="68" width="40" height="6" fill="#D0161E" />
            <rect x="93" y="56" width="14" height="2" rx="1" fill="#3D4350" />
            <rect x="85" y="81" width="30" height="6" rx="2" fill="#F4B7BA" />
            <rect x="85" y="92" width="30" height="6" rx="2" fill="#F4B7BA" />
            <rect x="85" y="103" width="20" height="6" rx="2" fill="#F4B7BA" />
            <rect x="85" y="120" width="30" height="9" rx="3" fill="#D0161E" />
            <g transform="translate(132 89)">
                <ParcelArt />
            </g>
        </g>

        <!-- 2. Branch counter across the belt; its scale reads 6.0 kg, with a receipt -->
        <g :opacity="opacity('counter')">
            <!-- like the parcels: faces on one silhouette, so no seams show -->
            <path d="M396 99H564L591.4 83V134L564 150H396Z" fill="#A8111A" />
            <rect x="396" y="99" width="168" height="51" fill="#D0161E" />
            <!-- where the belt comes out of the counter -->
            <path d="M564 150 579.4 141V109L564 118Z" fill="#7C0D13" />
            <path d="M386 88 413.4 72H601.4V84L574 100H386Z" fill="#A8111A" />
            <path d="M386 88 413.4 72H601.4L574 88Z" fill="#E4474D" />
            <path d="M574 88 601.4 72V84L574 100Z" fill="#7C0D13" />
            <!--
                the mark and the words centred on the front as one group
                (see counterStart), and on its visible height (100-150)
            -->
            <g :transform="`translate(${counterMarkX} 114.76) scale(0.64)`">
                <path
                    d="M16 5.5 26.5 10.75v10.5L16 26.5 5.5 21.25v-10.5Z"
                    fill="#FFFFFF"
                />
                <path
                    d="M5.5 10.75 16 16l10.5-5.25M16 16v10.5"
                    fill="none"
                    stroke="#D0161E"
                    stroke-width="1.8"
                    stroke-linejoin="round"
                />
                <path
                    d="M10.75 8.13 21.25 13.38V18.6"
                    fill="none"
                    stroke="#D0161E"
                    stroke-width="2.6"
                    stroke-linejoin="round"
                />
            </g>
            <text
                :x="counterWordX"
                y="129.47"
                text-anchor="middle"
                :textLength="lettering.counter.advance"
                :font-family="font"
                font-size="12"
                font-weight="700"
                fill="#FFFFFF"
                v-text="lettering.counter.text"
            />

            <!-- the scale: base and display, stem, platform with depth -->
            <path d="M456 83 461 68H515L520 83Z" fill="#3D4350" />
            <!--
                the readout's ink (24.28 across) sits 3.86 in from either end
                of the display, its capitals 2.4 from the top and the bottom
            -->
            <rect
                x="472"
                y="70.5"
                width="32"
                height="10"
                rx="2"
                fill="#16181D"
            />
            <text
                :x="anchorFor(lettering.readout, 488)"
                y="78.06"
                text-anchor="middle"
                :textLength="lettering.readout.advance"
                :font-family="mono"
                font-size="7"
                font-weight="700"
                fill="#FFC53D"
                v-text="lettering.readout.text"
            />
            <rect x="484" y="62" width="8" height="6" fill="#555C69" />
            <path
                d="M448 56 462.9 47.3H542.9V53.3L528 62H448Z"
                fill="#8C93A0"
            />
            <path d="M448 56 462.9 47.3H542.9L528 56Z" fill="#C9CED6" />
            <path d="M528 56 542.9 47.3V53.3L528 62Z" fill="#6B7280" />
            <g transform="translate(463.2 18.8) scale(0.62)">
                <ParcelArt />
            </g>

            <path
                d="M548 56H572V84L568 81 564 84 560 81 556 84 552 81 548 84Z"
                fill="#FFFFFF"
                stroke="#C9CED6"
            />
            <rect x="552" y="61" width="16" height="2" fill="#8C93A0" />
            <rect x="552" y="66" width="11" height="2" fill="#C9CED6" />
            <rect x="552" y="71" width="16" height="2" fill="#C9CED6" />
        </g>

        <!-- 3. The Kotak van on its way, with speed lines -->
        <g :opacity="opacity('van')">
            <path
                :class="{ 'conveyor-scene__speed--tour': idle }"
                d="M696 90H716M688 102H716M700 114H716"
                stroke="#F4B7BA"
                stroke-width="3"
                stroke-linecap="round"
            />
            <g :class="{ 'conveyor-scene__van--tour': idle }">
                <g transform="translate(676 -33.6) scale(0.34)">
                    <VanArt compact />
                </g>
            </g>
        </g>

        <!-- 4. The receiver's door, house number 12, the parcel on the doormat -->
        <g :opacity="opacity('door')">
            <rect
                x="1046"
                y="76"
                width="148"
                height="60"
                fill="#FFFFFF"
                stroke="#D5D9DF"
                stroke-width="2"
            />
            <path d="M1034 78 1120 46 1206 78Z" fill="#F4B7BA" />
            <rect
                x="1058"
                y="90"
                width="24"
                height="26"
                rx="3"
                fill="#D5DCE5"
            />
            <path
                d="M1070 90V116M1058 103H1082"
                stroke="#FFFFFF"
                stroke-width="2"
            />
            <rect x="1092" y="84" width="48" height="52" fill="#F4B7BA" />
            <rect
                x="1096"
                y="88"
                width="40"
                height="48"
                rx="2"
                fill="#2A2E36"
            />
            <rect
                x="1102"
                y="94"
                width="28"
                height="15"
                rx="2"
                fill="#3D4350"
            />
            <rect
                x="1102"
                y="114"
                width="28"
                height="16"
                rx="2"
                fill="#3D4350"
            />
            <circle cx="1131" cy="112" r="2.5" fill="#FFC53D" />
            <rect
                x="1150"
                y="88"
                width="22"
                height="14"
                rx="3"
                fill="#D0161E"
            />
            <!-- the number's ink (8.28 across) sits 6.86 in from either end of its plate -->
            <text
                :x="anchorFor(lettering.houseNumber, 1161)"
                y="98.35"
                text-anchor="middle"
                :textLength="lettering.houseNumber.advance"
                :font-family="font"
                font-size="9"
                font-weight="700"
                fill="#FFFFFF"
                v-text="lettering.houseNumber.text"
            />
            <path d="M1082 149.5H1150L1165.4 140.5H1097.4Z" fill="#F4B7BA" />
            <path d="M1082 149.5H1150" stroke="#E4474D" stroke-width="1.5" />
            <g
                :class="{ 'motion-safe:hidden': idle }"
                transform="translate(1092 123.8) scale(0.42)"
            >
                <ParcelArt :label="false" />
            </g>
        </g>

        <!-- parcels riding the belt to the next station -->
        <g v-if="idle" class="motion-safe:hidden">
            <g
                v-for="x in stillRiders"
                :key="`rider-${x}`"
                :transform="`translate(${x} 123.8) scale(0.42)`"
            >
                <ParcelArt :label="false" />
            </g>
        </g>
        <g
            v-if="movingOn !== null"
            :transform="`translate(${movingOn} 123.8) scale(0.42)`"
        >
            <ParcelArt :label="false" />
        </g>

        <!-- the touring parcel (motion allowed only) -->
        <g
            v-if="idle"
            class="hidden motion-safe:inline"
            :clip-path="`url(#${tourClipId})`"
        >
            <g class="conveyor-scene__rider">
                <g :transform="`translate(${tourStart} 123.8) scale(0.42)`">
                    <ParcelArt :label="false" />
                </g>
            </g>
        </g>

        <!-- delivered, on the plain picture and once it is true -->
        <g
            v-if="showDelivered"
            :class="{ 'conveyor-scene__delivered--tour': idle }"
        >
            <rect
                :x="deliveredX"
                y="12"
                :width="deliveredWidth"
                height="28"
                rx="14"
                fill="#FFFFFF"
                stroke="#C9CED6"
                stroke-width="1.5"
            />
            <circle
                :cx="deliveredTickX"
                cy="26"
                :r="deliveredTick"
                fill="#146C34"
            />
            <path
                :d="`M${deliveredTickX - 3.1} 25.9l2.2 2.2 4-4.2`"
                fill="none"
                stroke="#FFFFFF"
                stroke-width="2"
                stroke-linecap="round"
                stroke-linejoin="round"
            />
            <text
                :x="deliveredWordX"
                y="30.28"
                text-anchor="middle"
                :textLength="lettering.delivered.advance"
                :font-family="font"
                font-size="11.5"
                font-weight="700"
                fill="#146C34"
                v-text="lettering.delivered.text"
            />
        </g>

        <!-- a tick on stations the parcel has passed -->
        <g v-for="stage in passed" :key="`tick-${stage}`">
            <circle
                :cx="centre[stage] + 118"
                cy="30"
                r="14"
                :fill="tickColour"
            />
            <path
                :d="`M${centre[stage] + 111.5} 30l4.5 4.5 8.5-9`"
                fill="none"
                stroke="#FFFFFF"
                stroke-width="3.2"
                stroke-linecap="round"
                stroke-linejoin="round"
            />
        </g>
    </svg>
</template>

<style scoped>
/*
 * The tour: one 12 s loop, shared by every piece below and by the step
 * highlights in JourneyConveyor (same windows as the halos here).
 *
 *   0-12%   the parcel waits at the phone (station 1 lit)
 *  12-17%   rides 94 to the counter
 *  17-31%   waits at the counter (station 2 lit until it leaves the counter)
 *  31-48%   rides 331, through the counter, to the back of the van
 *  48-58%   waits at the van (station 3 lit until it is unloaded)
 *  58-62%   lifted into the van, out of sight
 *  62-70%   the van rumbles, speed lines streaming
 *  70-72%   dropped back on the belt past the van's nose
 *  72-81%   rides 167 to the doormat
 *  81-94%   waits at the door; "Delivered" (station 4 lit)
 *  94-100%  fades out, and a new parcel drops in at the phone
 *
 * The belt's ridges and rollers move only while the parcel rides, with
 * the same keyframes and easing, so they stay in step. The 592 units of
 * travel are 37 ridges and the rollers turn 2160deg (12 half turns, slower
 * than true rolling so they read calmly rather than as a blur), so
 * the loop restarts without a jump.
 */
.conveyor-scene__rider,
.conveyor-scene__roller--tour,
.conveyor-scene__van--tour,
.conveyor-scene__delivered--tour,
.conveyor-scene__tag {
    transform-box: fill-box;
    transform-origin: center;
}

@media (prefers-reduced-motion: no-preference) {
    .conveyor-scene__rider,
    .conveyor-scene__slats--tour,
    .conveyor-scene__roller--tour,
    .conveyor-scene__halo,
    .conveyor-scene__speed--tour,
    .conveyor-scene__van--tour,
    .conveyor-scene__delivered--tour,
    .conveyor-scene__tag {
        animation-duration: 12s;
        animation-timing-function: linear;
        animation-iteration-count: infinite;
        animation-fill-mode: both;
        animation-play-state: var(--journey-play, running);
    }

    .conveyor-scene__rider {
        animation-name: conveyor-scene-ride;
    }

    .conveyor-scene__slats--tour {
        animation-name: conveyor-scene-belt;
    }

    .conveyor-scene__roller--tour {
        animation-name: conveyor-scene-roll;
    }

    .conveyor-scene__halo--1 {
        animation-name: conveyor-scene-lit-1;
    }

    .conveyor-scene__halo--2 {
        animation-name: conveyor-scene-lit-2;
    }

    .conveyor-scene__halo--3 {
        animation-name: conveyor-scene-lit-3;
    }

    .conveyor-scene__halo--4 {
        animation-name: conveyor-scene-lit-4;
    }

    .conveyor-scene__speed--tour {
        animation-name: conveyor-scene-speed;
    }

    .conveyor-scene__van--tour {
        animation-name: conveyor-scene-rumble;
    }

    .conveyor-scene__delivered--tour {
        animation-name: conveyor-scene-delivered;
    }

    .conveyor-scene__tag {
        animation-name: conveyor-scene-tag;
    }

    /* Progress view: the chevrons after the current station flow slowly. */
    .conveyor-scene__chevron {
        animation: conveyor-scene-chase 2.4s linear infinite both;
        animation-play-state: var(--journey-play, running);
    }

    .conveyor-scene__chevron--2 {
        animation-delay: 0.4s;
    }

    .conveyor-scene__chevron--3 {
        animation-delay: 0.8s;
    }
}

@keyframes conveyor-scene-ride {
    0% {
        transform: translate(0, 0);
        opacity: 1;
    }
    12% {
        transform: translate(0, 0);
        animation-timing-function: cubic-bezier(0.45, 0, 0.3, 1);
    }
    17% {
        transform: translate(94px, 0);
    }
    31% {
        transform: translate(94px, 0);
        animation-timing-function: cubic-bezier(0.45, 0, 0.3, 1);
    }
    48% {
        transform: translate(425px, 0);
    }
    58% {
        transform: translate(425px, 0);
        animation-timing-function: ease-out;
    }
    59.5% {
        transform: translate(429px, -20px);
        animation-timing-function: ease-in;
    }
    61.5% {
        transform: translate(493px, -20px);
        opacity: 1;
    }
    62% {
        transform: translate(493px, -20px);
        opacity: 0;
    }
    69.9% {
        transform: translate(675px, -12px);
        opacity: 0;
        animation-timing-function: ease-out;
    }
    72% {
        transform: translate(675px, 0);
        opacity: 1;
        animation-timing-function: cubic-bezier(0.45, 0, 0.3, 1);
    }
    81% {
        transform: translate(842px, 0);
    }
    94% {
        transform: translate(842px, 0);
        opacity: 1;
    }
    96% {
        transform: translate(842px, 0);
        opacity: 0;
    }
    96.2% {
        transform: translate(0, -10px);
        opacity: 0;
        animation-timing-function: ease-out;
    }
    100% {
        transform: translate(0, 0);
        opacity: 1;
    }
}

@keyframes conveyor-scene-belt {
    0%,
    12% {
        transform: translateX(0);
        animation-timing-function: cubic-bezier(0.45, 0, 0.3, 1);
    }
    17%,
    31% {
        transform: translateX(94px);
        animation-timing-function: cubic-bezier(0.45, 0, 0.3, 1);
    }
    48%,
    72% {
        transform: translateX(425px);
        animation-timing-function: cubic-bezier(0.45, 0, 0.3, 1);
    }
    81%,
    100% {
        transform: translateX(592px);
    }
}

@keyframes conveyor-scene-roll {
    0%,
    12% {
        transform: rotate(0deg);
        animation-timing-function: cubic-bezier(0.45, 0, 0.3, 1);
    }
    17%,
    31% {
        transform: rotate(343deg);
        animation-timing-function: cubic-bezier(0.45, 0, 0.3, 1);
    }
    48%,
    72% {
        transform: rotate(1551deg);
        animation-timing-function: cubic-bezier(0.45, 0, 0.3, 1);
    }
    81%,
    100% {
        transform: rotate(2160deg);
    }
}

@keyframes conveyor-scene-lit-1 {
    0%,
    12%,
    98%,
    100% {
        opacity: 1;
    }
    14%,
    96% {
        opacity: 0;
    }
}

@keyframes conveyor-scene-lit-2 {
    0%,
    15.5%,
    42%,
    100% {
        opacity: 0;
    }
    17%,
    40% {
        opacity: 1;
    }
}

@keyframes conveyor-scene-lit-3 {
    0%,
    46.5%,
    73.5%,
    100% {
        opacity: 0;
    }
    48%,
    72% {
        opacity: 1;
    }
}

@keyframes conveyor-scene-lit-4 {
    0%,
    79.5%,
    96%,
    100% {
        opacity: 0;
    }
    81%,
    94% {
        opacity: 1;
    }
}

@keyframes conveyor-scene-speed {
    0%,
    62% {
        transform: translateX(6px);
        opacity: 0;
    }
    63.5% {
        transform: translateX(0);
        opacity: 1;
    }
    68.5% {
        transform: translateX(-4px);
        opacity: 1;
    }
    70%,
    100% {
        transform: translateX(-8px);
        opacity: 0;
    }
}

@keyframes conveyor-scene-rumble {
    0%,
    62.5%,
    65%,
    67.5%,
    70%,
    100% {
        transform: translateY(0);
    }
    63.75%,
    66.25%,
    68.75% {
        transform: translateY(-1.2px);
    }
}

@keyframes conveyor-scene-delivered {
    0%,
    81% {
        transform: scale(0.85);
        opacity: 0;
        animation-timing-function: ease-out;
    }
    83.5%,
    94% {
        transform: scale(1);
        opacity: 1;
    }
    96%,
    100% {
        transform: scale(1);
        opacity: 0;
    }
}

@keyframes conveyor-scene-tag {
    0%,
    94% {
        transform: scale(1);
        opacity: 1;
    }
    96% {
        transform: scale(1);
        opacity: 0;
    }
    97% {
        transform: scale(0.85);
        opacity: 0;
        animation-timing-function: ease-out;
    }
    100% {
        transform: scale(1);
        opacity: 1;
    }
}

@keyframes conveyor-scene-chase {
    0%,
    55%,
    100% {
        opacity: 0.3;
    }
    22% {
        opacity: 1;
    }
}
</style>
