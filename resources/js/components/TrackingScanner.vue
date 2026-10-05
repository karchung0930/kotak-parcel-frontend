<script setup lang="ts">
import {
    Camera,
    CameraOff,
    Check,
    Flashlight,
    Hand,
    Keyboard,
    PackageSearch,
    ZoomIn,
} from '@lucide/vue';
import { computed, nextTick, ref, useId, useTemplateRef, watch } from 'vue';
import FormField from '@/components/admin/FormField.vue';
import KeepTogether from '@/components/KeepTogether.vue';
import Notice from '@/components/Notice.vue';
import TrackingNumber from '@/components/TrackingNumber.vue';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import {
    Sheet,
    SheetContent,
    SheetDescription,
    SheetHeader,
    SheetTitle,
    SheetTrigger,
} from '@/components/ui/sheet';
import { Spinner } from '@/components/ui/spinner';
import { useTrackingScanner } from '@/composables/useTrackingScanner';
import type { ScanOutcome } from '@/composables/useTrackingScanner';
import {
    formatTrackingNumber,
    normalizeTrackingNumber,
    toTrackingQuery,
} from '@/lib/format';

/**
 * "Scan with camera": an outline button that opens a full-screen sheet with
 * the rear camera and a guide box. A barcode in the box (the counter pass's
 * Code 39, or Code 128 or QR) opens straight away, with a buzz, a beep and
 * a green frame. After a few seconds without one, hints appear and the
 * printed number is read with OCR; a reading is shown only once two frames
 * agree, and it waits for a tap. "Type it instead" is always there, started
 * with what OCR read, and is all there is without a camera.
 *
 * The page decides what a number opens: `resolve` looks it up and either
 * opens it (the sheet closes) or says why not, and scanning goes on with
 * that message. Classes and the default slot (the label) go to the button.
 *
 * <TrackingScanner :resolve="openParcel" class="h-12" />
 */
defineOptions({ inheritAttrs: false });

const props = withDefaults(
    defineProps<{
        resolve: (number: string) => Promise<ScanOutcome>;
        /** The sheet's title. */
        title?: string;
        /** The button that opens a read or typed number, e.g. "Open job". */
        actionLabel?: string;
        /**
         * What the page is doing with the number, put before it while it
         * works: "Opening KT-…", "Recording the pick-up of KT-…".
         */
        busyLabel?: string;
    }>(),
    {
        title: 'Scan a parcel',
        actionLabel: 'Open parcel',
        busyLabel: 'Opening',
    },
);

const open = ref(false);
const video = useTemplateRef<HTMLVideoElement>('video');
const box = useTemplateRef<HTMLElement>('box');

const scanner = useTrackingScanner({
    video,
    box,
    resolve: (number) => props.resolve(number),
    onFound: () => (open.value = false),
});

const {
    phase,
    problem,
    hints,
    barcodeReader,
    textReader,
    number,
    source,
    notice,
    torchAvailable,
    torchOn,
} = scanner;

const typed = ref('');
const typedError = ref<string | null>(null);
const id = useId();
const typedId = `${id}-number`;
const noticeId = `${id}-notice`;

const typedInput = useTemplateRef<{ $el: HTMLInputElement }>('typedInput');
const confirmButton = useTemplateRef<{ $el: HTMLButtonElement }>(
    'confirmButton',
);
const typeButton = useTemplateRef<{ $el: HTMLButtonElement }>('typeButton');

function onTriggerClick(event: MouseEvent): void {
    // The sheet gives focus back to whatever had it when it opened, and a
    // tap does not focus a button in every browser (Safari), so the button
    // takes focus itself and gets it back on close.
    (event.currentTarget as HTMLElement).focus();
    // Sound may only start from a tap, so the beep is unlocked here.
    scanner.unlockSound();
}

watch(open, async (isOpen) => {
    if (!isOpen) {
        scanner.stop();

        return;
    }

    typed.value = '';
    typedError.value = null;

    // The video and the guide box are in the sheet, which renders now.
    await nextTick();
    scanner.start();
});

// Focus follows the step: the open button for a reading, the field for
// typing, and "Type it instead" when the camera comes back.
watch(phase, async (current, previous) => {
    await nextTick();

    if (current === 'confirm') {
        confirmButton.value?.$el.focus();
    } else if (current === 'typing' || current === 'blocked') {
        typedInput.value?.$el.focus();
    } else if (
        (current === 'starting' || current === 'scanning') &&
        previous !== 'starting' &&
        previous !== 'scanning'
    ) {
        typeButton.value?.$el.focus();
    }
});

