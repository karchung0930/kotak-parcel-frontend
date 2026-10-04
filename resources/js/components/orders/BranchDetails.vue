<script setup lang="ts">
import { Clock, ExternalLink, Phone, Store } from '@lucide/vue';
import { Button } from '@/components/ui/button';
import { directionsUrl } from '@/lib/branches';
import { formatPhone, telHref } from '@/lib/format';
import type { Branch } from '@/types';

/**
 * A branch's name, address, opening hours and phone number, with a Google
 * Maps directions link. No card of its own: the parent draws the frame.
 */
defineProps<{
    branch: Branch;
}>();
</script>

<template>
    <div>
        <div class="flex items-start gap-3">
            <span
                class="flex size-10 flex-none items-center justify-center rounded-lg bg-brand-tint text-brand"
            >
                <Store aria-hidden="true" class="size-5" :stroke-width="2.2" />
            </span>
            <div class="min-w-0">
                <p
                    class="text-base leading-[22px] font-extrabold tracking-heading text-ink"
                >
                    {{ branch.name }}
                </p>
                <p class="mt-0.5 text-sm leading-5 text-muted-foreground">
                    {{ branch.address }}, {{ branch.postcode }}
                    {{ branch.city }}, {{ branch.state }}
                </p>
            </div>
        </div>

        <ul class="mt-3.5 space-y-2 text-sm leading-5 text-ink-2">
            <li class="flex items-start gap-2.5">
                <Clock
                    aria-hidden="true"
                    class="mt-0.5 size-4 flex-none text-brand"
                />
                <span>
                    <span class="sr-only">Opening hours:</span>
                    {{ branch.opening_hours }}
                </span>
            </li>
            <li class="flex items-start gap-2.5">
                <Phone
                    aria-hidden="true"
                    class="mt-0.5 size-4 flex-none text-brand"
                />
                <!-- A 44px target on touch screens without moving
                     anything; it stays clear of the button below. -->
                <a
                    :href="telHref(branch.phone)"
                    class="tap-target relative font-semibold text-ink-2 underline decoration-line-strong underline-offset-4 hover:text-brand-strong hover:decoration-current"
                >
                    <span class="sr-only">Call the branch:</span>
                    {{ formatPhone(branch.phone) }}
                </a>
            </li>
        </ul>

        <Button
            variant="outline"
            as-child
            class="mt-4 h-11 rounded-lg font-bold"
        >
            <a
                :href="directionsUrl(branch)"
                target="_blank"
                rel="noopener noreferrer"
            >
                Get directions
                <ExternalLink aria-hidden="true" />
                <span class="sr-only">(opens Google Maps in a new tab)</span>
            </a>
        </Button>
    </div>
</template>
