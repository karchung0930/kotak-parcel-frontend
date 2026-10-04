<script setup lang="ts">
import { ArrowRight } from '@lucide/vue';
import { useResizeObserver } from '@vueuse/core';
import {
    computed,
    nextTick,
    onMounted,
    reactive,
    useTemplateRef,
    watch,
} from 'vue';
import ConveyorScene from '@/components/brand/art/ConveyorScene.vue';
import { useInView } from '@/composables/useInView';
import { formatShortDate, formatShortDateTime } from '@/lib/format';
import {
    JOURNEY_STAGE_COPY,
    JOURNEY_STAGES,
    journeyPosition,
} from '@/lib/journey';
import type {
    JourneyStage,
    JourneyStageState,
    JourneyTone,
} from '@/lib/journey';
import { statusMeta } from '@/lib/status';
import type { OrderStatusValue } from '@/types';

/**
 * The parcel journey on one continuous conveyor belt: order online →
 * branch counter and scale → Kotak van → the receiver's door.
 *
 * - Without `status` it is the "How it works" illustration, with a
 *   numbered title and description under each station.
 * - With `status` it is a progress indicator: passed stations get a tick,
 *   the current one sits on a tinted panel, later ones are faded. Add
 *   `compact` on tracking and order pages for short labels only.
 *
 * From md up the scene scales to the container. Below md the belt never
 * breaks: the scene and its labels scroll sideways as one strip, and the
 * progress view starts with the current station in view.
 *
 * Without `status`, and with motion allowed, a parcel tours the scene and
 * each step's number and title light up while it is at that station (see
 * the styles below and ConveyorScene). All motion pauses while the
 * conveyor is off-screen, and none runs with prefers-reduced-motion.
 *
 * The picture is decorative; the ordered list carries the meaning
 * (aria-current="step" marks the current stage).
 */
const props = withDefaults(
    defineProps<{
        status?: OrderStatusValue | null;
        compact?: boolean;
        /** When each stage was reached, e.g. journeyTimes(order.status_events). */
        times?: Partial<Record<JourneyStage, string | null>>;
        /** The delivery date (scheduled_for), shown under "Delivered" until then. */
        expectedDelivery?: string | null;
        /** Heading level of the stage titles in the full variant. */
        headingLevel?: 'h3' | 'h4';
        /** The hint over the sideways strip on phones. */
        swipeHint?: string;
    }>(),
    {
        status: null,
        compact: false,
        times: () => ({}),
        expectedDelivery: null,
        headingLevel: 'h3',
        swipeHint: 'Swipe to follow your parcel',
    },
);

const position = computed(() =>
    props.status ? journeyPosition(props.status) : null,
);

const tone = computed<JourneyTone>(() => position.value?.tone ?? 'active');

function stateOf(stage: JourneyStage): JourneyStageState {
    if (!position.value) {
        return 'idle';
    }

    const current = position.value.stage;

    if (current === null) {
        return 'upcoming';
    }

    const index = JOURNEY_STAGES.indexOf(stage);
    const currentIndex = JOURNEY_STAGES.indexOf(current);

    if (index < currentIndex) {
        return 'done';
    }

    return index === currentIndex ? 'current' : 'upcoming';
}

const states = computed(() => {
    const map = {} as Record<JourneyStage, JourneyStageState>;

    for (const stage of JOURNEY_STAGES) {
        map[stage] = stateOf(stage);
    }

    return map;
});

const stages = computed(() =>
    JOURNEY_STAGES.map((stage) => ({
        key: stage,
        state: states.value[stage],
        ...JOURNEY_STAGE_COPY[stage],
    })),
);

const statusLabel = computed(() =>
    props.status ? statusMeta(props.status).label : '',
);

function detail(stage: JourneyStage, state: JourneyStageState): string {
    const reached = props.times[stage];
    // The formatters keep "29 Sep" on one line in the narrow compact columns.
    const when = reached ? formatShortDateTime(reached) : null;

    if (state === 'done') {
        return when ?? 'Done';
    }

    if (state === 'current') {
        if (tone.value === 'complete') {
            return when ?? 'Done';
        }

        const now = tone.value === 'active' ? 'Now' : statusLabel.value;

        return [statusLabel.value !== now ? statusLabel.value : null, now]
            .filter(Boolean)
            .join(' · ');
    }

    // Only while the journey runs normally: a failed or returned parcel's
    // scheduled_for has usually passed and is no longer a promise.
    if (
        stage === 'door' &&
        props.expectedDelivery &&
        props.status &&
        tone.value === 'active'
    ) {
        return `Expected ${formatShortDate(props.expectedDelivery)}`;
    }

    return '';
}

const stateText: Record<JourneyStageState, string> = {
    idle: '',
    done: 'Completed.',
    current: 'Current stage.',
    upcoming: 'Not reached yet.',
};

const currentLabelClass: Record<JourneyTone, string> = {
    active: 'text-brand-strong',
    issue: 'text-status-failed',
    ended: 'text-status-neutral',
    complete: 'text-status-delivered',
};