function scanAgain(): void {
    scanner.scanAgain();

    // "Scan again" itself goes once the message does.
    void nextTick(() => typeButton.value?.$el.focus());
}

function typeInstead(): void {
    typed.value = scanner.typeInstead();
    typedError.value = null;
}

function submitTyped(): void {
    const normalized = normalizeTrackingNumber(toTrackingQuery(typed.value));

    if (!normalized) {
        typedError.value =
            'Enter a Kotak tracking number: KT- and then 8 letters and digits.';
        typedInput.value?.$el.focus();

        return;
    }

    typedError.value = null;
    typed.value = formatTrackingNumber(normalized);
    scanner.submitTyped(typed.value);
}

/** Why there is no camera; the typed entry is right below. */
const PROBLEMS = {
    denied: {
        title: 'The camera is turned off for this site',
        text: "To scan, allow the camera in your browser's settings for this site, then try again.",
    },
    missing: {
        title: 'No camera found',
        text: 'This device has no camera the browser can use.',
    },
    busy: {
        title: 'The camera did not start',
        text: 'Another app may be using it. Close that app and try again.',
    },
    unsupported: {
        title: "This browser can't use the camera here",
        text: 'Scanning needs a secure (https) page in a current browser.',
    },
} as const;

/** The camera's picture shows (it is off for the typed entry). */
const showCamera = computed(
    () =>
        phase.value === 'starting' ||
        phase.value === 'scanning' ||
        phase.value === 'confirm' ||
        (phase.value === 'opening' && source.value !== 'typed'),
);
const typing = computed(
    () => phase.value === 'typing' || phase.value === 'blocked',
);
const barcodeRead = computed(
    () => phase.value === 'opening' && source.value === 'barcode',
);
const scannerFailed = computed(
    () => barcodeReader.value === 'failed' && textReader.value === 'failed',
);
const showHintChips = computed(
    () => hints.value && phase.value === 'scanning' && !scannerFailed.value,
);
// Kept while the light is on, so it can always be turned off.
const showTorch = computed(
    () =>
        torchAvailable.value &&
        (torchOn.value || (hints.value && phase.value === 'scanning')),
);

/** The line over the guide box: what the scanner is doing. */
const guidance = computed(() => {
    switch (phase.value) {
        case 'starting':
            return 'Starting the camera…';
        case 'confirm':
            return 'Number read';
        case 'opening':
            return source.value === 'barcode' ? 'Barcode read' : 'Number read';
    }

    if (hints.value && textReader.value === 'ready') {
        return 'Reading the number…';
    }

    if (barcodeReader.value !== 'failed') {
        return 'Looking for a barcode…';
    }

    return textReader.value === 'failed'
        ? 'The scanner did not load'
        : 'Getting ready…';
});

/** What a screen reader hears as the scanner moves on. */
const announcement = computed(() => {
    const read = number.value ? formatTrackingNumber(number.value) : '';

    switch (phase.value) {
        case 'starting':
            return 'Starting the camera.';
        case 'scanning':
            if (notice.value) {
                return `${notice.value} Still scanning.`;
            }

            if (scannerFailed.value) {
                return 'The scanner could not load. Reload the page, or type the number instead.';
            }

            if (barcodeReader.value === 'failed') {
                return 'Only the printed number can be read. Hold it inside the box, or type it instead.';
            }

            return hints.value
                ? 'No barcode yet. Move closer and hold the phone steady, or type the number instead.'
                : 'Camera on. Point it at the barcode or the tracking number.';
        case 'confirm':
            return `Read ${read}. Check it against the label, then choose ${props.actionLabel} or Scan again.`;
        case 'opening':
            return source.value === 'barcode'
                ? `Barcode read. ${props.busyLabel} ${read}.`
                : `${props.busyLabel} ${read}.`;
        case 'typing':
            return (
                typedError.value ?? notice.value ?? 'Type the tracking number.'
            );
        case 'blocked':
            return (
                typedError.value ??
                (problem.value ? PROBLEMS[problem.value].title : '')
            );
    }

    return '';
});

/*
 * The guide box is 16:5 and centred in the camera area, as wide as fits
 * with 20px around it (container query units of the area), so it is never
 * cut off on a short screen such as a phone on its side. The line above it
 * and the hints below sit 16px from it, but stay inside the area: where
 * there is no room they move over the box's edge rather than out of sight.
 * An area under 96px tall (a phone on its side, with a reading to check)
 * leaves the box and the line out.
 */
