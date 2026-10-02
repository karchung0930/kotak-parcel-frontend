<script setup lang="ts">
import { LocateFixed, X } from '@lucide/vue';
import LocationSortNote from '@/components/public/LocationSortNote.vue';
import { Button } from '@/components/ui/button';
import { Spinner } from '@/components/ui/spinner';
import type { LocateStatus } from '@/composables/useNearestBranches';

/**
 * The "Use my location" button for sorting branches by distance, with a
 * live note that says what happened (sorted, denied, failed).
 * Pair it with useNearestBranches().
 *
 * size "lg" makes the buttons 48px tall, to sit on one row with an h-12
 * field (they fill the width on phones). With note false the note is left
 * out, for a page that places LocationSortNote itself.
 */
withDefaults(
    defineProps<{
        status: LocateStatus;
        message: string;
        size?: 'md' | 'lg';
        note?: boolean;
    }>(),
    {
        size: 'md',
        note: true,
    },
);

const emit = defineEmits<{
    locate: [];
    clear: [];
}>();
</script>

<template>
    <div>
        <div
            :class="
                size === 'lg'
                    ? 'flex items-center gap-2'
                    : 'flex flex-wrap items-center gap-2'
            "
        >
            <Button
                type="button"
                variant="outline"
                :class="[
                    'border-field font-bold',
                    size === 'lg'
                        ? 'h-12 flex-1 rounded-lg px-5 text-[15px] has-[>svg]:px-5 sm:flex-none'
                        : 'h-11 px-4 text-[15px]',
                ]"
                :disabled="status === 'locating'"
                @click="emit('locate')"
            >
                <Spinner v-if="status === 'locating'" />
                <LocateFixed v-else aria-hidden="true" class="size-[18px]" />
                {{
                    status === 'located'
                        ? 'Update my location'
                        : 'Use my location'
                }}
            </Button>
            <Button
                v-if="status === 'located'"
                type="button"
                variant="ghost"
                :class="[
                    'px-3 text-sm font-semibold text-ink-2',
                    size === 'lg' ? 'h-12 rounded-lg' : 'h-11',
                ]"
                @click="emit('clear')"
            >
                <X aria-hidden="true" />
                Clear
            </Button>
        </div>

        <LocationSortNote
            v-if="note"
            :status="status"
            :message="message"
            :class="message ? 'mt-3' : ''"
        />
    </div>
</template>