const listLabel = computed(() => {
    if (!position.value) {
        return 'How your parcel travels with Kotak';
    }

    const current = position.value.stage;

    if (current === null) {
        return `Delivery progress: ${statusLabel.value}`;
    }

    const step = JOURNEY_STAGES.indexOf(current) + 1;

    return `Delivery progress: stage ${step} of ${JOURNEY_STAGES.length}, ${JOURNEY_STAGE_COPY[current].short}`;
});

/*
 * The sideways strip on small screens. It only scrolls below md (where the
 * scene keeps a minimum width); from md up nothing overflows and none of
 * this applies. The strip is `relative` so the absolutely positioned
 * sr-only state text scrolls (and clips) with it instead of widening the
 * page on phones.
 */
const strip = useTemplateRef<HTMLElement>('strip');

const scroller = reactive({
    measured: false,
    scrollable: false,
    atStart: true,
    atEnd: false,
    fadeStart: 0,
    fadeEnd: 0,
});

function measure(): void {
    const el = strip.value;

    if (!el) {
        return;
    }

    const width = el.clientWidth;
    const max = el.scrollWidth - width;

    scroller.measured = true;
    scroller.scrollable = max > 1;
    scroller.atStart = el.scrollLeft <= 1;
    scroller.atEnd = el.scrollLeft >= max - 1;

    /*
     * Each edge fades out all of the station it cuts through (art, tick
     * and label alike), so nothing of it is left as a fragment. That is
     * exact where the strip comes to rest (a station centred, or an end);
     * while it moves between two of those, the fades blend from one to
     * the other instead of jumping as a station crosses the edge.
     */
    const station = el.scrollWidth / JOURNEY_STAGES.length;
    const rests = JOURNEY_STAGES.map((_, index) =>
        Math.min(max, Math.max(0, (index + 0.5) * station - width / 2)),
    );
    const cut = (left: number) => ({
        start: (station - (left % station)) % station,
        end: (left + width) % station,
    });
    const x = Math.min(max, Math.max(0, el.scrollLeft));
    const next = Math.max(
        1,
        rests.findIndex((rest) => rest >= x),
    );
    const [a, b] = [rests[next - 1], rests[next]];
    const t = b > a ? (x - a) / (b - a) : 0;
    const fade = (from: number, to: number) =>
        Math.round(Math.max(24, from + (to - from) * t));

    scroller.fadeStart = fade(cut(a).start, cut(b).start);
    scroller.fadeEnd = fade(cut(a).end, cut(b).end);
}

/**
 * Centre the current station in the strip. Sets scrollLeft on the strip
 * itself, so the page never moves.
 */
function showCurrentStation(): void {
    const el = strip.value;
    const current = position.value?.stage;

    if (el && current) {
        const max = el.scrollWidth - el.clientWidth;

        if (max > 1) {
            const index = JOURNEY_STAGES.indexOf(current);
            const middle =
                ((index + 0.5) / JOURNEY_STAGES.length) * el.scrollWidth;

            el.scrollLeft = Math.min(
                max,
                Math.max(0, middle - el.clientWidth / 2),
            );
        }
    }

    measure();
}

onMounted(showCurrentStation);

watch(
    () => position.value?.stage,
    () => nextTick(showCurrentStation),
);

useResizeObserver(strip, measure);

/** Run the scene's animation only while the conveyor is on screen. */
const inView = useInView(strip);

const playState = computed(() => ({
    '--journey-play': inView.value ? 'running' : 'paused',
}));

/**
 * Fade the edges the strip can still scroll towards (see measure). Only
 * the last 16px of each fade shows, where the belt runs on into the
 * visible stations.
 */
const edgeFade = computed(() => {
    if (!scroller.scrollable) {
        return undefined;
    }

    const { fadeStart: s, fadeEnd: e } = scroller;
    const start = scroller.atStart
        ? '#000'
        : `transparent ${s - 16}px, #000 ${s}px`;
    const end = scroller.atEnd
        ? '#000'
        : `#000 calc(100% - ${e}px), transparent calc(100% - ${e - 16}px)`;
    const mask = `linear-gradient(to right, ${start}, ${end})`;

    return { maskImage: mask, WebkitMaskImage: mask };
});
</script>

