<script setup lang="ts">
import type { InertiaLinkProps } from '@inertiajs/vue3';
import { Link } from '@inertiajs/vue3';
import { Check, Copy } from '@lucide/vue';
import { createReusableTemplate } from '@vueuse/core';
import { computed, markRaw, onBeforeUnmount, ref } from 'vue';
import { toast } from 'vue-sonner';
import KeepTogether from '@/components/KeepTogether.vue';
import { Button } from '@/components/ui/button';
import { formatTrackingNumber, normalizeTrackingNumber } from '@/lib/format';

/**
 * A tracking number shown as KT-XXXXXXXX in mono, with a copy button that
 * confirms with a toast. Give it `href` to make the number a link, and
 * `copy-first` to put the button before the number (in a table column the
 * buttons then line up and so do the numbers). The button comes first in
 * the page too, so the tab order follows what is on screen.
 *
 * `stretched` makes the link cover its row or card (the nearest positioned
 * ancestor, so give that `relative`): a tap anywhere on it opens the
 * parcel, and the copy button stays on top. Otherwise the link and the
 * button are 44px tap targets on touch screens (tap-target in app.css).
 *
 * The number never breaks across lines ("KT- / 7Q4M92XD"). Size `inline`
 * is for a number inside a sentence, a list row or a printed label: only
 * the mono face, in the size and colour of the text around it, with no
 * copy button or link of its own: the props refuse `href`, `stretched`,
 * `copy-first` and a copy button with it (put it inside a link instead).
 * Text that is not a tracking number (what someone searched for) may break
 * anywhere instead, so a long string cannot push the page sideways.
 */
type Props = {
    /** Any accepted form: "KT-7Q4M92XD", "KT7Q4M92XD", "kt 7q4m92xd". */
    value: string;
} & (
    | {
          size?: 'sm' | 'md' | 'lg';
          copyable?: boolean;
          copyFirst?: boolean;
          href?: NonNullable<InertiaLinkProps['href']> | null;
          stretched?: boolean;
      }
    | {
          size: 'inline';
          copyable?: false;
          copyFirst?: false;
          href?: null;
          stretched?: false;
      }
);

// Defaults by destructuring: withDefaults would merge the two shapes and
// let any prop through.
const {
    value,
    size = 'md',
    copyable = true,
    copyFirst = false,
    href = null,
    stretched = false,
} = defineProps<Props>();

const [DefineCopyButton, CopyButton] = createReusableTemplate();

const display = computed(() => formatTrackingNumber(value));
const wrap = computed(() =>
    normalizeTrackingNumber(value) ? 'whitespace-nowrap' : 'break-all',
);
const copied = ref(false);
let resetTimer: ReturnType<typeof setTimeout> | undefined;

/** A toast's description, with the number shown as it is on the page. */
const describe = (text: string) => ({
    description: markRaw(KeepTogether),
    componentProps: { text },
});

async function copy(): Promise<void> {
    try {
        await navigator.clipboard.writeText(display.value);
    } catch {
        toast.error(
            'Could not copy the tracking number',
            describe(`Select ${display.value} and copy it instead.`),
        );

        return;
    }

    copied.value = true;
    toast.success('Tracking number copied', describe(display.value));
    clearTimeout(resetTimer);
    resetTimer = setTimeout(() => (copied.value = false), 2000);
}

onBeforeUnmount(() => clearTimeout(resetTimer));

const textSize = {
    sm: 'text-[13px] leading-5',
    md: 'text-base leading-6',
    lg: 'text-xl leading-8 sm:text-2xl',
};

const buttonSize = {
    sm: 'size-7',
    md: 'size-8',
    lg: 'size-9',
};

const iconSize = {
    sm: 'size-3.5',
    md: 'size-4',
    lg: 'size-4',
};
</script>

<template>
    <span
        v-if="size === 'inline'"
        :class="['font-mono font-bold tracking-[0.02em]', wrap]"
        >{{ display }}</span
    >
    <span v-else class="inline-flex max-w-full items-center gap-2 align-middle">
        <!-- Renders nothing: the button, written once, for either side.
             An outline Button, so in a table it lifts off the hovered row
             like every outline button instead of turning the row's grey. -->
        <DefineCopyButton>
            <Button
                type="button"
                variant="outline"
                size="icon"
                :aria-label="`Copy tracking number ${display}`"
                :title="copied ? 'Copied' : 'Copy tracking number'"
                :class="[
                    'tap-target relative text-ink-2',
                    buttonSize[size],
                    stretched && 'z-10',
                ]"
                @click="copy"
            >
                <Check
                    v-if="copied"
                    aria-hidden="true"
                    :class="['text-status-delivered', iconSize[size]]"
                />
                <Copy v-else aria-hidden="true" :class="iconSize[size]" />
            </Button>
        </DefineCopyButton>
        <CopyButton v-if="copyable && copyFirst" />
        <Link
            v-if="href"
            :href="href"
            :class="[
                'font-mono font-bold tracking-[0.02em] text-brand-strong underline-offset-4 hover:text-brand-deep hover:underline',
                wrap,
                textSize[size],
                stretched
                    ? 'after:absolute after:inset-0'
                    : 'tap-target relative',
            ]"
        >
            {{ display }}
        </Link>
        <span
            v-else
            :class="[
                'font-mono font-bold tracking-[0.02em] text-ink',
                wrap,
                textSize[size],
            ]"
        >
            {{ display }}
        </span>
        <CopyButton v-if="copyable && !copyFirst" />
    </span>
</template>