const CAMERA_AREA_STYLE = {
    '--box-w':
        'min(35rem, calc(100cqw - 2.5rem), calc((100cqh - 2.5rem) * 3.2))',
};
const GUIDANCE_STYLE = {
    bottom: 'min(calc(50cqh + var(--box-w) / 6.4 + 1rem), calc(100cqh - 2.75rem))',
};
const hintsStyle = computed(() => {
    // The hint chips are one 32px row; the light button is 44px, 12px under.
    const height =
        (showHintChips.value ? 2 : 0) +
        (showTorch.value ? 2.75 : 0) +
        (showHintChips.value && showTorch.value ? 0.75 : 0);

    return {
        top: `min(calc(50cqh + var(--box-w) / 6.4 + 1rem), calc(100cqh - ${height + 0.75}rem))`,
    };
});

/**
 * The labels laid over the picture (what is happening, and the hints):
 * white with a shadow, so they read on any background without a dark fill.
 */
const OVERLAY_LABEL =
    'inline-flex items-center gap-1.5 rounded-lg bg-white px-3 py-1.5 font-semibold whitespace-nowrap text-ink shadow-[0_2px_8px_rgb(22_24_29_/_0.25)]';

/** The guide box's corner marks. */
const CORNERS = [
    'top-[-2px] left-[-2px] rounded-tl-xl border-t-4 border-l-4',
    'top-[-2px] right-[-2px] rounded-tr-xl border-t-4 border-r-4',
    'bottom-[-2px] left-[-2px] rounded-bl-xl border-b-4 border-l-4',
    'right-[-2px] bottom-[-2px] rounded-br-xl border-r-4 border-b-4',
];

const fieldClass =
    'h-14 rounded-lg bg-white px-4 font-mono text-lg font-semibold md:text-lg tracking-[0.03em] text-ink uppercase placeholder:font-sans placeholder:font-medium placeholder:tracking-normal placeholder:normal-case';
const actionClass = 'h-12 rounded-lg px-5 text-[15px] font-bold';
</script>

