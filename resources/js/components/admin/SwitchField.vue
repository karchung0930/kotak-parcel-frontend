<script setup lang="ts">
/**
 * An on/off setting: a switch with its label, the current state in words
 * and an explanation. It is a native checkbox with role="switch", so Space
 * toggles it and screen readers announce "on" or "off".
 *
 * Default slot: extra notes under the description (e.g. why it is locked).
 */
const props = withDefaults(
    defineProps<{
        id: string;
        label: string;
        description?: string | null;
        onLabel?: string;
        offLabel?: string;
        disabled?: boolean;
        /** Extra ids for aria-describedby, e.g. the field's error. */
        describedby?: string;
    }>(),
    {
        description: null,
        onLabel: 'On',
        offLabel: 'Off',
        disabled: false,
        describedby: undefined,
    },
);

const model = defineModel<boolean>({ required: true });

const descriptionId = `${props.id}-description`;
</script>

<template>
    <!-- On phones only the label shares a row with the switch, and the
         explanation takes the full width below. From sm it is a column
         beside the switch. -->
    <div
        class="grid grid-cols-[minmax(0,1fr)_auto] content-start items-center gap-x-5 sm:items-start"
    >
        <label
            :for="id"
            class="col-start-1 row-start-1 text-sm leading-5 font-bold text-ink sm:pt-0.5"
        >
            {{ label }}
        </label>
        <div
            class="col-span-2 row-start-2 min-w-0 sm:col-span-1 sm:col-start-1"
        >
            <!-- Balanced lines in the narrow column beside the switch, so
                 it never ends the explanation on a lone word or two -->
            <p
                v-if="description"
                :id="descriptionId"
                class="mt-0.5 text-[13px] leading-5 text-pretty text-muted-foreground sm:mt-1 sm:text-balance"
            >
                {{ description }}
            </p>
            <slot />
        </div>

        <div
            class="col-start-2 row-start-1 flex items-center gap-3 pt-0.5 sm:row-end-3"
        >
            <span
                aria-hidden="true"
                :class="[
                    'text-[13px] font-bold',
                    model ? 'text-status-delivered' : 'text-muted-foreground',
                ]"
            >
                {{ model ? onLabel : offLabel }}
            </span>
            <!-- A second label around the 28px switch: its ::after makes
                 a 44px target on touch screens, and a tap on it toggles
                 the switch like a tap on the switch itself -->
            <label :for="id" class="tap-target relative inline-flex">
                <input
                    :id="id"
                    v-model="model"
                    type="checkbox"
                    role="switch"
                    :disabled="disabled"
                    :aria-describedby="
                        [description ? descriptionId : null, describedby]
                            .filter(Boolean)
                            .join(' ') || undefined
                    "
                    class="peer h-7 w-12 cursor-pointer appearance-none rounded-full bg-field transition-colors checked:bg-brand disabled:cursor-not-allowed disabled:opacity-50"
                />
                <span
                    aria-hidden="true"
                    class="pointer-events-none absolute top-1 left-1 size-5 rounded-full bg-white shadow-sm transition-transform peer-checked:translate-x-5"
                />
            </label>
        </div>
    </div>
</template>
