<script setup lang="ts">
import { ChevronDown } from '@lucide/vue';
import {
    TooltipArrow,
    TooltipContent,
    TooltipPortal,
    TooltipProvider,
    TooltipRoot,
    TooltipTrigger,
} from 'reka-ui';
import { computed, ref, useTemplateRef, watch } from 'vue';
import type { HTMLAttributes } from 'vue';
import InputError from '@/components/InputError.vue';
import {
    formatPhoneInput,
    phoneError,
    toE164,
    toNationalDisplay,
} from '@/lib/phone';
import type { PhoneKind } from '@/lib/phone';
import { cn } from '@/lib/utils';

/**
 * A Malaysian phone number field. The "+60" country selector looks like a
 * dropdown but is disabled: only Malaysian numbers are taken. It stays
 * focusable (aria-disabled, not disabled) so keyboard and screen reader
 * users also get its "Malaysian numbers only" hint, which shows as a
 * tooltip just above it on hover and on keyboard focus. The number after
 * it is formatted as it is typed ("12-345 6789") and checked with
 * libphonenumber when the field is left.
 *
 * The value (v-model, or a hidden input called `name` for forms that post
 * the DOM, like Inertia's <Form>) is the number in E.164 form
 * ("+60123456789"), or the text as typed when the field does not take it,
 * so the server can say what is wrong. The field shows one error: its own
 * check, else `error` (the server's). A hint in the default slot goes
 * between the field and the error.
 */
defineOptions({ inheritAttrs: false });

const props = withDefaults(
    defineProps<{
        /** The visible input's id (for its <label>); ids for the error and notes derive from it. */
        id: string;
        /** Posts the value under this name, from a hidden input. */
        name?: string;
        /** "mobile" for account numbers, "any" to also take landlines. */
        kind?: PhoneKind;
        /** The starting number when there is no v-model (E.164 or as typed). */
        defaultValue?: string | null;
        /** The server's error for this field. */
        error?: string;
        /** Ids of hints to read out with the field. */
        describedby?: string;
        required?: boolean;
        autocomplete?: string;
        placeholder?: string;
        /** Classes for the field's frame (height, radius, border). */
        class?: HTMLAttributes['class'];
        /** Classes for the number's text. */
        inputClass?: HTMLAttributes['class'];
    }>(),
    {
        name: undefined,
        kind: 'mobile',
        defaultValue: null,
        error: undefined,
        describedby: undefined,
        required: false,
        autocomplete: 'tel-national',
        placeholder: '12-345 6789',
        class: undefined,
        inputClass: undefined,
    },
);

const model = defineModel<string>();

const inputEl = useTemplateRef<HTMLInputElement>('inputEl');

/** What the visible input shows: the number after +60, formatted. */
const display = ref(toNationalDisplay(model.value ?? props.defaultValue));

/** The value last sent to v-model, to tell the parent's own changes apart. */
let sent = model.value;

const clientError = ref<string | null>(null);
const message = computed(() => clientError.value ?? props.error);

const errorId = computed(() => `${props.id}-error`);
const countryId = computed(() => `${props.id}-country`);
const describedBy = computed(() =>
    [countryId.value, props.describedby, message.value ? errorId.value : null]
        .filter(Boolean)
        .join(' '),
);

const submitValue = computed(() => toE164(display.value, props.kind));

// The parent replaced the value (a reset, say): show the new number.
watch(model, (value) => {
    if (value !== sent) {
        sent = value;
        display.value = toNationalDisplay(value);
        clientError.value = null;
    }
});

function commit(text: string): void {
    display.value = text;
    sent = toE164(text, props.kind);
    model.value = sent;
}

/** The characters the formatter keeps: digits and a leading "+". */
function significant(text: string): string {
    return text.replace(/[^\d+]/g, '');
}

/** The caret position just after the `count`-th significant character. */
function caretAfter(text: string, count: number): number {
    let seen = 0;

    for (let index = 0; index < text.length && count > 0; index++) {
        if (/[\d+]/.test(text[index]) && ++seen === count) {
            return index + 1;
        }
    }

    return count > 0 ? text.length : 0;
}

function onInput(event: Event): void {
    const el = event.target as HTMLInputElement;
    const { inputType } = event as InputEvent;
    let text = el.value;
    let caret = el.selectionStart ?? text.length;

    // Deleting only a "-" or a space would be undone by the formatter, so
    // Backspace and Delete remove the digit beside it instead.
    const backward = inputType === 'deleteContentBackward';

    if (
        (backward || inputType === 'deleteContentForward') &&
        significant(text) === significant(display.value)
    ) {
        const index = backward
            ? text.slice(0, caret).search(/\d(?=\D*$)/)
            : caret + text.slice(caret).search(/\d/);

        if (index >= 0 && index >= (backward ? 0 : caret)) {
            text = text.slice(0, index) + text.slice(index + 1);
            caret = index;
        }
    }

    const kept = significant(text.slice(0, caret)).length;
    const formatted = formatPhoneInput(text);

    el.value = formatted;
    commit(formatted);
    clientError.value = null;

    if (document.activeElement === el) {
        const position = caretAfter(formatted, kept);
        el.setSelectionRange(position, position);
    }
}

function onBlur(): void {
    const tidy = toNationalDisplay(display.value);

    if (tidy !== display.value) {
        commit(tidy);
    }

    clientError.value = phoneError(display.value, props.kind);
}

function focusInput(): void {
    inputEl.value?.focus();
}