<template>
    <div
        :class="['journey-conveyor', { 'journey-conveyor--tour': !status }]"
        :style="playState"
    >
        <p
            v-if="!scroller.measured || scroller.scrollable"
            aria-hidden="true"
            class="mb-3 flex items-center justify-end gap-1.5 text-[13px] leading-[18px] font-semibold text-muted-foreground md:hidden"
        >
            {{ swipeHint }}
            <ArrowRight class="size-4 text-brand" />
        </p>

        <div
            ref="strip"
            :tabindex="scroller.scrollable ? 0 : undefined"
            :role="scroller.scrollable ? 'region' : undefined"
            :aria-label="
                scroller.scrollable
                    ? 'Parcel journey, scrolls sideways'
                    : undefined
            "
            :style="edgeFade"
            class="relative focus-visible:outline-offset-[-3px] max-md:snap-x max-md:snap-mandatory max-md:[scrollbar-width:thin] max-md:[scrollbar-color:#C9CED6_transparent] max-md:overflow-x-auto max-md:overscroll-x-contain max-md:pb-2"
            @scroll.passive="measure"
        >
            <div
                :class="[
                    '@container w-full',
                    compact ? 'max-md:min-w-[720px]' : 'max-md:min-w-[880px]',
                ]"
            >
                <ConveyorScene :states="states" :tone="tone" />

                <ol :aria-label="listLabel" class="grid list-none grid-cols-4">
                    <li
                        v-for="(stage, index) in stages"
                        :key="stage.key"
                        :aria-current="
                            stage.state === 'current' ? 'step' : undefined
                        "
                        :class="[
                            'min-w-0 max-md:snap-center',
                            `journey-conveyor__step--${index + 1}`,
                        ]"
                    >
                        <div
                            v-if="compact"
                            class="mt-1.5 px-1 text-center @3xl:mt-2"
                        >
                            <p
                                :class="[
                                    'text-xs leading-4 font-bold @xl:text-sm @xl:leading-5',
                                    stage.state === 'current'
                                        ? [
                                              'font-extrabold',
                                              currentLabelClass[tone],
                                          ]
                                        : stage.state === 'upcoming'
                                          ? 'text-ink-2'
                                          : 'text-ink',
                                ]"
                            >
                                {{ stage.short }}
                            </p>
                            <p
                                v-if="detail(stage.key, stage.state)"
                                class="mt-0.5 text-[11px] leading-4 text-muted-foreground @xl:text-[12.5px] @xl:leading-[18px]"
                            >
                                {{ detail(stage.key, stage.state) }}
                            </p>
                            <span class="sr-only">
                                {{ stateText[stage.state] }}
                            </span>
                        </div>

                        <div
                            v-else
                            class="mt-4 px-2 text-center @4xl:mt-5 @5xl:px-4 @7xl:px-5"
                        >
                            <div
                                class="flex flex-col items-center justify-center gap-2 @7xl:flex-row @7xl:gap-2.5"
                            >
                                <span
                                    aria-hidden="true"
                                    class="relative inline-flex size-7 flex-none items-center justify-center rounded-md bg-brand-tint font-mono text-sm font-bold text-brand-strong @5xl:size-8"
                                >
                                    {{ index + 1 }}
                                    <span
                                        class="journey-conveyor__lit absolute inset-0 inline-flex items-center justify-center rounded-md bg-brand text-white"
                                    >
                                        {{ index + 1 }}
                                    </span>
                                </span>
                                <component
                                    :is="headingLevel"
                                    class="relative text-base leading-6 font-extrabold tracking-heading text-ink @4xl:text-lg @7xl:text-[19px]"
                                >
                                    {{ stage.title }}
                                    <span
                                        v-if="!status"
                                        aria-hidden="true"
                                        class="journey-conveyor__lit absolute inset-x-0 -bottom-1.5 mx-auto hidden h-[3px] w-8 rounded-full bg-brand motion-safe:block"
                                    />
                                </component>
                            </div>
                            <p
                                class="mx-auto mt-2 max-w-[272px] text-sm leading-[22px] text-muted-foreground @5xl:text-[15px] @5xl:leading-6"
                            >
                                {{ stage.description }}
                            </p>
                            <span v-if="stage.state !== 'idle'" class="sr-only">
                                {{ stateText[stage.state] }}
                            </span>
                        </div>
                    </li>
                </ol>
            </div>
        </div>
    </div>
</template>

<style scoped>
/*
 * The "How it works" tour: while ConveyorScene's parcel is at a station,
 * that step's number badge fills red and a short red bar shows under its
 * title. Same 12 s loop and the same windows as the scene's halos (see
 * ConveyorScene). Without motion every badge stays filled, as in the
 * progress view.
 */
@media (prefers-reduced-motion: no-preference) {
    .journey-conveyor--tour .journey-conveyor__lit {
        animation-duration: 12s;
        animation-timing-function: linear;
        animation-iteration-count: infinite;
        animation-fill-mode: both;
        animation-play-state: var(--journey-play, running);
    }

    .journey-conveyor--tour .journey-conveyor__step--1 .journey-conveyor__lit {
        animation-name: journey-conveyor-lit-1;
    }

    .journey-conveyor--tour .journey-conveyor__step--2 .journey-conveyor__lit {
        animation-name: journey-conveyor-lit-2;
    }

    .journey-conveyor--tour .journey-conveyor__step--3 .journey-conveyor__lit {
        animation-name: journey-conveyor-lit-3;
    }

    .journey-conveyor--tour .journey-conveyor__step--4 .journey-conveyor__lit {
        animation-name: journey-conveyor-lit-4;
    }
}

@keyframes journey-conveyor-lit-1 {
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

@keyframes journey-conveyor-lit-2 {
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

@keyframes journey-conveyor-lit-3 {
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

@keyframes journey-conveyor-lit-4 {
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
</style>