<template>
    <Sheet v-model:open="open">
        <SheetTrigger as-child>
            <Button
                type="button"
                variant="outline"
                v-bind="$attrs"
                @click="onTriggerClick"
            >
                <Camera aria-hidden="true" class="size-5" />
                <slot>Scan with camera</slot>
            </Button>
        </SheetTrigger>

        <!-- The whole screen: the camera fills the space between the title
             and the panel of actions, which stays at the bottom, in reach
             of a thumb. -->
        <SheetContent
            side="bottom"
            class="top-0 h-dvh gap-0 border-t-0 bg-white"
        >
            <SheetHeader class="flex-none border-b border-line">
                <!-- pr-12 leaves room for the close button. The column
                     lines up with the panel's below. -->
                <div class="mx-auto w-full max-w-xl min-w-0 pr-12">
                    <SheetTitle
                        class="text-lg leading-6 font-extrabold tracking-heading text-ink"
                    >
                        {{ title }}
                    </SheetTitle>
                    <SheetDescription
                        class="mt-1.5 text-sm leading-5 text-ink-2"
                    >
                        {{
                            showCamera
                                ? 'Hold the barcode or number in the box.'
                                : 'Type the tracking number.'
                        }}
                    </SheetDescription>
                </div>
            </SheetHeader>

            <!-- Camera. The video is only a picture: everything it shows
                 is announced in the panel below. -->
            <div
                v-if="showCamera"
                class="[container-type:size] relative min-h-0 flex-1 overflow-hidden bg-ink-2"
                :style="CAMERA_AREA_STYLE"
            >
                <video
                    ref="video"
                    tabindex="-1"
                    aria-hidden="true"
                    muted
                    playsinline
                    autoplay
                    class="absolute inset-0 size-full object-cover"
                />

                <!-- What is inside the box is read. Its shadow dims the
                     picture around it. -->
                <div
                    ref="box"
                    :class="[
                        'absolute top-1/2 left-1/2 aspect-[16/5] w-(--box-w) -translate-x-1/2 -translate-y-1/2 rounded-xl border-2 shadow-[0_0_0_100vmax_rgb(22_24_29_/_0.55)] transition-colors [@container(max-height:6rem)]:hidden',
                        barcodeRead
                            ? 'border-status-delivered bg-status-delivered/15'
                            : 'border-white/80',
                    ]"
                >
                    <span
                        v-for="corner in CORNERS"
                        :key="corner"
                        aria-hidden="true"
                        :class="[
                            'absolute size-7',
                            corner,
                            barcodeRead
                                ? 'border-status-delivered'
                                : 'border-brand',
                        ]"
                    />
                    <span
                        v-if="phase === 'scanning' && !scannerFailed"
                        aria-hidden="true"
                        class="absolute inset-x-4 top-1/2 h-0.5 -translate-y-1/2 rounded-full bg-brand/80 motion-safe:animate-pulse"
                    />
                    <span
                        v-if="barcodeRead"
                        aria-hidden="true"
                        class="absolute top-1/2 left-1/2 flex size-12 -translate-x-1/2 -translate-y-1/2 items-center justify-center rounded-full bg-status-delivered text-white"
                    >
                        <Check class="size-7" />
                    </span>
                </div>

                <!-- Above the box's dimming shadow. -->
                <p
                    class="absolute inset-x-5 z-10 flex justify-center [@container(max-height:6rem)]:hidden"
                    :style="GUIDANCE_STYLE"
                >
                    <span :class="[OVERLAY_LABEL, 'text-sm leading-5']">
                        {{ guidance }}
                    </span>
                </p>

                <div
                    v-if="showHintChips || showTorch"
                    class="absolute inset-x-5 z-10 flex flex-col items-center gap-3"
                    :style="hintsStyle"
                >
                    <ul
                        v-if="showHintChips"
                        class="flex justify-center gap-2 text-[13px] leading-5"
                    >
                        <li :class="OVERLAY_LABEL">
                            <ZoomIn aria-hidden="true" class="size-4" />
                            Move closer
                        </li>
                        <li :class="OVERLAY_LABEL">
                            <Hand aria-hidden="true" class="size-4" />
                            Hold steady
                        </li>
                    </ul>
                    <Button
                        v-if="showTorch"
                        type="button"
                        variant="outline"
                        class="h-11 rounded-lg px-4 text-sm font-bold"
                        @click="scanner.toggleTorch"
                    >
                        <Flashlight aria-hidden="true" class="size-4" />
                        {{
                            torchOn ? 'Turn off the light' : 'Turn on the light'
                        }}
                    </Button>
                </div>
            </div>

            <!-- The panel: where the scan stands and what to do next. -->
            <div
                :class="[
                    'flex-none border-t border-line p-(--sheet-padding) pb-[max(var(--sheet-padding),env(safe-area-inset-bottom))]',
                    !showCamera && 'flex-1 overflow-y-auto border-t-0',
                ]"
            >
                <p class="sr-only" aria-live="polite">{{ announcement }}</p>

                <!-- Two buttons sit side by side only where both labels
                     fit (container queries on the panel); otherwise they
                     stack at full width. -->
                <div class="@container mx-auto grid w-full max-w-xl gap-4">
                    <!-- No camera: why, in plain words. -->
                    <div
                        v-if="phase === 'blocked' && problem"
                        class="flex gap-4"
                    >
                        <span
                            aria-hidden="true"
                            class="flex size-12 flex-none items-center justify-center rounded-full bg-brand-tint text-brand"
                        >
                            <CameraOff class="size-6" />
                        </span>
                        <div class="min-w-0">
                            <h3
                                class="text-[17px] leading-6 font-extrabold tracking-heading text-ink"
                            >
                                {{ PROBLEMS[problem].title }}
                            </h3>
                            <p class="mt-1 text-[15px] leading-6 text-ink-2">
                                {{ PROBLEMS[problem].text }}
                            </p>
                        </div>
                    </div>

                    <Notice
                        v-if="notice"
                        :id="noticeId"
                        :icon="PackageSearch"
                        tone="brand"
                    >
                        <KeepTogether :text="notice" />
                        <template v-if="phase === 'scanning'">
                            Still scanning.</template
                        >
                    </Notice>

                    <!-- OCR read a number: check it, then open it. -->
                    <div
                        v-if="phase === 'confirm' && number"
                        class="grid gap-4"
                    >
                        <div>
                            <p class="text-sm leading-5 font-bold text-ink-2">
                                Read from the label
                            </p>
                            <p class="mt-1">
                                <TrackingNumber
                                    :value="number"
                                    size="lg"
                                    :copyable="false"
                                />
                            </p>
                            <p
                                class="mt-1 text-sm leading-5 text-muted-foreground"
                            >
                                Check it matches the label before you go on.
                            </p>
                        </div>
                        <div
                            class="grid gap-2.5 @[20rem]:grid-cols-2 @[34rem]:grid-cols-3"
                        >
                            <Button
                                ref="confirmButton"
                                type="button"
                                :class="[actionClass, 'hover:bg-brand-strong']"
                                @click="scanner.confirm"
                            >
                                {{ actionLabel }}
                            </Button>
                            <Button
                                type="button"
                                variant="outline"
                                :class="actionClass"
                                @click="scanAgain"
                            >
                                Scan again
                            </Button>
                            <Button
                                type="button"
                                variant="outline"
                                :class="[
                                    actionClass,
                                    '@[20rem]:col-span-2 @[34rem]:col-span-1',
                                ]"
                                @click="typeInstead"
                            >
                                <Keyboard
                                    aria-hidden="true"
                                    class="size-[18px]"
                                />
                                Type it instead
                            </Button>
                        </div>
                    </div>

                    <!-- The page is acting on the number. -->
                    <p
                        v-else-if="phase === 'opening' && number"
                        class="flex min-h-12 items-center gap-2.5 text-[15px] leading-6 font-semibold text-ink"
                    >
                        <Spinner class="size-5 flex-none text-brand" />
                        <span>
                            {{ busyLabel }}
                            <TrackingNumber :value="number" size="inline" />…
                        </span>
                    </p>

                    <!-- Typing the number: always possible, and all there
                         is without a camera. -->
                    <form
                        v-else-if="typing"
                        class="grid gap-5"
                        novalidate
                        @submit.prevent="submitTyped"
                    >
                        <FormField
                            :id="typedId"
                            v-slot="{ describedby, invalid }"
                            label="Tracking number"
                            :error="typedError ?? undefined"
                        >
                            <Input
                                :id="typedId"
                                ref="typedInput"
                                v-model="typed"
                                type="text"
                                maxlength="32"
                                autocomplete="off"
                                autocapitalize="characters"
                                spellcheck="false"
                                enterkeyhint="go"
                                placeholder="e.g. KT-7Q4M92XD"
                                :aria-invalid="invalid"
                                :aria-describedby="
                                    [describedby, notice ? noticeId : null]
                                        .filter(Boolean)
                                        .join(' ') || undefined
                                "
                                :class="fieldClass"
                            />
                        </FormField>
                        <div class="grid gap-2.5 @[26rem]:grid-cols-2">
                            <Button
                                type="submit"
                                :class="[actionClass, 'hover:bg-brand-strong']"
                            >
                                {{ actionLabel }}
                            </Button>
                            <Button
                                v-if="phase === 'typing'"
                                type="button"
                                variant="outline"
                                :class="actionClass"
                                @click="scanner.backToCamera"
                            >
                                Back to the camera
                            </Button>
                            <Button
                                v-else-if="problem && problem !== 'unsupported'"
                                type="button"
                                variant="outline"
                                :class="actionClass"
                                @click="scanner.retryCamera"
                            >
                                Try the camera again
                            </Button>
                        </div>
                    </form>

                    <!-- Scanning: what is happening, and the ways out. -->
                    <div v-else class="grid gap-3">
                        <p
                            v-if="scannerFailed"
                            class="text-sm leading-5 text-ink-2"
                        >
                            The scanner could not load. Reload the page, or type
                            the number.
                        </p>
                        <p
                            v-else-if="barcodeReader === 'failed'"
                            class="text-sm leading-5 text-ink-2"
                        >
                            Only the printed number can be read. Reload the page
                            to scan barcodes.
                        </p>
                        <p
                            v-else-if="hints && textReader === 'loading'"
                            class="flex items-center gap-2 text-sm leading-5 text-ink-2"
                        >
                            <Spinner class="size-4 flex-none text-brand" />
                            Getting ready to read the printed number…
                        </p>
                        <p
                            v-else-if="hints && textReader === 'failed'"
                            class="text-sm leading-5 text-ink-2"
                        >
                            The printed number can't be read on this device.
                            Scan the barcode or type the number.
                        </p>
                        <!-- After a refusal: the same label can be tried
                             again (it is skipped until then). -->
                        <div class="grid gap-2.5 @[20rem]:grid-cols-2">
                            <Button
                                v-if="notice"
                                type="button"
                                variant="outline"
                                :class="actionClass"
                                @click="scanAgain"
                            >
                                Scan again
                            </Button>
                            <Button
                                ref="typeButton"
                                type="button"
                                variant="outline"
                                :class="[
                                    actionClass,
                                    !notice && 'col-span-full',
                                ]"
                                @click="typeInstead"
                            >
                                <Keyboard
                                    aria-hidden="true"
                                    class="size-[18px]"
                                />
                                Type it instead
                            </Button>
                        </div>
                    </div>
                </div>
            </div>
        </SheetContent>
    </Sheet>
</template>
