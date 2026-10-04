<script setup lang="ts">
import { useForm } from '@inertiajs/vue3';
import { ArrowRight, ScanLine } from '@lucide/vue';
import { useId } from 'vue';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Spinner } from '@/components/ui/spinner';
import { toTrackingQuery } from '@/lib/format';
import { track } from '@/routes';
import type { RouteFormDefinition } from '@/wayfinder';

/**
 * The "track a parcel" form (GET /track?number=…). The number is tidied to
 * KT-XXXXXXXX before it is sent; anything else is sent as typed so the
 * tracking page can say that nothing matched.
 *
 * size: lg (home hero card), md (tracking page band), sm (header, menus).
 * Slot: label-aside, e.g. a "Where is my tracking number?" link beside the
 * label (when the label is visible).
 *
 * Staff and admins reuse it to open a parcel at the counter:
 * <TrackingSearch :action="counter.form()" label="Find a parcel" />.
 */
const props = withDefaults(
    defineProps<{
        size?: 'lg' | 'md' | 'sm';
        defaultValue?: string | null;
        label?: string;
        hideLabel?: boolean;
        hint?: string | null;
        /** Focus the field when the page opens (the tracking page only). */
        autofocus?: boolean;
        /** Where the number is sent (a GET form with a "number" field). */
        action?: RouteFormDefinition<'get'>;
    }>(),
    {
        size: 'md',
        defaultValue: null,
        label: 'Tracking number',
        hideLabel: false,
        hint: null,
        autofocus: false,
        action: () => track.form(),
    },
);

const id = `tracking-${useId()}`;
const hintId = `${id}-hint`;

/*
 * useForm rather than <Form>: a GET <Form> moves its fields into the URL
 * before the transform runs, so a transform there never sees the number.
 */
const form = useForm({ number: props.defaultValue ?? '' });

function submit(): void {
    form.transform(({ number }) => ({ number: toTrackingQuery(number) })).get(
        props.action.action,
    );
}

/*
 * sm is 44px tall with 16px text below 1024px, where it is used on touch
 * screens (the menu sheet, the console top bar on a phone or tablet) and
 * iOS zooms into a field with smaller text. From 1024px it is the compact
 * 40px / 14px box of the desktop header and top bar, but stays 44px tall
 * with 16px text on touch screens (an iPad in landscape). Below 360px only
 * the placeholder drops to 14px, so it fits the narrow menu sheet; md does
 * the same below 400px, for the card on the error page.
 */
const inputClass = {
    lg: 'h-14 pl-11 text-base sm:h-[60px] sm:pl-[52px] sm:text-lg md:text-[19px]',
    md: 'h-[52px] pl-[46px] text-base max-[400px]:placeholder:text-sm md:text-[17px]',
    sm: 'h-11 pl-9 text-base max-[360px]:placeholder:text-sm md:text-base lg:h-10 lg:text-sm pointer-coarse:h-11 pointer-coarse:text-base',
};

const iconClass = {
    lg: 'left-3.5 size-5 sm:left-4 sm:size-6',
    md: 'left-3.5 size-[22px]',
    sm: 'left-2.5 size-[18px]',
};

const buttonClass = {
    lg: 'h-14 px-5 text-base font-bold sm:h-[60px] sm:px-[26px] sm:text-[17px]',
    md: 'h-[52px] px-5 text-base font-bold',
    sm: 'h-11 w-11 px-0 text-sm font-bold lg:h-10 lg:w-10 pointer-coarse:h-11 pointer-coarse:w-11',
};

const labelClass = {
    lg: 'text-[15px] leading-5 font-bold text-ink',
    md: 'text-[13px] leading-[19px] font-semibold text-ink',
    sm: 'text-[13px] leading-[19px] font-semibold text-ink',
};
</script>

<template>
    <form
        :action="action.action"
        method="get"
        role="search"
        :aria-label="label"
        @submit.prevent="submit"
    >
        <div
            v-if="!hideLabel"
            :class="[
                'flex flex-wrap items-center justify-between gap-x-3 gap-y-1',
                size === 'lg' ? 'mb-3' : 'mb-1.5',
            ]"
        >
            <label :for="id" :class="labelClass[size]">{{ label }}</label>
            <slot name="label-aside" />
        </div>
        <label v-else :for="id" class="sr-only">{{ label }}</label>

        <div :class="['flex', size === 'sm' ? 'gap-2' : 'gap-2.5']">
            <div class="relative min-w-0 flex-1">
                <ScanLine
                    aria-hidden="true"
                    :class="[
                        'pointer-events-none absolute top-1/2 -translate-y-1/2 text-muted-foreground',
                        iconClass[size],
                    ]"
                />
                <Input
                    :id="id"
                    v-focus="autofocus"
                    name="number"
                    type="text"
                    required
                    maxlength="32"
                    v-model="form.number"
                    autocomplete="off"
                    autocapitalize="characters"
                    spellcheck="false"
                    enterkeyhint="search"
                    placeholder="e.g. KT-7Q4M92XD"
                    :aria-describedby="hint ? hintId : undefined"
                    :class="[
                        'rounded-lg bg-white pr-3 font-mono font-semibold tracking-[0.03em] text-ink placeholder:font-sans placeholder:font-medium placeholder:tracking-normal',
                        inputClass[size],
                    ]"
                />
            </div>
            <Button
                type="submit"
                :disabled="form.processing"
                :aria-label="size === 'sm' ? 'Track' : undefined"
                :class="['rounded-lg', buttonClass[size]]"
            >
                <Spinner v-if="form.processing" />
                <template v-if="size !== 'sm'">Track</template>
                <ArrowRight v-if="!form.processing" aria-hidden="true" />
            </Button>
        </div>

        <p
            v-if="hint"
            :id="hintId"
            class="mt-2.5 text-[13px] leading-[18px] text-muted-foreground"
        >
            {{ hint }}
        </p>
    </form>
</template>
