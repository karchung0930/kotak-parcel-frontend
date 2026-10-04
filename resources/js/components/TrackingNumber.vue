<script setup lang="ts">
import type { InertiaLinkProps } from '@inertiajs/vue3';
import { Link } from '@inertiajs/vue3';
import { Check, Copy } from '@lucide/vue';
import { createReusableTemplate } from '@vueuse/core';
import { computed, onBeforeUnmount, ref } from 'vue';
import { toast } from 'vue-sonner';
import { Button } from '@/components/ui/button';
import { formatTrackingNumber } from '@/lib/format';

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
 */
const props = withDefaults(
    defineProps<{
        /** Any accepted form: "KT-7Q4M92XD", "KT7Q4M92XD", "kt 7q4m92xd". */
        value: string;
        size?: 'sm' | 'md' | 'lg';
        copyable?: boolean;
        copyFirst?: boolean;
        href?: NonNullable<InertiaLinkProps['href']> | null;
        stretched?: boolean;
    }>(),
    {
        size: 'md',
        copyable: true,
        copyFirst: false,
        href: null,
        stretched: false,
    },
);

const [DefineCopyButton, CopyButton] = createReusableTemplate();

const display = computed(() => formatTrackingNumber(props.value));
const copied = ref(false);
let resetTimer: ReturnType<typeof setTimeout> | undefined;

async function copy(): Promise<void> {
    try {
        await navigator.clipboard.writeText(display.value);
    } catch {
        toast.error('Could not copy the tracking number', {
            description: `Select ${display.value} and copy it instead.`,
        });

        return;
    }

    copied.value = true;
    toast.success('Tracking number copied', { description: display.value });
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
    <span class="inline-flex max-w-full items-center gap-2 align-middle">
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
                'font-mono font-bold tracking-[0.02em] whitespace-nowrap text-brand-strong underline-offset-4 hover:text-brand-deep hover:underline',
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
                'font-mono font-bold tracking-[0.02em] whitespace-nowrap text-ink',
                textSize[size],
            ]"
        >
            {{ display }}
        </span>
        <CopyButton v-if="copyable && !copyFirst" />
    </span>
</template>