/** The 14-point Federal Star of the Malaysian flag, as polygon points. */
const FLAG_STAR = Array.from({ length: 28 }, (_, point) => {
    const radius = point % 2 === 0 ? 2.4 : 1.05;
    const angle = (Math.PI * point) / 14 - Math.PI / 2;

    return `${(10.35 + radius * Math.cos(angle)).toFixed(2)},${(4 + radius * Math.sin(angle)).toFixed(2)}`;
}).join(' ');
</script>

<template>
    <!-- The selector and the number sit inside the 44px field's border,
         and both reach over it so each is a 44px target: on touch screens
         the selector's ::after (tap-target in app.css), and the number's
         own box, 1px past the field's top and bottom edges (so the field
         does not clip its overflow). A tap on the border at either end
         moves on to the number too. -->
    <div
        :data-invalid="message ? '' : undefined"
        :class="
            cn(
                'flex h-11 w-full min-w-0 items-stretch rounded-md border border-input bg-white shadow-xs transition-[color,box-shadow] focus-within:border-ring focus-within:ring-[3px] focus-within:ring-ring/50',
                'data-invalid:border-destructive data-invalid:focus-within:border-destructive data-invalid:focus-within:ring-destructive/20',
                props.class,
            )
        "
        @click.self="focusInput"
    >
        <!--
            The hint sits right on top of the selector: its left edge lines
            up with the field, and a 10x5 arrow points down at the selector
            with its tip 4px above it (reka-ui adds the arrow's height to
            side-offset, so the bubble itself is 9px up). That puts the
            bubble's bottom edge just below the field label's letters, so
            while it shows it covers the label whole instead of leaving a
            sliver of it peeking out underneath. It never goes over the
            number; with no room above it flips below the field. It closes
            as soon as the pointer leaves the selector.
        -->
        <TooltipProvider :delay-duration="200" disable-hoverable-content>
            <TooltipRoot>
                <TooltipTrigger as-child>
                    <!--
                        aria-disabled rather than disabled, so it can take
                        focus (which opens the hint) and gets pointer events.
                        Clicking or pressing it moves on to the number;
                        mousedown.prevent keeps a click from focusing it first.
                    -->
                    <button
                        type="button"
                        aria-disabled="true"
                        aria-haspopup="listbox"
                        aria-label="Country: Malaysia (+60)"
                        :aria-describedby="countryId"
                        class="tap-target relative flex flex-none cursor-not-allowed items-center gap-1.5 rounded-l-[inherit] border-r border-line-strong bg-surface pr-2 pl-3 text-[15px] font-semibold text-ink-2 tabular-nums outline-none focus-visible:ring-2 focus-visible:ring-brand/60 focus-visible:ring-inset"
                        @mousedown.prevent
                        @click="focusInput"
                    >
                        <svg
                            viewBox="0 0 28 14"
                            aria-hidden="true"
                            class="h-3.5 w-7 flex-none rounded-[2px] ring-1 ring-ink/10"
                        >
                            <rect width="28" height="14" fill="#cc0001" />
                            <path
                                fill="#ffffff"
                                d="M0 1h28v1H0zM0 3h28v1H0zM0 5h28v1H0zM0 7h28v1H0zM0 9h28v1H0zM0 11h28v1H0zM0 13h28v1H0z"
                            />
                            <rect width="14" height="8" fill="#010066" />
                            <circle cx="5.3" cy="4" r="3.2" fill="#ffcc00" />
                            <circle cx="6.1" cy="4" r="2.7" fill="#010066" />
                            <polygon :points="FLAG_STAR" fill="#ffcc00" />
                        </svg>
                        <span>+60</span>
                        <ChevronDown
                            aria-hidden="true"
                            class="size-4 flex-none text-field/60"
                        />
                    </button>
                </TooltipTrigger>
                <TooltipPortal>
                    <TooltipContent
                        side="top"
                        align="start"
                        :side-offset="4"
                        :collision-padding="8"
                        class="z-50 origin-(--reka-tooltip-content-transform-origin) animate-in rounded-md bg-ink px-2.5 py-1.5 text-xs leading-4 font-semibold whitespace-nowrap text-white shadow-md fade-in-0 zoom-in-95 data-[side=bottom]:slide-in-from-top-1 data-[side=top]:slide-in-from-bottom-1 data-[state=closed]:animate-out data-[state=closed]:fade-out-0 data-[state=closed]:zoom-out-95"
                    >
                        Malaysian numbers only
                        <TooltipArrow
                            :width="10"
                            :height="5"
                            rounded
                            class="fill-ink"
                        />
                    </TooltipContent>
                </TooltipPortal>
            </TooltipRoot>
        </TooltipProvider>

        <input
            :id="id"
            ref="inputEl"
            v-bind="$attrs"
            :value="display"
            type="tel"
            inputmode="tel"
            :autocomplete="autocomplete"
            :placeholder="placeholder"
            :required="required"
            :aria-invalid="message ? true : undefined"
            :aria-describedby="describedBy"
            :class="
                cn(
                    '-my-px h-[calc(100%+2px)] w-full min-w-0 flex-1 bg-transparent px-3 text-base text-ink outline-none placeholder:text-muted-foreground md:text-[15px]',
                    inputClass,
                )
            "
            @input="onInput"
            @blur="onBlur"
        />

        <input v-if="name" type="hidden" :name="name" :value="submitValue" />
        <span :id="countryId" class="sr-only">
            Malaysian numbers only, after the country code +60.
        </span>
    </div>

    <slot />

    <InputError :id="errorId" :message="message" />
</template>
