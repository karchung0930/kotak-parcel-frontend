<script setup lang="ts">
import { usePasskeyRegister } from '@laravel/passkeys/vue';
import { ref } from 'vue';
import InputError from '@/components/InputError.vue';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';

const emit = defineEmits<{
    success: [];
}>();

const getDefaultPasskeyName = () => {
    const ua = navigator.userAgent;

    const browser = [
        { pattern: /Edg|Edge/, name: 'Edge' },
        { pattern: /OPR|Opera|OPiOS/, name: 'Opera' },
        { pattern: /Firefox|FxiOS/, name: 'Firefox' },
        { pattern: /Chrome|CriOS/, name: 'Chrome' },
        { pattern: /Safari/, name: 'Safari' },
    ].find(({ pattern }) => pattern.test(ua))?.name;

    const os = [
        { pattern: /iPhone/, name: 'iPhone' },
        { pattern: /iPad|Macintosh(?=.*Mobile)/, name: 'iPad' },
        { pattern: /Android/, name: 'Android' },
        { pattern: /Mac/, name: 'Mac' },
        { pattern: /Windows/, name: 'Windows' },
    ].find(({ pattern }) => pattern.test(ua))?.name;

    return [browser, os].filter(Boolean).join(' on ') || '';
};

const name = ref(getDefaultPasskeyName());
// Opened by the Passkeys card's header button; closes itself when done.
const showForm = defineModel<boolean>('open', { default: false });

const { register, isLoading, error, isSupported } = usePasskeyRegister({
    onSuccess: () => {
        name.value = '';
        showForm.value = false;
        emit('success');
    },
});

const handleSubmit = async (event: Event) => {
    event.preventDefault();

    if (!name.value.trim()) {
        return;
    }

    await register(name.value);
};

const handleCancel = () => {
    showForm.value = false;
    name.value = '';
};
</script>

<template>
    <div v-if="!isSupported" class="text-sm text-muted-foreground">
        Passkeys are not supported in this browser.
    </div>

    <form
        v-else-if="showForm"
        @submit="handleSubmit"
        class="space-y-4 rounded-lg border border-border bg-muted/50 p-4"
    >
        <div class="grid gap-1.5">
            <Label
                for="passkey-name"
                class="text-[13.5px] leading-[19px] font-semibold text-ink"
            >
                Passkey name
            </Label>
            <Input
                id="passkey-name"
                type="text"
                v-model="name"
                placeholder="e.g. MacBook Pro or iPhone"
                class="h-11 bg-white text-base md:text-[15px]"
                aria-describedby="passkey-name-hint"
                v-focus
            />
            <p id="passkey-name-hint" class="text-xs text-muted-foreground">
                A name helps you identify this passkey later.
            </p>
        </div>

        <InputError v-if="error" :message="error" />

        <!-- Red for the next step; Cancel is a plain outline button, like
             every Cancel on the site (a ghost button's pale red hover
             would read as "selected"). -->
        <div class="flex flex-wrap gap-2.5">
            <Button
                type="submit"
                class="h-11 rounded-lg px-5 font-bold"
                :disabled="isLoading || !name.trim()"
            >
                {{ isLoading ? 'Registering...' : 'Register passkey' }}
            </Button>
            <Button
                type="button"
                variant="outline"
                class="h-11 rounded-lg px-5 font-bold"
                @click="handleCancel"
            >
                Cancel
            </Button>
        </div>
    </form>
</template>
